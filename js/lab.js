/* VPC Packet Tracer lab: traces a packet hop-by-hop through routes, NACLs (stateless) and Security Groups (stateful). */
window.VPC = (function () {
  const INTERNET_IP = '203.0.113.50', INTERNET_DST = '93.184.0.10';
  const ip2n = ip => ip.split('.').reduce((a, o) => a * 256 + (+o), 0);
  const inCidr = (ip, cidr) => { const [b, bits] = cidr.split('/'); const m = +bits === 0 ? 0 : (0xFFFFFFFF << (32 - +bits)) >>> 0; return ((ip2n(ip) & m) >>> 0) === ((ip2n(b) & m) >>> 0); };
  const portOk = (spec, port) => { if (spec == null || spec === 'all' || spec === -1) return true; const s = String(spec); if (s.includes('-')) { const [a, b] = s.split('-').map(Number); return port >= a && port <= b; } return +s === +port; };
  const protoOk = (rp, p) => !rp || rp === 'all' || rp === '-1' || rp === p;
  function routeFor(cfg, subnet, ip) {
    const rt = cfg.routeTables[cfg.subnets[subnet].routeTable] || [];
    let best = null;
    rt.forEach(r => { if (inCidr(ip, r.dest)) { const len = +r.dest.split('/')[1]; if (!best || len > best.len) best = { len, target: r.target, dest: r.dest }; } });
    if (inCidr(ip, cfg.vpc.cidr) && (!best || best.len <= +cfg.vpc.cidr.split('/')[1])) best = { len: +cfg.vpc.cidr.split('/')[1], target: 'local', dest: cfg.vpc.cidr };
    return best;
  }
  function nacl(cfg, subnet, dir, proto, port, ip) {
    const name = cfg.subnets[subnet].nacl; const n = (cfg.nacls || {})[name];
    if (!n) return { ok: true, why: `subnet ${subnet} uses the default NACL (allows all)` };
    const rules = (n[dir] || []).slice().sort((a, b) => a.rule - b.rule);
    for (const r of rules) if (protoOk(r.proto, proto) && portOk(r.ports, port) && inCidr(ip, r.cidr))
      return { ok: r.action === 'allow', why: `NACL ${name} ${dir} rule ${r.rule} (${r.proto} ${r.ports} ${r.cidr}) → ${r.action.toUpperCase()}` };
    return { ok: false, why: `NACL ${name} ${dir}: no rule matched → default * DENY` };
  }
  function sgIn(cfg, inst, proto, port, srcIp, srcSgs) {
    for (const sg of inst.sg || []) { const s = cfg.securityGroups[sg]; if (!s) continue;
      for (const r of s.inbound || []) if (protoOk(r.proto, proto) && portOk(r.ports, port) && (cfg.securityGroups[r.source] ? (srcSgs || []).includes(r.source) : inCidr(srcIp, r.source)))
        return { ok: true, why: `SG ${sg} inbound allows ${r.proto} ${r.ports} from ${r.source}` }; }
    return { ok: false, why: `no inbound rule in [${(inst.sg || []).join(', ')}] allows ${proto}/${port} from ${srcIp}` };
  }
  function sgOut(cfg, inst, proto, port, dstIp, dstSgs) {
    for (const sg of inst.sg || []) { const s = cfg.securityGroups[sg]; if (!s) continue;
      if (!s.outbound) return { ok: true, why: `SG ${sg} outbound: default allow all` };
      for (const r of s.outbound) if (protoOk(r.proto, proto) && portOk(r.ports, port) && (cfg.securityGroups[r.dest] ? (dstSgs || []).includes(r.dest) : inCidr(dstIp, r.dest)))
        return { ok: true, why: `SG ${sg} outbound allows ${r.proto} ${r.ports} to ${r.dest}` }; }
    return { ok: false, why: `no outbound rule in [${(inst.sg || []).join(', ')}] allows ${proto}/${port} to ${dstIp}` };
  }
  function trace(cfg, p) {
    const hops = []; const add = (ok, t) => { hops.push({ ok, t }); return ok; };
    const done = ok => ({ ok, hops });
    const proto = p.proto || 'tcp', port = +p.port || 0, eph = '1024-65535';
    const retPort = proto === 'icmp' ? 0 : 1024;
    const I = cfg.instances || {};
    if (p.from === 'internet') {
      const x = I[p.to]; if (!x) return done(add(false, `unknown instance ${p.to}`));
      if (!add(!!cfg.igw, cfg.igw ? 'VPC has an Internet Gateway attached' : 'no Internet Gateway attached to the VPC')) return done(false);
      if (!add(!!x.publicIp, x.publicIp ? `${p.to} has a public IP` : `${p.to} has no public IP: the internet can't address it`)) return done(false);
      const r = routeFor(cfg, x.subnet, INTERNET_IP);
      if (!add(r && r.target === 'igw', r && r.target === 'igw' ? `subnet ${x.subnet} route ${r.dest} → igw (public subnet)` : `subnet ${x.subnet} has no 0.0.0.0/0 → igw route: it is private`)) return done(false);
      let n = nacl(cfg, x.subnet, 'inbound', proto, port, INTERNET_IP); if (!add(n.ok, n.why)) return done(false);
      const s = sgIn(cfg, x, proto, port, INTERNET_IP, []); if (!add(s.ok, s.why)) return done(false);
      n = nacl(cfg, x.subnet, 'outbound', proto, retPort, INTERNET_IP); if (!add(n.ok, 'return traffic: ' + n.why + (n.ok ? '' : ' (NACLs are stateless: allow ephemeral ports ' + eph + ' outbound!)'))) return done(false);
      add(true, 'SG is stateful: return traffic allowed automatically'); return done(true);
    }
    if (p.to === 'internet') {
      const x = I[p.from]; if (!x) return done(add(false, `unknown instance ${p.from}`));
      let s = sgOut(cfg, x, proto, port, INTERNET_DST, []); if (!add(s.ok, s.why)) return done(false);
      let n = nacl(cfg, x.subnet, 'outbound', proto, port, INTERNET_DST); if (!add(n.ok, n.why)) return done(false);
      const r = routeFor(cfg, x.subnet, INTERNET_DST);
      if (!r || r.target === 'local') return done(add(false, `subnet ${x.subnet} has no route to 0.0.0.0/0`));
      if (r.target === 'igw') { if (!add(!!cfg.igw && !!x.publicIp, x.publicIp ? `route → igw, ${p.from} has a public IP` : `route → igw but ${p.from} has no public IP (private instances need a NAT gateway)`)) return done(false); }
      else if (/^nat/.test(r.target)) { const ng = (cfg.natGateways || {})[r.target];
        if (!add(!!ng, ng ? `route → ${r.target} (in subnet ${ng.subnet})` : `route points to ${r.target}, which doesn't exist`)) return done(false);
        const r2 = routeFor(cfg, ng.subnet, INTERNET_DST); if (!add(r2 && r2.target === 'igw' && cfg.igw, r2 && r2.target === 'igw' ? `NAT subnet ${ng.subnet} routes to igw ✓ (NAT must live in a PUBLIC subnet)` : `NAT gateway's subnet ${ng.subnet} has no route to igw: NAT must be in a public subnet`)) return done(false);
        if (cfg.subnets[ng.subnet].nacl !== cfg.subnets[x.subnet].nacl) { const nn = nacl(cfg, ng.subnet, 'inbound', proto, port, cfg.subnets[x.subnet].cidr.split('/')[0]); if (!add(nn.ok, 'NAT subnet ' + nn.why)) return done(false); } }
      else return done(add(false, `route target ${r.target} not simulated`));
      n = nacl(cfg, x.subnet, 'inbound', proto, retPort, INTERNET_DST); if (!add(n.ok, 'return traffic: ' + n.why + (n.ok ? '' : ' (stateless NACL: allow ephemeral ports ' + eph + ' inbound)'))) return done(false);
      return done(true);
    }
    const a = I[p.from], b = I[p.to]; if (!a || !b) return done(add(false, 'unknown instance'));
    const r = routeFor(cfg, a.subnet, b.ip);
    if (!add(r && r.target === 'local', r && r.target === 'local' ? `route ${cfg.vpc.cidr} → local (inside the VPC)` : 'no local route')) return done(false);
    let s = sgOut(cfg, a, proto, port, b.ip, b.sg); if (!add(s.ok, s.why)) return done(false);
    const cross = a.subnet !== b.subnet;
    if (cross) { let n = nacl(cfg, a.subnet, 'outbound', proto, port, b.ip); if (!add(n.ok, n.why)) return done(false);
      n = nacl(cfg, b.subnet, 'inbound', proto, port, a.ip); if (!add(n.ok, n.why)) return done(false); }
    else add(true, 'same subnet: NACLs not evaluated');
    s = sgIn(cfg, b, proto, port, a.ip, a.sg); if (!add(s.ok, s.why)) return done(false);
    if (cross) { let n = nacl(cfg, b.subnet, 'outbound', proto, retPort, a.ip); if (!add(n.ok, 'return traffic: ' + n.why)) return done(false);
      n = nacl(cfg, a.subnet, 'inbound', proto, retPort, b.ip); if (!add(n.ok, 'return traffic: ' + n.why)) return done(false); }
    return done(true);
  }
  return { trace, inCidr };
})();

window.LAB = (function () {
  const DEFAULT = {
    vpc: { cidr: '10.0.0.0/16' }, igw: true,
    subnets: { 'public-a': { cidr: '10.0.1.0/24', routeTable: 'rt-public', nacl: 'nacl-open' }, 'private-a': { cidr: '10.0.11.0/24', routeTable: 'rt-private', nacl: 'nacl-open' } },
    routeTables: { 'rt-public': [{ dest: '0.0.0.0/0', target: 'igw' }], 'rt-private': [{ dest: '0.0.0.0/0', target: 'nat-a' }] },
    natGateways: { 'nat-a': { subnet: 'public-a' } },
    nacls: { 'nacl-open': { inbound: [{ rule: 100, proto: 'all', ports: 'all', cidr: '0.0.0.0/0', action: 'allow' }], outbound: [{ rule: 100, proto: 'all', ports: 'all', cidr: '0.0.0.0/0', action: 'allow' }] } },
    securityGroups: { 'sg-web': { inbound: [{ proto: 'tcp', ports: '443', source: '0.0.0.0/0' }] }, 'sg-app': { inbound: [{ proto: 'tcp', ports: '8080', source: 'sg-web' }] } },
    instances: { web: { subnet: 'public-a', ip: '10.0.1.10', publicIp: true, sg: ['sg-web'] }, app: { subnet: 'private-a', ip: '10.0.11.20', publicIp: false, sg: ['sg-app'] } }
  };
  const J = o => JSON.stringify(o, null, 2);
  function render(body, l, api) {
    const ch = l.challenge || {}; const esc = api.esc;
    const saved = api.drafts[l.id]; const text = saved != null ? saved : (ch.starter != null ? ch.starter : J(DEFAULT));
    const pk = Object.assign({ from: 'internet', to: 'web', proto: 'tcp', port: 443 }, ch.packet || {});
    let names = []; try { names = Object.keys(JSON.parse(text).instances || {}); } catch (e) {}
    const opt = (v, sel) => ['internet'].concat(names).map(n => `<option ${n === sel ? 'selected' : ''}>${n}</option>`).join('');
    body.innerHTML = `<div class="lab vpc"><div class="col"><div class="lh">VPC CONFIG <span>JSON · edit me</span></div><textarea id="labText" spellcheck="false">${esc(text)}</textarea></div>
      <div class="col"><div class="lh">PACKET</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><label>From<select id="pF">${opt(0, pk.from)}</select></label><label>To<select id="pT">${opt(0, pk.to)}</select></label>
        <label>Protocol<select id="pP">${['tcp', 'udp', 'icmp'].map(x => `<option ${x === pk.proto ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Port<input id="pN" value="${pk.port}"></label></div>
        <div class="btnrow"><button class="btn" id="traceBtn">▶ TRACE PACKET</button>${ch.tests ? '<button class="btn ghost" id="runBtn">✓ RUN TESTS</button>' : ''}<button class="btn ghost" id="resetBtn">RESET</button></div>
        <div id="labOut" class="labout"><span class="cm">Pick a packet and TRACE it hop by hop. Internet client = 203.0.113.50.</span></div></div></div>` + api.taskBar(l);
    const ta = body.querySelector('#labText');
    ta.oninput = () => api.drafts[l.id] = ta.value;
    ta.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = p + 2; } e.stopPropagation(); };
    body.querySelectorAll('input,select').forEach(i => i.onkeydown = e => e.stopPropagation());
    const cfg = () => { try { return JSON.parse(ta.value); } catch (e) { throw new Error('JSON error: ' + e.message); } };
    const out = body.querySelector('#labOut');
    body.querySelector('#traceBtn').onclick = () => { try { const r = VPC.trace(cfg(), { from: body.querySelector('#pF').value, to: body.querySelector('#pT').value, proto: body.querySelector('#pP').value, port: +body.querySelector('#pN').value });
        out.innerHTML = `<div class="dec ${r.ok ? 'allow' : 'deny'}">${r.ok ? '✓ PACKET DELIVERED (and the reply gets back)' : '✕ PACKET DROPPED'}</div>` + r.hops.map((h, i) => `<div class="hop ${h.ok ? 'ok' : 'bad'}"><b>${i + 1}</b><span>${esc(h.t)}</span></div>`).join('');
      } catch (e) { out.innerHTML = `<div class="dec err">✕ ${esc(e.message)}</div>`; } };
    const rb = body.querySelector('#runBtn');
    if (rb) rb.onclick = () => { try { const c = cfg(); let pass = 0;
        const rows = ch.tests.map(t => { const r = VPC.trace(c, t); const ok = r.ok === t.expect; if (ok) pass++; const last = r.hops[r.hops.length - 1];
          return `<div class="tr ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✕'} ${esc(t.from)} → ${esc(t.to)} ${t.proto}/${t.port}: ${r.ok ? 'DELIVERED' : 'DROPPED'} <i>(expected ${t.expect ? 'DELIVERED' : 'DROPPED'})</i>${!ok && last ? `<br><span class="cm">↳ ${esc(last.t)}</span>` : ''}</div>`; }).join('');
        out.innerHTML = `<div class="dec ${pass === ch.tests.length ? 'allow' : 'deny'}">${pass}/${ch.tests.length} tests pass</div>` + rows;
        if (pass === ch.tests.length) api.solve(l.id); else api.toast('Not yet: read the ✕ lines');
      } catch (e) { out.innerHTML = `<div class="dec err">✕ ${esc(e.message)}</div>`; } };
    body.querySelector('#resetBtn').onclick = () => { api.drafts[l.id] = null; render(body, l, api); };
    let tmr; ta.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { try { const ns = Object.keys(JSON.parse(ta.value).instances || {}); ['#pF', '#pT'].forEach(id => { const sel = body.querySelector(id); const v = sel.value; sel.innerHTML = ['internet'].concat(ns).map(n => `<option ${n === v ? 'selected' : ''}>${n}</option>`).join(''); }); } catch (e) {} }, 500); });
  }
  return { render, DEFAULT };
})();

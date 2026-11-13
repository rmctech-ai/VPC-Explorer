window.LESSONS = window.LESSONS || [];
window.J = o => JSON.stringify(o, null, 2);
/* shared network scene: internet → IGW → public subnet → NAT → private subnets */
window.NET = { type: 'graph', nodes: [
  { id: 'inet', x: 80, y: 240, icon: 'globe', label: 'Internet', sub: '203.0.113.50' },
  { id: 'igw', x: 220, y: 240, icon: 'api', label: 'Internet GW', sub: 'igw-0abc' },
  { id: 'rt', x: 380, y: 75, icon: 'list', label: 'route tables', sub: '0.0.0.0/0 → igw | nat' },
  { id: 'web', x: 420, y: 200, icon: 'server', label: 'web', sub: 'public-a · 10.0.1.10' },
  { id: 'nat', x: 420, y: 380, icon: 'gear', label: 'NAT gateway', sub: 'in public-a' },
  { id: 'app', x: 640, y: 200, icon: 'server', label: 'app', sub: 'private-a · 10.0.11.20' },
  { id: 'db', x: 830, y: 290, icon: 'disk', label: 'db', sub: 'isolated · 10.0.21.30' },
  { id: 'sg', x: 640, y: 75, icon: 'shield', label: 'Security Groups', sub: 'stateful · per ENI' },
  { id: 'nacl', x: 640, y: 400, icon: 'firewall', label: 'NACLs', sub: 'stateless · per subnet' }
], edges: [{ a: 'inet', b: 'igw' }, { a: 'igw', b: 'web' }, { a: 'web', b: 'app' }, { a: 'app', b: 'db' }, { a: 'app', b: 'nat' }, { a: 'nat', b: 'igw' }, { a: 'rt', b: 'web' }, { a: 'sg', b: 'app' }, { a: 'nacl', b: 'app' }] };

window.VC = {
  open: () => ({ inbound: [{ rule: 100, proto: 'all', ports: 'all', cidr: '0.0.0.0/0', action: 'allow' }], outbound: [{ rule: 100, proto: 'all', ports: 'all', cidr: '0.0.0.0/0', action: 'allow' }] }),
  make(o) {
    const c = { vpc: { cidr: '10.0.0.0/16' }, igw: true,
      subnets: { 'public-a': { cidr: '10.0.1.0/24', routeTable: 'rt-public', nacl: 'nacl-open' } },
      routeTables: { 'rt-public': [{ dest: '0.0.0.0/0', target: 'igw' }] },
      natGateways: {}, nacls: { 'nacl-open': VC.open() }, securityGroups: {}, instances: {} };
    return Object.assign(c, o);
  }
};

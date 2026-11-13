# VPC Cheat Sheet

_Auto-generated from the VPC Explorer lessons. One master memory hook + the key commands per lesson._

## 01 · What is a VPC?

> ★ A VPC is a gated housing estate. You pick the street numbers (CIDR), the neighborhoods (subnets), the gates (gateways) and the guards (SGs & NACLs).

| Command | What it does |
|---|---|
| `aws ec2 create-vpc --cidr-block 10.0.0.0/16` | create VPC |
| `VPC = region · subnet = AZ` | scope |
| `IGW → Route → NACL → SG → ENI` | inbound path |
| `default VPC 172.31.0.0/16` | learning only |

**Memory hooks:**

- **An isolated network**: Closed by default. You open specific doors.
- **Region & AZs**: VPC = region-wide. Subnet = one AZ.
- **The building blocks**: "Some Routes Into Networks Stay Nicely Encrypted": Subnets, Routes, IGW, NAT, SGs, NACLs, Endpoints.
- **The default VPC**: Default VPC = playground. Custom VPC = production.
- **Traffic path**: IGW → Route → NACL → SG → ENI.

## 02 · CIDR & IP Addressing

> ★ Slash number = fixed bits. Hosts = 2^(32 − slash). /16 = 65,536 · /24 = 256.

| Command | What it does |
|---|---|
| `/n → 2^(32-n) addresses` | size |
| `10/8 · 172.16/12 · 192.168/16` | private ranges |
| `VPC /16 to /28` | allowed sizes |
| `5 reserved per subnet` | .0 .1 .2 .3 .255 |
| `ipaddress.ip_network()` | Python CIDR math |

**Memory hooks:**

- **Reading CIDR**: Bigger slash, smaller network. +1 slash = half the size.
- **Private ranges**: 10 · 172.16 · 192.168. And never overlap.
- **Splitting into subnets**: Encode the tier in the third number.
- **5 reserved IPs**: First four + last one. /24 → 251 usable.
- **IPv6 (briefly)**: IPv6 outbound-only = egress-only IGW.

## 03 · Subnets: Public, Private, Isolated

> ★ Public = route to IGW. Private = route to NAT. Isolated = no internet route.

| Command | What it does |
|---|---|
| `public: 0.0.0.0/0 → igw` | internet-facing |
| `private: 0.0.0.0/0 → nat` | outbound only |
| `isolated: local only` | databases |
| `3 tiers × 2 AZs` | standard layout |
| `describe-subnets` | list subnets |

**Memory hooks:**

- **Subnet basics**: Subnet = CIDR + AZ.
- **Public subnet**: Public subnet = for things that face the internet.
- **Private subnet**: Private = can go out, can't be called in.
- **Isolated subnet**: Databases live in isolated subnets.
- **Multi-AZ layout**: 3 tiers × 2 AZs = 6 subnets. The classic starter VPC.

## 04 · Route Tables

> ★ Most specific route wins (longest prefix). /32 beats /24 beats /16 beats /0.

| Command | What it does |
|---|---|
| `aws ec2 create-route --destination-cidr-block 0.0.0.0/0 --gateway-id igw-…` | add default route |
| `10.0.0.0/16 → local` | always present |
| `longest prefix wins` | rule |
| `associate-route-table` | link subnet |
| `timeout → check routes` | troubleshooting |

**Memory hooks:**

- **Destination → target**: Where to? → Which door.
- **The local route**: Inside the VPC is always "local".
- **Longest prefix match**: Bigger slash wins.
- **Associations**: Keep the main route table private. New subnets then default to safe.
- **Fix a broken route**: Timeout + everything looks fine → check routes.

## 05 · Internet Gateway & Public IPs

> ★ IGW + route + public IP = internet access. Miss one, no access.

| Command | What it does |
|---|---|
| `create/attach-internet-gateway` | IGW |
| `allocate-address / associate-address` | Elastic IP |
| `IGW + route + public IP` | requirements |
| `describe-addresses (no AssociationId)` | idle EIPs to delete |

**Memory hooks:**

- **Attach an IGW**: One VPC, one IGW, fully managed.
- **Public IP addresses**: Need a fixed address? Elastic IP.
- **The three requirements**: Gate, road, address, guards.
- **Outbound through the IGW**: IGW works only for instances with public IPs.
- **Public IPs cost & exposure**: Fewer public IPs = lower bill + smaller attack surface.

## 06 · NAT Gateway

> ★ NAT = one-way door: out yes, in no. It sits in the PUBLIC subnet.

| Command | What it does |
|---|---|
| `create-nat-gateway --subnet-id PUBLIC` | create NAT |
| `create-route ... --nat-gateway-id` | private route |
| `NAT per AZ` | HA |
| `$/hr + $/GB` | cost |
| `private → igw = broken` | common mistake |

**Memory hooks:**

- **What NAT does**: Outbound conversations only.
- **Placement matters**: NAT lives public, serves private.
- **Inbound stays blocked**: Private + NAT = unreachable from the internet.
- **HA & cost**: NAT per AZ for HA; endpoints for S3 to save money.
- **Test outbound from private**: Private instance + route to IGW = no internet.

## 07 · Security Groups

> ★ SG = bouncer with a guest list who remembers faces. Allow-only, stateful, per instance.

| Command | What it does |
|---|---|
| `create-security-group` | new SG |
| `authorize-security-group-ingress --cidr` | allow from CIDR |
| `--source-group sg-…` | allow from SG |
| `allow-only, stateful` | behavior |
| `no 0.0.0.0/0 on 22/3389/DB` | rule |
| `revoke-security-group-egress` | limit outbound |

**Memory hooks:**

- **Allow rules only**: Allow-only. Default: nothing in, everything out.
- **Stateful**: Allow the request; the reply comes free.
- **Reference other SGs**: Tier-to-tier: reference SGs, not CIDRs.
- **Common mistakes**: Never 0.0.0.0/0 on 22, 3389 or databases.
- **Limits & tips**: Multiple SGs = union. Restrict outbound for sensitive tiers.

## 08 · Network ACLs

> ★ NACL = checkpoint with no memory. It checks every packet both ways, first matching rule number wins.

| Command | What it does |
|---|---|
| `create-network-acl-entry --rule-number N` | add rule |
| `lowest number first` | evaluation |
| `--rule-action deny` | block a range |
| `egress 1024-65535` | allow replies |
| `SG stateful · NACL stateless` | exam fact |

**Memory hooks:**

- **Subnet-level firewall**: NACL = subnet border; SG = instance door.
- **Numbered rules**: Lowest number wins. Deny before allow to block.
- **Stateless**: Stateless → allow ephemeral 1024-65535 for replies.
- **SG vs NACL**: SG: Stateful, Single instance. NACL: No memory, Numbered.
- **Debug the ephemeral trap**: SG fine + timeout + custom NACL → check ephemeral ports.

## 09 · Three-Tier VPC Design

> ★ "Each tier only trusts the tier in front of it." Internet → LB → App → DB.

| Command | What it does |
|---|---|
| `LB public · app private · DB isolated` | layout |
| `sg-app ← sg-lb · sg-db ← sg-app` | SG chain |
| `PubliclyAccessible = false` | RDS |
| `create-network-insights-path` | Reachability Analyzer |
| `test allowed AND denied paths` | verification |

**Memory hooks:**

- **The tiers**: Front counter, kitchen, pantry.
- **Chain the SGs**: Each SG's source = the SG in front.
- **Database isolation**: DB: local route only + SG from app only.
- **Outbound for apps**: App out via NAT; AWS services via endpoints.
- **Verify with tests**: Test the "must NOT" paths too.

## 10 · VPC Endpoints & PrivateLink

> ★ Gateway endpoint = free route for S3/DynamoDB. Interface endpoint = private ENI for everything else.

| Command | What it does |
|---|---|
| `create-vpc-endpoint --service-name ...s3 --route-table-ids` | gateway endpoint |
| `--vpc-endpoint-type Interface --private-dns-enabled` | interface endpoint |
| `aws:SourceVpce` | bucket condition |
| `endpoint service + NLB` | PrivateLink provider |

**Memory hooks:**

- **Why endpoints**: Private path, no NAT bill.
- **Gateway endpoints**: S3 & DynamoDB? Gateway endpoint, always.
- **Interface endpoints**: Interface endpoint = ENI + private DNS + SG on 443.
- **Endpoint & bucket policies**: aws:SourceVpce = "only via my endpoint".
- **PrivateLink for your own services**: PrivateLink = service-to-consumer, one direction.

## 11 · Peering, Transit Gateway & Hybrid

> ★ Peering = private bridge between two. TGW = airport hub for many. VPN = encrypted tunnel over internet. Direct Connect = private fiber.

| Command | What it does |
|---|---|
| `create-vpc-peering-connection + accept + routes` | peering |
| `non-transitive` | peering rule |
| `Transit Gateway` | hub for many |
| `Site-to-Site VPN` | IPsec over internet |
| `Direct Connect` | dedicated line |

**Memory hooks:**

- **VPC peering**: Peering is not transitive.
- **The mesh problem**: Many VPCs? Stop peering, start hubbing.
- **Transit Gateway**: TGW = transitive hub.
- **Site-to-Site VPN**: VPN = fast to set up, rides the internet.
- **Direct Connect**: VPN = minutes, internet. DX = weeks, dedicated.

## 12 · DNS & Route 53

> ★ "It's always DNS." Resolver at .2, private zones for internal names, routing policies for smart answers.

| Command | What it does |
|---|---|
| `VPC base + 2` | resolver IP |
| `private hosted zone` | internal names |
| `Alias record` | apex → AWS resource |
| `Resolver inbound/outbound endpoints` | hybrid DNS |
| `latency · failover · weighted` | routing policies |

**Memory hooks:**

- **The VPC resolver**: Resolver = VPC base + 2. Remember the reserved .2 from lesson 2.
- **Private hosted zones**: Private zone = names that never leak to the internet.
- **Public hosted zones**: Alias = point at AWS resources, works at the apex.
- **Hybrid DNS**: Inbound = office asks AWS. Outbound = AWS asks office.
- **Routing policies**: Simple, Weighted, Latency, Failover, Geo: "Some Wise Lions Fight Gently".

## 13 · Flow Logs & Troubleshooting

> ★ Flow logs = the network's receipts. REJECT tells you a firewall said no.

| Command | What it does |
|---|---|
| `create-flow-logs --resource-type VPC` | enable |
| `6=TCP 17=UDP 1=ICMP` | protocols |
| `ACCEPT/REJECT` | action field |
| `in ACCEPT + reply REJECT = NACL` | clue |
| `DNS · instance · SG · NACL · route · IP · logs` | ladder |

**Memory hooks:**

- **Enable flow logs**: Turn on VPC-level flow logs on day one.
- **Read a record**: src → dst : port · 6=TCP 17=UDP 1=ICMP · ACCEPT/REJECT.
- **Interpret ACCEPT/REJECT**: In ACCEPT + reply REJECT = NACL. Nothing logged = routing/DNS.
- **The debug ladder**: "DNS, Instance, SG, NACL, Route, IP, Logs."
- **Final boss: broken VPC**: Trace → fix the first failure → trace again.


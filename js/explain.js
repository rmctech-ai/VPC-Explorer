window.EXPLAIN = {
"what-is-vpc": [
 ["A VPC is regional: it spans every Availability Zone in its Region. Subnets are the per-AZ pieces you carve out of it.", ["Subnets are per-AZ; the VPC itself covers the whole Region.", null, "A VPC never spans Regions; connect Regions with peering or Transit Gateway.", "A subnet lives inside a VPC, not the other way round."]],
 ["A new custom VPC has no internet gateway and no route to one, so nothing gets in or out of the internet until you add an IGW, a 0.0.0.0/0 route and public IPs (or a NAT for outbound only).", ["Nothing is open by default; you build the path yourself.", null, "Outbound also needs an IGW or NAT gateway plus routes.", "Inbound needs an IGW, a route and a public IP."]],
 ["Network ACLs attach to subnets and are stateless, so return traffic needs its own rule. Security groups attach to instances (ENIs) and are stateful.", ["Security groups are instance-level and stateful.", null, "An internet gateway is a VPC component, not a filter.", "Route 53 is DNS, not a network filter."]],
 ["Every default VPC uses 172.31.0.0/16, with a /20 default subnet in each AZ. Custom VPCs use whatever CIDR you choose.", ["10.0.0.0/16 is a popular choice for custom VPCs, not the default VPC.", null, "192.168.0.0/16 is private, but not the default VPC range.", "0.0.0.0/0 means \"all IPv4 addresses\", used in routes and rules."]]
],
"cidr": [
 ["A /24 fixes 24 of the 32 bits, leaving 8 host bits: 2^8 = 256 addresses. Each smaller prefix number doubles the size.", ["24 is the prefix length, not the address count.", "128 addresses is a /25.", null, "65,536 addresses is a /16."]],
 ["AWS reserves 5 addresses in every subnet: network address, VPC router (+1), DNS (+2), future use (+3) and broadcast (last). 256 minus 5 = 251.", ["Not all 256 can be assigned.", "Traditional networking reserves 2; AWS reserves 5.", null, "AWS reserves exactly 5, leaving 251."]],
 ["The RFC 1918 private ranges are 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. They aren't routed on the public internet.", ["8.8.8.0/24 is public (Google DNS).", null, "100.0.0.0/8 is public space (100.64.0.0/10 is carrier-grade NAT, not RFC 1918).", "1.1.1.0/24 is public (Cloudflare DNS)."]],
 ["Routing needs unique destinations. Overlapping VPC CIDRs can't be peered or routed through Transit Gateway, so plan non-overlapping ranges up front.", ["Overlap doesn't change pricing; it blocks connectivity.", null, "DNS isn't affected by CIDR overlap.", "It's a hard limit that's painful to fix later."]]
],
"subnets": [
 ["A subnet is public only because its route table has 0.0.0.0/0 pointing to an internet gateway. There's no public checkbox.", ["No such checkbox exists; the route makes it public.", null, "Subnets use private CIDRs either way.", "Names are just labels."]],
 ["Databases belong in isolated or private subnets with no route to the internet, reachable only from the app tier, which minimizes exposure.", ["A public subnet exposes the DB to internet routing.", "NAT is only needed if the DB must reach out, which it usually doesn't.", null, "Default VPC subnets are public."]],
 ["Being in a public subnet isn't enough: the instance also needs a public IPv4 or Elastic IP for the IGW to translate to.", ["Without a public IP the IGW can't route to it.", null, "NAT only allows outbound-initiated traffic.", "The instance keeps running; it's just unreachable from outside."]],
 ["A NAT gateway sits in a public subnet so it can use that subnet's internet gateway route; private subnets then route 0.0.0.0/0 to the NAT.", ["In a private subnet it would have no internet path itself.", null, "Isolated subnets have no internet route.", "NAT gateways are VPC resources inside a subnet."]]
],
"route-tables": [
 ["Routing uses longest prefix match: 10.1.0.0/16 is more specific than 0.0.0.0/0, so the packet goes to the peering connection.", ["The default route only wins when nothing more specific matches.", null, "A matching route exists, so it isn't dropped.", "10.1.x.x isn't the VPC's own CIDR, so local doesn't apply."]],
 ["Every route table has a local route for the VPC CIDR that can't be deleted, which guarantees all subnets in the VPC can reach each other.", ["The local route is permanent.", null, "It's in every table, main or custom.", "IPv4 and IPv6 local routes are both permanent."]],
 ["Subnets without an explicit association use the VPC's main route table. Keep the main table private and associate public subnets explicitly.", ["There's always an associated table.", null, "An IGW is a target, not a table.", "Association is deterministic: the main table."]],
 ["A missing route makes packets go nowhere, so the client waits until it times out. Errors like 403 or 500 mean the network worked and the application answered.", ["403 comes from the application or IAM, so the network path worked.", null, "DNS errors happen before any packet is sent.", "500 is a server-side application error."]]
],
"igw": [
 ["The IGW performs one-to-one NAT between a public IP and the instance's private IP. With no public IP there's nothing to translate, so no internet access.", ["A public or Elastic IP is required.", null, "The port doesn't matter; translation needs a public IP.", "Security groups don't create public IPs."]],
 ["An Elastic IP is a static public IPv4 address you own until released and can remap between instances, useful for allow-lists and failover.", ["Auto-assigned public IPs change on stop/start.", null, "Private IPs aren't reachable from the internet.", "An ENI is a network interface, not an address."]],
 ["A VPC can have only one internet gateway attached. It's horizontally scaled and highly available by design.", [null, "IGWs aren't per AZ; one serves the whole VPC.", "The limit is one.", "Only one can be attached."]],
 ["Session Manager connects through the SSM agent over outbound HTTPS, so no inbound port, public IP or SSH key is needed, and sessions are logged.", ["Port 22 open to the world is the most-attacked rule in AWS.", null, "EIPs expose the instances publicly.", "Disabling security groups isn't possible and would be terrible."]]
],
"nat": [
 ["The NAT gateway needs internet access itself, so it lives in a public subnet whose route table points to the IGW.", ["In a private subnet it would have no path out.", null, "Isolated subnets have no internet route.", "Placement matters; only public subnets work."]],
 ["NAT only translates connections started from inside. Unsolicited inbound connections from the internet have no mapping and are dropped.", ["That's exactly what NAT prevents.", null, "No port is open inbound through NAT.", "An EIP on the NAT gateway is used for outbound traffic only."]],
 ["S3 gateway endpoints are free and route S3 traffic privately, avoiding NAT gateway per-GB processing charges.", ["NAT works but adds data processing costs.", null, "Public IPs expose instances and still cost money.", "A VPN is for on-premises connectivity."]],
 ["NAT gateways are AZ-scoped. One per AZ (each private subnet routing to its local NAT) avoids a single-AZ failure and cross-AZ data charges.", ["One per VPC is a single point of failure.", null, "One per instance is wasteful and unnecessary.", "Private instances that need outbound access need NAT."]]
],
"security-groups": [
 ["Security groups only have allow rules; anything not allowed is denied. Use NACLs (or AWS Network Firewall) when you need explicit deny rules.", ["SGs can't express deny rules.", null, "Outbound rules are also allow-only.", "IPv6 rules are allow-only too."]],
 ["SGs are stateful: once inbound 443 is allowed, the reply traffic for that connection is automatically allowed out, whatever the outbound rules say.", ["Stateful tracking allows replies.", null, "NACLs are separate and not required for this.", "UDP flows are tracked statefully too."]],
 ["Referencing the app tier's security group lets any instance in that group reach the DB, even as instances scale and change IPs, and nothing else.", ["0.0.0.0/0 exposes the DB to everything.", "The whole VPC CIDR is broader than needed.", null, "The DB's own IP isn't a source."]],
 ["SSH (22) open to 0.0.0.0/0 invites constant brute-force attempts. Use Session Manager or restrict to known IPs.", ["443 on a public load balancer is expected.", null, "DB from the app SG is correct design.", "Allowing all outbound is the default and common."]]
],
"nacls": [
 ["NACL rules are evaluated in ascending number order and the first match wins. Rule 90 (deny all) matches first, so 443 is denied.", ["Rule 100 is never reached because 90 matches first.", null, "The NACL blocks the packet before any security group sees it.", "Replies are blocked by the same rule."]],
 ["NACLs are stateless, so replies to clients go out to their random ephemeral ports (1024-65535) and need an explicit outbound rule.", ["SSH uses port 22 inbound, not the ephemeral range.", null, "DNS replies are one case, but web replies need it too.", "Without it, replies are dropped."]],
 ["A NACL deny rule can block a specific CIDR at the subnet edge. Security groups can't deny.", ["SGs have allow rules only.", null, "Route tables direct traffic; they don't filter it.", "An IGW doesn't filter traffic."]],
 ["NACLs filter traffic entering and leaving the subnet. Traffic between instances in the same subnet never crosses that boundary (security groups still apply).", ["Same-subnet traffic doesn't cross the NACL.", null, "Protocol doesn't matter.", "SG differences don't change NACL behavior."]]
],
"three-tier": [
 ["Only the load balancer tier sits in public subnets; app servers and databases stay private and accept traffic only from the tier in front of them.", ["Databases should never be internet-facing.", "App servers stay private behind the LB.", null, "Exposing every tier defeats the design."]],
 ["The DB should accept 5432 only from the app tier's security group, the one tier that legitimately needs it.", ["0.0.0.0/0 exposes the DB.", "The LB never talks to the DB directly.", null, "The VPC CIDR is broader than needed."]],
 ["Negative tests prove there's no shortcut from the LB tier to the DB, which shows least privilege actually holds.", ["Cost isn't the reason.", null, "AWS doesn't require it; it's good practice.", "DNS is unrelated."]],
 ["VPC Reachability Analyzer analyzes routes, SGs and NACLs to show whether a path exists (and which hop blocks it), without sending real packets.", ["CloudFormation builds resources; it doesn't test paths.", null, "Route 53 is DNS.", "Inspector does have network reachability findings, but path analysis is Reachability Analyzer."]]
],
"endpoints": [
 ["Gateway endpoints exist only for S3 and DynamoDB; they're route table targets and free. Other services use interface endpoints (PrivateLink).", ["Most services use interface endpoints.", null, "EC2 and RDS APIs use interface endpoints.", "Lambda uses an interface endpoint."]],
 ["Interface endpoints are ENIs with private IPs in your subnets, powered by PrivateLink; DNS resolves the service name to those IPs.", ["Routes are how gateway endpoints work.", null, "IGWs give internet access, not private service access.", "NAT translates addresses for internet access."]],
 ["aws:SourceVpce matches the VPC endpoint ID the request came through, so a bucket policy can deny anything not arriving via your endpoint.", ["Private traffic via endpoints doesn't carry your public IP.", null, "RequestedRegion restricts Regions.", "MFA is unrelated to network paths."]],
 ["Traffic to S3 through a gateway endpoint bypasses the NAT gateway, so you avoid its per-GB data processing charge, and the endpoint itself is free.", ["Endpoints don't change compute speed.", null, "EC2 is still billed.", "S3 storage is still billed."]]
],
"connectivity": [
 ["VPC peering is not transitive: traffic can't go A to B to C. Peer A with C directly or use a Transit Gateway hub.", ["Peering doesn't pass traffic through.", null, "IGWs don't route between VPCs.", "Protocol isn't the issue."]],
 ["Transit Gateway is a regional hub-and-spoke router; 50 VPCs need 50 attachments instead of 1,225 peering connections.", ["Full mesh peering grows as n(n-1)/2 connections.", null, "NAT gives outbound internet access.", "IGWs connect to the internet."]],
 ["Site-to-Site VPN builds IPsec tunnels over the internet and can be up in minutes. Direct Connect takes weeks to provision.", ["Direct Connect needs a physical circuit.", null, "Peering connects VPCs, not offices.", "CloudFront is a CDN."]],
 ["Direct Connect is a dedicated physical connection to AWS with consistent latency and bandwidth that doesn't traverse the public internet.", ["VPN rides the internet, so performance varies.", null, "The public internet is variable.", "NAT is for outbound internet access."]]
],
"dns": [
 ["The Amazon-provided DNS resolver lives at the VPC base address plus two: 10.0.0.2 for 10.0.0.0/16 (169.254.169.253 also works).", ["Base + 1 is the VPC router.", null, "8.8.8.8 is Google public DNS.", "That's the broadcast-style last address, reserved."]],
 ["Private hosted zones in Route 53 answer only for the VPCs they're associated with, which is perfect for internal names like db.internal.", ["Public zones answer the whole internet.", null, "Alias is a record type, not visibility.", "Health checks monitor endpoints."]],
 ["The zone apex can't be a CNAME. Route 53 Alias A records point the apex at AWS resources like ALBs and CloudFront, and Alias queries are free.", ["DNS rules forbid CNAME at the apex.", null, "MX is for mail servers.", "TXT holds text such as verification records."]],
 ["Latency-based routing answers with the Region that gives each user the lowest measured latency.", ["Weighted splits traffic by percentages.", null, "Simple returns fixed values.", "Multivalue returns several healthy records at random."]]
],
"flow-logs": [
 ["Flow logs record the IANA protocol number: 6 = TCP, 17 = UDP, 1 = ICMP.", ["UDP is 17.", null, "ICMP is 1.", "HTTP is an application protocol running over TCP."]],
 ["Stateful security groups always allow replies to allowed requests. A rejected reply points to a stateless NACL missing the outbound ephemeral port rule.", ["SGs track connections and allow replies.", null, "DNS isn't involved after connection setup.", "IAM doesn't filter network packets."]],
 ["Flow logs record rejected traffic too, so no record at all means the packets never reached that interface: wrong IP, DNS, route or a different ENI.", ["An SG block would appear as REJECT.", null, "An allowed packet would appear as ACCEPT.", "Missing records mean the traffic went somewhere else."]],
 ["Start by confirming DNS resolves to the IP you expect; otherwise you debug the wrong path. Then check routes, NACLs, SGs and finally the app.", ["Rebooting hides the cause.", null, "Deleting SGs creates new problems.", "Opening all ports is unsafe and hides the real issue."]]
]
};

/* merge into the lessons (loaded after lessons, before app.js) */
(function (E) { (window.LESSONS || []).forEach(l => { const x = E[l.id]; if (!x || !l.quiz) return; x.forEach((e, i) => { const q = l.quiz[i]; if (!q || !e) return; if (e[0]) q.why = e[0]; if (e[1]) q.w = e[1]; }); }); })(window.EXPLAIN || {});

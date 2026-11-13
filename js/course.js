window.COURSE = {
 "short": "VPC",
 "key": "vpc-explorer-v1",
 "prompt": "$",
 "termTitle": "aws cli",
 "where": "CLI",
 "lab": "vpc",
 "handsOn": "Packet Tracer challenge",
 "errRe": "timed out|error occurred|REJECT|DROPPED|Error:",
 "cats": [
  [
   "all",
   "ALL"
  ],
  [
   "core",
   "BASICS"
  ],
  [
   "route",
   "ROUTING"
  ],
  [
   "fw",
   "FIREWALLS"
  ],
  [
   "conn",
   "CONNECTIVITY"
  ],
  [
   "ops",
   "DNS & OPS"
  ]
 ],
 "catTitle": {
  "core": "VPC BASICS",
  "route": "ROUTING & GATEWAYS",
  "fw": "FIREWALLS & DESIGN",
  "conn": "CONNECTIVITY",
  "ops": "DNS & TROUBLESHOOTING"
 },
 "kinds": {
  "vpc": [
   "VPC",
   "#1d5bd8"
  ],
  "route": [
   "ROUTE",
   "#7c3aed"
  ],
  "sg": [
   "SECURITY GROUP",
   "#16a34a"
  ],
  "nacl": [
   "NACL",
   "#f59e0b"
  ],
  "dns": [
   "DNS",
   "#0891b2"
  ],
  "net": [
   "NETWORK TEST",
   "#0d9488"
  ],
  "pol": [
   "POLICY",
   "#db2777"
  ],
  "err": [
   "FAILURE",
   "#e11d48"
  ]
 },
 "layers": [
  "ADDRESSING",
  "ROUTING",
  "FIREWALLS",
  "CONNECTIVITY",
  "DNS",
  "OBSERVABILITY"
 ],
 "levels": [
  [
   0,
   "PACKET PUSHER"
  ],
  [
   150,
   "SUBNET SLICER"
  ],
  [
   400,
   "ROUTE READER"
  ],
  [
   800,
   "FIREWALL TAMER"
  ],
  [
   1300,
   "VPC DESIGNER"
  ],
  [
   2000,
   "NETWORK DETECTIVE"
  ],
  [
   2900,
   "CLOUD NETWORK ARCHITECT"
  ]
 ]
};
COURSE.errRe = new RegExp(COURSE.errRe, "i");

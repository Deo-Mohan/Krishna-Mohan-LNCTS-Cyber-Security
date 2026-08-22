# Threat Model: STRIDE Analysis & Lateral Movement Scenarios

## 1. STRIDE Analysis
This section analyzes threats across our environment using the STRIDE methodology.

| Threat Category | Threat Description | Affected Asset | Mitigation Strategy |
|---|---|---|---|
| **Spoofing (S)** | Attacker spoofs identity to access the Faculty Portal or Examination System. | Faculty Portal, Exam System | Enforce Multi-Factor Authentication (MFA) and Identity-Aware Proxy (ZTNA) validations. |
| **Tampering (T)** | Attacker tampers with exam questions in transit or grades in the database. | Examination System & DB | Network policies blocking direct DB access; TLS 1.3 for all connections; cryptographic signatures on grades. |
| **Repudiation (R)** | Attacker modifies data or accesses resources, and claims they did not. | System Logs | Centralized immutable audit logs sent to the SIEM via encrypted TLS Syslog stream. |
| **Information Disclosure (I)** | Unauthenticated user reads student PII or exam questions. | Student DB, Exam DB | Strict data-at-rest encryption, TLS-only endpoints, and micro-segmentation blocking direct DB queries. |
| **Denial of Service (D)** | Attacker floods the public-facing portals or internal APIs. | Public Portals, VPN | Rate limiting on ZTNA Gateway, Auto-scaling container pods, and redundant VPN links. |
| **Elevation of Privilege (E)** | Attacker compromises a web app (e.g. Research) and attempts to gain root access to the K8s node/control plane. | K8s Control Plane, Host Node | Run containers as non-root, restrict service accounts, block access to the Kube-API from workloads. |

---

## 2. Attack Simulation Scenario A: Compromised Research Workload
The Research Application is our highest-exposure entry point. The attacker obtains remote code execution (RCE) on the pod.

### Attack Path Analysis (Without Zero-Trust)
In a legacy perimeter network, the attacker could scan and compromise the student database, on-premises Faculty VM, or query the cloud metadata service to steal credentials.

### Zero-Trust Containment (Remediated CRIT-01)
- **Local Network Isolation**: The CNI drops any direct packet sent from the Research pod to other namespaces (`student-portal`, `kube-system`) or to on-premises subnets (`10.200.0.0/16`).
- **DNS Exfiltration Prevention**: The Research pod cannot send DNS queries to external resolvers (e.g., 8.8.8.8) to exfiltrate data via DNS Tunneling. Egress is strictly whitelisted to CoreDNS (`10.96.0.10:53`) in `kube-system`. Any external resolution queries are dropped, and CoreDNS queries are logged to detect subdomain encoding.
- **Control Plane Isolation**: ServiceAccount token auto-mounting is disabled. The pod cannot request permissions or read API server secrets. Egress to the API server IP (`10.96.0.1`) is blocked by NetworkPolicy.
- **Metadata Protection**: Egress to `169.254.169.254` is blocked at the NetworkPolicy/CNI layer, stopping cloud metadata and token theft.

---

## 3. Attack Simulation Scenario B: Compromised ZTNA Gateway (Remediated CRIT-04)
If an attacker compromises a ZTNA Gateway (e.g., the Cloud ZTNA Gateway at `10.100.1.10`), they can attempt to pivot to other apps, databases, or environments.

### Containment Model for ZTNA Compromise
1. **Pivoting to On-Premises VM**: 
   - *Target*: Examination System VM (`10.200.20.10`).
   - *Result*: **DENIED**. The Cloud ZTNA Gateway is logically isolated and resides in the Cloud VPC. The Cloud VPN Gateway configuration and IPSec tunnel routes block any traffic from `10.100.1.10` targeting on-premises IPs. Only the On-Premises ZTNA Gateway (`10.200.10.10`) can traverse the tunnel to the workload subnet.
2. **Accessing the Kubernetes API Control Plane**:
   - *Target*: Kube-API Server (`10.96.0.1`).
   - *Result*: **DENIED**. The Cloud DMZ Subnet Security Group and Kubernetes Ingress rules prohibit the gateway from sending TCP traffic to port 6443 of the master nodes.
3. **Querying Databases Directly**:
   - *Target*: Student DB Pod (`5432`) or Research DB Pod (`5432`).
   - *Result*: **DENIED**. NetworkPolicies on the database pods only accept ingress packets originating from their respective application pods (e.g., Student Portal Pod or Research App Pod). The ZTNA Gateway cannot route packets directly to the database pods.
4. **Accessing Management VPC**:
   - *Target*: SIEM Syslog receiver (`172.16.1.100`).
   - *Result*: **DENIED**. The gateway has no egress permission to the Management subnet except to ship its own logs on port 514. Any port scan or attempt to access management consoles is dropped.

---

## 4. Lateral Movement & Compromise Matrix
The table below traces the containment success for both scenarios:

| Source (Compromised Node) | Target Destination | Protocol/Port | Action | Enforcement Control |
|---|---|---|---|---|
| **Research Pod** | Research DB | PostgreSQL / 5432 | **ALLOW** | Approved workload database path. |
| **Research Pod** | Student Portal Pod | HTTP / 8080 | **DENY** | Namespace isolation & NetworkPolicy egress drop. |
| **Research Pod** | Student DB Pod | PostgreSQL / 5432 | **DENY** | Egress NetworkPolicy drop at Research Pod. |
| **Research Pod** | Faculty Portal VM | HTTP / 8080 | **DENY** | Egress NetworkPolicy & Cloud Security Group block. |
| **Research Pod** | Examination VM | HTTPS / 8443 | **DENY** | Egress NetworkPolicy & Cloud Security Group block. |
| **Research Pod** | Examination DB VM | SQL / 1521 | **DENY** | Egress NetworkPolicy & Cloud Security Group block. |
| **Research Pod** | Kubernetes API | HTTPS / 6443 | **DENY** | Egress NetworkPolicy blocks IP `10.96.0.1`. |
| **Research Pod** | Management / SIEM | Syslog / 514 | **ALLOW** | Approved outbound telemetry path. |
| **Research Pod** | External Internet | DNS / 53 (External) | **DENY** | Egress NetworkPolicy restricts DNS to CoreDNS only. |
| **Cloud ZTNA Gateway** | Student Portal Pod | HTTP / 8080 | **ALLOW** | Approved proxy routing. |
| **Cloud ZTNA Gateway** | Research App Pod | HTTP / 8080 | **ALLOW** | Approved proxy routing. |
| **Cloud ZTNA Gateway** | Student DB Pod | PostgreSQL / 5432 | **DENY** | NetworkPolicies on DB pod drop ZTNA source IP. |
| **Cloud ZTNA Gateway** | Faculty Portal VM | HTTP / 8080 | **DENY** | VPN routing rules block Cloud DMZ to On-Prem VMs. |
| **Cloud ZTNA Gateway** | Examination VM | HTTPS / 8443 | **DENY** | VPN routing rules block Cloud DMZ to On-Prem VMs. |
| **Cloud ZTNA Gateway** | Kubernetes API | HTTPS / 6443 | **DENY** | VPC Security Groups block access to control plane. |
| **Cloud ZTNA Gateway** | Central SIEM | Syslog / 514 | **ALLOW** | Outbound log forwarding allowed. |
| **Cloud ZTNA Gateway** | Management VPC | HTTP / 80 | **DENY** | Security Group egress filter drops management CIDR. |

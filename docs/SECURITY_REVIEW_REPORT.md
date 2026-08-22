# Security Review Report

**Reviewer**: Senior Cloud Security Architect  
**Date**: 2026-08-22  
**Subject**: Zero-Trust Hybrid Datacenter/Cloud Architecture — Pre-Implementation Security Review  
**Verdict**: ⚠️ **CONDITIONAL APPROVAL** — Approve after the 14 findings below are resolved in the documents.

---

## 0. Review Methodology

Every document was read line-by-line. Each claim of "DENY" or "ALLOW" was traced through the architecture diagram, the communication matrix, the YAML NetworkPolicy snippets, the IAM role table, and the simulation engine rules to determine whether the architecture **actually enforces** what it claims. Aspirational statements that lack a concrete enforcement mechanism are flagged.

---

## 1. Critical Security Flaws

### CRIT-01 — DNS Egress Is Unrestricted (Covert Channel)

**Location**: [COMMUNICATION_MATRIX.md](COMMUNICATION_MATRIX.md) lines 6–22, [ARCHITECTURE.md](ARCHITECTURE.md) line 80.

The default-deny NetworkPolicy blocks all egress except `research-db:5432` and `siem:514`. However, the YAML policy contains **no allowance for DNS resolution (UDP/TCP 53 to `kube-dns`)**. This means either:

1. The Research App pod cannot resolve *any* hostname (including `research-db`), making the application non-functional, **or**
2. DNS is implicitly allowed but not documented, which creates a **covert exfiltration channel** via DNS tunneling (e.g., `iodine`, `dnscat2`).

Real Kubernetes CNI implementations (Calico, Cilium) will drop DNS traffic if egress is default-deny and no DNS rule exists. The architecture must explicitly address DNS.

**Fix**: Add a DNS egress rule to `kube-system` namespace `kube-dns` service on port 53 (UDP+TCP). Then document DNS tunneling as a residual risk in THREAT_MODEL.md and state that DNS query logging at the cluster level is required to detect exfiltration attempts.

---

### CRIT-02 — No Ingress Policy Defined for Backend Pods

**Location**: [COMMUNICATION_MATRIX.md](COMMUNICATION_MATRIX.md) lines 9, 12.

The matrix states the ZTNA Gateway can reach Student Portal and Research App pods on port 8080. The default-deny policy blocks **all ingress**. But there is no corresponding **ingress-allow NetworkPolicy YAML** permitting traffic from the ZTNA Gateway IP (`10.100.1.10`) into the `student-portal` or `research-app` namespaces.

Without an explicit ingress-allow rule, the ZTNA Gateway's proxied traffic will also be dropped by the CNI. The architecture is self-contradictory: the matrix says ALLOW but the only YAML shown is deny-all + egress-only.

**Fix**: Add ingress NetworkPolicy YAML for each namespace allowing traffic from the ZTNA Gateway's CIDR (`10.100.1.0/24`) on the application port (8080). Include this in COMMUNICATION_MATRIX.md alongside the existing egress YAML.

---

### CRIT-03 — On-Premises Firewall Enforcement Is Unspecified

**Location**: [ARCHITECTURE.md](ARCHITECTURE.md) line 69, [COMMUNICATION_MATRIX.md](COMMUNICATION_MATRIX.md) lines 10–11.

On-premises enforcement is described as "local software firewalls (simulating iptables/Windows Firewall)". However:

- There is no equivalent of the Kubernetes NetworkPolicy YAML for the on-prem segment.
- There are no iptables rule snippets or Windows Firewall rule declarations.
- The architecture does not specify which interface the rules bind to, what the default chain policy is (`INPUT DROP`? `FORWARD DROP`?), or how inter-VM traffic within the `10.200.0.0/16` subnet is filtered.

The Examination VM (`10.200.1.10`) and Faculty VM (`10.200.1.20`) sit on the **same `/16` subnet**. Without explicit host-firewall rules, the Faculty VM can directly reach the Examination DB (`10.200.2.10`) — violating least privilege.

**Fix**: 
1. Segment the on-prem network into distinct subnets (e.g., `10.200.1.0/28` for Exam, `10.200.2.0/28` for Faculty) with a router/firewall between them.
2. Document iptables-equivalent rules showing `INPUT -j DROP` default with explicit accept rules only for the designated database port.

---

### CRIT-04 — ZTNA Gateway Is a Single Point of Compromise

**Location**: [ARCHITECTURE.md](ARCHITECTURE.md) lines 46–50, [SECURITY_MODEL.md](SECURITY_MODEL.md) lines 31–49.

The ZTNA Gateway at `10.100.1.10` is the **sole** ingress point for ALL four applications (Student, Faculty, Exam, Research). It sits in the public subnet and accepts traffic from the entire internet on port 443. If this host is compromised (e.g., a vulnerability in the reverse proxy software), the attacker gains:

- Direct network paths to **every** backend application and VM.
- Effectively becomes a trusted source IP that passes through all firewall rules.
- Ability to bypass MFA entirely since the proxy terminates the session.

The architecture treats the ZTNA Gateway as inherently trusted, which is a contradiction of the "Assume Breach" tenet of Zero Trust.

**Fix**: 
1. Acknowledge this as a residual risk in THREAT_MODEL.md.
2. Apply defense-in-depth: backend pods should also validate JWT/session tokens independently, not blindly trust traffic from the Gateway IP.
3. Consider separate ZTNA gateway instances per application zone (one for cloud workloads, one for on-prem) to reduce blast radius.

---

## 2. Architecture Weaknesses

### WEAK-01 — Flat On-Premises Subnet (`10.200.0.0/16`)

The entire on-premises datacenter is modeled as a single `/16` network. The Examination System, Faculty Portal, and their databases all share this address space. Even with host-firewalls, a single broadcast domain of 65,534 hosts provides excessive attack surface for ARP spoofing, broadcast storms, and VLAN-hopping if the underlying switch is misconfigured.

**Fix**: Split into distinct VLANs/subnets:
- `10.200.1.0/28` — Examination Application Tier
- `10.200.2.0/28` — Examination Database Tier
- `10.200.3.0/28` — Faculty Application Tier
- `10.200.4.0/28` — Faculty Database Tier
- `10.200.254.0/28` — VPN Gateway DMZ

---

### WEAK-02 — No Mutual TLS (mTLS) Between Services

**Location**: [SECURITY_MODEL.md](SECURITY_MODEL.md), [COMMUNICATION_MATRIX.md](COMMUNICATION_MATRIX.md).

NetworkPolicies operate at L3/L4 (IP and port). They cannot verify the *identity* of the caller — only its source IP. If an attacker obtains code execution on the same node or manages to spoof the source IP within the pod network, the NetworkPolicy would allow the traffic.

True Zero-Trust demands cryptographic identity verification at the application layer (mTLS or signed JWTs between services).

**Fix**: Document a service mesh concept (e.g., simulated Istio/Linkerd sidecar) or application-level token validation as an additional defense layer. Even if simulated, this should be part of the model.

---

### WEAK-03 — SIEM Log Integrity Is Not Guaranteed

**Location**: [THREAT_MODEL.md](THREAT_MODEL.md) line 10.

The STRIDE table states "centralized immutable audit logs" but nothing in the architecture enforces immutability. If the SIEM server at `172.16.1.100` is compromised, or if an attacker with node access can send crafted syslog packets, the audit trail is destroyed.

**Fix**: Document log integrity mechanisms:
1. Write-once storage or append-only log streams.
2. Cryptographic log chaining (hash chain) so tampering is detectable.
3. Restrict SIEM ingress to only the known source IPs of the applications.

---

### WEAK-04 — No Egress Filtering to the Internet

**Location**: [COMMUNICATION_MATRIX.md](COMMUNICATION_MATRIX.md).

The matrix defines egress from the Research Pod to internal targets but does not explicitly address egress to the **public internet** (`0.0.0.0/0`). If the default-deny egress policy is properly enforced, internet access is blocked — but this should be stated explicitly because:

1. Many Kubernetes deployments have NAT gateways that allow outbound internet by default.
2. Data exfiltration to an external C2 server is one of the highest-impact post-compromise actions.

**Fix**: Add an explicit row: `Research App Pod → Internet (0.0.0.0/0) → ANY → DENY → Prevent data exfiltration to external C2`.

---

## 3. Missing Components

| ID | Missing Component | Impact | Recommendation |
|---|---|---|---|
| **MISS-01** | **DNS Policy** | Pods cannot resolve hostnames or DNS becomes a covert channel. | See CRIT-01. |
| **MISS-02** | **Ingress NetworkPolicy YAML** | ZTNA traffic to pods is actually blocked by the architecture's own deny-all. | See CRIT-02. |
| **MISS-03** | **Network segmentation detail for on-prem** | On-prem apps share a flat network; lateral movement is trivial between Exam and Faculty VMs. | See CRIT-03 / WEAK-01. |
| **MISS-04** | **Database authentication model** | SECURITY_MODEL.md mentions "dynamic secrets" but does not explain who issues them, how they rotate, or what happens when a pod restarts. | Add a section on database credential lifecycle (e.g., simulated Vault-style secret injection). |
| **MISS-05** | **Incident response procedure** | The SIEM generates alerts but there is no documented response: who receives them, what action is taken, is the compromised pod auto-quarantined? | Add an incident response workflow (even if simulated). |
| **MISS-06** | **Cloud metadata endpoint blocking** | THREAT_MODEL.md mentions `169.254.169.254` blocking but no enforcement mechanism is defined (no NetworkPolicy or iptables rule). | Add explicit egress deny rule to `169.254.169.254/32` in the NetworkPolicy YAML. |

---

## 4. Unnecessary Components

| ID | Component | Concern | Recommendation |
|---|---|---|---|
| **UNNEC-01** | Oracle/SQL on port 1521 for Examination DB | Using Oracle DB adds complexity with no security value. A uniform PostgreSQL or MySQL stack simplifies the simulation without losing any zero-trust demonstration value. | Standardize all databases to PostgreSQL to reduce surface area in the simulation. |
| **UNNEC-02** | "Hardware MFA token" for Examiner role | Simulating hardware tokens adds UI complexity with minimal security-demonstration value over TOTP-based MFA. | Use TOTP-based MFA simulation uniformly; note in DECISIONS.md that hardware tokens are a production upgrade. |

---

## 5. Components That Are Unrealistic for a Student Project

| Component | Why Unrealistic | Recommendation |
|---|---|---|
| Live IPSec IKEv2 VPN with AES-256 | Requires two physical/virtual routers, certificate authorities, and complex key management. | ✅ Already marked as simulated — correct decision. |
| Full Calico/Cilium CNI with real NetworkPolicy enforcement | Requires a running multi-node Kubernetes cluster with a CNI plugin. | ✅ Already marked as simulated — correct decision. |
| Production SIEM (Splunk/Elastic SIEM) | Requires significant infrastructure and licensing. | ✅ Already planned as a simulated log viewer — correct decision. |
| Device posture checks (OS patch level, certificate validation) | Requires endpoint management agents (e.g., CrowdStrike, Jamf). | Mark explicitly as "SIMULATED — production would use EDR/MDM integration". |

---

## 6. Components That Should Be Simulated

All infrastructure components are already planned as simulated (per DECISIONS.md). This is the correct approach. The following should be **clearly labeled** in the UI:

| Component | Simulation Label |
|---|---|
| IPSec VPN Tunnel | `[SIMULATED] IPSec IKEv2 — Modeled as route policy engine` |
| Kubernetes CNI / NetworkPolicy | `[SIMULATED] Calico CNI — Modeled as packet-filter state machine` |
| ZTNA Gateway | `[SIMULATED] Identity-Aware Proxy — Modeled as auth+route middleware` |
| SIEM/Syslog Collector | `[SIMULATED] SOC Log Aggregator — Modeled as in-memory event stream` |
| Cloud VPC / Security Groups | `[SIMULATED] AWS/GCP VPC — Modeled as subnet + ACL rule engine` |
| Host iptables (On-Prem) | `[SIMULATED] Linux iptables — Modeled as per-host packet filter` |

---

## 7. Lateral Movement Path Analysis (Compromised Research Pod)

This is the core security validation. For each path, I evaluate whether the architecture **actually enforces** the intended policy.

### PATH 1: Research App → Research DB

| Attribute | Value |
|---|---|
| **Verdict** | ✅ **ALLOW** |
| **Source** | Research App Pod (`research-app` namespace) |
| **Destination** | Research DB Pod (`research-app` namespace, port 5432) |
| **Enforcement** | K8s egress NetworkPolicy `research-app-egress` explicitly allows `podSelector: app=research-database` on TCP/5432. |
| **Analysis** | This is a legitimate business flow. The policy is correctly scoped to a single pod label and single port. **SOUND.** |

---

### PATH 2: Research App → Student Portal Pod

| Attribute | Value |
|---|---|
| **Verdict** | ✅ **DENY** (with caveat) |
| **Source** | Research App Pod |
| **Destination** | Student Portal Pod (`student-portal` namespace, any port) |
| **Enforcement** | Egress from `research-app` namespace only allows `research-db:5432` and `siem:514`. The Student Portal is in a different namespace and is not listed. The default-deny drops the packet. |
| **Caveat** | The enforcement depends entirely on the CNI plugin actually supporting cross-namespace egress filtering. Standard `networking.k8s.io/v1` NetworkPolicies with `podSelector` **only match pods in the same namespace** unless `namespaceSelector` is used. Since the student pod is in a *different* namespace and the egress rule only allows pods matching `app: research-database` *in the same namespace*, this traffic is correctly denied. **SOUND**, but document the namespace-scoping behavior explicitly. |

---

### PATH 3: Research App → Faculty Portal VM

| Attribute | Value |
|---|---|
| **Verdict** | ⚠️ **DENY — ENFORCEMENT UNCERTAIN** |
| **Source** | Research App Pod |
| **Destination** | Faculty Portal VM (`10.200.1.20`, on-prem, port 8080) |
| **Enforcement Chain** | 1) K8s egress NetworkPolicy blocks all egress except `research-db` and `siem`. ✅ Blocks at CNI. 2) Cloud Security Group should block egress to `10.200.0.0/16`. Not documented. 3) VPN Gateway ACL should restrict which cloud CIDRs can transit the tunnel. Not documented. 4) On-Prem host firewall should block traffic from cloud pod CIDR. Not documented. |
| **Analysis** | The K8s NetworkPolicy alone is sufficient to block this at Layer 1 of defense. However, defense-in-depth demands that the VPN and on-prem firewall ALSO block this independently. If the CNI fails or is misconfigured, there is no secondary enforcement documented. |
| **Fix** | Document the VPN ACL and on-prem firewall rules as independent enforcement layers. |

---

### PATH 4: Research App → Examination System VM

| Attribute | Value |
|---|---|
| **Verdict** | ⚠️ **DENY — ENFORCEMENT UNCERTAIN** |
| **Source** | Research App Pod |
| **Destination** | Examination System VM (`10.200.1.10`, on-prem, port 8443) |
| **Enforcement** | Same chain as PATH 3. K8s egress deny is the only concrete enforcement documented. |
| **Analysis** | Same finding as PATH 3. The exam system is the highest-sensitivity asset. It warrants the strongest defense-in-depth, yet it relies on a single enforcement point. |
| **Fix** | Same as PATH 3. Add VPN + on-prem firewall rules. Additionally, the Examination VM should have an application-layer authentication gate that rejects connections not originating from the ZTNA Gateway's session proxy. |

---

### PATH 5: Research App → Student DB Pod

| Attribute | Value |
|---|---|
| **Verdict** | ✅ **DENY** |
| **Source** | Research App Pod |
| **Destination** | Student DB Pod (`student-portal` namespace, port 5432) |
| **Enforcement** | 1) Egress NetworkPolicy on `research-app` namespace — only allows `research-db` pod (same namespace). ✅ 2) Ingress NetworkPolicy on `student-portal` namespace — default-deny blocks all ingress (no rule admits traffic from `research-app`). ✅ Double enforcement. |
| **Analysis** | **SOUND.** Two independent policies must both fail for this path to open. |

---

### PATH 6: Research App → Examination DB VM

| Attribute | Value |
|---|---|
| **Verdict** | ⚠️ **DENY — ENFORCEMENT UNCERTAIN** |
| **Source** | Research App Pod |
| **Destination** | Examination DB VM (`10.200.2.10`, on-prem, port 1521) |
| **Enforcement** | K8s egress deny only. No documented VPN ACL or on-prem firewall rule. |
| **Analysis** | If the CNI is bypassed (e.g., pod uses `hostNetwork: true` due to misconfiguration), the traffic could reach the on-prem network. The Pod Security Standard forbids `hostNetwork`, but this is a policy — not a technical gate — in the simulation. |
| **Fix** | Document the VPN gateway ACL as a secondary enforcement. The VPN should only route traffic from the ZTNA Gateway IP, not from arbitrary pod CIDRs. |

---

### PATH 7: Research App → Kubernetes API Server

| Attribute | Value |
|---|---|
| **Verdict** | ✅ **DENY** (strong) |
| **Source** | Research App Pod |
| **Destination** | Kubernetes API Server (`10.96.0.1:6443` or cluster DNS `kubernetes.default.svc`) |
| **Enforcement** | 1) Egress NetworkPolicy does not whitelist `10.96.0.1`. ✅ 2) `automountServiceAccountToken: false` — no credential to authenticate even if network path existed. ✅ 3) RBAC — no ClusterRole or Role binding for the pod's ServiceAccount. ✅ Triple enforcement. |
| **Analysis** | **SOUND.** This is the best-defended path in the architecture. Three independent controls must all fail. |

---

### PATH 8: Research App → Management Network / SIEM

| Attribute | Value |
|---|---|
| **Verdict** | ⚠️ **PARTIALLY ALLOW — OVERPRIVILEGED** |
| **Source** | Research App Pod |
| **Destination** | SIEM at `172.16.1.100:514` |
| **Enforcement** | Egress NetworkPolicy explicitly allows `172.16.1.100/32:514`. |
| **Analysis** | The pod CAN reach the management network — specifically the SIEM on port 514. While necessary for logging, this opens a concern: if the SIEM has additional services running (SSH on 22, web UI on 443), the `/32` + port restriction blocks those. But if port 514 on the SIEM has a vulnerability, the attacker has a path into the management VPC. |
| **Residual Risk** | An attacker in the Research pod could attempt to exploit the SIEM's syslog listener by sending crafted log payloads. |
| **Fix** | Document this as an accepted residual risk. Note that the SIEM's syslog port should run a hardened, input-validated receiver. |

---

### PATH 9: Research App → Internet (Data Exfiltration)

| Attribute | Value |
|---|---|
| **Verdict** | ✅ **DENY** (implicit, but undocumented) |
| **Source** | Research App Pod |
| **Destination** | Any external IP (`0.0.0.0/0`) |
| **Enforcement** | Egress NetworkPolicy only allows two destinations. Everything else is dropped by default-deny. |
| **Analysis** | Correct, but not explicitly stated anywhere. See WEAK-04. |

---

## 8. Summary of All Recommended Fixes

| Priority | ID | Fix |
|---|---|---|
| 🔴 Critical | CRIT-01 | Add DNS egress rule to `kube-dns` (UDP+TCP 53). Document DNS tunneling as residual risk. |
| 🔴 Critical | CRIT-02 | Add ingress-allow NetworkPolicy YAML for ZTNA Gateway → application pods. |
| 🔴 Critical | CRIT-03 | Segment on-prem into distinct subnets with inter-subnet firewall rules. Document iptables equivalents. |
| 🔴 Critical | CRIT-04 | Acknowledge ZTNA Gateway as a high-value target. Add backend token validation. Consider split gateways. |
| 🟡 Medium | WEAK-01 | Split `10.200.0.0/16` into per-tier `/28` subnets with documented routing. |
| 🟡 Medium | WEAK-02 | Document mTLS or application-level token validation between services. |
| 🟡 Medium | WEAK-03 | Add log integrity mechanisms (hash chaining, write-once storage concept). |
| 🟡 Medium | WEAK-04 | Add explicit internet-egress DENY row to communication matrix. |
| 🟢 Low | MISS-04 | Document database credential lifecycle. |
| 🟢 Low | MISS-05 | Add incident response workflow. |
| 🟢 Low | MISS-06 | Add explicit `169.254.169.254/32` deny rule in NetworkPolicy YAML. |
| 🟢 Low | UNNEC-01 | Standardize all DBs to PostgreSQL. |
| 🟢 Low | UNNEC-02 | Use TOTP MFA uniformly; note hardware tokens as production upgrade. |
| 🟢 Low | PATH-3/4/6 | Document VPN ACL and on-prem firewall as defense-in-depth layers. |

---

## 9. Final Verdict

### ⚠️ CONDITIONAL APPROVAL

The architecture demonstrates **strong conceptual understanding** of Zero-Trust principles. The Kubernetes control plane protection (PATH 7) is genuinely well-designed with triple-layer enforcement. The default-deny NetworkPolicy model is correctly structured. The ZTNA access model correctly eliminates network-level user access.

However, I **cannot issue unconditional approval** because:

1. **The architecture breaks its own applications** — the default-deny egress policy blocks DNS, and no ingress policy exists for the ZTNA Gateway. As written, no application can actually function.
2. **On-premises security is a blank check** — a flat `/16` with "iptables" mentioned but no rules defined is not a security architecture; it is an aspiration.
3. **Defense-in-depth is single-layer for cross-premises paths** — the VPN tunnel and on-prem firewalls are not documented with enforceable rules, making the K8s NetworkPolicy the sole barrier between a compromised cloud pod and on-prem exam data.

**Action Required**: Resolve the four CRIT findings in the documents. Once resolved, the architecture will be **APPROVED** for implementation.

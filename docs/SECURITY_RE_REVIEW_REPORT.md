# Security Re-Review Report

**Reviewer**: Senior Cloud Security Architect  
**Date**: 2026-08-22  
**Subject**: Post-Remediation Focused Re-Review of Zero-Trust Architecture  
**Review Type**: Targeted re-review of CRIT-01 through CRIT-04 + full lateral-movement path validation  

---

## Part 1: Critical Finding Re-Evaluation

---

### CRIT-01 — DNS Egress

**Previous weakness**: Default-deny egress NetworkPolicy did not account for DNS. Either applications could not resolve hostnames (breaking functionality) or DNS was silently unrestricted (enabling DNS-tunneling exfiltration).

**Remediation applied**:
- Egress NetworkPolicy for `research-app` namespace now includes an explicit rule allowing UDP/TCP port 53 **only** to pods matching `k8s-app: kube-dns` in the `kube-system` namespace.
- On-premises workloads restricted to the internal resolver at `10.200.40.5` via firewall rule FW-08.
- CoreDNS query logging enabled and streamed to SIEM.
- Behavior under DNS outage documented: applications fail closed (cannot resolve, cannot start).
- External DNS resolvers (8.8.8.8, 1.1.1.1) explicitly blocked.

**Is the remediation sufficient?**

Yes. I traced the egress YAML in KUBERNETES_SECURITY.md (lines 72–84). The rule uses a combined `namespaceSelector` + `podSelector`, which is the correct Kubernetes syntax for cross-namespace targeting. The `namespaceSelector` matches `kubernetes.io/metadata.name: kube-system` (an immutable label set by Kubernetes itself — cannot be spoofed by creating a rogue namespace). The `podSelector` matches `k8s-app: kube-dns`. Both conditions are ANDed because they appear in the same `to:` entry. This is syntactically and semantically correct.

The on-premises side is covered by FW-08 (allow workload subnet → resolver on 53) combined with the FW-Default deny rule (blocks everything else including external DNS).

**Remaining risk**: CoreDNS forwards recursive queries upstream to public DNS. A compromised pod could encode data in subdomain queries (`exfil.attacker.com`). This is correctly identified as a residual risk and mitigated by SIEM anomaly detection. For a student lab project, this is an **accepted** residual risk. Deploying an internal-only DNS zone without upstream forwarding would eliminate this but is overengineering for this scope.

**Verdict**: ✅ **PASS**

---

### CRIT-02 — ZTNA Gateway Ingress NetworkPolicy

**Previous weakness**: Default-deny ingress blocked the ZTNA Gateway's own proxied traffic from reaching backend application pods. The architecture contradicted itself — the matrix said ALLOW but no ingress rule existed.

**Remediation applied**:
- Explicit ingress NetworkPolicy added in KUBERNETES_SECURITY.md (lines 19–38) and COMMUNICATION_MATRIX.md (lines 49–69).
- Ingress is restricted to source IP `10.100.1.10/32` (Cloud ZTNA Gateway) on TCP port 8080 only.
- An identical policy is stated for `student-portal` namespace.
- ZTNA Gateway → Database pods: explicitly documented as DENY (no ingress rule admits gateway IP to DB pods).
- ZTNA Gateway → K8s API: explicitly documented as DENY.
- ZTNA Gateway → Management: explicitly documented as DENY.

**Is the remediation sufficient?**

Yes. I verified that the YAML uses `ipBlock: cidr: 10.100.1.10/32`, which is scoped to a single host. The port is locked to TCP/8080. The `podSelector` targets only `app: research-application`, not all pods in the namespace. This means the Research DB pod in the same namespace does NOT receive an ingress rule for the gateway — the gateway cannot reach the database even within the same namespace.

One subtlety worth noting: the ingress rule does not have a corresponding `from: namespaceSelector`, which means it relies entirely on IP matching. Since the ZTNA Gateway sits outside the cluster (in the Cloud Public Subnet, not in a Kubernetes namespace), IP-based matching via `ipBlock` is the correct and only option. This is sound.

**Remaining risk**: If the CNI plugin is misconfigured or does not support `ipBlock` rules (some older CNI plugins don't), the ingress restriction fails open. This is a deployment-level risk, not an architecture-level risk. For a simulated project, this is irrelevant. For production, CNI compatibility testing would be required.

**Verdict**: ✅ **PASS**

---

### CRIT-03 — Flat On-Premises /16 Network

**Previous weakness**: All on-prem assets (Exam VM, Faculty VM, Exam DB, Faculty DB) shared a flat `10.200.0.0/16` segment. The Faculty VM could directly reach the Examination DB. "iptables" was mentioned but never defined.

**Remediation applied**:
- Five distinct `/24` subnets created: DMZ (`10.200.10.0/24`), Workload (`10.200.20.0/24`), Database (`10.200.30.0/24`), Management (`10.200.40.0/24`), Security (`10.200.50.0/24`).
- Formal firewall ACL with 16 explicit rules + default-deny (ON_PREM_FIREWALL_POLICY.md).
- Host-level iptables script provided for the Examination DB VM with `INPUT DROP` default policy and explicit accept only from `10.200.20.10` on port 1521.
- Cross-subnet deny rules:
  - FW-09: ZTNA Gateway → Database Subnet = DENY.
  - FW-10: Faculty VM → Exam DB = DENY.
  - FW-12: Faculty VM → Management = DENY.
  - FW-16: Entire Cloud VPC → On-Prem DB Subnet = DENY.

**Is the remediation sufficient?**

Yes. Defense-in-depth is achieved:
- **Layer 1 (Network Firewall)**: Subnet-level ACL blocks cross-zone traffic by default.
- **Layer 2 (Host Firewall)**: iptables on the DB VM drops all input except from its designated application VM.

I traced the specific attack path: Faculty VM (`10.200.20.20`) → Examination DB (`10.200.30.10`). FW-10 explicitly denies this. Even if FW-10 is bypassed, the iptables on the Exam DB only admits traffic from `10.200.20.10` (Exam Portal VM), not `10.200.20.20` (Faculty VM). Two independent controls must both fail. This is sound.

**Remaining risk**: The Examination VM and Faculty VM share the same Workload Subnet (`10.200.20.0/24`). This means they can reach each other on the network layer. This is acceptable because application VMs do not contain sensitive data themselves (data lives in the Database Subnet). A compromised Faculty VM could attempt to attack the Exam VM's web service, but the Exam VM's web port only serves proxied ZTNA sessions with JWT validation, so raw network access does not equal application access.

For a student project, further segmenting into per-application subnets (one `/28` per app) would be overengineering.

**Verdict**: ✅ **PASS**

---

### CRIT-04 — ZTNA Gateway as Single Point of Compromise

**Previous weakness**: A single ZTNA Gateway served all four applications across both environments. Its compromise would expose every backend.

**Remediation applied**:
- Split into two isolated gateways:
  - Cloud ZTNA Gateway (`10.100.1.10`) — routes only to Student Portal and Research App (K8s pods).
  - On-Prem ZTNA Gateway (`10.200.10.10`) — routes only to Faculty Portal and Examination System (VMs).
- Backend JWT validation: applications verify signed tokens rather than trusting the gateway's IP.
- Gateway egress restrictions: no routes or ACL rules permit gateway → database, gateway → K8s API, or gateway → management.
- Logging: both gateways stream logs to the SIEM; anomaly detection is configured.

**Is the remediation sufficient?**

Yes. I traced the critical scenario: Cloud ZTNA Gateway is compromised. Can the attacker reach the Examination System?

1. The Exam VM is at `10.200.20.10` in the on-prem Workload Subnet.
2. The Cloud ZTNA Gateway is at `10.100.1.10` in the Cloud Public Subnet.
3. To reach `10.200.20.10`, traffic must traverse the VPN tunnel (Cloud VPN GW → On-Prem VPN GW).
4. Per ARCHITECTURE.md line 112: VPN routing restricts Cloud VPC traffic to syslog telemetry only. The Cloud ZTNA Gateway IP is not in the VPN route table for workload-bound traffic.
5. Per ON_PREM_FIREWALL_POLICY.md FW-02/FW-03: only the On-Prem ZTNA Gateway (`10.200.10.10`) is permitted to reach the Workload Subnet.
6. The Cloud Gateway IP (`10.100.1.10`) would be dropped by both the VPN route filter AND the on-prem firewall.

Three independent controls block this path. This is sound defense-in-depth.

**Remaining risk**: If the On-Prem ZTNA Gateway is compromised, it can reach both Faculty and Exam VMs on their web ports (FW-02, FW-03). This is an accepted residual risk documented in REMEDIATION_REPORT.md. The mitigation is JWT validation at the application layer — even with network access, the attacker cannot forge valid user sessions without the identity provider's signing key. For a student project, this level of defense is appropriate. Further mitigation (per-application on-prem gateways) would be overengineering.

**Verdict**: ✅ **PASS**

---

## Part 2: Lateral Movement Analysis — Scenario A (Compromised Research Pod)

For each path, I trace every enforcement layer and assess confidence.

| # | Path | Verdict | Controls (Defense-in-Depth) | Reason | Confidence |
|---|---|---|---|---|---|
| A1 | Research App → Research DB | **ALLOW** | Egress NetworkPolicy permits `app: research-database` on TCP/5432. | Legitimate application-to-database path. Single-namespace, label-scoped. | 🟢 High |
| A2 | Research App → Student App | **DENY** | **[1]** Egress NetworkPolicy on `research-app` — Student Pod not in whitelist. **[2]** Ingress NetworkPolicy on `student-portal` — Research Pod IP not in whitelist. | Double enforcement. Both the sender and receiver block this path independently. | 🟢 High |
| A3 | Research App → Student DB | **DENY** | **[1]** Egress NetworkPolicy — Student DB not in whitelist. **[2]** Ingress NetworkPolicy on Student DB — only Student App Pod is admitted. | Double enforcement. | 🟢 High |
| A4 | Research App → Faculty App | **DENY** | **[1]** Egress NetworkPolicy — on-prem IPs not in whitelist. **[2]** Cloud Security Group — blocks outbound to `10.200.0.0/16`. **[3]** VPN route filter — blocks pod CIDR from traversing tunnel to workload subnet. **[4]** On-Prem Firewall FW-Default — drops traffic not from ZTNA Gateway. | Quadruple enforcement. Strongest cross-environment path. | 🟢 Very High |
| A5 | Research App → Faculty DB | **DENY** | Same four layers as A4, plus **[5]** host-level iptables on Faculty DB (admits only `10.200.20.20`). | Five enforcement layers. | 🟢 Very High |
| A6 | Research App → Exam App | **DENY** | Same four layers as A4. | Quadruple enforcement. | 🟢 Very High |
| A7 | Research App → Exam DB | **DENY** | Same four layers as A4, plus **[5]** host-level iptables on Exam DB (admits only `10.200.20.10`). | Five enforcement layers. | 🟢 Very High |
| A8 | Research App → K8s API | **DENY** | **[1]** Egress NetworkPolicy — API IP `10.96.0.1` not in whitelist. **[2]** `automountServiceAccountToken: false` — no credential to authenticate. **[3]** RBAC — no Role/ClusterRole bound. | Triple enforcement. Even if network path opened, API returns 403. | 🟢 Very High |
| A9 | Research App → Management | **DENY** | **[1]** Egress NetworkPolicy — management CIDRs not in whitelist. **[2]** Cloud Security Group. | Double enforcement. | 🟢 High |
| A10 | Research App → SIEM (port 514) | **ALLOW** | Egress NetworkPolicy permits `172.16.1.100/32` on TCP/514 only. | Required for audit logging. Scoped to single IP and single port. Residual risk: syslog listener vulnerability. Accepted risk for student project. | 🟡 Medium (accepted) |
| A11 | Research App → Internet | **DENY** | **[1]** Egress NetworkPolicy — no `0.0.0.0/0` rule. Default-deny drops all non-whitelisted egress. **[2]** DNS restricted to CoreDNS (cannot resolve external C2 domains for direct connection). | Double enforcement. | 🟢 High |

**Scenario A Assessment**: All 10 DENY paths are enforced. The single ALLOW path to SIEM is correctly scoped. No single-control dependencies exist for any critical path. **PASS.**

---

## Part 3: Lateral Movement Analysis — Scenario B (Compromised Cloud ZTNA Gateway)

| # | Path | Verdict | Controls (Defense-in-Depth) | Reason | Confidence |
|---|---|---|---|---|---|
| B1 | Cloud ZTNA GW → Student App | **ALLOW** | Ingress NetworkPolicy admits `10.100.1.10/32` on TCP/8080. | This is the gateway's designed function. Attack surface: attacker can send arbitrary HTTP requests to Student App. **Mitigated by**: JWT token validation at the application layer — unsigned/invalid requests are rejected. | 🟡 Medium |
| B2 | Cloud ZTNA GW → Faculty App | **DENY** | **[1]** No VPN route from Cloud Public Subnet (`10.100.1.0/24`) to On-Prem Workload Subnet. **[2]** On-Prem Firewall: only On-Prem ZTNA Gateway (`10.200.10.10`) is admitted (FW-02). **[3]** Split-Gateway architecture: Cloud gateway has no configuration or credentials for on-prem targets. | Triple enforcement. Network path does not exist. | 🟢 Very High |
| B3 | Cloud ZTNA GW → Exam App | **DENY** | Same three layers as B2 (FW-03 admits only On-Prem ZTNA). | Triple enforcement. | 🟢 Very High |
| B4 | Cloud ZTNA GW → Research App | **ALLOW** | Ingress NetworkPolicy admits `10.100.1.10/32` on TCP/8080. | Same as B1. Designed function. Mitigated by JWT validation. | 🟡 Medium |
| B5 | Cloud ZTNA GW → Student DB | **DENY** | **[1]** No ingress NetworkPolicy on Student DB pod admits the ZTNA Gateway IP. Default-deny drops. **[2]** Student DB only admits `app: student-portal` pods via podSelector. | Double enforcement. Gateway IP is not a pod, so podSelector cannot match it. | 🟢 High |
| B6 | Cloud ZTNA GW → Research DB | **DENY** | **[1]** No ingress NetworkPolicy on Research DB pod admits the ZTNA Gateway IP. **[2]** Research DB only admits `app: research-application` pods. | Double enforcement. | 🟢 High |
| B7 | Cloud ZTNA GW → On-Prem DBs | **DENY** | **[1]** VPN route filter — Cloud DMZ not routed to on-prem. **[2]** On-Prem Firewall FW-09 (ZTNA → DB Subnet = DENY). **[3]** Host iptables (DB VMs only admit their designated app VM). | Triple enforcement. | 🟢 Very High |
| B8 | Cloud ZTNA GW → K8s API | **DENY** | **[1]** Cloud VPC Security Group — blocks DMZ subnet to control-plane ports. **[2]** K8s API server authentication — gateway has no kubeconfig or ServiceAccount token. | Double enforcement. | 🟢 High |
| B9 | Cloud ZTNA GW → Management VPC | **DENY** | **[1]** Cloud Security Group egress filter — Management CIDR (`172.16.0.0/16`) not in allowed egress (except SIEM on port 514). **[2]** Management VPC ingress Security Group — admits only syslog sources. | Double enforcement. Syslog port (514) is the only reachable service, which is the same accepted residual risk as A10. | 🟢 High |

**Scenario B Assessment**: The compromised Cloud ZTNA Gateway can reach Student App and Research App pods on port 8080. This is **by design** — it is the gateway's purpose. The critical defense here is JWT validation at the application layer: the gateway cannot forge signed tokens without the identity provider's private key. Even with raw HTTP access, the application will reject unsigned or expired sessions.

All non-designed paths (databases, on-prem, K8s API, management) have double or triple enforcement. **PASS.**

---

## Part 4: Complexity Assessment for Student Project

| Category | Component | Classification |
|---|---|---|
| **Required** | Default-deny NetworkPolicies (ingress + egress) | Core Zero-Trust demonstration |
| **Required** | DNS egress restriction to CoreDNS | Prevents trivial exfiltration bypass |
| **Required** | Split ZTNA gateways (cloud vs on-prem) | Core blast-radius reduction |
| **Required** | Subnet segmentation (5 on-prem zones) | Core network security fundamentals |
| **Required** | Host-level iptables on database VMs | Defense-in-depth demonstration |
| **Required** | SIEM log streaming and alert dashboard | Core monitoring requirement |
| **Recommended** | Application-level JWT validation (simulated) | Strengthens ZTNA compromise resilience |
| **Recommended** | CoreDNS query logging → SIEM | Detects DNS tunneling |
| **Recommended** | Explicit `169.254.169.254` deny rule | Cloud metadata theft prevention |
| **Overengineering** | Full mTLS service mesh (Istio/Linkerd) | Unnecessary for simulation |
| **Overengineering** | Hardware MFA token simulation | TOTP is sufficient |
| **Overengineering** | Per-application on-prem ZTNA gateways | Two gateways is sufficient |
| **Overengineering** | Write-once log storage / hash-chained logs | Beyond student project scope |
| **Overengineering** | Separate `/28` subnets per on-prem application | Five `/24` zones is sufficient |

---

## Part 5: Final Verdict

### ✅ APPROVED

**Justification:**

All four critical findings have been remediated with verifiable enforcement mechanisms:

| Finding | Status | Defense Layers |
|---|---|---|
| CRIT-01 (DNS Egress) | ✅ PASS | NetworkPolicy + CoreDNS logging + SIEM detection |
| CRIT-02 (ZTNA Ingress) | ✅ PASS | Explicit ingress NetworkPolicy scoped to gateway IP/port |
| CRIT-03 (Flat On-Prem) | ✅ PASS | 5 subnets + firewall ACL (16 rules) + host iptables |
| CRIT-04 (ZTNA SPOC) | ✅ PASS | Split gateways + JWT validation + gateway egress deny |

Lateral movement analysis confirms:
- **Scenario A** (Research Pod compromised): 10 of 10 unauthorized paths are DENIED with multi-layer enforcement. Zero single-control dependencies on critical paths.
- **Scenario B** (Cloud ZTNA Gateway compromised): All cross-environment paths (to on-prem, databases, K8s API, management) are DENIED with 2–3 independent controls each. Authorized proxy paths to cloud apps are mitigated by application-layer JWT validation.

The architecture satisfies the core security objective: **"A compromised application must not automatically become a compromised enterprise."**

The project is ready to proceed to implementation.

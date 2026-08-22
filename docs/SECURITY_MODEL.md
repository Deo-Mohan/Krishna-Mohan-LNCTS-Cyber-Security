# Security Model: IAM, RBAC, ZTNA, and Container Hardening

## 1. Zero-Trust Core Policies
This system adheres to the three foundational tenets of Zero Trust:
1. **Verify Explicitly**: Always authenticate and authorize based on all available data points (identity, location, device health, service context).
2. **Use Least Privilege Access**: Limit user and service access with Just-in-Time and Just-Enough-Access (JITA/JEA) models, using role-based policies (RBAC).
3. **Assume Breach**: Minimize blast radius by segmenting access by network, user, devices, and application awareness. Encrypt all sessions end-to-end. Use analytics to gain visibility and drive threat detection.

---

## 2. Identity & Access Management (IAM) & RBAC
Identity is the new perimeter. The security model defines roles and access permissions for users and machine identities.

### User Role Matrix
- **Student**: Allowed to access the Student Portal VM/Pod. Requires credentials + TOTP MFA.
- **Faculty**: Allowed to access the Student Portal and Faculty Portal. Requires credentials + TOTP MFA.
- **Examiner**: Allowed to access the Faculty Portal and Examination System. Requires hardware/strict token MFA, connection from recognized ZTNA client IP, and business hours check.
- **Researcher**: Allowed to access the Research Application.
- **Security Officer**: Allowed to access the SIEM / SOC Dashboard. Requires credentials + MFA.

### Machine Identity & Pod Isolation
By default, standard Kubernetes configurations mount a ServiceAccount token inside every pod, allowing communication with the API. This architecture disables this behavior:
* **`automountServiceAccountToken: false`** is applied to Student and Research pods.
* Pods have no capability to query the Kubernetes API.
* Database workloads are authenticated using dynamic secrets rather than hardcoded credentials.

---

## 3. ZTNA (Zero-Trust Network Access) Gateway Separation & Defense-in-Depth (Remediated CRIT-04)
To address the risk of the ZTNA Gateway becoming a single point of compromise, we implement a **Split-Gateway Architecture** combined with defense-in-depth.

```
                  ┌──────────────────────────────────────────────┐
                  │                 Public Users                 │
                  └──────────────┬────────────────┬──────────────┘
                                 │                │
                        (Student/Research)    (Faculty/Exam)
                                 ▼                ▼
                  ┌──────────────────────┐┌──────────────────────┐
                  │  Cloud ZTNA Gateway  ││ On-Prem ZTNA Gateway │
                  │     (10.100.1.10)    ││    (10.200.10.10)    │
                  └──────────┬───────────┘└───────────┬──────────┘
                             │                        │
                    (K8s Private Pods)          (On-Prem VMs)
                             ▼                        ▼
```

### 1. Gateway Isolation
- We split the ZTNA Gateway into two distinct, isolated physical/logical proxy domains:
  - **Cloud ZTNA Gateway (`10.100.1.10`)**: Handles user access only for cloud-hosted applications (Student Portal and Research Application). It has no network route, VPN rule, or configuration to access on-premises systems.
  - **On-Premises ZTNA Gateway (`10.200.10.10`)**: Handles user access only for datacenter applications (Faculty Portal and Examination System). It has no network access to the cloud VPC.
- If the Cloud ZTNA Gateway is compromised, the attacker has **zero ability** to pivot to the high-security Examination System VM or Faculty Portal VM, as those reside in the isolated on-premises subnets and are network-reachable only from the On-Premises ZTNA Gateway's private IP.

### 2. Backend Application Token Validation (mTLS / Signed Headers)
- Web application servers do not blindly trust requests arriving from the ZTNA Gateway IP.
- The ZTNA Gateway signs requests using a cryptographically secure token (JSON Web Token - JWT) signed by the identity provider. 
- The backend application validates the signature and ensures the user identity within the token is authorized to perform the action. If the Gateway is compromised and attempts to relay unauthorized requests, the application rejects them.

### 3. Least Privilege Firewall Restrictions for ZTNA Gateways
- **ZTNA Cloud Gateway**: Allowed egress is restricted *only* to K8s pods labeled `app=student-portal` or `app=research-app` on port 8080. Egress to databases (`5432`), Kubernetes control plane (`6443`), and management subnets is **denied by default**.
- **ZTNA On-Prem Gateway**: Allowed egress is restricted *only* to `10.200.20.10` (Exam VM, port 8443) and `10.200.20.20` (Faculty VM, port 8080). Egress to databases (`3306`, `1521`) and management servers is **denied by default**.

### 4. Logging & Threat Monitoring
- Both gateways stream connection and authorization logs to the SIEM.
- The SIEM triggers alerts on anomalous behavior, such as:
  - Gateway attempting to scan invalid ports or database subnets.
  - Simultaneous logins for the same user from different IP ranges.
  - Sudden volume of unauthorized API requests.

---

## 4. DNS Security and Egress Control (Remediated CRIT-01)
To restrict DNS resolution and prevent DNS-based data exfiltration:
- Workloads are prohibited from querying external public DNS resolvers (e.g., 8.8.8.8, 1.1.1.1).
- In Kubernetes, NetworkPolicies restrict DNS traffic (port 53 UDP/TCP) exclusively to the cluster DNS service IP (`10.96.0.10`) in the `kube-system` namespace.
- On-premises workloads resolve hostnames only via the internal Local Bind Resolver (`10.200.40.5`).
- CoreDNS logging logs queries for external domains, enabling detection of DNS tunneling.
- If DNS is unavailable, applications will fail to resolve database addresses and safely halt startup, preventing data exfiltration or fallback to unencrypted channels.

---

## 5. Kubernetes Security Hardening (Pod Security Standards)
Container security is enforced via strict cluster policies:
1. **Restricted Pod Security Standard**:
   - Pods must run as a non-root user (`runAsNonRoot: true`, `runAsUser: 10001`).
   - Root filesystems are read-only (`readOnlyRootFilesystem: true`) to prevent downloading tools.
   - Host namespace sharing (`hostNetwork`, `hostPID`, `hostIPC`) is forbidden.
   - Privilege escalation is disabled (`allowPrivilegeEscalation: false`).
   - Linux capabilities are dropped (`capabilities: drop: ["ALL"]`).
2. **Namespace Segmentation**:
   - Network traffic is restricted between namespaces. The `research-app` namespace cannot access the `student-portal` namespace.

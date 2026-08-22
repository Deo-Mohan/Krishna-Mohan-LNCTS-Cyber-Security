# Architecture Remediation Report

## 1. Finding Remediation Details

### CRIT-01 — DNS Egress (Covert Channel)
* **Finding**: The original default-deny NetworkPolicy locked egress but failed to account for DNS resolution. The absence of a DNS rule would either cause applications to fail (due to inability to resolve database hostnames) or indicate that DNS was open, which would allow DNS Tunneling exfiltration.
* **Root Cause**: Omission of DNS rules in the egress whitelists for containerized applications.
* **Remediation**: 
  - Restructured Kubernetes NetworkPolicies to explicitly authorize UDP and TCP egress on port 53 exclusively to the internal CoreDNS resolver IP (`10.96.0.10`) in the `kube-system` namespace.
  - Configured firewall policies to block outbound DNS queries to external public resolvers.
* **New Security Control**: CoreDNS-restricted NetworkPolicy + CoreDNS query logging streamed to the SIEM.
* **Expected Result**: Applications can resolve internal DB services; any attempt to query external resolvers directly is blocked. DNS tunneling queries are caught via SIEM correlation of CoreDNS logs.
* **Residual Risk**: A compromised container could attempt to leak data by making DNS queries to subdomains of a malicious domain (e.g. `secretdata.attacker.com`). CoreDNS will forward the query to external servers. This is mitigated by anomaly detection inside the SIEM monitoring for high-frequency or high-entropy queries.

---

### CRIT-02 — ZTNA Gateway Ingress NetworkPolicy
* **Finding**: The default-deny policy in Kubernetes would drop legitimate HTTP requests routed from the ZTNA reverse proxy to the application pods.
* **Root Cause**: Network policies only defined egress limits and default-deny; they did not define an ingress-allow path for the proxy gateway.
* **Remediation**:
  - Defined explicit ingress rules on the `student-portal` and `research-app` namespaces allowing ingress traffic *only* from the ZTNA Gateway IP (`10.100.1.10`) on application web ports (8080).
  - Explicitly defined the allowed ingress matrix, documenting that databases, K8s control plane APIs, and management networks block ingress from the ZTNA gateway.
* **New Security Control**: Namespace-level Ingress NetworkPolicies restricting inbound traffic sources to the ZTNA gateway.
* **Expected Result**: Legitimate user traffic is successfully routed through the ZTNA gateway; direct connectivity attempts from external systems or from unauthorized namespaces are blocked.
* **Residual Risk**: If the application web framework has a vulnerability (like RCE), the gateway will forward traffic to it, leading to pod compromise. This is mitigated by the egress default-deny policy, which stops the compromised pod from communicating with the rest of the network.

---

### CRIT-03 — On-Premises Flat /16 Network
* **Finding**: The private datacenter was configured as a flat `10.200.0.0/16` segment. If the Faculty Portal VM was compromised, it could easily scan and access the Examination DB VM or other sensitive assets on the same subnet.
* **Root Cause**: Flat network layout without VLAN partitioning or explicit subnet ACLs.
* **Remediation**:
  - Segmented the `10.200.0.0/16` address space into five distinct subnets (DMZ, Workload, Database, Management, and Security).
  - Placed the subnets behind a firewall and created a formal access control list (ACL).
  - Added host-level iptables rules on database VMs to drop all ingress except from authorized application hosts.
* **New Security Control**: Subnet-level firewall rules and host-level iptables configurations (documented in `/docs/ON_PREM_FIREWALL_POLICY.md`).
* **Expected Result**: The Faculty Portal VM cannot ping, scan, or query the Examination DB or Student DB. Inter-subnet traffic is blocked by default.
* **Residual Risk**: Switch-level configuration errors (e.g. VLAN hopping) could bypass subnet-level firewalls. This is mitigated by host-level iptables rules running on the VMs.

---

### CRIT-04 — ZTNA Gateway as Single Point of Compromise
* **Finding**: The ZTNA Gateway was a single node serving all applications. A compromise of this gateway would expose the entire internal network.
* **Root Cause**: Single reverse-proxy deployment handling all zones and routing paths.
* **Remediation**:
  - Adopted a **Split-Gateway Architecture**. The Cloud ZTNA Gateway (`10.100.1.10`) only manages cloud workloads. The On-Premises ZTNA Gateway (`10.200.10.10`) only manages on-premises workloads.
  - Implemented application-level JWT validation: backend applications do not trust requests based on the IP address; they require a cryptographically signed header token from the identity provider.
  - Restricted gateway egress: gateways have no network routes or rules allowing database, Kubernetes API, or management VPC access.
* **New Security Control**: App-domain gateway isolation, signed header verification, and strict gateway egress security groups.
* **Expected Result**: A compromise of the Cloud ZTNA Gateway does not compromise the on-premises database or Examination System, as there is no network path or authentication trust between them.
* **Residual Risk**: Compromising the On-Premises ZTNA Gateway could still expose the Faculty and Examination application ports. This is mitigated by strict context-aware checks (e.g., checking client certs and enforcing TOTP/MFA checks on the gateway itself).

---

## 2. Updated Document Index
All architectural files have been updated or added to incorporate these fixes:
- **[NETWORK_DESIGN.md](NETWORK_DESIGN.md)**: Defines new subnets, DNS controls, and ingress paths.
- **[KUBERNETES_SECURITY.md](KUBERNETES_SECURITY.md)**: Details the YAML NetworkPolicies, RBAC, and pod contexts.
- **[SECURITY_MODEL.md](SECURITY_MODEL.md)**: Details the split ZTNA model and defense-in-depth steps.
- **[THREAT_MODEL.md](THREAT_MODEL.md)**: Includes updated STRIDE and lateral-movement matrices.
- **[ON_PREM_FIREWALL_POLICY.md](ON_PREM_FIREWALL_POLICY.md)**: Details host-firewall and router ACL rules.

---

ARCHITECTURE STATUS:
READY FOR RE-REVIEW

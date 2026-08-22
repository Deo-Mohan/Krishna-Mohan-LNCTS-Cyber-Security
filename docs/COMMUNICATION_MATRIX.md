# Communication Matrix: Network & Application Micro-Segmentation

## 1. Network Traffic Rules Matrix
This matrix represents the definitive policy for network traffic throughout the hybrid environment. All flows not explicitly listed in the table below are **DENIED BY DEFAULT**.

| Source | Destination | Protocol / Port | Policy | Rationale | Enforcement Mechanism |
|---|---|---|---|---|---|
| **Any (Internet)** | Cloud ZTNA Gateway (`10.100.1.10`) | HTTPS / 443 | **ALLOW** | Public entry point for users accessing cloud portals. | Cloud VPC Edge Security Group |
| **Any (Internet)** | On-Prem ZTNA Gateway (`10.200.10.10`) | HTTPS / 443 | **ALLOW** | Public entry point for users accessing on-prem portals. | On-Prem DMZ Router ACL |
| **Cloud ZTNA Gateway** | Student Portal Pod | HTTP / 8080 | **ALLOW** | Proxying authorized user sessions to Student Portal. | K8s Ingress NetworkPolicy |
| **Cloud ZTNA Gateway** | Research App Pod | HTTP / 8080 | **ALLOW** | Proxying research traffic to Research portal. | K8s Ingress NetworkPolicy |
| **On-Prem ZTNA Gateway** | Faculty Portal VM | HTTP / 8080 | **ALLOW** | Proxying authorized user sessions to Faculty Portal. | On-Prem Firewall Router ACL |
| **On-Prem ZTNA Gateway** | Examination VM | HTTPS / 8443 | **ALLOW** | Proxying authorized examiners to Exam System. | On-Prem Firewall Router ACL |
| **Student Portal Pod** | Student DB Pod | PostgreSQL / 5432 | **ALLOW** | Application database query traffic. | K8s Pod NetworkPolicy (Ingress/Egress) |
| **Research App Pod** | Research DB Pod | PostgreSQL / 5432 | **ALLOW** | Application database query traffic. | K8s Pod NetworkPolicy (Ingress/Egress) |
| **Faculty Portal VM** | Faculty DB VM | MySQL / 3306 | **ALLOW** | Portal database query traffic. | On-Prem Firewall Router ACL & host iptables |
| **Examination VM** | Examination DB VM | Oracle/SQL / 1521 | **ALLOW** | Examination database query traffic. | On-Prem Firewall Router ACL & host iptables |
| **All Apps / VMs** | SIEM syslog (`172.16.1.100`) | Syslog-TLS / 514 | **ALLOW** | Encrypted shipping of access/deny audit logs. | Outbound Firewall & NetworkPolicies |
| **K8s Pods (Application)** | CoreDNS (`10.96.0.10`) | UDP/TCP / 53 | **ALLOW** | Cluster name resolution for DB services. | K8s Egress NetworkPolicy |
| **On-Prem VMs (Workload)** | Local Resolver (`10.200.40.5`) | UDP/TCP / 53 | **ALLOW** | Local name resolution for databases. | On-Prem Firewall Router ACL |
| **Research App Pod** | Student Portal Pod | TCP / Any | **DENY** | Micro-segmentation: Research cannot cross-talk. | K8s NetworkPolicy |
| **Research App Pod** | Faculty Portal VM | TCP / Any | **DENY** | Micro-segmentation: Research cannot talk to On-Prem. | Cloud Security Group & K8s Egress |
| **Research App Pod** | Examination VM | TCP / Any | **DENY** | Micro-segmentation: Research cannot talk to Exam. | Cloud Security Group & K8s Egress |
| **Research App Pod** | Kubernetes API | HTTPS / 6443 | **DENY** | Block workload access to control plane. | K8s Egress Policy & API Firewalls |
| **Research App Pod** | Internal Network | Any / Any | **DENY** | Block lateral scanning of private subnets. | K8s Egress NetworkPolicy |
| **Research App Pod** | External Internet | Any / Any | **DENY** | Block data exfiltration channels (non-DNS). | K8s Egress NetworkPolicy |

---

## 2. Kubernetes NetworkPolicy Declarations

To achieve default-deny inside the Kubernetes namespaces, we apply these CNI-level policies:

### 1. Default-Deny All Ingress and Egress
Applied to namespaces `student-portal` and `research-app`:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: research-app
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### 2. Ingress Policy for Research App (Allows Cloud ZTNA Gateway only)
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: research-app-ingress
  namespace: research-app
spec:
  podSelector:
    matchLabels:
      app: research-application
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 10.100.1.10/32
    ports:
    - protocol: TCP
      port: 8080
```

### 3. Egress Policy for Research App (DB, SIEM, and CoreDNS only)
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: research-app-egress
  namespace: research-app
spec:
  podSelector:
    matchLabels:
      app: research-application
  policyTypes:
  - Egress
  egress:
  # Egress to Research DB in the same namespace
  - to:
    - podSelector:
        matchLabels:
          app: research-database
    ports:
    - protocol: TCP
      port: 5432
  # Egress to SIEM Syslog Server
  - to:
    - ipBlock:
        cidr: 172.16.1.100/32
    ports:
    - protocol: TCP
      port: 514
  # Egress to internal cluster DNS (CoreDNS)
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```
All other egress traffic is dropped by the network plugin.

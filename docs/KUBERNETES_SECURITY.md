# Kubernetes Security: Policies, Segmentations, and CNI Rules

## 1. Kubernetes Namespace Architecture
Workloads are segregated into dedicated namespaces to enforce administrative boundaries, resource quotas, and network isolation policies:
- **`student-portal`**: Contains the Student web portal pods and Student PostgreSQL database pods.
- **`research-app`**: Contains the Research collaborative application pods and Research database pods.
- **`kube-system`**: Contains CoreDNS (`kube-dns`), API server endpoints, and cluster controllers.
- **`siem-mgmt`**: Contains the syslog aggregator and log forwarding daemonsets.

---

## 2. Kubernetes NetworkPolicies (Remediated CRIT-01 & CRIT-02)

To secure workloads inside Kubernetes, namespaces are configured with a **Default-Deny All Ingress and Egress** network policy. Workloads are then granted explicit, minimal permissions.

### Ingress Rules: ZTNA Gateway Gateway Connectivity (CRIT-02)
To allow the external ZTNA Cloud Gateway (`10.100.1.10`) to connect to application web pods (port 8080) without exposing the entire namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ztna-gateway-ingress
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
*(An identical policy is applied in the `student-portal` namespace targeting the student web pods.)*

### Egress Rules: DNS Security and Egress Control (CRIT-01)
To allow workloads to resolve DNS *only* through the cluster's internal DNS service, and to block all direct public DNS queries:

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
  # 1. Allow Egress to Research Database
  - to:
    - podSelector:
        matchLabels:
          app: research-database
    ports:
    - protocol: TCP
      port: 5432
  # 2. Allow Egress to Central SIEM syslog receiver
  - to:
    - ipBlock:
        cidr: 172.16.1.100/32
    ports:
    - protocol: TCP
      port: 514
  # 3. DNS Egress Rule: Restrict UDP/TCP 53 to cluster CoreDNS
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

---

## 3. Kubernetes RBAC & ServiceAccount Hardening (Workload Identity)
Workload Pods can be exploited if they carry credentials that allow querying the Kubernetes Control Plane (API Server).
1. **Disable ServiceAccount Token Mounting**:
   All pods in `student-portal` and `research-app` must declare:
   ```yaml
   spec:
     automountServiceAccountToken: false
   ```
   This prevents the CNI/Kubelet from mounting the token JWT at `/var/run/secrets/kubernetes.io/serviceaccount/token`.
2. **RBAC Default-Deny**:
   No custom Roles or ClusterRoles are bound to application service accounts. If an attacker gains command execution within a pod, any request targeting the API Server (`10.96.0.1:443`) will return a `403 Forbidden` response.

---

## 4. Container Pod Hardening (Pod Security Standards)
Both the student and research workloads enforce the **Restricted Pod Security Standard** at the namespace admission level. The following fields are mandated:

```yaml
spec:
  containers:
  - name: application-container
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 10001
      capabilities:
        drop:
        - ALL
```
* **ReadOnly Root Filesystem**: Attackers cannot install scanning tools (`nmap`, `netcat`) or download scripts to `/tmp` or `/opt` because the storage layer is read-only.
* **No Privilege Escalation / Non-Root**: Prevents local container breakout exploits from obtaining root privileges on the underlying host node.

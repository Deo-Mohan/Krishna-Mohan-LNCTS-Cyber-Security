# Kubernetes RBAC & Identity Model

This document outlines the security specifications and RBAC parameters configured for the SecureHaven local cluster lab environment.

---

## 1. Principles of Least Privilege Identity

The primary security objective for workload identities is:
> **"A compromised application must not automatically gain Kubernetes API privileges."**

### 1.1 Dedicated ServiceAccounts
Workloads must never run under the default namespace-level `default` ServiceAccount. Instead, each workload type is assigned its own dedicated ServiceAccount:
- **`student-app-sa`** & **`student-db-sa`** (in `student` namespace)
- **`faculty-app-sa`** & **`faculty-db-sa`** (in `faculty` namespace)
- **`exam-app-sa`** & **`exam-db-sa`** (in `exam` namespace)
- **`research-app-sa`** & **`research-db-sa`** (in `research` namespace)

### 1.2 Disabled Token Automounting
By default, Kubernetes automounts the ServiceAccount's API credential token inside the pod filesystem at `/var/run/secrets/kubernetes.io/serviceaccount/token`. 
To mitigate potential API credential leakage and prevent lateral movement:
- **Application workloads do not require Kubernetes API access.**
- `automountServiceAccountToken` is set to `false` on both the ServiceAccounts and the Deployment pod templates.
- If a container is compromised, the attacker will find no service account token within the pod environment, rendering access to the Kubernetes control plane `Access Denied` by default.

---

## 2. Workload RBAC Privileges

None of the application or database ServiceAccounts have any linked `Roles`, `RoleBindings`, `ClusterRoles`, or `ClusterRoleBindings`.
- **API permissions**: None.
- **Access to secrets in other namespaces**: Blocked.
- **Cluster resource discovery**: Blocked.

---

## 3. Human & Administrative Logical Role Model

Because human IAM integration is decoupled from the local cluster configuration, we establish a logical mapping of administrative access roles:

| Logical Role | Target Permissions | Kubernetes Implementation Pattern |
|---|---|---|
| **Kubernetes Administrator** | Full cluster-wide resource management | Bound to custom OIDC group mapping to the `cluster-admin` ClusterRole. |
| **Security Analyst** | Read-only audit logs, NetworkPolicies, pod configurations | Custom ClusterRole allowing `get`, `list`, `watch` on all namespaces; restricted from modifying resources. |
| **Application Developer** | Workload CRUD within a designated namespace (e.g. `student`) | Namespace-scoped `RoleBinding` to the native `admin` or `edit` Role within their specific team namespace. |

---

## 4. Workload Security Context & Hardening

Each portal application and database is configured with active sandbox limits to limit kernel/host level exposure:
- **`runAsNonRoot: true`**: Pod is blocked from running container processes as root.
- **`allowPrivilegeEscalation: false`**: Container processes are blocked from gaining more privileges than their parent process (e.g. using setuid binaries).
- **`capabilities.drop: ["ALL"]`**: Drops all default Linux kernel capabilities (e.g., net_admin, sys_chroot), rendering the container unprivileged.
- **Host Boundaries**: No workloads use `hostNetwork: true` or bind directly to host port listeners.

---

## 5. Verification Boundaries

### Statically Verified
- Presence of dedicated ServiceAccounts per workload.
- `automountServiceAccountToken: false` in both SA and Deployment manifests.
- Absence of `RoleBinding` / `ClusterRoleBinding` configurations linked to application ServiceAccounts.
- Exclusion of `privileged: true` and presence of `allowPrivilegeEscalation: false` and capability drop `ALL`.

### Runtime Verification Requirements
- Verification that `/var/run/secrets/kubernetes.io/serviceaccount/` remains empty inside a running pod.
- Testing that connection requests to `https://kubernetes.default.svc` from inside a portal container fail with a timeout or credential rejection.

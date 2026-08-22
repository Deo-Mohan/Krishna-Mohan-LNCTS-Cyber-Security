# Kubernetes Network Policy Model

This document outlines the network security segmentation design for the SecureHaven local cluster lab environment.

---

## 1. Security Design Strategy

The workload network segmentation implements a defense-in-depth, zero-trust model:

```
Default Deny (All Ingress/Egress)
    ↓
Explicit DNS Egress Allow (Only to CoreDNS UDP/TCP 53)
    ↓
Explicit Own-Database Allow (TCP App -> DB in Namespace)
    ↓
Everything Else Denied (No cross-app, cross-db, or external access)
```

---

## 2. Policy Architectures

### 2.1 Default-Deny Policies (Phase 3C Baseline)
Every namespace (`student`, `faculty`, `exam`, `research`) contains a default-deny policy targeting all pods:
- **`podSelector: {}`**: Matches all pods.
- **`policyTypes: [Ingress, Egress]`**: Places both directions under evaluation.
- Since no ingress/egress blocks are defined, all communication is dropped by default.

### 2.2 Controlled DNS Egress Policies
To enable name resolution for internal services while preventing DNS tunneling exfiltration:
- Workloads are allowed to query **only** the CoreDNS pods in the `kube-system` namespace.
- **Target Selection**:
  ```yaml
  namespaceSelector:
    matchLabels:
      kubernetes.io/metadata.name: kube-system
  podSelector:
    matchLabels:
      k8s-app: kube-dns
  ```
- **Port Constraints**: Allowed strictly on `UDP/53` and `TCP/53`. No wildcard egress (`0.0.0.0/0 -> 53`) is permitted.

### 2.3 Portal-to-Database Allow Policies
Each frontend application is granted a narrow, namespace-scoped allowance to communicate with its dedicated database:
- **Ingress to Database**: Allows inbound TCP connections strictly from the portal selector (`app: [name]-app`) to the database port.
- **Egress from Portal**: Allows outbound TCP connections strictly to the database selector (`app: [name]-db`) on the database port.

---

## 3. Communication Matrix (Phase 3D Status)

| Source Workload | Target Workload | Port / Protocol | Phase 3D Policy State | Enforcing Policy Resource | Reason |
|---|---|---|---|---|---|
| `student-app` | `student-db` | `5432 / TCP` | **ALLOW** | `student-db-ingress` & `student-app-egress-to-db` | Application operation requirement |
| `faculty-app` | `faculty-db` | `3306 / TCP` | **ALLOW** | `faculty-db-ingress` & `faculty-app-egress-to-db` | Application operation requirement |
| `exam-app` | `exam-db` | `1521 / TCP` | **ALLOW** | `exam-db-ingress` & `exam-app-egress-to-db` | Application operation requirement |
| `research-app`| `research-db`| `5432 / TCP` | **ALLOW** | `research-db-ingress` & `research-app-egress-to-db` | Application operation requirement |
| Any Workload | CoreDNS Pods | `53 / UDP, TCP` | **ALLOW** | `[namespace]-dns-egress` | Namespace service name lookup |
| `research-app`| `student-app`| Any | **DENY** | `student-default-deny` | Cross-portal boundary enforcement |
| `research-app`| `student-db` | Any | **DENY** | `student-default-deny` | Cross-database boundary enforcement |
| `research-app`| `faculty-db` | Any | **DENY** | `faculty-default-deny` | Cross-database boundary enforcement |
| `research-app`| `exam-db` | Any | **DENY** | `exam-default-deny` | Cross-database boundary enforcement |
| Any Workload | External Host | Port 53 | **DENY** | `[namespace]-default-deny` | Block exfiltration via external resolvers |
| Any Workload | External Host | Any Port | **DENY** | `[namespace]-default-deny` | Block arbitrary internet outbound traffic |

---

## 4. Verification & Testing Boundaries

### Statically Verified
- Presence of default-deny manifests inside `k8s/network-policies/default-deny/`.
- DNS egress policies restrict queries to namespace `kube-system` and selector `k8s-app: kube-dns` on port 53.
- Database policies enforce 1:1 ingress/egress relationships using exact configured ports:
  - Student: `5432`
  - Faculty: `3306`
  - Exam: `1521`
  - Research: `5432`
- Static audit suite `network_policy_tests.js` executed with **0 failures**.

### Runtime Verified
- **None**. The development machine does not have a running Docker engine or Kubernetes CLI tools. No dynamic connections or packet drop assertions have been performed.

### Runtime Unverified
- Verification that packets from `research-app` to `student-db` are dropped at the interface level by the network plug-in (CNI).
- Verification that `student-app` to `student-db` TCP handshakes complete successfully.
- Verification that CoreDNS lookup queries resolve successfully.

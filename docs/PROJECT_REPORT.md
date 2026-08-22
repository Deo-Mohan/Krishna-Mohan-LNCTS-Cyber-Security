# SecureHaven — Project Report

## Kubernetes Security Hardening & Zero-Trust Security Monitoring Dashboard

**B.Tech CSE Final Year Project**
**Cisco Virtual Internship 2026 — Cyber Security**
**LNCTS, Bhopal**

**Author:** Krishna Mohan

---

## Abstract

SecureHaven is a Kubernetes security hardening project that implements a defense-in-depth, zero-trust architecture for an academic institution's examination portal workloads. The project hardens container workloads running in a dedicated Kubernetes namespace (`exam`) on a local Kind cluster (`securehaven`) by enforcing non-root execution, Linux capability dropping, read-only filesystems, default-deny network microsegmentation, dedicated ServiceAccount identities, dynamic secrets injection, and namespace-level resource quotas. A purpose-built Next.js security monitoring dashboard provides real-time telemetry by querying the Kubernetes API server-side through a read-only RBAC-scoped ServiceAccount, presenting sanitized security posture data without exposing credentials to the browser. The implemented architecture achieved a verified security score of 96/100, with 13 out of 13 runtime verification tests passing.

**Keywords:** Kubernetes, Zero-Trust, Container Security, NetworkPolicy, RBAC, Microsegmentation, Security Dashboard, Next.js, Docker, Calico

---

## Chapter 1 — Introduction

### 1.1 Background

Cloud-native applications deployed on Kubernetes face a broad attack surface. Containers running as root, unrestricted network communication between pods, over-privileged service accounts, and hardcoded credentials represent common security anti-patterns that enable lateral movement after an initial breach. The MITRE ATT&CK framework for containers documents techniques such as container escape, privilege escalation, and credential access that exploit these weaknesses.

### 1.2 Problem Statement

Traditional Kubernetes deployments often rely on default configurations that leave workloads vulnerable. Default ServiceAccounts carry API access tokens, containers run as root with full Linux capabilities, and the flat pod network allows unrestricted lateral communication. There is a need to demonstrate how zero-trust principles can be systematically applied to harden Kubernetes workloads and provide security observability.

### 1.3 Motivation

This project was developed as part of the Cisco Virtual Internship 2026 (Cyber Security) program. The problem statement required designing a Zero-Trust Hybrid Datacenter/Cloud Security Architecture for an academic institution. The motivation was to move beyond theoretical security models and implement verifiable, testable security controls on real container workloads.

### 1.4 Objectives

1. Harden container workloads with non-root execution, capability dropping, read-only filesystems, and privilege escalation prevention.
2. Implement default-deny network microsegmentation using Calico CNI and Kubernetes NetworkPolicies.
3. Enforce least-privilege RBAC with dedicated ServiceAccounts and disabled token auto-mounting.
4. Protect secrets through dynamic Kubernetes Secret injection rather than hardcoded credentials.
5. Enforce resource quotas and limit ranges to prevent denial-of-service attacks.
6. Build a real-time security monitoring dashboard with server-side Kubernetes API integration.

### 1.5 Scope

The security hardening scope is strictly limited to the `exam` namespace on the `securehaven` Kind cluster. The workloads in scope are `exam-app` (Node.js examination portal), `exam-db` (PostgreSQL database), and `security-dashboard` (Next.js monitoring frontend). The `student`, `faculty`, and `research` namespaces are present in the repository but are outside the hardening scope.

### 1.6 Significance

This project demonstrates practical, verifiable Kubernetes security hardening rather than theoretical models. Every security claim is backed by a testable verification command, and the dashboard provides continuous security observability.

---

## Chapter 2 — Existing System and Problem Analysis

### 2.1 Existing Approach

In traditional Kubernetes deployments, workloads typically run with default configurations: root user execution, all Linux capabilities enabled, writable filesystems, default ServiceAccounts with auto-mounted API tokens, and flat pod networks with no traffic restrictions.

### 2.2 Limitations of Existing Approach

| Limitation | Security Risk |
|:---|:---|
| Root container execution | Container escape leads to host compromise |
| Full Linux capabilities | Kernel-level exploitation vectors |
| Writable root filesystem | Web shell persistence, binary tampering |
| Default ServiceAccount tokens | Kubernetes API credential theft |
| Flat pod network | Unrestricted lateral movement |
| No resource limits | Denial-of-service via resource exhaustion |
| Hardcoded credentials | Credential exposure in source control |

### 2.3 Need for Zero-Trust Kubernetes Security

The zero-trust model ("Never Trust, Always Verify") requires that every workload operates with minimum necessary privileges, all network traffic is explicitly authorized, and no implicit trust is granted based on network location. Kubernetes provides native primitives (SecurityContext, NetworkPolicy, RBAC, ResourceQuota) to implement these principles, but they must be explicitly configured.

---

## Chapter 3 — Proposed System

### 3.1 SecureHaven Overview

SecureHaven implements a comprehensive security hardening framework for Kubernetes workloads with eight verified security domains: Container Security, Filesystem Hardening, Network Security, RBAC, Secrets Management, Resource Protection, Runtime Health, and Image Security.

### 3.2 Key Features

1. **Container Sandbox** — Non-root UID 1000, `capabilities.drop: [ALL]`, `allowPrivilegeEscalation: false`
2. **Filesystem Hardening** — `readOnlyRootFilesystem: true` with size-limited `/tmp` (50Mi emptyDir)
3. **Network Microsegmentation** — Default-deny with explicit app→db and DNS egress allowlists
4. **Identity Isolation** — Dedicated ServiceAccounts per workload with zero API permissions
5. **Dynamic Secrets** — Database passwords injected via `secretKeyRef` from Kubernetes Secrets
6. **Resource Controls** — Namespace-level ResourceQuota and LimitRange enforcement
7. **Security Dashboard** — Real-time monitoring via server-side Kubernetes API queries
8. **Supply Chain** — Node.js 22-alpine base image, production-only `npm ci`, `.dockerignore` pruning

### 3.3 Advantages

- Every security control is independently verifiable through kubectl commands
- Dashboard operates with read-only, namespace-scoped RBAC permissions
- No Kubernetes credentials are exposed to the browser client
- Automated test suites validate secrets scanning, Dockerfile integrity, and network isolation

---

## Chapter 4 — Requirement Analysis

### 4.1 Functional Requirements

| ID | Requirement |
|:---|:---|
| FR-01 | exam-app serves HTTP API on port 8083 with health endpoint |
| FR-02 | exam-db provides PostgreSQL database on port 1521 |
| FR-03 | Security dashboard displays live workload status |
| FR-04 | Dashboard displays security control verification matrix |
| FR-05 | Dashboard displays network policy visualization |
| FR-06 | Dashboard displays resource quota usage |

### 4.2 Non-Functional Requirements

| ID | Requirement |
|:---|:---|
| NFR-01 | Dashboard loads within 3 seconds |
| NFR-02 | Dashboard supports dark and light theme modes |
| NFR-03 | Dashboard is responsive across desktop viewports |
| NFR-04 | API polling interval of 5 seconds for live data |

### 4.3 Security Requirements

| ID | Requirement |
|:---|:---|
| SR-01 | All containers must run as non-root |
| SR-02 | All Linux capabilities must be dropped |
| SR-03 | Root filesystem must be read-only |
| SR-04 | Network traffic must be default-deny |
| SR-05 | ServiceAccount tokens must not auto-mount on workloads |
| SR-06 | Credentials must not be hardcoded in source |
| SR-07 | Resource quotas must prevent DoS |
| SR-08 | Dashboard API must not expose secrets to client |

### 4.4 Hardware Requirements

| Component | Specification |
|:---|:---|
| Processor | 4+ core x86_64 |
| RAM | 8 GB minimum |
| Storage | 20 GB free |
| Network | Internet for image pulls |

### 4.5 Software Requirements

| Software | Version |
|:---|:---|
| Docker | Latest |
| kubectl | v1.28+ |
| Kind | v0.20+ |
| Node.js | v22.23.2 |
| npm | v10+ |

---

## Chapter 5 — System Architecture

### 5.1 Overall Architecture

The system operates within a single Kind Kubernetes cluster named `securehaven`. The `exam` namespace contains three workloads: the examination portal (`exam-app`), its PostgreSQL database (`exam-db`), and the security monitoring dashboard (`security-dashboard`).

### 5.2 Kubernetes Architecture

```
securehaven cluster (Kind)
└── exam namespace
    ├── exam-app (Deployment, 1 replica)
    │   ├── ServiceAccount: exam-app-sa (token disabled)
    │   ├── Image: exam-app:latest (Node.js 22-alpine)
    │   └── Service: exam-app (ClusterIP :8083)
    ├── exam-db (Deployment, 1 replica)
    │   ├── ServiceAccount: exam-db-sa (token disabled)
    │   ├── Image: postgres:15-alpine
    │   └── Service: exam-db (ClusterIP :1521)
    ├── security-dashboard (Deployment, 1 replica)
    │   ├── ServiceAccount: security-dashboard-sa (token enabled)
    │   ├── Role: security-dashboard-role (get, list)
    │   ├── RoleBinding: security-dashboard-rolebinding
    │   ├── Image: securehaven-dashboard:latest (Next.js 16)
    │   └── Service: security-dashboard (ClusterIP :80→3000)
    ├── NetworkPolicies:
    │   ├── exam-default-deny (deny all ingress/egress)
    │   ├── exam-app-network-policy (app egress to db + dns)
    │   ├── exam-db-ingress (db ingress from app only)
    │   ├── exam-app-egress-to-db (app egress to db TCP:1521)
    │   └── exam-dns-egress (all pods → kube-dns UDP/TCP:53)
    ├── ResourceQuota: exam-quota (4 pods, 500m/1 CPU, 256Mi/512Mi mem)
    └── LimitRange: exam-limits (default 250m/128Mi per container)
```

### 5.3 Dashboard Data Flow

```
Browser → Next.js Client (React) → /api/security-status (Server Route)
                                          ↓
                                   security-dashboard-sa
                                   (Role: get, list only)
                                          ↓
                                   Kubernetes API Server
                                          ↓
                              Pods, Deployments, Services,
                              NetworkPolicies, ResourceQuotas,
                              LimitRanges, ServiceAccounts
                                          ↓
                                   Sanitized JSON Response
                                   (no secrets, no tokens)
                                          ↓
                                   Browser renders dashboard
```

### 5.4 Network Communication Flow

```
exam-app ──TCP:1521──► exam-db         ✅ ALLOWED
exam-app ──UDP:53────► kube-dns         ✅ ALLOWED
exam-app ──*────────► anything else     ❌ BLOCKED
exam-db  ──*────────► anything          ❌ BLOCKED (except ingress from exam-app)
*        ──*────────► exam-app          ❌ BLOCKED (unauthorized ingress)
```

---

## Chapter 6 — Technology Stack

| Technology | Version | Role |
|:---|:---|:---|
| **Kubernetes** | Kind (local) | Container orchestration and policy enforcement |
| **Calico CNI** | — | NetworkPolicy enforcement engine |
| **Docker** | Latest | Container image building and runtime |
| **Node.js** | v22.23.2 (Alpine 3.21.3) | exam-app backend runtime |
| **Express.js** | v4.19.2 | HTTP API framework for exam portal |
| **PostgreSQL** | 15-alpine | Examination database |
| **Next.js** | 16.3.2 | Security dashboard framework (SSR + API routes) |
| **React** | 19.2.8 | Dashboard UI component library |
| **TypeScript** | 5.x | Type-safe dashboard development |
| **Tailwind CSS** | 4.x | Utility-first CSS styling |
| **@kubernetes/client-node** | 0.21.0 | Server-side Kubernetes API client |
| **Git / GitHub** | — | Version control |

---

## Chapter 7 — Security Design and Implementation

### 7.1 Container Security

**Problem:** Containers running as root can escape to the host if a kernel vulnerability is exploited.

**Control:** Non-root execution with UID 1000, all capabilities dropped, privilege escalation disabled.

**Implementation** (from `k8s/deployments/exam-app.yaml`):
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

**Verification:**
```bash
$ kubectl exec -n exam deploy/exam-app -- id
uid=1000(node) gid=1000(node)
```

**Result:** PASS — Container runs as unprivileged UID 1000.

### 7.2 Filesystem Hardening

**Problem:** Writable filesystems allow attackers to persist web shells or tamper with application binaries.

**Control:** Read-only root filesystem with isolated writable `/tmp` directory (50Mi size limit).

**Verification:**
```bash
$ kubectl exec -n exam deploy/exam-app -- sh -c "touch /usr/src/app/test"
touch: /usr/src/app/test: Read-only file system

$ kubectl exec -n exam deploy/exam-app -- sh -c "touch /tmp/test && echo OK"
OK
```

**Result:** PASS — Root filesystem is read-only; `/tmp` is writable and size-capped.

### 7.3 Network Security

**Problem:** Flat pod networks allow any pod to communicate with any other pod, enabling lateral movement.

**Control:** Default-deny NetworkPolicy with explicit allow-list rules.

**Implementation:**
- `exam-default-deny` — Blocks all ingress and egress for all pods in the namespace
- `exam-app-network-policy` — Allows exam-app egress to exam-db (TCP:1521) and kube-dns (UDP/TCP:53)
- `exam-db-ingress` — Allows exam-db ingress only from exam-app on TCP:1521

**Result:** PASS — Unauthorized traffic is blocked by default.

### 7.4 RBAC and ServiceAccounts

**Problem:** Default ServiceAccounts carry auto-mounted API tokens that attackers can use to query the Kubernetes API.

**Control:** Dedicated ServiceAccounts per workload with `automountServiceAccountToken: false` and zero API permissions.

**Implementation** (from `k8s/rbac/exam-serviceaccount.yaml`):
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: exam-app-sa
  namespace: exam
automountServiceAccountToken: false
```

The security dashboard uses a separate ServiceAccount (`security-dashboard-sa`) with read-only permissions:
```yaml
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "resourcequotas", "limitranges", "serviceaccounts"]
    verbs: ["get", "list"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["networkpolicies"]
    verbs: ["get", "list"]
```

**Result:** PASS — Workloads have zero API access; dashboard has read-only namespace-scoped access.

### 7.5 Secrets Management

**Problem:** Hardcoded database credentials in source code risk exposure through version control.

**Control:** Dynamic injection via Kubernetes Secrets using `secretKeyRef`.

**Implementation** (from `k8s/deployments/exam-app.yaml`):
```yaml
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: exam-db-secret
      key: db-password
```

**Limitation:** The secret manifests in `k8s/config/` contain base64-encoded values, which is encoding, not encryption. These are for local development use only.

**Result:** PASS — No credentials are hardcoded in application source code.

### 7.6 Resource Protection

**Problem:** Unrestricted resource consumption can lead to denial-of-service through CPU/memory exhaustion.

**Control:** Namespace-level ResourceQuota and per-container LimitRange defaults.

**ResourceQuota** (`exam-quota`):
| Resource | Limit |
|:---|:---|
| Pods | 4 |
| CPU Requests | 500m |
| CPU Limits | 1000m |
| Memory Requests | 256Mi |
| Memory Limits | 512Mi |

**LimitRange** (`exam-limits`):
| Parameter | Default Request | Default Limit |
|:---|:---|:---|
| CPU | 100m | 250m |
| Memory | 64Mi | 128Mi |

**Result:** PASS — Resource boundaries are enforced at both namespace and container levels.

### 7.7 Container Image Security

**Problem:** Outdated base images contain known CVEs and end-of-life runtimes.

**Control:** Upgraded base image from Node.js 18 (EOL) to Node.js 22-alpine (LTS). Production-only dependency installation. `.dockerignore` to prune sensitive files from build context.

**Dockerfile** (from `apps/exam/Dockerfile`):
```dockerfile
FROM node:22-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
COPY public/ ./public/
USER node
EXPOSE 8083
CMD ["node", "src/server.js"]
```

**Limitation:** A dedicated container CVE scanner (Trivy/Grype) was unavailable locally. `npm audit --omit=dev` returned 0 vulnerabilities.

**Result:** INFO — Base image upgraded; npm audit clean; full binary CVE scan not completed.

### 7.8 Dashboard API Security

**Problem:** Exposing Kubernetes API credentials or raw cluster data to browser clients creates a credential theft vector.

**Control:** Server-side only Kubernetes API queries through Next.js API routes. The `@kubernetes/client-node` SDK runs exclusively on the server. Responses are sanitized to exclude environment variables, secrets, tokens, and internal metadata.

**Implementation** (from `app/api/security-status/route.ts`):
- Kubernetes client loads from in-cluster ServiceAccount token
- API queries use namespace-scoped read-only permissions
- Response maps only safe fields (name, status, resource limits)
- Error responses use generic messages, never raw Kubernetes errors

**Result:** PASS — No credentials or sensitive data exposed to the client.

---

## Chapter 8 — Dashboard Implementation

### 8.1 Overview

The SecureHaven dashboard is a Next.js 16 application that provides a real-time security monitoring interface. It queries the Kubernetes API server-side and renders a glassmorphic UI with dark/light theme support.

### 8.2 UI Components

| Component | Purpose |
|:---|:---|
| `SecurityScore.tsx` | Animated SVG gauge showing security posture (0–100) |
| `SecurityControlCard.tsx` | Individual security domain verification cards |
| `WorkloadCard.tsx` | Pod health, resources, and security context display |
| `NetworkOverview.tsx` | Zero-trust traffic flow visualization |
| `ResourceOverview.tsx` | ResourceQuota progress bars and LimitRange table |
| `VerificationPanel.tsx` | 13 runtime verification test results |
| `FindingsSummary.tsx` | Known limitations and informational findings |
| `Sidebar.tsx` | Navigation with section links |
| `Topbar.tsx` | Theme toggle and cluster status header |

### 8.3 Live Kubernetes Integration

When running inside the cluster, the dashboard fetches live data from `/api/security-status` every 5 seconds. The API route queries pods, deployments, services, NetworkPolicies, ResourceQuotas, LimitRanges, and ServiceAccounts. When running outside the cluster (local development), the dashboard falls back to static mock data defined in `lib/mock-data.ts`.

### 8.4 Theme System

The dashboard implements a CSS variable-based theme system with:
- Synchronous blocking script in `<head>` to prevent flash of unstyled content (FOUC)
- `localStorage` persistence for theme preference
- Class-based dark mode via `@custom-variant dark (&:where(.dark, .dark *))` in Tailwind CSS v4

---

## Chapter 9 — Testing and Verification

### 9.1 Testing Strategy

Testing was performed at three levels:
1. **Automated test suites** — `run_tests.js` and `tests/container/container_tests.js`
2. **Kubernetes runtime verification** — `kubectl exec` commands documented in SECURITY.md
3. **Build validation** — TypeScript compilation and Next.js production build

### 9.2 Verification Results

| Test ID | Test | Expected | Actual | Status |
|:---:|:---|:---|:---|:---:|
| SEC-01 | Non-root execution (UID 1000) | UID 1000 | UID 1000 | PASS |
| SEC-02 | Root filesystem write blocked | Read-only file system | Read-only file system | PASS |
| SEC-03 | /tmp write allowed | TMP_WRITE_OK | TMP_WRITE_OK | PASS |
| SEC-04 | Privilege escalation disabled | false | false | PASS |
| SEC-05 | Linux capabilities dropped | Drop ALL | Drop ALL | PASS |
| SEC-06 | NetworkPolicy active | Active | Active | PASS |
| SEC-07 | Unauthorized ingress blocked | Timeout | Timeout | PASS |
| SEC-08 | PostgreSQL connected | mock: false | mock: false | PASS |
| SEC-09 | ResourceQuota enforced | Active | Active | PASS |
| SEC-10 | LimitRange enforced | Active | Active | PASS |
| SEC-11 | Zero restart count | 0 | 0 | PASS |
| SEC-12 | Pod health status | Running | Running | PASS |
| SEC-13 | Node.js 22 runtime | v22.23.2 | v22.23.2 | PASS |

### 9.3 Automated Test Suites

**`run_tests.js`** performs:
- Source code scanning for hardcoded secrets (passwords, tokens, keys)
- Dockerfile audit (non-root USER directive, correct EXPOSE port)
- Application startup verification
- Health endpoint validation (200 OK with `status: healthy`)
- API endpoint validation (correct responses and 404 handling)
- Strict database connectivity check (503 on database failure)

**`tests/container/container_tests.js`** performs:
- Docker Compose container health checks
- Network isolation matrix testing (16 connection probes across 4 apps × 4 databases)
- Verification that each app connects only to its own database

### 9.4 Build Validation

```bash
$ npm run build   # Next.js production build
✓ Compiled successfully
✓ TypeScript validation passed
✓ Static pages generated (4/4)
Exit code: 0
```

---

## Chapter 10 — Results and Discussion

### 10.1 Security Score Summary

| Domain | Score | Status |
|:---|:---:|:---:|
| Container Security | 100 | PASS |
| Filesystem Security | 100 | PASS |
| Network Security | 100 | PASS |
| RBAC & ServiceAccounts | 100 | PASS |
| Secrets Management | 90 | PASS |
| Resource Protection | 100 | PASS |
| Runtime Health | 100 | PASS |
| Image Security | 80 | INFO |
| **Overall** | **96/100** | **SECURE** |

### 10.2 Discussion

The project successfully demonstrated that Kubernetes native primitives (SecurityContext, NetworkPolicy, RBAC, ResourceQuota, LimitRange) can be systematically applied to achieve a defense-in-depth security posture. The separation of the monitoring dashboard into a read-only, namespace-scoped ServiceAccount demonstrates the principle of least privilege applied to observability tooling.

The 4-point deduction in the overall score reflects the Image Security domain, where a full container binary CVE scan could not be completed due to tool unavailability. The npm production dependency audit returned 0 vulnerabilities, but this does not cover system-level Alpine packages in the base image.

---

## Chapter 11 — Limitations

1. **Image Vulnerability Scanner Unavailable** — Trivy/Grype were not installed locally, and Docker Scout required authentication. Only `npm audit --omit=dev` was performed.
2. **Namespace Scope** — Hardening applies only to the `exam` namespace. Student, faculty, and research namespaces run unhardened.
3. **Development Secrets** — Kubernetes secret manifests in `k8s/config/` use base64 encoding (not encryption).
4. **Local Kind Environment** — Validation was performed on a single-node Kind cluster, not a production cloud environment.
5. **exam-db Security Context** — The PostgreSQL container does not have `readOnlyRootFilesystem` enabled due to database write requirements.

---

## Chapter 12 — Future Enhancements

1. **Trivy/Grype CI Integration** — Automate container image vulnerability scanning in CI/CD pipelines.
2. **Production Secret Management** — Integrate HashiCorp Vault or External Secrets Operator.
3. **Multi-Namespace Hardening** — Extend security controls to student, faculty, and research namespaces.
4. **Immutable Image Digests** — Pin container images by SHA256 digest for build reproducibility.
5. **Database Resource Profiling** — Monitor memory usage under realistic traffic to optimize limits.
6. **Prometheus/Grafana** — Add metrics collection, alerting, and historical trend analysis.

---

## Chapter 13 — Conclusion

SecureHaven successfully demonstrates the practical implementation of zero-trust security principles on Kubernetes workloads. The project achieved a verified security score of 96/100 across eight security domains, with 13 out of 13 runtime verification tests passing. The security monitoring dashboard provides continuous observability through a read-only, server-side Kubernetes API integration that does not expose credentials to the client.

The project validates that Kubernetes native security primitives — when systematically configured — provide robust protection against container escape, lateral movement, privilege escalation, credential theft, and resource exhaustion attacks. The documented verification methodology ensures that every security claim is independently testable and reproducible.

---

## References

1. Kubernetes Documentation — Pod Security Standards. https://kubernetes.io/docs/concepts/security/pod-security-standards/
2. Kubernetes Documentation — Network Policies. https://kubernetes.io/docs/concepts/services-networking/network-policies/
3. Kubernetes Documentation — RBAC Authorization. https://kubernetes.io/docs/reference/access-authn-authz/rbac/
4. NIST SP 800-207 — Zero Trust Architecture. National Institute of Standards and Technology, 2020.
5. MITRE ATT&CK — Containers Matrix. https://attack.mitre.org/matrices/enterprise/containers/
6. CIS Kubernetes Benchmark. Center for Internet Security, 2024.
7. Docker Documentation — Dockerfile Best Practices. https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
8. Project Calico — NetworkPolicy Documentation. https://docs.tigera.io/calico/latest/network-policy/
9. Next.js Documentation — Route Handlers. https://nextjs.org/docs/app/building-your-application/routing/route-handlers
10. Node.js Release Schedule. https://nodejs.org/en/about/previous-releases

---

## Appendix A — Key Kubernetes Manifests

### A.1 exam-app Deployment (excerpt)
```yaml
spec:
  serviceAccountName: exam-app-sa
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
    - name: portal
      image: exam-app:latest
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: [ALL]
      resources:
        requests: { cpu: 100m, memory: 64Mi, ephemeral-storage: 50Mi }
        limits: { cpu: 250m, memory: 128Mi, ephemeral-storage: 100Mi }
```

### A.2 Default-Deny NetworkPolicy
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: exam-default-deny
  namespace: exam
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
```

### A.3 Security Dashboard RBAC
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: security-dashboard-role
  namespace: exam
rules:
  - apiGroups: [""]
    resources: [pods, services, resourcequotas, limitranges, serviceaccounts]
    verbs: [get, list]
  - apiGroups: [apps]
    resources: [deployments]
    verbs: [get, list]
  - apiGroups: [networking.k8s.io]
    resources: [networkpolicies]
    verbs: [get, list]
```

## Appendix B — Verification Commands

```bash
# Pod status
kubectl get pods -n exam

# Non-root verification
kubectl exec -n exam deploy/exam-app -- id

# Filesystem hardening
kubectl exec -n exam deploy/exam-app -- sh -c "touch /usr/src/app/test"
kubectl exec -n exam deploy/exam-app -- sh -c "touch /tmp/test && echo OK"

# Health check
kubectl exec -n exam deploy/exam-app -- sh -c "wget -qO- http://127.0.0.1:8083/health"

# RBAC verification
kubectl get sa,role,rolebinding -n exam

# NetworkPolicy verification
kubectl get networkpolicy -n exam

# ResourceQuota verification
kubectl get resourcequota,limitrange -n exam

# Run automated tests
node run_tests.js
node tests/container/container_tests.js
```

## Appendix C — Project File Listing

| Path | Purpose |
|:---|:---|
| `SECURITY.md` | Security audit report |
| `README.md` | Project overview and quickstart |
| `docker-compose.yml` | Multi-service isolated development |
| `run_tests.js` | Automated integrity test suite |
| `apps/exam/` | Examination portal source |
| `apps/security-dashboard/` | Security dashboard source |
| `k8s/deployments/` | Kubernetes deployment manifests |
| `k8s/rbac/` | ServiceAccount definitions |
| `k8s/network-policies/` | NetworkPolicy manifests |
| `k8s/config/` | Kubernetes Secrets (dev only) |
| `k8s/services/` | Service manifests |
| `docs/` | 28 architecture and review documents |

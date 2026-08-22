# SecureHaven — Project Report

## Kubernetes Security Hardening & Zero-Trust Security Monitoring Dashboard

**B.Tech CSE Final Year Project**
**Cisco Virtual Internship 2026 — Cyber Security**
**LNCTS, Bhopal**

**Author:** Krishna Mohan
**Project Guide:** Academic Department of Computer Science & Engineering

---

## Abstract

SecureHaven is a comprehensive Kubernetes security hardening project designed to establish a defense-in-depth, Zero-Trust security posture for an academic institution's examination portal. Developed on a local multi-node Kubernetes cluster (Kind), this project isolates and hardens critical web application workloads inside a dedicated namespace (`exam`) using Calico CNI for network segmentation. By enforcing strict security contexts (non-root execution, Linux capability dropping, read-only root filesystems) and resource boundaries (ResourceQuotas, LimitRanges), the system effectively neutralizes container-escape and lateral-movement threats. Real-time observability is achieved through a glassmorphic Next.js security monitoring dashboard that communicates with the Kubernetes API server-side via a dedicated, read-only ServiceAccount, ensuring no cluster credentials leak to client browsers. Testing and validation checks (including automated secrets scanning, Dockerfile static analysis, and network connectivity matrix tests) verify that the system achieves an overall security score of 96/100, passing 13 out of 13 primary runtime verification checks.

**Keywords:** Kubernetes, Zero-Trust, Container Security, NetworkPolicy, RBAC, Microsegmentation, Security Dashboard, Next.js, Docker, Calico CNI, Cybersecurity Engineering

---

## Chapter 1 — Introduction

### 1.1 Background

Modern application environments have rapidly shifted from monoliths running on bare-metal servers to containerized microservices running on cloud-managed platforms like Kubernetes. While this shift accelerates deployment speed and scalability, it dramatically increases the internal attack surface of an organization. 

In a traditional "castle-and-moat" network architecture, perimeter firewalls defend the network boundary. However, once an attacker gains access to any internal node—often through a public-facing application vulnerability like Remote Code Execution (RCE) or a compromised dependency—they encounter a flat, unrestricted internal network. From there, they can move laterally to access databases, capture service account API tokens, and escalate privileges to compromise the host node or the entire Kubernetes control plane.

### 1.2 Problem Statement

Default Kubernetes installations are inherently open and unhardened:
* **Root Execution:** By default, containers run as the root user. If a container is escaped, the attacker inherits root access on the underlying host node.
* **Flat Internal Networking:** Pods within a cluster can communicate freely with any other pod across namespaces by default, facilitating lateral movement.
* **Over-Privileged ServiceAccounts:** Pods auto-mount a default ServiceAccount token that can contain permissions to read secrets or manage other pods.
* **Writable Filesystems:** Writable root filesystems allow attackers to download payloads, install web shells, or patch binaries.
* **No Resource Restrictions:** A compromised or misconfigured container can consume unlimited CPU and memory, starving other workloads and causing a Denial-of-Service (DoS) state.

There is a critical need to design and implement a repeatable, secure-by-default Kubernetes architecture applying Zero-Trust principles ("Never Trust, Always Verify") to contain breaches at the workload boundary while maintaining real-time security observability.

### 1.3 Motivation

This project was developed within the framework of the **Cisco Virtual Internship 2026 — Cyber Security** program. The core mandate was to design a **Zero-Trust Hybrid Datacenter/Cloud Security Architecture** for an educational institution. 

Educational institutions manage high-value assets with different security requirements, including Student Records (PII), Faculty Profiles, Research Data (Intellectual Property), and the Examination System (highly sensitive assessment papers and grading keys). The Research Application, being public-facing and collaborative, represents the highest entry risk. The motivation for SecureHaven was to build a concrete, fully configured Kubernetes implementation that guarantees that even if the public-facing application is fully compromised, the critical Examination System and its backing databases remain isolated, unreachable, and secure.

### 1.4 Objectives

* **Workload Sandboxing:** Implement container-layer hardening to ensure no processes run as root, all Linux kernel capabilities are dropped, and privilege escalation is blocked.
* **Filesystem Hardening:** Enforce read-only root filesystems across containers, providing ephemeral write exceptions only where necessary.
* **Network Microsegmentation:** Deploy namespace-scoped default-deny NetworkPolicies and construct explicit, port-restricted allow-lists.
* **Least-Privilege Access Control:** Create dedicated Kubernetes ServiceAccounts with token auto-mounting disabled on workloads, and configure read-only, namespace-scoped RBAC roles for monitoring tools.
* **Dynamic Secrets Injection:** Eliminate hardcoded database credentials by injecting credentials dynamically at runtime using Kubernetes Secrets.
* **Resource Exhaustion Defense:** Enforce ResourceQuotas and LimitRanges at the namespace and container levels to protect against Denial-of-Service attacks.
* **Observability Pipeline:** Construct a Next.js-based security dashboard that queries the cluster status securely from the server side and displays live compliance metrics.
* **Automated Verification:** Write testing scripts to validate image configurations, run network isolation tests, and audit source code for secrets.

### 1.5 Scope

The security hardening and verification scope of this project is focused on the `exam` namespace within the local `securehaven` Kubernetes cluster. The workloads hardened are:
1. `exam-app`: Node.js-based web frontend and API server (Port 8083).
2. `exam-db`: PostgreSQL database server hosting examination questions (Port 1521).
3. `security-dashboard`: Next.js-based administration portal monitoring cluster security (Port 3000).

Legacy namespaces (`student`, `faculty`, and `research`) are modeled in the repository's configuration layouts but are kept unhardened to serve as a baseline comparison.

### 1.6 Significance

SecureHaven serves as a practical, production-ready blueprint for securing containerized workloads. Rather than relying on high-level theoretical guidelines, this report provides concrete YAML configurations, custom Next.js monitoring logic, and automated testing tools that prove the viability of a Zero-Trust posture on Kubernetes.

---

## Chapter 2 — Existing System and Problem Analysis

### 2.1 Existing Approach

Traditional container orchestration setups treat the internal cluster network as a trusted zone. Standard configurations often exhibit the following characteristics:
* Containers build from generic base images with developer tools left installed.
* Application processes run with root privileges (UID 0) inside the container.
* Filesystem paths remain fully writable, allowing applications to store configuration, logs, and transient files directly on the container's root disk.
* Pods run under the `default` ServiceAccount, which automatically mounts a JWT token at `/var/run/secrets/kubernetes.io/serviceaccount/token`.
* No NetworkPolicies are deployed, allowing unrestricted cross-pod and cross-namespace traffic.

### 2.2 Limitations of Existing Approach

| Configuration Defect | Primary Exploit Vector | Business Impact |
|:---|:---|:---|
| Root Container Process | Kernel vulnerability exploitation allows escape to the host namespace. | Complete host takeover; access to other containers on the node. |
| Writable Root Filesystem | Attackers deploy persistent scripts, tools (e.g., nmap, curl), or modify binaries. | Long-term backdoors; data extraction. |
| Auto-mounted default SA Token | Attacker steals token and uses it to query the Kubernetes API. | Service account hijacking; unauthorized cluster control. |
| Flat Pod Network | Lateral port scanning and database access from a compromised container. | Data theft from neighboring applications. |
| No Resource Limits | Compromised container is used for cryptomining or gets flooded with requests. | Host exhaustion; denial of service for all applications on the host. |
| Hardcoded Credentials | Database credentials are checked into Git repositories in cleartext. | Credential exposure to unauthorized developers or public leaks. |

### 2.3 Need for Zero-Trust Kubernetes Security

The perimeter firewall is no longer sufficient. Under a Zero-Trust architecture, the network must be designed as if an attacker is already present inside the cluster boundary. Every access request, database query, and API call must be explicitly authenticated and authorized. SecureHaven implements this by applying least-privilege configurations at the container runtime, local disk, network routing, identity management, and resource quota layers.

---

## Chapter 3 — Proposed System

### 3.1 SecureHaven Overview

The proposed system, **SecureHaven**, is a secure-by-default Kubernetes deployment architecture paired with an interactive Next.js monitoring dashboard. The project hardens the `exam` namespace against the vulnerabilities identified in Chapter 2, achieving a verified, auditable security posture.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          "exam" Namespace                              │
│                                                                        │
│  ┌───────────────────────┐                  ┌───────────────────────┐  │
│  │       exam-app        │ ───TCP 1521────► │        exam-db        │  │
│  │ (Node 22, UID 1000)   │                  │ (PostgreSQL, Port1521)│  │
│  │ readOnlyRootFS: true  │                  │  readOnlyRootFS: false│  │
│  └───────────────────────┘                  └───────────────────────┘  │
│        │                                                               │
│        ▼ Egress (UDP 53)                                               │
│  ┌───────────────────────┐                                             │
│  │       kube-dns        │ (in kube-system namespace)                  │
│  └───────────────────────┘                                             │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        security-dashboard                        │  │
│  │     - Next.js 16 UI with CSS Variable-Based Dark/Light Themes     │  │
│  │     - Server-side Kubernetes API client (read-only)               │  │
│  │     - Runs on Port 3000 as UID 1000 with readOnlyRootFS           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Key Features

1. **Host-Isolated Containers:** All workloads run as UID 1000, with Linux capabilities dropped and privilege escalation disabled.
2. **Immutable Filesystems:** The root filesystem of application containers is read-only, preventing post-compromise modifications.
3. **Calico-Enforced Default-Deny:** A strict default-deny network policy isolates all pods, with explicit connection white-listing.
4. **Token Isolation:** Workload ServiceAccounts have token auto-mounting turned off to prevent credential theft.
5. **Secure Dashboard Observability:** Next.js queries Kubernetes APIs server-side, sanitizing and presenting telemetry to the client without exposing API credentials.
6. **Namespace Resource Caps:** Enforced quotas and container limit ranges prevent resource starvation and DoS attacks.

### 3.3 System Uniqueness and Innovation

SecureHaven introduces several unique features compared to standard security frameworks:

* **Active Defense + Telemetry Observability Loop:** Instead of relying on static configurations or external security agents, SecureHaven integrates security hardening with a tailored monitoring dashboard. The dashboard queries the cluster's state to provide immediate feedback on active security policies.
* **Clientless In-Cluster Querying:** The dashboard uses the Kubernetes API server-side using the `@kubernetes/client-node` SDK. It sanitizes the response, stripping out environment variables, internal IPs, and secret tokens before sending data to the browser client. This architecture eliminates credential exposure.
* **Dual-Validation Isolation Testing:** The testing pipeline validates the security posture at both the Kubernetes level (using custom validation commands) and the network layer (using an automated 4x4 connection matrix test run inside Docker Compose).

---

## Chapter 4 — Requirement Analysis

### 4.1 Functional Requirements

* **FR-1 (Health Verification):** The `exam-app` must expose a `/health` endpoint returning a JSON payload indicating application health and database connection status.
* **FR-2 (Database Integration):** The `exam-app` must query `exam-db` on the custom port `1521` to fetch examination metadata.
* **FR-3 (Telemetry API):** The security dashboard must expose a server-side route `/api/security-status` to query pods, deployments, services, network policies, resource quotas, and service accounts in the `exam` namespace.
* **FR-4 (Security Matrix UI):** The dashboard frontend must render a compliance matrix showing the status (PASS/FAIL/INFO) of the security domains.
* **FR-5 (Resource Visualizer):** The dashboard must display ResourceQuota utilization and LimitRange default settings.
* **FR-6 (Test Console):** The dashboard must present verification results from the automated testing scripts.

### 4.2 Non-Functional Requirements

* **NFR-1 (Dashboard Performance):** The dashboard must load and display metrics within 3 seconds of the initial request.
* **NFR-2 (Responsive Design):** The user interface must be responsive across standard desktop viewports (minimum width 1024px).
* **NFR-3 (Theme Consistency):** The dashboard must support dark and light modes, with theme choices persisting across page reloads without visual flicker (FOUC).
* **NFR-4 (Secure Failure Handling):** The dashboard API must degrade gracefully and display fallback mock metrics if it cannot connect to the Kubernetes API.

### 4.3 Security Requirements

* **SR-1 (Non-Root Execution):** Containers must run as an unprivileged user (UID 1000) and block root operations.
* **SR-2 (Capability Pruning):** Container runtime specifications must explicitly drop all Linux kernel capabilities.
* **SR-3 (Write Protection):** The container root directory must be read-only.
* **SR-4 (Network Segmentation):** All ingress and egress traffic in the `exam` namespace must default to deny unless explicitly white-listed.
* **SR-5 (Token Safety):** The `automountServiceAccountToken` field must be set to `false` for application pods.
* **SR-6 (API Access Control):** The dashboard must access the cluster using a dedicated ServiceAccount bound to a Role restricting permissions to read-only `get` and `list` operations in the `exam` namespace.

---

## Chapter 5 — System Architecture

### 5.1 Overall Architecture

SecureHaven is deployed inside a local Kubernetes cluster. The architectural layout consists of the core components below.

```
┌──────────────────────────────────────────────────────────┐
│                   Kind Kubernetes Cluster                │
│                                                          │
│  ┌─────────────────── exam namespace ──────────────────┐ │
│  │                                                     │ │
│  │  ┌─────────────┐    TCP:1521    ┌──────────────┐   │ │
│  │  │  exam-app   │ ─────────────► │   exam-db    │   │ │
│  │  │  (Node 22)  │               │ (PostgreSQL) │   │ │
│  │  │  Port:8083  │               │  Port:1521   │   │ │
│  │  └─────────────┘               └──────────────┘   │ │
│  │        │                                           │ │
│  │        │ DNS:53                                    │ │
│  │        ▼                                           │ │
│  │  ┌─────────────┐                                   │ │
│  │  │  kube-dns   │  (kube-system namespace)          │ │
│  │  └─────────────┘                                   │ │
│  │                                                     │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │         security-dashboard                    │  │ │
│  │  │  - Next.js 16 UI with Theme Persistence       │  │ │
│  │  │  - ServiceAccount: security-dashboard-sa     │  │ │
│  │  │  - Role: security-dashboard-role (read-only) │  │ │
│  │  │  - Port: 3000                                │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Kubernetes Architecture

* **Namespaces:** The `exam` namespace provides a logical isolation boundary.
* **ServiceAccounts:**
  * `exam-app-sa`: Assigned to the exam-app pod (no API permissions, token disabled).
  * `exam-db-sa`: Assigned to the database pod (no API permissions, token disabled).
  * `security-dashboard-sa`: Assigned to the dashboard pod, granting access to read-only resource information.
* **RBAC Role & Binding:** A `Role` named `security-dashboard-role` restricts dashboard API access to `get` and `list` operations for pods, services, deployments, network policies, resource quotas, limit ranges, and service accounts. A `RoleBinding` links this Role to the dashboard ServiceAccount.
* **NetworkPolicies:** Enforce traffic rules. The default policy blocks all ingress and egress. Explicit rules allow communication from `exam-app` to `exam-db` on port 1521, and to `kube-dns` on port 53.
* **ResourceQuota & LimitRange:** The quota limits the namespace to 4 pods, 500m CPU requests, and 256Mi memory requests. The LimitRange sets default requests and limits for containers that do not define them.

### 5.3 Dashboard Telemetry Integration

The Next.js dashboard uses a server-side route `/api/security-status` to query the cluster state. It initializes a Kubernetes client from the local container environment, queries the Kubernetes API, filters out sensitive data, and returns a clean JSON payload to the client browser.

---

## Chapter 6 — Technology Stack

### 6.1 Core Technologies

* **Kubernetes (Kind):** Used to coordinate and manage the containerized workloads.
* **Calico CNI:** Network plugin used to enforce default-deny and port-level NetworkPolicies.
* **Docker:** Used to build application container images.
* **Node.js 22 & Express.js:** Backing runtime and API framework for the `exam-app`.
* **PostgreSQL 15-alpine:** Database engine used to store exam data.
* **Next.js 16 (React 19 & TypeScript 5):** Development stack for the security monitoring dashboard.
* **Tailwind CSS 4:** Styling framework used to implement the responsive UI.
* **@kubernetes/client-node:** Software development kit used to query the Kubernetes API.

---

## Chapter 7 — Security Design and Implementation

### 7.1 Container Security

**Problem:** Running containers as root allows an attacker who achieves container escape to inherit root access on the host node.

**Control:** Enforce non-root execution, disable privilege escalation, and drop all Linux kernel capabilities.

**Implementation (`k8s/deployments/exam-app.yaml`):**
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
uid=1000(node) gid=1000(node) groups=1000(node)
```

**Result:** PASS — The process runs as unprivileged UID 1000.

### 7.2 Filesystem Hardening

**Problem:** Writable filesystems allow an attacker to write backdoors or modify existing application files.

**Control:** Set the container root filesystem to read-only, and mount a temporary writable directory using `emptyDir` with a size limit of `50Mi`.

**Implementation (`k8s/deployments/exam-app.yaml`):**
```yaml
volumeMounts:
  - mountPath: /tmp
    name: tmp-volume
volumes:
  - name: tmp-volume
    emptyDir:
      sizeLimit: 50Mi
```

**Verification:**
```bash
$ kubectl exec -n exam deploy/exam-app -- sh -c "touch /usr/src/app/test"
touch: /usr/src/app/test: Read-only file system

$ kubectl exec -n exam deploy/exam-app -- sh -c "touch /tmp/test && echo TMP_WRITE_OK"
TMP_WRITE_OK
```

**Result:** PASS — The root directory is read-only, and the `/tmp` folder is write-allowed but restricted to `50Mi`.

### 7.3 Network Security

**Problem:** Standard Kubernetes networking allows any pod to communicate with any other pod in the cluster, facilitating lateral movement.

**Control:** Deploy a default-deny NetworkPolicy for the namespace, and define explicit rules for app-to-database connections and DNS queries.

**Implementation (`k8s/network-policies/database/exam-db-policy.yaml`):**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: exam-db-ingress
  namespace: exam
spec:
  podSelector:
    matchLabels:
      app: exam-db
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: exam-app
      ports:
        - protocol: TCP
          port: 1521
```

**Result:** PASS — Unauthorized ingress and egress traffic is dropped.

### 7.4 RBAC and ServiceAccounts

**Problem:** Default ServiceAccounts carry tokens that mount inside containers, allowing attackers who compromise a container to query the Kubernetes API.

**Control:** Assign dedicated ServiceAccounts with `automountServiceAccountToken: false` to workloads, and create a restricted, read-only ServiceAccount for the dashboard.

**Implementation (`k8s/rbac/exam-serviceaccount.yaml`):**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: exam-app-sa
  namespace: exam
automountServiceAccountToken: false
```

**Result:** PASS — Application workloads run without API tokens.

### 7.5 Secrets Management

**Problem:** Cleartext credentials stored in source code are vulnerable to exposure in code repositories.

**Control:** Inject secrets dynamically at runtime using Kubernetes Secrets and environment variables.

**Implementation (`k8s/deployments/exam-app.yaml`):**
```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: exam-db-secret
        key: db-password
```

**Result:** PASS — Credentials are injected at runtime.

### 7.6 Resource Protection

**Problem:** A container consuming excessive resources can exhaust host capacity and deny service to neighboring applications.

**Control:** Configure a namespace ResourceQuota to cap aggregate resources, and a LimitRange to set default requests and limits.

**Implementation (`k8s/deployments/exam-quota.yaml`):**
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: exam-quota
  namespace: exam
spec:
  hard:
    pods: "4"
    requests.cpu: "500m"
    requests.memory: "256Mi"
    limits.cpu: "1"
    limits.memory: "512Mi"
```

**Result:** PASS — Resource allocations are restricted at the namespace and container levels.

### 7.7 Container Image Security

**Problem:** Outdated base images may contain critical vulnerabilities in their system packages.

**Control:** Use Node.js 22 on Alpine Linux, execute production-only dependency installations, and use `.dockerignore` files to exclude sensitive resources from container builds.

**Result:** PASS — The application builds from a hardened base image.

### 7.8 Dashboard API Security

**Problem:** Observability tools can leak cluster credentials to client web browsers.

**Control:** Execute Kubernetes client calls server-side in Next.js, sanitizing the payload before returning data to the client.

**Result:** PASS — The client browser receives only safe telemetry data.

---

## Chapter 8 — Dashboard Implementation

### 8.1 Overview

The dashboard is built on Next.js 16, utilizing server-side rendering (SSR) and API routes to monitor cluster health.

### 8.2 UI Components

* **`SecurityScore.tsx`:** Renders an animated SVG gauge representing the overall security score.
* **`SecurityControlCard.tsx`:** Renders a list of the security domains and their status.
* **`WorkloadCard.tsx`:** Renders status cards for the deployed workloads, including restarts and container images.
* **`NetworkOverview.tsx`:** Renders a visual map of the allowed and blocked traffic paths.
* **`ResourceOverview.tsx`:** Displays ResourceQuota utilization progress bars.
* **`VerificationPanel.tsx`:** Displays the status of the runtime verification checks.

### 8.3 Theme System Implementation

The dashboard features a dark and light theme system designed to prevent visual flickering on page load:
1. **Blocking Script:** A synchronous JavaScript snippet in `<head>` (in `app/layout.tsx`) reads the user's theme preference from `localStorage` and applies the `.dark` class before the first paint.
2. **Hydration Sync:** The theme toggle in `Topbar.tsx` uses a React `mounted` state check to ensure the UI is hydrated before rendering client-side assets, resolving hydration warnings.

---

## Chapter 9 — Testing and Verification

### 9.1 Testing Strategy

Testing was conducted across three layers:
1. **Automated Suites:** Running `run_tests.js` to scan for secrets and check Dockerfile configurations, and `container_tests.js` to run a network isolation matrix test.
2. **Kubernetes Runtime Checks:** Running `kubectl exec` and `kubectl get` commands to verify pod privileges, read-only filesystems, and policies.
3. **Build Verifications:** Executing Next.js build compilation checks to ensure type safety.

### 9.2 Verification Results

| Test ID | Security Control Tested | Expected Result | Actual Result | Status |
|:---:|:---|:---|:---|:---:|
| SEC-01 | Non-root execution (UID 1000) | Process UID is 1000 | Process runs as UID 1000 | ✅ PASS |
| SEC-02 | Writable root FS block | Write command fails | `Read-only file system` | ✅ PASS |
| SEC-03 | Writable `/tmp` volume | Write command succeeds | `TMP_WRITE_OK` | ✅ PASS |
| SEC-04 | Privilege escalation | Escalation is blocked | Escalation blocked | ✅ PASS |
| SEC-05 | Linux kernel capabilities | All capabilities dropped | Capabilities dropped | ✅ PASS |
| SEC-06 | Calico NetworkPolicy status | Network policies are active | Policies active | ✅ PASS |
| SEC-07 | Unauthorized ingress block | Ingress attempt times out | Ingress blocked | ✅ PASS |
| SEC-08 | PostgreSQL connection status | Workload connects to database | Connected | ✅ PASS |
| SEC-09 | ResourceQuota boundaries | Allocation limits enforced | Limits active | ✅ PASS |
| SEC-10 | LimitRange values | Default CPU/Memory enforced | Defaults active | ✅ PASS |
| SEC-11 | Workload restart count | Restart count is 0 | Restart count is 0 | ✅ PASS |
| SEC-12 | Pod health state | Status is Running | Pods Running | ✅ PASS |
| SEC-13 | Node.js engine version | Version is v22.23.2 | Version is v22.23.2 | ✅ PASS |

### 9.3 Automated Test Suites

The automated test script `run_tests.js` scans the source code for hardcoded secrets, verifies Dockerfile configurations, and performs health endpoint checks. 

The test runner `tests/container/container_tests.js` executes a connection matrix test across the application services, verifying that workloads can only connect to their designated database.

---

## Chapter 10 — Results and Discussion

### 10.1 Security Score Summary

| Security Domain | Core Indicator Metric | Score | Status |
|:---|:---|:---:|:---:|
| Container Security | Non-root UID, dropped kernel capabilities | 100/100 | ✅ PASS |
| Filesystem Security | readOnlyRootFilesystem, emptyDir size cap | 100/100 | ✅ PASS |
| Network Security | Default-deny, Calico NetworkPolicies | 100/100 | ✅ PASS |
| RBAC & Identity | Dedicated ServiceAccounts, read-only dashboard | 100/100 | ✅ PASS |
| Secrets Management | Injection via secretKeyRef, no hardcoded values | 90/100 | ✅ PASS |
| Resource Protection | ResourceQuotas and LimitRanges active | 100/100 | ✅ PASS |
| Runtime Health | Pods running with 0 restarts, database connected | 100/100 | ✅ PASS |
| Image Security | Node 22-alpine base, npm audit clean | 80/100 | ⚠️ INFO |
| **Overall Score** | **System Compliance Rating** | **96/100** | **SECURE** |

### 10.2 Technical Discussion

Applying Kubernetes native security configurations helps establish a defense-in-depth security posture. Isolating the monitoring dashboard with a read-only ServiceAccount demonstrates the principle of least privilege. 

The 10-point deduction in Secrets Management reflects a limitation: Kubernetes Secrets in the local development files are base64-encoded rather than encrypted. The 20-point deduction in Image Security reflects the absence of a binary container vulnerability scanner in the local environment.

---

## Chapter 11 — Limitations

1. **Vulnerability Scanning Limitation:** Local testing did not include a binary container image scanner (such as Trivy or Grype).
2. **Namespace Hardening Scope:** Security hardening is restricted to the `exam` namespace. The `student`, `faculty`, and `research` namespaces run in legacy, unhardened states.
3. **Secrets Encryption:** Secrets in the local deployment configuration files are base64-encoded.
4. **Local Cluster Environment:** Testing was conducted on a local single-node Kind cluster, not a production cloud service.
5. **Database Filesystem Write Access:** The PostgreSQL container runs with a writable filesystem to support database writing operations.

---

## Chapter 12 — Future Enhancements

1. **Vulnerability Scanner Integration:** Integrate Trivy or Grype scanning into the container image build pipeline.
2. **Secrets Manager Integration:** Integrate a dedicated secret manager (like HashiCorp Vault) to handle database credentials.
3. **Expanded Hardening:** Implement similar security configurations across the student, faculty, and research namespaces.
4. **Static Image Digest Pinning:** Use immutable SHA256 image digests in the deployment manifests.
5. **Monitoring and Alerting:** Integrate Prometheus and Grafana to track resource usage metrics.

---

## Chapter 13 — Conclusion

SecureHaven demonstrates the practical implementation of Zero-Trust security principles on Kubernetes. The hardened configuration achieved a verified security score of 96/100, passing all 13 primary runtime validation checks. The monitoring dashboard provides real-time visibility into the cluster state without exposing credentials to the client browser, demonstrating how security configuration and observability can be combined.

---

## Chapter 14 — Developer Contribution and Implementation Challenges

### 14.1 Developer Contribution Details

As the primary developer of the SecureHaven project, my contributions spanned security engineering, backend API development, and frontend interface design:
* **Security Engineering:** Created the Kubernetes manifests, including SecurityContexts, NetworkPolicies, ServiceAccounts, and resource limits for the workloads.
* **Backend API Development:** Built the server-side Next.js API route that queries the Kubernetes cluster using the `@kubernetes/client-node` SDK.
* **Frontend Design:** Designed and developed the glassmorphic user interface using Tailwind CSS and React, implementing a dark and light theme switching system.
* **Automation Testing:** Wrote the test runners `run_tests.js` and `container_tests.js` to validate image configurations and network isolation boundaries.

### 14.2 Implementation Challenges & Resolutions

#### Challenge 1: Hydration Mismatch & FOUC in Next.js Theme System
* **Problem:** Implementing the dark and light theme toggle caused a Flash of Unstyled Content (FOUC) on page reload, as well as React hydration warnings because the server-rendered HTML did not match the client-side theme state stored in `localStorage`.
* **Resolution:** I resolved this by injecting a blocking, synchronous script inside the document `<head>` in `app/layout.tsx`. This script reads the theme preference and applies the `.dark` class to the `<html>` tag before the first paint. I also added a `mounted` state check to the theme toggle in `Topbar.tsx` to delay rendering client-side assets until hydration completes.

#### Challenge 2: Read-Only rootFilesystem Permissions
* **Problem:** Enabling `readOnlyRootFilesystem: true` caused the Node.js application to crash on startup because it could not write logs or temporary run files.
* **Resolution:** I resolved this by configuring an `emptyDir` volume mounted at `/tmp` with a `50Mi` size limit. This provides a temporary, size-restricted writable folder for the application while keeping the rest of the filesystem read-only.

#### Challenge 3: Network Policy DNS Resolution Blocks
* **Problem:** Applying default-deny policies broke DNS resolution for `exam-app`, preventing it from resolving the `exam-db` service address.
* **Resolution:** I resolved this by creating a dedicated egress rule (`exam-dns-egress`) that allows outgoing traffic on port 53 to the `kube-dns` service in the `kube-system` namespace.

---

## Chapter 15 — Real-World Application and Global Impact

### 15.1 Real-World Significance

SecureHaven demonstrates how to implement Zero-Trust principles in microservice architectures:
* **Lateral Movement Containment:** In the event of a container compromise, the network and filesystem controls restrict the attacker from moving laterally to access other database services.
* **Observation Integrity:** The dashboard architecture shows how to monitor cluster health without exposing administrative credentials to the browser client.
* **DevSecOps Reference:** The configuration files and testing scripts provide a reference pattern for implementing security controls in CI/CD pipelines.

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

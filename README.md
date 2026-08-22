<p align="center">
  <img src="https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js_22-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL_15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Calico_CNI-FF6600?style=for-the-badge&logo=linux&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<h1 align="center">🛡️ SecureHaven</h1>
<h3 align="center">Kubernetes Security Hardening & Zero-Trust Security Monitoring Dashboard</h3>

<p align="center">
  <strong>B.Tech CSE Final Year Project — Cisco Virtual Internship 2026 (Cyber Security)</strong>
</p>

<p align="center">
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Security_Audit-PASS-22c55e?style=flat-square" /></a>
  <img src="https://img.shields.io/badge/Security_Score-96%2F100-22c55e?style=flat-square" />
  <img src="https://img.shields.io/badge/Namespace_Scope-exam-8b5cf6?style=flat-square" />
  <img src="https://img.shields.io/badge/Cluster-securehaven-0ea5e9?style=flat-square" />
  <img src="https://img.shields.io/badge/Verified_Tests-13%20PASS-22c55e?style=flat-square" />
</p>

---

## 📋 Table of Contents

- [About](#-about)
- [Architecture](#-architecture)
- [Security Controls](#-security-controls)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Security Dashboard](#-security-dashboard)
- [Testing & Verification](#-testing--verification)
- [Security Score](#-security-score)
- [Known Limitations](#-known-limitations)
- [Future Enhancements](#-future-enhancements)
- [Documentation Index](#-documentation-index)
- [Author](#-author)

---

## 🎯 About

**SecureHaven** is a comprehensive Kubernetes security hardening project that implements a defense-in-depth, zero-trust architecture for an academic institution's multi-tier workloads. The project demonstrates real-world container security, network microsegmentation, RBAC least-privilege enforcement, and live security telemetry monitoring through a purpose-built Next.js dashboard.

The project was built as part of the **Cisco Virtual Internship 2026 — Cyber Security** program and addresses the problem statement of designing a **Zero-Trust Hybrid Datacenter/Cloud Security Architecture**.

### Core Objectives

1. **Container Hardening** — Enforce non-root execution, capability dropping, read-only filesystems, and privilege escalation prevention.
2. **Network Microsegmentation** — Implement default-deny NetworkPolicies using Calico CNI with explicit allow-list rules.
3. **RBAC & Identity Isolation** — Assign dedicated ServiceAccounts per workload with zero API permissions and disabled token auto-mounting.
4. **Resource Protection** — Enforce ResourceQuotas and LimitRanges to prevent denial-of-service attacks.
5. **Live Security Monitoring** — Build a real-time security dashboard that queries Kubernetes APIs server-side and presents sanitized telemetry.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    SecureHaven Cluster                    │
│                    (Kind Kubernetes)                      │
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
│  │  │  (Next.js 16 + Kubernetes API Client)        │  │ │
│  │  │  ServiceAccount: security-dashboard-sa       │  │ │
│  │  │  Role: security-dashboard-role (read-only)   │  │ │
│  │  │  Port: 3000                                  │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  │                                                     │ │
│  │  Policies: exam-default-deny, exam-app-network-     │ │
│  │            policy, exam-db-ingress,                 │ │
│  │            exam-app-egress-to-db, exam-dns-egress   │ │
│  │  Quotas:   exam-quota, exam-limits                  │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Dashboard Data Flow

```
Browser ──► Next.js UI (Client) ──► /api/security-status (Server Route)
                                           │
                                    security-dashboard-sa
                                    (namespace-scoped read-only)
                                           │
                                    Kubernetes API Server
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                           Pods      NetworkPolicies  ResourceQuotas
                        Deployments  LimitRanges     ServiceAccounts
```

---

## 🔒 Security Controls

| Security Domain | Control | Status |
|:---|:---|:---:|
| **Container Security** | Non-root UID 1000, capabilities drop ALL, no privilege escalation | ✅ PASS |
| **Filesystem Hardening** | Read-only root filesystem, size-limited `/tmp` (50Mi emptyDir) | ✅ PASS |
| **Network Security** | Default-deny NetworkPolicy, microsegmented egress/ingress | ✅ PASS |
| **RBAC & Identity** | Dedicated ServiceAccounts, `automountServiceAccountToken: false` | ✅ PASS |
| **Secrets Management** | Dynamic injection via `secretKeyRef`, no hardcoded credentials | ✅ PASS |
| **Resource Protection** | ResourceQuota (4 pods, CPU/mem limits), LimitRange defaults | ✅ PASS |
| **Runtime Health** | All pods running, 0 restarts, database connected | ✅ PASS |
| **Image Security** | Node.js 22-alpine, npm audit clean; CVE scanner unavailable | ⚠️ INFO |
| **Dashboard API** | Server-side only K8s queries, sanitized responses, no credential exposure | ✅ PASS |

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
|:---|:---|:---|:---|
| **Orchestration** | Kubernetes (Kind) | Local cluster | Container orchestration & policy enforcement |
| **Network CNI** | Calico | — | Default-deny NetworkPolicy enforcement |
| **Container Runtime** | Docker | — | Container image build & runtime |
| **Application** | Node.js | v22.23.2 (Alpine) | Exam portal backend runtime |
| **Database** | PostgreSQL | 15-alpine | Examination data persistence |
| **Dashboard Framework** | Next.js | 16.3.2 | Security monitoring dashboard (SSR + API) |
| **UI Library** | React | 19.2.8 | Component-based dashboard UI |
| **Type System** | TypeScript | 5.x | Type-safe development |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS with dark/light theme |
| **K8s SDK** | @kubernetes/client-node | 0.21.0 | Server-side Kubernetes API integration |
| **Version Control** | Git / GitHub | — | Source control & collaboration |

---

## 📁 Project Structure

```
SecureHaven/
├── apps/
│   ├── exam/                          # Examination Portal (Node.js)
│   │   ├── Dockerfile                 # Non-root Node 22-alpine image
│   │   ├── .dockerignore              # Build context pruning
│   │   ├── package.json               # Express.js dependency
│   │   └── src/
│   │       ├── server.js              # Express API + health endpoint
│   │       ├── config.js              # Environment configuration
│   │       ├── database.js            # PostgreSQL connection
│   │       └── logger.js              # Structured logging
│   ├── security-dashboard/            # Security Monitoring Dashboard
│   │   ├── Dockerfile                 # Multi-stage non-root build
│   │   ├── package.json               # Next.js + K8s client deps
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout + theme script
│   │   │   ├── page.tsx               # Main dashboard page
│   │   │   ├── globals.css            # Theme system (CSS variables)
│   │   │   └── api/security-status/
│   │   │       └── route.ts           # K8s API server-side route
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   │   │   └── Topbar.tsx         # Header + theme toggle
│   │   │   └── dashboard/
│   │   │       ├── SecurityScore.tsx   # Security posture gauge
│   │   │       ├── SecurityControlCard.tsx
│   │   │       ├── WorkloadCard.tsx    # Pod monitoring cards
│   │   │       ├── NetworkOverview.tsx # Network policy visualization
│   │   │       ├── ResourceOverview.tsx # Quota & limits display
│   │   │       ├── VerificationPanel.tsx
│   │   │       └── FindingsSummary.tsx # Known limitations
│   │   ├── lib/
│   │   │   ├── k8s-client.ts          # Kubernetes client init
│   │   │   └── mock-data.ts           # Fallback data definitions
│   │   └── types/
│   │       └── security.ts            # TypeScript interfaces
│   ├── student/                       # Student Portal (outside scope)
│   ├── faculty/                       # Faculty Portal (outside scope)
│   └── research/                      # Research Portal (outside scope)
│
├── k8s/
│   ├── deployments/
│   │   ├── exam-app.yaml              # Hardened exam-app Deployment
│   │   ├── exam-db.yaml               # PostgreSQL Deployment
│   │   ├── exam-quota.yaml            # ResourceQuota (4 pods, CPU/mem)
│   │   ├── exam-limits.yaml           # LimitRange defaults
│   │   └── security-dashboard.yaml    # Dashboard SA + Role + Deployment
│   ├── rbac/
│   │   └── exam-serviceaccount.yaml   # exam-app-sa + exam-db-sa
│   ├── network-policies/
│   │   ├── default-deny/
│   │   │   └── exam-default-deny.yaml # Namespace default-deny
│   │   ├── dns/
│   │   │   └── exam-dns-egress.yaml   # kube-dns egress allowlist
│   │   └── database/
│   │       └── exam-db-policy.yaml    # App→DB ingress/egress rules
│   ├── networkpolicy.yaml             # exam-app-network-policy
│   ├── config/
│   │   └── exam-secrets.yaml          # Kubernetes Secret (dev only)
│   ├── services/
│   │   ├── exam-app-service.yaml      # ClusterIP :8083
│   │   └── exam-db-service.yaml       # ClusterIP :1521
│   └── tests/                         # K8s verification scripts
│
├── tests/
│   └── container/
│       └── container_tests.js         # Docker Compose isolation matrix
│
├── docs/                              # 28 documentation files
│   ├── PROJECT_CONTEXT.md             # Project overview & business context
│   ├── ARCHITECTURE.md                # Hybrid datacenter architecture
│   ├── THREAT_MODEL.md                # STRIDE threat analysis
│   ├── SECURITY_MODEL.md              # Zero-trust policy model
│   ├── PROJECT_REPORT.md              # Full academic project report
│   ├── TESTING_REPORT.md              # Detailed testing results
│   └── ... (see Documentation Index)
│
├── SECURITY.md                        # Security hardening audit report
├── docker-compose.yml                 # Multi-service isolated networks
├── run_tests.js                       # Automated test suite
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/) installed (for Kubernetes cluster)
- [Node.js 22+](https://nodejs.org/) (for local dashboard development)

### 1. Create the Kind Cluster

```bash
kind create cluster --name securehaven
```

### 2. Install Calico CNI (for NetworkPolicy enforcement)

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

### 3. Create Namespace and Apply Manifests

```bash
# Create the exam namespace
kubectl create namespace exam

# Apply secrets, quotas, and limits
kubectl apply -f k8s/config/exam-secrets.yaml
kubectl apply -f k8s/deployments/exam-quota.yaml
kubectl apply -f k8s/deployments/exam-limits.yaml

# Apply RBAC
kubectl apply -f k8s/rbac/exam-serviceaccount.yaml

# Apply network policies
kubectl apply -f k8s/network-policies/default-deny/exam-default-deny.yaml
kubectl apply -f k8s/network-policies/dns/exam-dns-egress.yaml
kubectl apply -f k8s/network-policies/database/exam-db-policy.yaml
kubectl apply -f k8s/networkpolicy.yaml

# Build and load container images
docker build -t exam-app:latest ./apps/exam
kind load docker-image exam-app:latest --name securehaven

# Deploy workloads
kubectl apply -f k8s/deployments/exam-db.yaml
kubectl apply -f k8s/services/exam-db-service.yaml
kubectl apply -f k8s/deployments/exam-app.yaml
kubectl apply -f k8s/services/exam-app-service.yaml
```

### 4. Deploy the Security Dashboard

```bash
# Build and load the dashboard image
docker build -t securehaven-dashboard:latest ./apps/security-dashboard
kind load docker-image securehaven-dashboard:latest --name securehaven

# Deploy (includes ServiceAccount, Role, RoleBinding, Deployment, Service)
kubectl apply -f k8s/deployments/security-dashboard.yaml
```

### 5. Access the Dashboard

```bash
# Port-forward to access the dashboard
kubectl port-forward -n exam svc/security-dashboard 3000:80

# Open in browser
# http://localhost:3000
```

### Local Development (Dashboard Only)

```bash
cd apps/security-dashboard
npm install
npm run dev
# Dashboard available at http://localhost:3000
# Note: Uses mock data when Kubernetes API is unavailable
```

---

## 📊 Security Dashboard

The SecureHaven Security Dashboard provides a real-time, glassmorphic monitoring interface for the security posture of the `exam` namespace.

### Dashboard Features

| Feature | Description |
|:---|:---|
| **Security Score** | Animated gauge showing composite security posture (0–100) |
| **Security Control Matrix** | 8 verified security domains with PASS/INFO/FAIL status |
| **Workload Monitoring** | Live pod status, restarts, CPU/memory, container images |
| **Network Visualization** | Zero-trust traffic flow diagram with allowed/blocked paths |
| **Resource Monitoring** | ResourceQuota usage bars and LimitRange configurations |
| **Verification Panel** | 13 runtime verification test results |
| **Findings Summary** | Known limitations and informational notices |
| **Dark/Light Theme** | Persistent theme with FOUC-free synchronous switching |

### API Architecture

The dashboard's `/api/security-status` route runs **server-side only**, using the `security-dashboard-sa` ServiceAccount to query:
- Pods, Deployments, Services
- NetworkPolicies
- ResourceQuotas, LimitRanges
- ServiceAccounts

All responses are **sanitized** — no environment variables, secrets, tokens, or internal IP addresses are exposed to the browser client.

---

## ✅ Testing & Verification

### Kubernetes Runtime Verification

| Test ID | Test | Expected | Actual | Status |
|:---:|:---|:---|:---|:---:|
| SEC-01 | Non-root execution (UID 1000) | UID 1000 | UID 1000 | ✅ |
| SEC-02 | Read-only root filesystem write | Blocked | `Read-only file system` | ✅ |
| SEC-03 | `/tmp` directory write | Allowed | `TMP_WRITE_OK` | ✅ |
| SEC-04 | Privilege escalation | Disabled | Disabled | ✅ |
| SEC-05 | Linux capabilities | Drop ALL | Drop ALL | ✅ |
| SEC-06 | NetworkPolicy active | Active | Active | ✅ |
| SEC-07 | Unauthorized ingress | Blocked | Timeout | ✅ |
| SEC-08 | PostgreSQL connectivity | Connected | `mock: false` | ✅ |
| SEC-09 | ResourceQuota enforced | Active | Active | ✅ |
| SEC-10 | LimitRange enforced | Active | Active | ✅ |
| SEC-11 | Zero restart count | 0 | 0 | ✅ |
| SEC-12 | Pod health status | Running | Running | ✅ |
| SEC-13 | Node.js 22 runtime | v22.23.2 | v22.23.2 | ✅ |

### Automated Test Suites

```bash
# Run application integrity tests (secrets scan, Dockerfile audit, API tests)
node run_tests.js

# Run container network isolation matrix
node tests/container/container_tests.js
```

---

## 📈 Security Score

| Security Domain | Score | Status |
|:---|:---:|:---:|
| Container Security | 100 | ✅ PASS |
| Filesystem Security | 100 | ✅ PASS |
| Network Security | 100 | ✅ PASS |
| RBAC & ServiceAccounts | 100 | ✅ PASS |
| Secrets Management | 90 | ✅ PASS |
| Resource Protection | 100 | ✅ PASS |
| Runtime Health | 100 | ✅ PASS |
| Image Security | 80 | ⚠️ INFO |
| **Overall** | **96/100** | **SECURE** |

> **Note**: Image Security scored 80 because a dedicated container CVE scanner (Trivy/Grype) was unavailable on the local lab host. The npm production dependency audit returned 0 vulnerabilities.

---

## ⚠️ Known Limitations

1. **Image Vulnerability Scanning**: A dedicated binary container scanner (Trivy/Grype) was not available locally. Only `npm audit --omit=dev` was performed (0 vulnerabilities found).
2. **Namespace Scope**: Security hardening is limited to the `exam` namespace. The `student`, `faculty`, and `research` namespaces are outside the hardening scope.
3. **Development Secrets**: Kubernetes secrets in `k8s/config/` are base64-encoded (not encrypted). These are strictly for local lab/dev use.
4. **Local Environment**: All testing was performed on a single-node Kind cluster, not a production cloud environment.

---

## 🔮 Future Enhancements

- [ ] **Trivy/Grype CI Integration** — Automated container image CVE scanning in CI/CD pipelines
- [ ] **Production Secret Management** — HashiCorp Vault or External Secrets Operator integration
- [ ] **Multi-Namespace Hardening** — Extend controls to `student`, `faculty`, and `research` namespaces
- [ ] **Immutable Image Digests** — Pin container images by SHA256 digest instead of mutable tags
- [ ] **Database Resource Profiling** — Monitor and scale memory limits based on realistic traffic patterns
- [ ] **Prometheus/Grafana Integration** — Extended metrics collection and alerting

---

## 📚 Documentation Index

### Core Security Documentation

| Document | Description |
|:---|:---|
| [**SECURITY.md**](SECURITY.md) | Security hardening audit report with verified test results |
| [**docs/PROJECT_REPORT.md**](docs/PROJECT_REPORT.md) | Complete academic project report for submission |
| [**docs/TESTING_REPORT.md**](docs/TESTING_REPORT.md) | Detailed testing & verification results |

### Architecture & Design

| Document | Description |
|:---|:---|
| [**docs/PROJECT_CONTEXT.md**](docs/PROJECT_CONTEXT.md) | Business context, threat scenario, and project objectives |
| [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md) | Hybrid datacenter/cloud network architecture |
| [**docs/KUBERNETES_ARCHITECTURE.md**](docs/KUBERNETES_ARCHITECTURE.md) | Kubernetes cluster design and namespace layout |
| [**docs/CONTAINER_ARCHITECTURE.md**](docs/CONTAINER_ARCHITECTURE.md) | Container build strategy and image hardening |
| [**docs/NETWORK_DESIGN.md**](docs/NETWORK_DESIGN.md) | Network topology and segmentation design |

### Security Analysis

| Document | Description |
|:---|:---|
| [**docs/THREAT_MODEL.md**](docs/THREAT_MODEL.md) | STRIDE-based threat analysis with attack scenarios |
| [**docs/SECURITY_MODEL.md**](docs/SECURITY_MODEL.md) | Zero-trust policy definitions and access controls |
| [**docs/RBAC_MODEL.md**](docs/RBAC_MODEL.md) | RBAC design and ServiceAccount architecture |
| [**docs/NETWORKPOLICY_MODEL.md**](docs/NETWORKPOLICY_MODEL.md) | NetworkPolicy design and microsegmentation rules |
| [**docs/COMMUNICATION_MATRIX.md**](docs/COMMUNICATION_MATRIX.md) | Allowed/denied communication flow matrix |
| [**docs/SERVICEACCOUNT_SECURITY.md**](docs/SERVICEACCOUNT_SECURITY.md) | ServiceAccount identity isolation strategy |

### Security Reviews

| Document | Description |
|:---|:---|
| [**docs/PHASE1_SECURITY_REVIEW.md**](docs/PHASE1_SECURITY_REVIEW.md) | Phase 1 security review findings |
| [**docs/PHASE2_SECURITY_REVIEW.md**](docs/PHASE2_SECURITY_REVIEW.md) | Phase 2 security review findings |
| [**docs/PHASE3A_SECURITY_REVIEW.md**](docs/PHASE3A_SECURITY_REVIEW.md) | Phase 3A — Container hardening review |
| [**docs/PHASE3B_SECURITY_REVIEW.md**](docs/PHASE3B_SECURITY_REVIEW.md) | Phase 3B — Network isolation review |
| [**docs/PHASE3C_SECURITY_REVIEW.md**](docs/PHASE3C_SECURITY_REVIEW.md) | Phase 3C — RBAC and identity review |
| [**docs/PHASE3D_SECURITY_REVIEW.md**](docs/PHASE3D_SECURITY_REVIEW.md) | Phase 3D — Database allow-list review |
| [**docs/SECURITY_REVIEW_REPORT.md**](docs/SECURITY_REVIEW_REPORT.md) | Consolidated security review report |
| [**docs/REMEDIATION_REPORT.md**](docs/REMEDIATION_REPORT.md) | Security remediation actions taken |

### Implementation

| Document | Description |
|:---|:---|
| [**docs/IMPLEMENTATION_PLAN.md**](docs/IMPLEMENTATION_PLAN.md) | Phased implementation roadmap |
| [**docs/KUBERNETES_DEPLOYMENT.md**](docs/KUBERNETES_DEPLOYMENT.md) | Kubernetes deployment procedures |
| [**docs/KUBERNETES_SECURITY.md**](docs/KUBERNETES_SECURITY.md) | Kubernetes security configuration guide |
| [**docs/APPLICATION_SECURITY.md**](docs/APPLICATION_SECURITY.md) | Application-layer security controls |
| [**docs/ON_PREM_FIREWALL_POLICY.md**](docs/ON_PREM_FIREWALL_POLICY.md) | On-premises firewall policy rules |
| [**docs/DECISIONS.md**](docs/DECISIONS.md) | Technical decision rationale |
| [**docs/APPLICATIONS.md**](docs/APPLICATIONS.md) | Application portfolio overview |

---

## 👤 Author

**Krishna Mohan**
- B.Tech CSE — LNCTS, Bhopal
- Cisco Virtual Internship 2026 — Cyber Security

---

<p align="center">
  <sub>Built with ❤️ for academic excellence in cybersecurity education</sub>
</p>

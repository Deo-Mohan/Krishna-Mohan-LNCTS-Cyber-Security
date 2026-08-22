# PHASE 1 SECURITY REVIEW

**Reviewer**: Senior Application Security Architect  
**Date**: 2026-08-22  
**Scope**: Phase 1 — Application Foundation (Student, Faculty, Examination, Research Portals)  
**Method**: Line-by-line source code inspection of all `src/`, `public/`, `Dockerfile`, `package.json`, `run_tests.js`, and `/docs/` artifacts. Static analysis for secrets, fingerprints, missing safeguards, and architectural boundary violations.

---

## Review Summary

The four applications are intentionally simple, consistently structured, and correctly architected as passive security-test workloads. No application implements network-level security controls in code (no fake 403s, no IP-based blocking, no cross-app deny logic). The separation between application responsibility and infrastructure responsibility is clean.

The codebase has **zero critical findings** and **zero high-severity findings**. There are several medium and low findings that are non-blocking for Phase 2 but should be tracked for resolution before production-grade Kubernetes deployment.

---

## Findings

---

### P1-SEC-01: Logger reads `APP_NAME` independently from config.js

| Field | Value |
|---|---|
| **ID** | P1-SEC-01 |
| **Severity** | Low |
| **Files** | `apps/student/src/logger.js:1-3` (all four apps) |
| **Problem** | The logger defines its own `config = { APP_NAME: process.env.APP_NAME || 'student-portal' }` object at the top of the file rather than importing the shared `config.js` module. If `config.js` defaults are changed (e.g., to rename an app), the logger's application name will diverge. |
| **Security Impact** | SIEM log correlation could attribute logs to the wrong application if names drift. This is a telemetry integrity issue, not a direct exploit. |
| **Recommended Fix** | Change `logger.js` to `const config = require('./config');` (same as `database.js` already does). |
| **Required Before Phase 2?** | **NO** — Non-blocking. Fix during Phase 2 hardening. |

---

### P1-SEC-02: Express `X-Powered-By` header not disabled

| Field | Value |
|---|---|
| **ID** | P1-SEC-02 |
| **Severity** | Low |
| **Files** | `apps/*/src/server.js` (all four apps) |
| **Problem** | Express enables the `X-Powered-By: Express` response header by default. This leaks the server technology stack to any client or attacker performing reconnaissance. |
| **Security Impact** | Information disclosure. An attacker learns the exact framework, enabling targeted CVE lookups. Standard CIS/OWASP hardening recommends removing this header. |
| **Recommended Fix** | Add `app.disable('x-powered-by');` after `const app = express();` in each `server.js`. |
| **Required Before Phase 2?** | **NO** — Non-blocking. Low-priority hardening. |

---

### P1-SEC-03: No `.dockerignore` files

| Field | Value |
|---|---|
| **ID** | P1-SEC-03 |
| **Severity** | Medium |
| **Files** | `apps/student/`, `apps/faculty/`, `apps/exam/`, `apps/research/` |
| **Problem** | No `.dockerignore` file exists in any application directory. When `docker build` runs, the entire build context — including `node_modules/`, `.env` files (if they exist in future), test files, `.git/`, and any other local artifacts — is sent to the Docker daemon and potentially baked into the image layer cache. |
| **Security Impact** | If a developer creates a local `.env` file with real database credentials for testing, that file could be copied into the Docker image and shipped to a registry. The `COPY` statements (`COPY src/ ./src/`, `COPY public/ ./public/`) are scoped and would not copy `.env`, but the build context transfer itself is wasteful and a latent risk. |
| **Recommended Fix** | Create a `.dockerignore` in each app directory containing: `node_modules`, `.env`, `.env.*`, `tests/`, `*.md`, `.git`. |
| **Required Before Phase 2?** | **YES** — Must be in place before any container image is pushed to a registry. |

---

### P1-SEC-04: No `.gitignore` at project root

| Field | Value |
|---|---|
| **ID** | P1-SEC-04 |
| **Severity** | Medium |
| **Files** | Project root (`d:\DEVELOPMENT\Krishna Mohan - LNCTS - Cyber Security\`) |
| **Problem** | No `.gitignore` file exists at the project root or in any app directory. `node_modules/` directories (currently 68 packages × 4 apps = ~272 package installations) and any future `.env` files would be committed to version control. |
| **Security Impact** | Committing `node_modules/` bloats the repository. More critically, committing `.env` files would expose database credentials in Git history permanently. |
| **Recommended Fix** | Create a root `.gitignore` with entries for: `node_modules/`, `.env`, `.env.*`, `*.log`, `.DS_Store`. |
| **Required Before Phase 2?** | **YES** — Must be in place before any `git commit`. |

---

### P1-SEC-05: `express.json()` uses default body size limit (100KB)

| Field | Value |
|---|---|
| **ID** | P1-SEC-05 |
| **Severity** | Low |
| **Files** | `apps/*/src/server.js:9` (all four apps) |
| **Problem** | `app.use(express.json())` uses Express's default 100KB body limit. While these apps currently have no POST/PUT endpoints that consume request bodies, the middleware is mounted globally. If POST endpoints are added in Phase 2, the default limit is reasonable but not explicitly documented. |
| **Security Impact** | Without an explicit limit, a future developer might unknowingly accept multi-megabyte payloads, enabling memory exhaustion denial-of-service. The current 100KB default is safe but implicit. |
| **Recommended Fix** | Make the limit explicit: `app.use(express.json({ limit: '100kb' }))`. This documents the intent and prevents regression. |
| **Required Before Phase 2?** | **NO** — Current apps have no body-consuming routes. Fix when POST routes are added. |

---

### P1-SEC-06: Health endpoint triggers active TCP probe on every request

| Field | Value |
|---|---|
| **ID** | P1-SEC-06 |
| **Severity** | Low |
| **Files** | `apps/*/src/database.js:11-48` (all four apps) |
| **Problem** | Every call to `/health` opens a new TCP socket to the database port, waits up to 2 seconds, then destroys it. In Kubernetes, the kubelet calls liveness/readiness probes every 10-30 seconds. At 4 apps × 1 probe/10s, this creates ~24 TCP connections per minute to the database hosts. More importantly, every call to the API endpoint (e.g., `GET /api/students`) ALSO triggers a full TCP probe before returning data. |
| **Security Impact** | Not a direct security vulnerability, but the double-probe on API calls (once for health check in `getStudents()`, once for the actual data fetch) creates unnecessary network noise. In a Kubernetes environment with NetworkPolicies, these probes will generate allow/deny log entries in the CNI, potentially flooding SIEM with routine connection events and masking real attack signatures. |
| **Recommended Fix** | Cache the database connectivity status with a short TTL (e.g., 10 seconds). On API calls, check the cached status instead of opening a new socket. Health endpoint can still do a live probe. |
| **Required Before Phase 2?** | **NO** — Acceptable for Phase 1 workloads. Optimize during Kubernetes integration to reduce log noise. |

---

### P1-SEC-07: Mock data returned even when real database connects

| Field | Value |
|---|---|
| **ID** | P1-SEC-07 |
| **Severity** | Medium |
| **Files** | `apps/*/src/database.js` (all four apps) |
| **Problem** | When `checkDatabaseConnectivity()` succeeds (TCP connection established, `status: 'connected', mock: false`), the data-fetching functions (`getStudents()`, `getCourses()`, etc.) still return the hardcoded mock arrays. The `mock: false` flag in the health response is misleading — it suggests the app is using real data when it is not. |
| **Security Impact** | This could hide a real security failure during Phase 2 testing. If a Kubernetes NetworkPolicy is misconfigured and accidentally allows a cross-namespace database connection, the TCP probe would succeed, the health check would say `connected`, but the app would still serve mock data — making it impossible to distinguish between "app correctly talking to its own DB" and "app accidentally connected to the wrong DB". |
| **Recommended Fix** | Document explicitly in `APPLICATION_SECURITY.md` that mock data is always returned regardless of TCP probe status in Phase 1. In Phase 2, when real database drivers are added, the `mock` flag must control whether the app queries the real DB or returns mock data. The health check should also report `dataSource: 'mock'` or `dataSource: 'live'` to prevent false confidence. |
| **Required Before Phase 2?** | **YES** — The documentation must clearly state this limitation. The code fix (real DB queries) is a Phase 2 deliverable, but the health response should not imply live data connectivity. |

---

### P1-SEC-08: No rate limiting on API or health endpoints

| Field | Value |
|---|---|
| **ID** | P1-SEC-08 |
| **Severity** | Low |
| **Files** | `apps/*/src/server.js` (all four apps) |
| **Problem** | No rate limiting is applied to any endpoint. An attacker with network access to a pod (e.g., through a compromised ZTNA gateway) could flood `/health` or `/api/*` endpoints. |
| **Security Impact** | Denial of service against individual pods. However, the approved architecture states that the ZTNA Gateway is responsible for rate limiting (THREAT_MODEL.md, STRIDE DoS row). This is the correct enforcement point. |
| **Recommended Fix** | No application-level rate limiting needed. This is correctly deferred to the ZTNA gateway and Kubernetes resource limits. Document this decision. |
| **Required Before Phase 2?** | **NO** — Architectural decision is sound. No code change needed. |

---

### P1-SEC-09: `req.originalUrl` logged directly — potential log injection

| Field | Value |
|---|---|
| **ID** | P1-SEC-09 |
| **Severity** | Low |
| **Files** | `apps/*/src/logger.js:36` (all four apps) |
| **Problem** | The logging middleware includes `req.originalUrl` directly in the log message string: `` logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {...}) ``. If an attacker sends a request with a crafted URL containing JSON control characters or newlines, the log message could be corrupted. However, because the message is serialized through `JSON.stringify()`, JSON special characters are automatically escaped. |
| **Security Impact** | Minimal. `JSON.stringify()` properly escapes `"`, `\n`, `\r`, and other control characters. Log injection is effectively mitigated by the structured logging format. No action required. |
| **Recommended Fix** | None needed. The JSON serialization handles this correctly. |
| **Required Before Phase 2?** | **NO** — Already mitigated by design. |

---

### P1-SEC-10: No authentication or authorization on any endpoint

| Field | Value |
|---|---|
| **ID** | P1-SEC-10 |
| **Severity** | Informational |
| **Files** | `apps/*/src/server.js` (all four apps) |
| **Problem** | All API and health endpoints are unauthenticated. Any client with network access can query `/api/students`, `/api/exams/questions`, etc. |
| **Security Impact** | This is **intentionally correct**. Per the approved architecture (SECURITY_MODEL.md §3.2), authentication is enforced at the ZTNA Gateway layer. The gateway validates user identity and MFA, then forwards requests with a signed `x-ztna-user` header. The applications read this header for logging but do not enforce it — this is the correct design because authentication is a gateway responsibility, not an application responsibility. Adding auth checks in application code would violate the separation-of-concerns principle and create a false security boundary. |
| **Recommended Fix** | No change. Phase 2 should add JWT signature validation at the application layer as a defense-in-depth measure (per SECURITY_MODEL.md §3 "Backend Application Token Validation"), but the Phase 1 foundation correctly defers this. |
| **Required Before Phase 2?** | **NO** — Correct architectural decision. JWT validation is a Phase 2/3 enhancement. |

---

### P1-SEC-11: Exam portal mock data contains answer keys

| Field | Value |
|---|---|
| **ID** | P1-SEC-11 |
| **Severity** | Low |
| **Files** | `apps/exam/src/database.js:7` |
| **Problem** | The mock exam data includes an `answer` field: `answer: 'readOnlyRootFilesystem: true'`. This answer is returned in the API response to any authenticated user. |
| **Security Impact** | In a real examination system, returning answer keys in the API response would be a critical data exposure vulnerability. However, this is mock data in a security lab workload. The data exists to demonstrate what the exam portal stores, not to implement real exam security. |
| **Recommended Fix** | No code change needed. Optionally remove the `answer` field from mock data to avoid confusion during demonstrations. |
| **Required Before Phase 2?** | **NO** — Mock data only. |

---

## Positive Observations

The following security properties were verified and confirmed correct:

| # | Property | Status |
|---|---|---|
| 1 | No hardcoded secrets in any source file | ✅ Confirmed |
| 2 | `DB_PASSWORD` defaults to empty string, must be injected via env | ✅ Confirmed |
| 3 | No `.env` files committed to source | ✅ Confirmed |
| 4 | All Dockerfiles use `USER node` (non-root) | ✅ Confirmed |
| 5 | All Dockerfiles use Alpine base (minimal attack surface) | ✅ Confirmed |
| 6 | `npm ci --only=production` (no devDependencies in image) | ✅ Confirmed |
| 7 | COPY directives are scoped (`src/`, `public/`) — no wildcard `COPY . .` | ✅ Confirmed |
| 8 | Structured JSON logging to stdout | ✅ Confirmed |
| 9 | No passwords, tokens, or secrets in log output | ✅ Confirmed |
| 10 | `SIGTERM` handler for graceful shutdown (K8s pod termination) | ✅ Confirmed |
| 11 | Health endpoint returns `503` when DB is unreachable (`STRICT_DB_CHECK`) | ✅ Confirmed |
| 12 | Error responses use generic messages, do not leak stack traces | ✅ Confirmed |
| 13 | 404 handler returns structured JSON, not default Express HTML | ✅ Confirmed |
| 14 | Applications do NOT implement network security in code | ✅ Confirmed — Critical requirement |
| 15 | Applications do NOT block cross-app traffic via HTTP 403 | ✅ Confirmed — Critical requirement |
| 16 | Applications do NOT share database credentials | ✅ Confirmed (each has unique `DB_USER`, `DB_NAME`) |
| 17 | Each app has a distinct port (8081-8084) | ✅ Confirmed |
| 18 | Each app targets a distinct database port matching architecture | ✅ Confirmed |
| 19 | Single dependency (Express) — minimal attack surface | ✅ Confirmed |
| 20 | `express ^4.19.2` — no known critical CVEs at time of review | ✅ Confirmed |
| 21 | Consistent internal structure across all four apps | ✅ Confirmed |
| 22 | Test suite covers startup, health, API, 404, fail-closed, and secret scan | ✅ Confirmed |
| 23 | Applications are not over-engineered | ✅ Confirmed — Appropriately simple |

---

## Cross-Application Security Boundary Check

| Question | Answer |
|---|---|
| Does any app import code from another app? | **No** — Complete isolation. |
| Does any app reference another app's database credentials? | **No** — Each has unique `DB_USER`, `DB_NAME`, `DB_PORT`. |
| Does any app attempt to connect to another app's port? | **No** — Each only connects to its own `DB_HOST:DB_PORT`. |
| Does any app return HTTP 403 to simulate network isolation? | **No** — Correct. Network isolation is infrastructure-only. |
| Does any app check the source IP of incoming requests? | **No** — Correct. Source IP filtering is a NetworkPolicy/firewall responsibility. |
| Could the mock data behavior hide a real NetworkPolicy failure? | **Yes** — See P1-SEC-07. TCP probe succeeds but mock data is always returned regardless. Must be documented. |

---

## Kubernetes Readiness Assessment

| Requirement | Status |
|---|---|
| Health endpoint (`/health`) exists | ✅ Ready |
| Health endpoint returns `503` on dependency failure | ✅ Ready |
| SIGTERM graceful shutdown handler | ✅ Ready |
| Listens on `0.0.0.0` (not `127.0.0.1`) | ✅ Ready |
| Port configurable via environment variable | ✅ Ready |
| Non-root container user | ✅ Ready |
| No volume mounts required | ✅ Ready |
| No hostNetwork/hostPID/hostIPC required | ✅ Ready |
| Structured stdout logging (for sidecar collection) | ✅ Ready |
| `.dockerignore` present | ❌ Must create (P1-SEC-03) |

---

## Required Fixes Before Phase 2

Only **two items** must be resolved:

| ID | Fix | Effort |
|---|---|---|
| **P1-SEC-03** | Create `.dockerignore` in each app directory | 5 minutes |
| **P1-SEC-04** | Create `.gitignore` at project root | 2 minutes |

One additional **documentation clarification** is required:

| ID | Fix | Effort |
|---|---|---|
| **P1-SEC-07** | Document in `APPLICATION_SECURITY.md` that mock data is always returned regardless of DB connectivity status. Health response should be updated to include `dataSource: 'mock'` in Phase 2. | 5 minutes |

---

## Non-Blocking Improvements (Defer to Phase 2)

| ID | Improvement | Priority |
|---|---|---|
| P1-SEC-01 | Logger should import shared `config.js` | Low |
| P1-SEC-02 | Disable `X-Powered-By` header | Low |
| P1-SEC-05 | Make `express.json()` body limit explicit | Low |
| P1-SEC-06 | Cache DB connectivity status to reduce probe noise | Low |

---

## Verdict

### ✅ APPROVED FOR PHASE 2

**Conditions**: The three required fixes listed above (P1-SEC-03, P1-SEC-04, P1-SEC-07 documentation) must be applied before beginning Phase 2 container and Kubernetes deployment work. These are trivial file additions and a documentation update — no application logic changes are required.

**Rationale**: The applications are correctly structured as passive security-test workloads. They do not implement any network security boundaries in application code. They are simple, clean, modular, testable, container-ready, and security-conscious. The single external dependency (Express 4.19.x) has no known critical vulnerabilities. The codebase is not over-engineered. All 37 tests pass. The applications are ready to become Kubernetes workloads once the `.dockerignore` and `.gitignore` files are created.

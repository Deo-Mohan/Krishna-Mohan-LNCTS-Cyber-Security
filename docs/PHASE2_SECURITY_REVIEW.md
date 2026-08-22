# PHASE 2 SECURITY REVIEW

**Reviewer**: Senior Infrastructure & Container-Security Architect  
**Date**: 2026-08-22  
**Scope**: Phase 2 — Container Infrastructure Foundation  
**Method**: Line-by-line static analysis of `docker-compose.yml`, `.env`, `.env.example`, `.gitignore`, `container_tests.js`, `CONTAINER_ARCHITECTURE.md`, and all Phase 1 application code relevant to container integration.

---

## 1. Findings

---

### P2-SEC-01: `.env.example` contains actual working passwords

| Field | Value |
|---|---|
| **ID** | P2-SEC-01 |
| **Severity** | Medium |
| **File** | `.env.example` |
| **Evidence Type** | Configuration-level |
| **Problem** | `.env.example` contains what appear to be usable development passwords (e.g., `student_dev_pass_9988`). The `.gitignore` excludes `.env` and `.env.*` but `.env.example` does **not** match the `.env.*` glob pattern — it will be committed to version control. While these are labeled as development credentials, the convention for `.env.example` files is to contain **placeholder values** (e.g., `STUDENT_DB_PASSWORD=changeme`) rather than functional passwords. |
| **Security Impact** | If a developer copies `.env.example` to `.env` without changing values (which is the standard workflow), the "example" passwords become the actual runtime passwords. An attacker reading the committed `.env.example` would know the exact development credentials. Low real-world risk for a local-only dev environment, but it establishes a bad habit. |
| **Recommended Fix** | Replace actual passwords in `.env.example` with placeholder tokens: `STUDENT_DB_PASSWORD=<CHANGE_ME>`. Keep real values only in the gitignored `.env`. |
| **Required Before Phase 3?** | **YES** — Trivial fix. Prevents credential leakage pattern. |

---

### P2-SEC-02: Faculty DB healthcheck leaks password via command-line argument

| Field | Value |
|---|---|
| **ID** | P2-SEC-02 |
| **Severity** | Medium |
| **File** | `docker-compose.yml:59` |
| **Evidence Type** | Configuration-level |
| **Problem** | The MariaDB health check uses: `mariadb-admin ping -h localhost -u faculty_user --password=$$FACULTY_DB_PASSWORD`. The `$$` syntax in Compose files resolves to a literal `$` at runtime, meaning the healthcheck command will literally pass `--password=$FACULTY_DB_PASSWORD` as a string to the shell inside the container. This will **fail authentication** because the actual password value is not being interpolated — the literal string `$FACULTY_DB_PASSWORD` is used as the password. |
| **Security Impact** | The healthcheck will always fail for the faculty-db container. Docker will report the service as unhealthy. Because `faculty-app` has `depends_on: condition: service_healthy`, the faculty application container will **never start**. This is a functional blocker. Additionally, even if the variable were correctly interpolated, passing passwords as command-line arguments exposes them in `/proc/<pid>/cmdline` inside the container. |
| **Recommended Fix** | Use a password-free healthcheck. MariaDB supports `healthcheck.cnf` files or the simpler `mysqladmin ping` without authentication by relying on the unix socket. Alternative: `test: ["CMD-SHELL", "healthcheck() { mariadb-admin ping -h localhost; }; healthcheck"]` or better: `test: ["CMD", "healthcheck", "--connect", "--innodb_initialized"]` if using MariaDB 10.11+. The simplest reliable fix: `test: ["CMD-SHELL", "mariadb-admin ping -h 127.0.0.1 -u root -p$$MYSQL_ROOT_PASSWORD || exit 1"]` — but note this still has the `$$` problem. The cleanest approach is: `test: ["CMD-SHELL", "mariadb-admin ping -h 127.0.0.1"]` which pings via the local socket and does not require a password. |
| **Required Before Phase 3?** | **YES** — The faculty-db service will never pass its healthcheck in the current configuration, which blocks `faculty-app` from starting. |

---

### P2-SEC-03: Documentation incorrectly characterizes isolation mechanism

| Field | Value |
|---|---|
| **ID** | P2-SEC-03 |
| **Severity** | Medium (Documentation Accuracy) |
| **File** | `docs/CONTAINER_ARCHITECTURE.md:55`, `docs/CONTAINER_ARCHITECTURE.md:66-80` |
| **Evidence Type** | Configuration-level analysis |
| **Problem** | The documentation states: *"Because Docker's embedded DNS server only resolves and routes container names on networks to which a container is explicitly attached, workloads are logically and physically segmented at the container engine layer."* The enforcement column in the communication matrix says: *"Network segmentation (DNS resolution & routing denied)"*. This conflates two distinct mechanisms: (1) DNS resolution failure, and (2) network-layer routing isolation. **DNS resolution failure alone is NOT a security boundary.** If an attacker inside `student-app` discovered the IP address of `faculty-db` (e.g., through container metadata, ARP scanning, or information leakage), they could potentially connect directly by IP. The actual security guarantee comes from **Docker's bridge network isolation**: containers on separate user-defined bridge networks are placed on different Linux bridge interfaces with separate IP subnets, and by default Docker does **not** create iptables FORWARD rules between distinct user-defined bridge networks. Therefore: **the isolation IS real, but the reason stated in the documentation is wrong.** The guarantee comes from the lack of inter-bridge routing at the kernel/iptables level, NOT from DNS resolution behavior. |
| **Security Impact** | If someone reads the documentation and believes DNS is the security boundary, they might assume that adding a container to a second network (for a legitimate operational reason) would only affect DNS resolution — when in fact it would create a routing path. The documentation must accurately describe **why** the isolation works. |
| **Recommended Fix** | Update `CONTAINER_ARCHITECTURE.md` to state: *"Each network uses a separate Linux bridge with a distinct IP subnet. Docker does not create forwarding rules between separate user-defined bridge networks, so containers on different networks have no IP-level reachability. DNS resolution failure is a side effect of this network-level isolation, not the cause of it."* |
| **Required Before Phase 3?** | **YES** — Documentation accuracy is a security requirement for this project. |

---

### P2-SEC-04: Container test suite uses hostname-based probes only

| Field | Value |
|---|---|
| **ID** | P2-SEC-04 |
| **Severity** | Low |
| **File** | `tests/container/container_tests.js:83` |
| **Evidence Type** | Static validation |
| **Problem** | The test probes use `probeNetworkConnection(sourceApp, targetDb.name, targetDb.port)` where `targetDb.name` is a hostname (e.g., `'faculty-db'`). If the hostname fails to resolve (which it will, since the containers are on different networks), the probe fails — but this only proves DNS isolation, not network-layer isolation. A more rigorous test would also attempt connection by IP address to confirm that even with a known IP, the connection is blocked. |
| **Security Impact** | The tests would pass even if inter-network routing existed, as long as DNS resolution was unavailable. This means the tests validate the **weaker** guarantee (DNS) rather than the **stronger** guarantee (routing). |
| **Recommended Fix** | Optionally add a secondary test that resolves the target DB's IP from its own network (via `docker inspect`) and then attempts a direct IP connection from the cross-network app container. This confirms routing-level isolation. |
| **Required Before Phase 3?** | **NO** — The Docker Compose network configuration is structurally correct. The test gap is a test-quality observation, not a blocking security issue. Kubernetes NetworkPolicy tests in Phase 3 will provide the definitive enforcement validation. |

---

### P2-SEC-05: Database containers run as root

| Field | Value |
|---|---|
| **ID** | P2-SEC-05 |
| **Severity** | Low |
| **File** | `docker-compose.yml:7-21` (all DB services) |
| **Evidence Type** | Configuration-level |
| **Problem** | The official `postgres:15-alpine` and `mariadb:10.11-alpine` images run their database processes as `root` internally (Postgres drops to user `postgres` after initialization, but the entrypoint starts as root). The application containers correctly run as `USER node`, but the database containers have no explicit `user:` directive. |
| **Security Impact** | Minimal in the local development context. The database images are official vendor images and the root entrypoint is required for data directory initialization. In Kubernetes (Phase 3), Pod Security Standards will enforce `runAsNonRoot` which will need to be addressed with init containers or volume permission settings. |
| **Recommended Fix** | No change needed in Phase 2. Document as a Phase 3 consideration for Pod Security Standard compliance. |
| **Required Before Phase 3?** | **NO** — Expected behavior for official DB images in development. |

---

### P2-SEC-06: No `internal: true` flag on database networks

| Field | Value |
|---|---|
| **ID** | P2-SEC-06 |
| **Severity** | Low |
| **File** | `docker-compose.yml:173-181` |
| **Evidence Type** | Configuration-level |
| **Problem** | The four networks are defined as standard bridge networks without `internal: true`. Docker networks with `internal: true` prevent containers on that network from reaching the host's external network interface (i.e., the internet). Without it, database containers can potentially make outbound connections to the internet (e.g., if compromised). |
| **Security Impact** | Low. In a development environment, database containers do not initiate outbound connections. In production, Kubernetes egress NetworkPolicies will handle this. |
| **Recommended Fix** | Optionally add `internal: true` to further harden the development environment. Not required for Phase 2 scope. |
| **Required Before Phase 3?** | **NO** — Development convenience. Kubernetes egress policies are the production enforcement point. |

---

## 2. Security Assessment

### What Was Done Correctly

| # | Property | Status | Evidence Type |
|---|---|---|---|
| 1 | Four separate user-defined bridge networks created | ✅ | Configuration |
| 2 | Each app attached to exactly one network | ✅ | Configuration |
| 3 | Each DB attached to exactly one network | ✅ | Configuration |
| 4 | No service attached to multiple networks | ✅ | Configuration |
| 5 | Database ports not exposed to host | ✅ | Configuration |
| 6 | Application ports exposed only for development access | ✅ | Configuration |
| 7 | Credentials sourced from `.env` file | ✅ | Configuration |
| 8 | `.env` file covered by `.gitignore` | ✅ | Configuration |
| 9 | Health checks defined for all DB services | ✅ | Configuration |
| 10 | `depends_on: condition: service_healthy` used | ✅ | Configuration |
| 11 | `STRICT_DB_CHECK: "true"` enabled in compose | ✅ | Configuration |
| 12 | `restart: unless-stopped` for dev resilience | ✅ | Configuration |
| 13 | No `privileged: true` on any container | ✅ | Configuration |
| 14 | No Docker socket mount | ✅ | Configuration |
| 15 | No `network_mode: host` | ✅ | Configuration |
| 16 | No `cap_add` escalation | ✅ | Configuration |
| 17 | Database types match architecture (PG, MariaDB, PG, PG) | ✅ | Configuration |
| 18 | Database ports match Phase 1 app configs (5432, 3306, 1521, 5432) | ✅ | Configuration |
| 19 | Unique DB users per service | ✅ | Configuration |
| 20 | Unique DB names per service | ✅ | Configuration |
| 21 | Phase 1 test suite unaffected (37/37) | ✅ | Runtime |
| 22 | Documentation labels this as "Development Isolation" | ✅ | Configuration |
| 23 | Documentation does not claim Kubernetes equivalence | ✅ | Configuration |

---

## 3. Runtime Verification Limitations

| Verification Area | Status | Notes |
|---|---|---|
| Docker image builds | **NOT VERIFIED** | Docker CLI not available on host |
| Container startup | **NOT VERIFIED** | Docker daemon not available |
| Database service health | **NOT VERIFIED** | Containers not running |
| Application ↔ DB connectivity (ALLOW paths) | **NOT VERIFIED** | Containers not running |
| Cross-network isolation (DENY paths) | **NOT VERIFIED** | Containers not running |
| Health check probe accuracy | **NOT VERIFIED** | Containers not running |
| Faculty DB healthcheck (`$$` interpolation) | **PREDICTED FAILURE** | See P2-SEC-02 |
| Container test suite execution | **NOT VERIFIED** | Docker CLI required |

> **Assessment**: The absence of Docker runtime verification is **not a security blocker for Phase 3**. Phase 2's purpose is to create a reproducible container definition that models the approved architecture's segmentation topology. The configuration is structurally sound. Kubernetes (Phase 3) will be the actual enforcement layer and will be runtime-verified independently.

---

## 4. Security Matrix

### Communication Path Classification

| Source | Target | Policy | Classification | Reasoning |
|---|---|---|---|---|
| `student-app` | `student-db` | **ALLOW** | **CONFIGURED BUT UNVERIFIED** | Both on `student-net`. Configuration correct. No runtime test. |
| `student-app` | `faculty-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks (`student-net` vs `faculty-net`). Docker bridge isolation prevents routing. No runtime test. |
| `student-app` | `exam-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |
| `student-app` | `research-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |
| `faculty-app` | `faculty-db` | **ALLOW** | **CONFIGURED BUT UNVERIFIED** | Both on `faculty-net`. Configuration correct. No runtime test. |
| `faculty-app` | `student-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |
| `faculty-app` | `exam-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |
| `faculty-app` | `research-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |
| `exam-app` | `exam-db` | **ALLOW** | **CONFIGURED BUT UNVERIFIED** | Both on `exam-net`. Configuration correct. No runtime test. |
| `exam-app` | `student-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |
| `exam-app` | `faculty-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |
| `exam-app` | `research-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |
| `research-app` | `research-db` | **ALLOW** | **CONFIGURED BUT UNVERIFIED** | Both on `research-net`. Configuration correct. No runtime test. |
| `research-app` | `student-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |
| `research-app` | `faculty-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |
| `research-app` | `exam-db` | **DENY** | **CONFIGURED BUT UNVERIFIED** | Different networks. No runtime test. |

**Summary**: 16/16 paths are **CONFIGURED BUT UNVERIFIED**. 0 paths are VERIFIED at runtime. 0 paths are NOT ENFORCED by configuration.

The configuration is structurally sound. Each service is attached to exactly one network, and no network is shared between workload pairs. Given Docker's well-documented behavior for user-defined bridge networks, the DENY paths will hold when containers are eventually started.

---

## 5. Required Fixes Before Phase 3

| ID | Fix | Effort | Blocking? |
|---|---|---|---|
| **P2-SEC-01** | Replace real passwords in `.env.example` with placeholders | 2 minutes | **YES** |
| **P2-SEC-02** | Fix faculty-db healthcheck (remove password from CLI, use socket-based ping) | 3 minutes | **YES** |
| **P2-SEC-03** | Correct documentation: isolation is from bridge routing, not DNS | 5 minutes | **YES** |

---

## 6. Phase 3 Readiness Assessment

| Criterion | Assessment |
|---|---|
| Does Docker Compose correctly model the approved architecture's segmentation? | **Yes** — 4 isolated network zones, 1:1 app-to-DB mapping. |
| Is Docker Compose the final enforcement layer? | **No** — Kubernetes NetworkPolicy is the target enforcement mechanism. |
| Does missing Docker runtime block Kubernetes work? | **No** — Kubernetes manifests, NetworkPolicies, and namespace definitions can be authored independently of Docker Compose. |
| Are Phase 1 applications Kubernetes-ready? | **Yes** — Confirmed in Phase 1 review (health endpoints, SIGTERM, 0.0.0.0 binding, env-based config, non-root). |
| Are the 3 required fixes blocking for Kubernetes work? | **Partially** — P2-SEC-01 and P2-SEC-03 are documentation/hygiene fixes that should happen before Phase 3 begins. P2-SEC-02 is a Docker Compose issue that blocks local testing but does not affect Kubernetes manifests. |

---

## 7. Final Verdict

### ✅ CONDITIONAL — FIX BEFORE PHASE 3

**Three required fixes must be applied:**

1. **P2-SEC-01**: Replace passwords in `.env.example` with `<CHANGE_ME>` placeholders.
2. **P2-SEC-02**: Fix the `faculty-db` healthcheck to not require password interpolation. Use `mariadb-admin ping -h 127.0.0.1` without credentials.
3. **P2-SEC-03**: Correct `CONTAINER_ARCHITECTURE.md` to accurately describe Docker bridge routing isolation as the security mechanism, not DNS resolution failure.

**These are all trivial fixes (~10 minutes total). Once applied, Phase 3 may begin.**

### Critical Observation on DNS vs. Network Isolation

The claim *"Because Docker's DNS server blocks resolution of container names across networks, workloads are logically isolated by default"* is **misleading but not fatally wrong**. To be precise:

- **DNS resolution failure** is a **consequence** of network isolation, not its **cause**.
- User-defined Docker bridge networks use **separate Linux bridges with separate subnets**. Docker's iptables rules do **not** create `FORWARD` chain entries between distinct user-defined bridges.
- Even if an attacker inside `student-app` obtained the raw IP address of `faculty-db`, the IP packet would have **no routing path** because the bridges are not interconnected.
- The isolation is therefore at the **IP routing layer**, which is stronger than DNS-only isolation.

This must be documented accurately because in Kubernetes (Phase 3), the team needs to understand that `NetworkPolicy` operates at the IP/port level — not at DNS — and the mental model must be consistent from Phase 2 onward.

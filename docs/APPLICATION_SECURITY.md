# Application Security Engineering & Standards

This document describes the security engineering practices, telemetry formats, secrets handling, and containment behaviors implemented across the workload portals.

---

## 1. Zero-Trust Security Separation (Application vs. Network)
A core tenet of our design is that **applications do not fake network security**.
- Applications behave normally and do not return artificial `403 Forbidden` errors to pretend that network isolation is happening.
- True network security and boundaries (e.g. blocking the Research Portal from reaching the Student Database) are enforced strictly at the infrastructural and runtime layer (VPC Security Groups, Kubernetes NetworkPolicies, Router Firewalls, and host-level iptables).
- This separation ensures the high-fidelity simulator represents a realistic production environment where applications run unaware of the network filters surrounding them.

---

## 2. Telemetry and Structured JSON Logging
Every application uses a standardized structured logger (`src/logger.js`) printing JSON formats directly to `stdout`.
- Standardized logs allow logging daemons (like fluent-bit or vector) to collect and stream telemetry logs to the SIEM without complex regex parsing.
- Logs include critical transaction fields:
  ```json
  {
    "timestamp": "2026-08-22T12:00:00.000Z",
    "application": "student-portal",
    "severity": "INFO",
    "message": "GET /api/students - 200",
    "requestId": "abc123xyz789",
    "user": "student_account_1",
    "sourceIp": "10.100.1.10",
    "method": "GET",
    "route": "/api/students",
    "status": 200,
    "durationMs": 4
  }
  ```
- **Secret Filtering**: Passwords, cookies, user authentication tokens, and private keys are strictly prohibited from being logged.

---

## 3. Dynamic Health Probing & Fail-Closed Behavior
Health endpoints (`/health`) perform active TCP connection checks.
- Instead of returning a static `200 OK`, each portal tries to open a TCP network connection to its database backend (`DB_HOST` and `DB_PORT`) using Node's `net.Socket`.
- If the socket connection fails:
  - If `STRICT_DB_CHECK=true` is enabled: The server immediately registers the dependency as offline, outputs an error trace in JSON log format, and returns an HTTP status code of `503 Service Unavailable`.
  - If strict mode is false: The server logs a warning but falls back to in-memory mock data (allowing local verification without running databases).
- This ensures that if network rules are misconfigured or drop packets, the application reflects this immediately in its health status rather than failing silently or leaking unhandled errors.

---

## 4. Secrets Management
- No passwords, private keys, or system credentials are hardcoded into the source code or configurations.
- The configuration reads secrets from environment variables (e.g. `DB_PASSWORD` mapping from `process.env.DB_PASSWORD`).
- Production deployments inject these environment variables dynamically using Kubernetes Secrets, Kubernetes ServiceAccount tokens, or encrypted vault runners.

---

## 5. Container Runtime Hardening
The Dockerfiles are structured to enforce the least privilege runtime:
- **Alpine Base Image**: Minimizes image size and removes unnecessary shells and utilities (like curl/wget where practical) to limit post-exploitation shell command capability.
- **Non-Root Execution**: By declaring `USER node` in the Dockerfile, the container runs under a standard unprivileged user account (UID `1000`) instead of running as `root` (UID `0`). If an attacker gains command execution inside the container, they cannot write files to system folders or capture network interfaces.

---

## 6. Phase 1 Testing & Mock Database Behavior Limitations

During Phase 1 development and validation, the following behaviors and limitations apply:
- **TCP Socket Probing**: Database connectivity is validated through TCP socket probing (`net.Socket`). The application checks if a TCP port is open at the configured `DB_HOST` and `DB_PORT`.
- **Mock Data Fallback**: To facilitate standalone testing and pipeline verification when database services are not yet running, high-fidelity mock data is returned by default when `STRICT_DB_CHECK` is disabled, even if no real database listener exists.
- **Authorization vs. Connectivity**: The mock data fallback is a temporary development and testing mechanism. It **MUST NOT** be interpreted as proof of successful production database authorization, user authentication, or complete transactional capability.
- **Infrastructure Validation**: Actual database authorization, database firewall policies, Kubernetes network policies (`NetworkPolicy`), and credential validation will be fully enforced and verified during subsequent infrastructure phases (Phase 2 and Phase 3).
- **Final Security Testing**: Production-level validation and security pen-testing must utilize real database endpoints to ensure end-to-end security compliance.


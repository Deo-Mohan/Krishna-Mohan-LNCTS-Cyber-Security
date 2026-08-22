# Kubernetes Security Hardening & Zero-Trust Audit Report

This document records the security hardening implementation, verification testing, and supply-chain analysis completed for the examination portal workloads in the **exam** namespace on the **securehaven** cluster.

> [!NOTE]
> This milestone focuses strictly on the security architecture of the `exam` namespace. The `student`, `faculty`, and `research` namespaces were outside the scope of this security-hardening phase.

---

## 1. Scope of the Hardening Milestone

| Parameter | Configuration |
| :--- | :--- |
| **Target Cluster** | `securehaven` (local Kind Kubernetes cluster) |
| **Namespace** | `exam` |
| **Workloads** | `exam-app` (Web Frontend & API Portal), `exam-db` (PostgreSQL Database Backend) |
| **Container Image** | `exam-app:latest` (Custom build running Node.js 22) |
| **Database Container** | `postgres:15-alpine` |

---

## 2. Container Security (Least Privilege & Sandbox)

Workload configurations have been hardened to restrict container privilege levels and drop unnecessary kernel capabilities:

* **Non-Root Execution**: Both workloads are configured to run as non-root users.
  - `runAsNonRoot: true`
  - `runAsUser: 1000` (Maps to the unprivileged `node` user in the application image)
* **Privilege Escalation Blocked**: `allowPrivilegeEscalation: false` prevents child processes from gaining more privileges than their parent.
* **Capabilities Drop**: All standard Linux kernel capabilities are explicitly dropped via:
  ```yaml
  securityContext:
    capabilities:
      drop:
        - ALL
  ```
* **Dedicated Workload Identities**: Dedicated Kubernetes ServiceAccounts (`exam-app-sa` and `exam-db-sa`) are assigned to the respective pods rather than relying on the default account.

---

## 3. Filesystem Hardening

The root filesystem of the application workload is hardened to protect against unauthorized code execution, web shell persistence, or filesystem tampering:

* **ReadOnlyRootFilesystem**: The container root filesystem of `exam-app` is set to `readOnlyRootFilesystem: true`.
* **Ephemeral Writable Directory**: To support application runtime logs, PID files, and temporary caches, an `emptyDir` volume is mounted specifically at `/tmp`.
* **Storage Cap**: The `/tmp` volume is restricted using `sizeLimit: 50Mi` to prevent disk exhaustion (Denial of Service).

### Verified Hardening Behavior
Verification tests performed inside the running `exam-app` container:

```bash
# Test 1: Verify write block on read-only root directory
$ kubectl exec -n exam deploy/exam-app -- sh -c "touch /usr/src/app/node22-test"
touch: /usr/src/app/node22-test: Read-only file system
# Result: PASS (Write blocked as expected)

# Test 2: Verify write permissions in designated temporary directory
$ kubectl exec -n exam deploy/exam-app -- sh -c "touch /tmp/node22-test && echo TMP_WRITE_OK"
TMP_WRITE_OK
# Result: PASS (Temporary storage write succeeded)
```

---

## 4. Network Security

A default-deny zero-trust network policy model is enforced using Calico CNI inside the namespace:

* **Policy**: `exam-app-network-policy` (applied to pods matching label `app: exam-app`).
* **Ingress Protection**: Ingress to exam-app is restricted by the NetworkPolicy. Unauthorized pod-to-exam-app access was verified to be blocked.
* **Egress Isolation**: Egress is restricted to PostgreSQL access on TCP port 1521 and DNS resolution on TCP/UDP port 53. Other egress traffic is not permitted by the policy.
* **Traffic Restriction**: Traffic not explicitly permitted by the NetworkPolicy is denied.

### Verified Network Segmentation Behavior
Network connection and isolation tests:
- **Authorized connection**: The `exam-app` successfully connects to `exam-db` on TCP port `1521`.
- **Blocked connections**: Unauthorized pod-to-exam-app access was tested and timed out as expected.

---

## 5. Docker Image Security

The application container image was rebuilt using a clean, modern base image to address supply-chain vulnerability risks:

* **Base Image Upgrade**: Transitioned from the End-of-Life (EOL) `node:18-alpine` base image to a supported LTS runtime `node:22-alpine` (specifically running Node.js `v22.23.2` on Alpine Linux `3.21.3`).
* **Build Context Pruning**: A `.dockerignore` file is implemented to exclude sensitive and development-only files from entering the Docker build context:
  - `node_modules/` (Excludes local host development dependencies)
  - `.env` and `.env.*` (Prevents local environment secrets from leaking into image layers)
  - `.git/` (Excludes version control history)
  - `tests/` and log files (`*.log`)
* **Production-Only Packages**: The image build installs dependencies using `npm ci --only=production` to keep the final image minimal.
* **Non-Root Build Directives**: The Dockerfile specifies `USER node` before running the entrypoint command.

---

## 6. RBAC and Service Accounts

No custom Kubernetes RBAC permissions are granted to the workload ServiceAccounts.

* **ServiceAccount Configuration**:
  - `exam-app-sa` (bound to `exam-app`)
  - `exam-db-sa` (bound to `exam-db`)
* **Token Disable**: `automountServiceAccountToken: false` is configured on both pods, preventing the container runtime from auto-mounting Kubernetes API credentials into `/var/run/secrets/kubernetes.io/serviceaccount`.
* **RBAC Restrictions**: No RoleBindings or ClusterRoleBindings are associated with these ServiceAccounts. The application runs with zero API capability:
  - Cannot read pods, deployments, or services.
  - Cannot access secrets, configmaps, or node resources.
  - Has no cluster-admin permissions.

---

## 7. Secrets Management

Credentials are kept out of application manifests and source code:

* **Dynamic Injection**: Database passwords are dynamically injected into environment variables inside the pod using `secretKeyRef` referencing the Kubernetes Secret `exam-db-secret` and key `db-password`.
* **No Hardcoding**: Codebase audit verified that no database credentials, access tokens, or configuration secrets are hardcoded in the application repository.
* **Environment Protection**: Local `.env` configuration files are untracked and omitted from the git tree.

### Development Limitations
> [!WARNING]
> Manifests in `k8s/config/` containing base64-encoded mock credentials are used for local dev/lab bootstrapping. Remember that base64 is an **encoding**, not **encryption**. These manifests are strictly designated as development/lab assets and do not constitute production-grade secret encryption.

---

## 8. Resource Quotas and DoS Protection

To safeguard the cluster nodes from resource exhaustion, resource starvation, and noisy-neighbor issues, namespace and workload-level resource controls are applied:

### Namespace-Level Quota (`exam-quota`)
Enforces maximum cumulative resource constraints in the `exam` namespace:
- `pods`: `4` (Allows room for rolling updates)
- `requests.cpu`: `500m`
- `requests.memory`: `256Mi`
- `limits.cpu`: `1` (1000m)
- `limits.memory`: `512Mi`

### Namespace-Level Default Range (`exam-limits`)
Applies default container limits if a pod description omits them:
- Default Request: `100m` CPU, `64Mi` Memory
- Default Limit: `250m` CPU, `128Mi` Memory

### Workload Configurations

| Container | CPU Request | CPU Limit | Memory Request | Memory Limit | Ephemeral Storage Request | Ephemeral Storage Limit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`exam-app` (portal)** | `100m` | `250m` | `64Mi` | `128Mi` | `50Mi` | `100Mi` |
| **`exam-db` (postgres)** | `100m` | `250m` | `64Mi` | `128Mi` | `50Mi` | `256Mi` |

---

## 9. Runtime Health and Verification Results

The running state of the `exam` namespace workloads was verified successfully:

```bash
# Check pod running state and restart counts
$ kubectl get pods -n exam
NAME                        READY   STATUS    RESTARTS   AGE
exam-app-5c8cfc7c45-vlbtz   1/1     Running   0          20m
exam-db-6d9cb56c79-w2tq6    1/1     Running   0          22m

# Execute application health check inside the cluster
$ kubectl exec -n exam deploy/exam-app -- sh -c "wget -qO- http://127.0.0.1:8083/health"
{"status":"healthy","application":"exam-portal","timestamp":"2026-08-22T18:58:01.283Z","dependencies":{"database":{"status":"connected","mock":false}}}
```

### Verification Findings Summary
* **Pod Health**: Both application and database pods are running stably with `0` restarts.
* **Database Connection**: The health check response reports `"status":"connected"` and `"mock":false`, confirming that `exam-app` successfully authenticates with the live PostgreSQL database instance.
* **Security Directives**: The exam-app container executes under UID 1000 with a read-only root filesystem and constrained writable /tmp storage. The workloads use non-root security contexts as configured.

---

## 10. Image Vulnerability Scanning Limitations

* **npm Audit**: Run on the production dependency tree (`npm audit --omit=dev`), returning **0 vulnerabilities** (clean).
* **Base Image / System Vulnerability Scan**: A dedicated container image vulnerability scanner (such as Trivy or Grype) was not available on the local host environment, and `docker scout` required Docker Hub authentication. 
* **CVE Posture Statement**: 
  > The available local checks and npm production dependency audit identified no reported vulnerabilities, but a dedicated container image CVE scan was not completed because Trivy/Grype were unavailable and Docker Scout required authentication.

---

## 11. Final Security Status

> [!IMPORTANT]
> The exam namespace security-hardening milestone is complete and has passed the implemented verification tests.
> 
> *Note: Student, faculty, and research namespaces were outside the scope of this milestone and are not covered by this validation.*

---

## 12. Future Security Improvements

The following items are recommended for future security phases to enhance the cluster's posture:
1. **Automated Vulnerability Scanning**: Integrate Trivy or Grype into the CI/CD pipeline to automate container image vulnerability scans on every code change.
2. **Production Secrets Management**: Replace the local base64 development-only Kubernetes secrets (`k8s/config/`) with a secure production secret engine (such as HashiCorp Vault, AWS Secrets Manager, or Google Secret Manager) via the External Secrets Operator.
3. **Extend Hardening Scope**: Apply equivalent container sandbox, network isolation, filesystem, and resource quota hardening configurations to the `student`, `faculty`, and `research` namespaces.
4. **Database Resource Profiling**: Monitor database memory usage under realistic user traffic to evaluate if memory limits should be scaled above the current `128Mi` lab baseline.
5. **Immutable Build Tags**: Move from mutable image tags (e.g. `node:22-alpine`) to fully pinned SHA256 digests in Dockerfiles to guarantee absolute build reproducibility.

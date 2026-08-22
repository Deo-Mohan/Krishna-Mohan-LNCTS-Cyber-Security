# Kubernetes Local Deployment Guide

This guide provides step-by-step instructions on setting up and validating the SecureHaven Kubernetes environment on a developer workstation.

---

## 1. Prerequisites

Ensure the following tools are installed on your system:
- **Docker Desktop** (or Docker Engine on Linux)
- **kind** (Kubernetes in Docker CLI: `winget install Kubernetes.kind` on Windows, or `brew install kind` on macOS)
- **kubectl** (Kubernetes CLI: `winget install Kubernetes.kubectl` on Windows, or `brew install kubectl` on macOS)

---

## 2. Step-by-Step Lab Setup

### Step 2.1: Boot the Cluster
Use the provided automation script or run:
```bash
kind create cluster --name securehaven-lab
```

### Step 2.2: Build the Application Images
Build the portal Docker images locally from the root folder:
```bash
docker build -t student-app:latest ./apps/student
docker build -t faculty-app:latest ./apps/faculty
docker build -t exam-app:latest ./apps/exam
docker build -t research-app:latest ./apps/research
```

### Step 2.3: Import Images into the Cluster
Because `kind` does not pull local images from the host's daemon automatically, you must load them into the cluster's internal registry:
```bash
kind load docker-image student-app:latest --name securehaven-lab
kind load docker-image faculty-app:latest --name securehaven-lab
kind load docker-image exam-app:latest --name securehaven-lab
kind load docker-image research-app:latest --name securehaven-lab
```

### Step 2.4: Apply the Manifests
Apply all resource definitions sequentially:
```bash
# 1. Namespaces
kubectl apply -f k8s/namespaces/

# 2. Secrets
kubectl apply -f k8s/config/

# 3. Workload Deployments
kubectl apply -f k8s/deployments/

# 4. ClusterIP Services
kubectl apply -f k8s/services/
```

---

## 3. Verification & Local Access

### Check Pod Status
Verify all workloads are running and healthy:
```bash
kubectl get pods -A
```
*Wait until the status of all pods shows `Running` and `1/1` or `2/2` Ready.*

### Manual Testing via Port Forwarding
Because the portal services are ClusterIP (internal), you must use port forwarding to query them from your host browser/client:

- **Student Portal**:
  ```bash
  kubectl port-forward svc/student-app -n student 8081:8081
  ```
- **Faculty Portal**:
  ```bash
  kubectl port-forward svc/faculty-app -n faculty 8082:8082
  ```
- **Exam Portal**:
  ```bash
  kubectl port-forward svc/exam-app -n exam 8083:8083
  ```
- **Research Portal**:
  ```bash
  kubectl port-forward svc/research-app -n research 8084:8084
  ```

Query `http://localhost:8081/health` to verify that the application returns `200 OK` and a healthy status payload.

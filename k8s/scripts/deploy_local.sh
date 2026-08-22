#!/usr/bin/env bash

# ==============================================================================
# SECUREHAVEN — LOCAL KUBERNETES DEPLOYMENT SCRIPT
# ==============================================================================
# This script sets up a local lab environment using 'kind' (Kubernetes in Docker).
# Note: Requires Docker and the 'kind' CLI to be installed on the host.
# ==============================================================================

set -euo pipefail

CLUSTER_NAME="securehaven-lab"

echo "=== SecureHaven Local Lab Setup ==="

# 1. Check docker daemon availability
if ! docker info >/dev/null 2>&1; then
  echo "[ERROR] Docker daemon is not running or client is not configured."
  echo "Please start Docker and try again."
  exit 1
fi

# 2. Check kind CLI availability
if ! command -v kind >/dev/null 2>&1; then
  echo "[ERROR] 'kind' utility is not installed."
  echo "Please install kind (https://kind.sigs.k8s.io/) and try again."
  exit 1
fi

# 3. Check kubectl CLI availability
if ! command -v kubectl >/dev/null 2>&1; then
  echo "[ERROR] 'kubectl' utility is not installed."
  echo "Please install kubectl and try again."
  exit 1
fi

# 4. Create Kind Cluster
if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
  echo "[INFO] Kind cluster '${CLUSTER_NAME}' already exists."
else
  echo "[INFO] Creating Kind cluster '${CLUSTER_NAME}'..."
  kind create cluster --name "$CLUSTER_NAME"
fi

# 5. Build portal images locally
echo "[INFO] Building portal application images..."
docker build -t student-app:latest ./apps/student
docker build -t faculty-app:latest ./apps/faculty
docker build -t exam-app:latest ./apps/exam
docker build -t research-app:latest ./apps/research

# 6. Load local images into Kind cluster
echo "[INFO] Loading images into Kind cluster..."
kind load docker-image student-app:latest --name "$CLUSTER_NAME"
kind load docker-image faculty-app:latest --name "$CLUSTER_NAME"
kind load docker-image exam-app:latest --name "$CLUSTER_NAME"
kind load docker-image research-app:latest --name "$CLUSTER_NAME"

# 7. Apply Kubernetes Manifests
echo "[INFO] Applying Kubernetes configurations..."
kubectl apply -f k8s/namespaces/
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/network-policies/default-deny/
kubectl apply -f k8s/network-policies/dns/
kubectl apply -f k8s/network-policies/database/
kubectl apply -f k8s/config/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/

echo "=== Deployment Completed Successfully ==="
echo "To verify the pods:"
echo "  kubectl get pods -A"
echo "To port-forward the student app:"
echo "  kubectl port-forward svc/student-app -n student 8081:8081"

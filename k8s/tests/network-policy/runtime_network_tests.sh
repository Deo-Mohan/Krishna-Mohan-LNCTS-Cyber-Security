#!/usr/bin/env bash

# ==============================================================================
# SECUREHAVEN — RUNTIME NETWORK POLICY CONNECTIVITY TESTS
# ==============================================================================
# This script executes connection validation tests inside running containers.
# NOTE: Requires a running Kubernetes cluster and all deployments to be active.
# ==============================================================================

set -euo pipefail

echo "=== Starting Runtime NetworkPolicy Verification ==="

# Helper function to run netcat inside a pod to check TCP connectivity
check_connection() {
  local src_pod_selector="$1"
  local src_namespace="$2"
  local target_host="$3"
  local target_port="$4"
  local expected_status="$5" # "ALLOW" or "DENY"

  # Find running pod name
  local pod_name
  pod_name=$(kubectl get pods -n "$src_namespace" -l "$src_pod_selector" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)

  if [ -z "$pod_name" ]; then
    echo "[SKIP] Source pod in '$src_namespace' matching '$src_pod_selector' not found."
    return 0
  fi

  echo -n "Testing: $src_namespace/$pod_name -> $target_host:$target_port (Expected: $expected_status)... "

  # Run exec with nc or local connection test (timeout 3 seconds)
  local status=0
  if kubectl exec -n "$src_namespace" "$pod_name" -- nc -zvw3 "$target_host" "$target_port" >/dev/null 2>&1; then
    status=1 # Success connection
  else
    status=0 # Failed connection / timeout
  fi

  if [ "$expected_status" == "ALLOW" ]; then
    if [ "$status" -eq 1 ]; then
      echo -e "\033[0;32m[PASS]\033[0m Connection succeeded."
    else
      echo -e "\033[0;31m[FAIL]\033[0m Connection failed."
      exit 1
    fi
  else
    if [ "$status" -eq 0 ]; then
      echo -e "\033[0;32m[PASS]\033[0m Connection blocked (timed out)."
    else
      echo -e "\033[0;31m[FAIL]\033[0m Connection succeeded when it should be blocked!"
      exit 1
    fi
  fi
}

# 1. Test Allowed same-namespace application-to-database connections
check_connection "app=student-app" "student" "student-db" "5432" "ALLOW"
check_connection "app=faculty-app" "faculty" "faculty-db" "3306" "ALLOW"
check_connection "app=exam-app" "exam" "exam-db" "1521" "ALLOW"
check_connection "app=research-app" "research" "research-db" "5432" "ALLOW"

# 2. Test Denied cross-namespace database connections (Lateral movement validation)
check_connection "app=research-app" "research" "student-db.student.svc.cluster.local" "5432" "DENY"
check_connection "app=research-app" "research" "faculty-db.faculty.svc.cluster.local" "3306" "DENY"
check_connection "app=research-app" "research" "exam-db.exam.svc.cluster.local" "1521" "DENY"

# 3. Test Denied cross-namespace application portals
check_connection "app=research-app" "research" "student-app.student.svc.cluster.local" "8081" "DENY"
check_connection "app=research-app" "research" "faculty-app.faculty.svc.cluster.local" "8082" "DENY"
check_connection "app=research-app" "research" "exam-app.exam.svc.cluster.local" "8083" "DENY"

# 4. Test Denied cross-namespace connections from student to others
check_connection "app=student-app" "student" "faculty-db.faculty.svc.cluster.local" "3306" "DENY"
check_connection "app=student-app" "student" "exam-db.exam.svc.cluster.local" "1521" "DENY"
check_connection "app=student-app" "student" "research-db.research.svc.cluster.local" "5432" "DENY"

# 5. Test DNS resolution (Allowed only via CoreDNS)
echo -n "Testing DNS lookup from research-app (Expected: ALLOW)... "
res_pod=$(kubectl get pods -n research -l app=research-app -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
if [ -n "$res_pod" ]; then
  if kubectl exec -n research "$res_pod" -- nslookup kubernetes.default.svc.cluster.local >/dev/null 2>&1; then
    echo -e "\033[0;32m[PASS]\033[0m DNS resolved successfully."
  else
    echo -e "\033[0;31m[FAIL]\033[0m DNS lookup failed."
    exit 1
  fi
else
  echo "[SKIP] research-app pod not found."
fi

echo "=== All Connection Verifications Completed ==="

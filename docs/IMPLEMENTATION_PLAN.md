# Implementation Plan: Zero-Trust Interactive Simulator

## 1. Overview
To demonstrate this hybrid Zero-Trust architecture in a local workspace, we will construct an **Interactive Zero-Trust Network & Attack Simulator**. This web application will run a high-fidelity simulation engine representing the network topologies, databases, identity gateways, and firewall state machines.

---

## 2. Core Features & Phase Deliverables

### Phase 1: Setup and Design System
* **Tech Stack**: React 18, Vite, Lucide React (for security icons), CSS Grid, and custom Canvas/SVG rendering.
* **Aesthetics**: Sleek dark mode, glassmorphism card panels (`backdrop-filter`), neon status indicators (green/red/amber), and smooth vector packet-transfers.

### Phase 2: Network Topology Visualization
* **Objective**: Interactive network layout showing:
  * Public Internet & ZTNA Gateway.
  * Public Cloud VPC (Private subnet, Kubernetes Cluster nodes, Pods).
  * On-Premises Datacenter (IPSec VPN Gateway, isolated VM subnets).
  * Secure Management VPC (SIEM logging server).
* **Interactivity**: Users can hover over any host to inspect its IP address, role, running software version, active firewall rules, and Kubernetes configuration.

### Phase 3: The Attack Simulation Engine
* **Objective**: A simulated shell terminal allowing the user to initiate attack scripts from the compromised **Research Application Pod**.
* **Simulated Command List**:
  1. `curl http://student-db.student-portal:5432` (Attempt to query Student Database)
  2. `nmap -sS -p 80,443,8080,3306 10.200.1.0/24` (Scan On-Premises subnets)
  3. `curl -H "Metadata-Flavor: Google" http://169.254.169.254/computeMetadata/v1/` (Harvest IAM keys)
  4. `kubectl get pods -n default` (Query Kubernetes API Control Plane)
  5. `curl http://faculty-portal.faculty-portal:8080` (Scan Faculty Portal)
* **Dynamic Control Engine**: The user will be able to toggle security controls (e.g. "NetworkPolicy: Enabled", "PodSecurity: Restricted", "ZTNA Firewall: Enforced") and see how the attack outcome instantly switches from **SUCCESS (Vulnerable)** to **BLOCKED (Zero-Trust Protected)**.

### Phase 4: SIEM / SOC Dashboard
* **Objective**: Stream live JSON audit events reflecting the state of the network.
* **Metrics Panel**:
  * Event throughput (events/sec).
  * Allowed vs. Blocked packets tracker (circular indicator).
  * Live alert feed with levels: `INFO`, `WARNING`, and `CRITICAL`.
* **Sample SIEM Alert Output**:
  ```json
  {
    "timestamp": "2026-08-22T17:20:00Z",
    "source_ip": "10.100.2.5",
    "dest_ip": "10.200.1.10",
    "protocol": "TCP",
    "port": 80,
    "action": "DROP",
    "reason": "EgressBlockedByNetworkPolicy",
    "severity": "CRITICAL",
    "message": "Unauthorized lateral movement attempt from Research Application namespace to Examination System VM."
  }
  ```

### Phase 5: ZTNA Identity Gateway & MFA Portal
* **Objective**: Create a side-drawer portal modeling the user journey:
  * Access request for the portals (Student, Faculty, Exam).
  * Multi-Factor Authentication input validation.
  * Role mapping validation (e.g. Student attempting to access Faculty portal → Access Denied).

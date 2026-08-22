# Project Context: Zero-Trust Hybrid Security Architecture

## 1. Executive Summary
This project is designed in alignment with the **Cisco Virtual Internship 2026 Cyber Security** problem statement. The core objective is to design, model, and demonstrate a practical **Zero-Trust Hybrid Datacenter/Cloud Security Architecture** for an academic institution. 

In a traditional security architecture, networks are secured at the perimeter ("castle-and-moat"). Once an attacker breaches the perimeter (e.g., through a compromised public-facing application), they can easily move laterally to compromise databases, directory services, Kubernetes cluster assets, or other production workloads. 

This architecture addresses this vulnerability by enforcing a strict **Zero-Trust (Never Trust, Always Verify)** policy. We partition the institution's workloads—**Student Portal**, **Faculty Portal**, **Examination System**, and **Research Application**—into distinct security domains, ensuring that a compromise of one application (specifically the Research Application, which is targeted in our simulation) is contained and cannot affect the others.

---

## 2. Business Context & Assets
The academic institution hosts several critical applications with differing levels of data sensitivity:

| Application | Description | Primary Users | Sensitivity Class | Core Security Concern |
|---|---|---|---|---|
| **Student Portal** | Access to student profiles, registrations, and general records. | Students, Admin | Medium (PII) | Unauthorized access to student personal data. |
| **Faculty Portal** | Workspace for lecturers to manage course materials and student lists. | Faculty, Admin | Medium-High | Unauthorized modification of course rosters. |
| **Examination System** | Core system containing exam questions, grading keys, and draft results. | Authorized Faculty, Exam Board | Critical | Integrity and confidentiality of exam questions; grade tampering. |
| **Research Application** | Public-facing collaborative portal for research papers and computing projects. | Researchers, Guests | High (Intellectual Property) | Intellectual Property theft, resource hijacking (cryptomining), entry point for lateral movement. |

### The Core Threat Scenario
The **Research Application** is inherently open and collaborative, making it the most vulnerable entry point. If a researcher downloads an untrusted package or falls victim to remote code execution (RCE), the attacker gains a foothold inside the Research security boundary. Under a Zero-Trust architecture, this foothold must be completely isolated, preventing lateral movement to the high-stakes **Examination System**, the PII-heavy **Student Portal**, the **Faculty Portal**, or the underlying infrastructure control plane.

---

## 3. Project Objectives
1. **Model a Hybrid Environment**: Bridge the gap between a private on-premises datacenter (hosting legacy systems like the Examination System and Faculty Portal) and a cloud-based Kubernetes environment (hosting dynamic applications like the Student Portal and Research Application).
2. **Implement Micro-Segmentation**: Ensure every workload is encapsulated inside a logical security boundary using default-deny firewall policies, VPC security groups, and Kubernetes `NetworkPolicies`.
3. **Demonstrate Active Defense (Containment)**: Build an interactive console to simulate advanced lateral-movement attacks and demonstrate how the Zero-Trust controls successfully drop and flag unauthorized communication.
4. **Establish Security Observability**: Construct a centralized log monitoring framework (SIEM/SOC simulation) to capture all traffic flows (allowed and denied), alerting administrators of suspicious activity in real-time.

---

## 4. Document Roadmap
The technical layout of this architecture is distributed across the following core documents:
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: Details the physical, logical, hybrid, and Kubernetes network layout.
- **[THREAT_MODEL.md](THREAT_MODEL.md)**: Performs a STRIDE-based analysis of the application suite.
- **[SECURITY_MODEL.md](SECURITY_MODEL.md)**: Explains the Zero-Trust policies, IAM, RBAC, and ZTNA access controls.
- **[COMMUNICATION_MATRIX.md](COMMUNICATION_MATRIX.md)**: Defines the granular network policies (who can talk to whom).
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)**: The execution steps for creating the simulator, dashboard, and testing scripts.
- **[DECISIONS.md](DECISIONS.md)**: Rationale behind tech stack choices, architectural patterns, and simulations.

# On-Premises Firewall Policy and Security Zones

## 1. Network Zone Allocations
The on-premises infrastructure is divided into isolated subnets under a centralized network firewall:
- **DMZ Zone (`10.200.10.0/24`)**: Gateway systems.
- **Workload Zone (`10.200.20.0/24`)**: Application servers.
- **Database Zone (`10.200.30.0/24`)**: Database hosts.
- **Management Zone (`10.200.40.0/24`)**: Administration tools.
- **Security Zone (`10.200.50.0/24`)**: Log aggregation.

---

## 2. Firewall Access Control List (ACL)
The firewall enforces a strict **Default-Deny** rule: any connection attempt not explicitly permitted in this policy table is dropped.

| Rule ID | Source Subnet / Host | Destination Subnet / Host | Protocol | Port | Action | Reason / Justification |
|---|---|---|---|---|---|---|
| **FW-01** | Any (Internet) | ZTNA On-Prem Gateway (`10.200.10.10`) | TCP | 443 | **ALLOW** | Public ingress for authorized faculty and examiners. |
| **FW-02** | ZTNA On-Prem Gateway (`10.200.10.10`) | Faculty Portal VM (`10.200.20.20`) | TCP | 8080 | **ALLOW** | Proxying authenticated faculty HTTP sessions. |
| **FW-03** | ZTNA On-Prem Gateway (`10.200.10.10`) | Examination Portal VM (`10.200.20.10`) | TCP | 8443 | **ALLOW** | Proxying authenticated examiner HTTPS sessions. |
| **FW-04** | Faculty Portal VM (`10.200.20.20`) | Faculty Database VM (`10.200.30.20`) | TCP | 3306 | **ALLOW** | Faculty portal querying its respective MySQL DB. |
| **FW-05** | Examination Portal VM (`10.200.20.10`) | Examination Database VM (`10.200.30.10`) | TCP | 1521 | **ALLOW** | Exam portal querying its respective database. |
| **FW-06** | Workload Subnet (`10.200.20.0/24`) | Syslog Collector (`10.200.50.100`) | TCP | 514 | **ALLOW** | Forwarding VM operating system and service logs. |
| **FW-07** | Database Subnet (`10.200.30.0/24`) | Syslog Collector (`10.200.50.100`) | TCP | 514 | **ALLOW** | Forwarding database access audit logs. |
| **FW-08** | Workload Subnet (`10.200.20.0/24`) | Local DNS Resolver (`10.200.40.5`) | UDP/TCP | 53 | **ALLOW** | Internal name resolution for databases. |
| **FW-09** | ZTNA On-Prem Gateway (`10.200.10.10`) | Database Subnet (`10.200.30.0/24`) | Any | Any | **DENY** | Prevents ZTNA proxy from accessing databases directly. |
| **FW-10** | Faculty Portal VM (`10.200.20.20`) | Examination Database VM (`10.200.30.10`) | Any | Any | **DENY** | Prevents Faculty portal from accessing Examination DB. |
| **FW-11** | Faculty Portal VM (`10.200.20.20`) | Student DB Pod (Cloud) | Any | Any | **DENY** | Faculty portal must not access Student DB. |
| **FW-12** | Faculty Portal VM (`10.200.20.20`) | Management Subnet (`10.200.40.0/24`) | Any | Any | **DENY** | Application hosts cannot access management. |
| **FW-13** | Research App Pod (Cloud) | Research Database Pod (Cloud) | TCP | 5432 | **ALLOW** | Cloud-native workload DB query path. |
| **FW-14** | Research App Pod (Cloud) | Examination Database VM (`10.200.30.10`) | Any | Any | **DENY** | Cloud pods cannot cross-talk to on-premises DBs. |
| **FW-15** | Research App Pod (Cloud) | Management Subnet (`10.200.40.0/24`) | Any | Any | **DENY** | Cloud pods cannot access on-premises management. |
| **FW-16** | Cloud VPC IP Space (`10.100.0.0/16`) | On-Premises DB Subnet (`10.200.30.0/24`)| Any | Any | **DENY** | VPN route filtering drops direct cloud-to-on-prem DB. |
| **FW-Default**| Any | Any | Any | Any | **DENY** | Default drop rule. |

---

## 3. Host-Level Firewalls (iptables configuration)
In addition to network firewalls, host-level security is enforced on critical VMs.

### Example: Examination Database VM (`10.200.30.10`) iptables Rules
To restrict inbound traffic solely to the Examination Portal VM:
```bash
# 1. Set default policies to DROP
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# 2. Allow Loopback interface
iptables -A INPUT -i lo -j ACCEPT

# 3. Allow established/related sessions (e.g. outbound syslog responses)
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 4. Explicitly allow ingress database traffic only from the Exam VM
iptables -A INPUT -p tcp -s 10.200.20.10 --dport 1521 -m conntrack --ctstate NEW -j ACCEPT

# 5. Drop and log all other inputs
iptables -A INPUT -j LOG --log-prefix "FW_DATABASE_DROP: "
iptables -A INPUT -j DROP
```
This multi-layered approach ensures that even if the network firewall is bypassed, the database server will reject requests from the Faculty Portal VM, ZTNA Gateway, or any cloud pods.

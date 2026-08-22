# Architectural Decisions: Tech Stack and Simulation Boundaries

## 1. Simulation vs. Production Infrastructure
* **Decision**: Implement a high-fidelity, interactive client-side simulator using React/Vite/CSS, running entirely in the local browser.
* **Alternative Considered**: Deploying a live AWS/GKE Kubernetes cluster with Calico CNI, IPsec routers, and standalone VMs.
* **Rationale**:
  * **Feasibility**: A live multi-network cloud deployment requires paid cloud resources, credentials, domain setup, and takes minutes to spin up or reconfigure.
  * **Didactic Value**: A visual React simulator can model complex packet flows, allow users to toggle network policies in real-time, and display instant SIEM logs without delay.
  * **Portability**: The simulator can be run instantly in any local environment using standard `npm run dev` with zero setup or cost.
  * **Safety**: There is no risk of real-world exploitation during attack simulations since all scripts run inside a sandboxed state machine.

---

## 2. Technology Stack Selection
* **Core Framework**: React 18 with Vite. Vite offers extremely fast HMR (Hot Module Replacement), which speeds up UI feedback.
* **Styling**: Vanilla CSS with CSS custom variables (CSS custom properties) to manage themes (Dark/Light mode) and layout. Glassmorphism features (translucent backdrops, border-box glows) are used to present a premium Cyber Security Command Center feel.
* **Component Icons**: `lucide-react` is used for modern, standardized UI icons representing networks, servers, databases, firewalls, and threats.
* **Visualization Layer**: Interactive SVGs/Canvas for rendering the network nodes and the packets moving between them, providing a dynamic look.

---

## 3. Threat containment Simulation Rules
To reflect a real-world enterprise CNI/Firewall, the simulation engine is designed around the following logical state machine:
* Each node is assigned a specific IP and namespace.
* A central policy engine maintains a key-value store of active security policies (e.g. `cniPoliciesEnabled: true`).
* When an attack is executed from the terminal, the engine routes the packet:
  * If the target is blocked by the policy, it registers a `DROP` event, halts the packet animation at the firewall boundary, and posts a critical alert to the SIEM log database.
  * If the target is allowed, the packet is animated to the destination, returning a simulated data payload.

---

## 4. Identity & ZTNA Modeling
* Rather than setting up a full external identity provider (like Keycloak or Okta), the ZTNA Gateway simulation includes a mockup of a context-aware reverse proxy.
* It models the authentication handshake, credential validation, multi-factor token input, and role authorization checks.
* The ZTNA portal simulates path-based routing (e.g., routing path `/faculty` only if role includes `Faculty` or `Examiner`).

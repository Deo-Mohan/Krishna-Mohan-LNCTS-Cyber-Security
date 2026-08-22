import { 
  SecurityControl, 
  Workload, 
  VerificationTest, 
  ResourceDetails, 
  NamespaceQuota, 
  Finding 
} from '../types/security';

export const CLUSTER_NAME = 'securehaven';
export const HARDENED_NAMESPACE = 'exam';
export const POSTURE_SCORE = 96;

export const SCORE_BREAKDOWN = [
  { name: 'Container Security', score: 100 },
  { name: 'Filesystem Security', score: 100 },
  { name: 'Network Security', score: 100 },
  { name: 'RBAC', score: 100 },
  { name: 'Secrets Management', score: 90 },
  { name: 'Resources Protection', score: 100 },
  { name: 'Image Security', score: 80 }
];

export const SECURITY_CONTROLS: SecurityControl[] = [
  {
    id: 'container-sec',
    name: 'Container Security',
    status: 'PASS',
    description: 'Enforces non-root execution (UID 1000), drops all Linux capabilities, and disables privilege escalation.',
    metric: 'UID 1000 / Drop ALL',
    category: 'Sandbox'
  },
  {
    id: 'filesystem-sec',
    name: 'Filesystem Hardening',
    status: 'PASS',
    description: 'Read-only root filesystem for app containers with a size-limited writable /tmp volume.',
    metric: 'readOnlyRoot / 50Mi tmp',
    category: 'Storage'
  },
  {
    id: 'network-sec',
    name: 'Network Security',
    status: 'PASS',
    description: 'Enforces default-deny microsegmentation. Restricts ingress on port 8083 and egress to DNS and DB only.',
    metric: 'NetworkPolicy Active',
    category: 'Network'
  },
  {
    id: 'rbac-sec',
    name: 'RBAC & Service Accounts',
    status: 'PASS',
    description: 'Dedicated ServiceAccounts per workload with automountServiceAccountToken disabled and zero API permissions.',
    metric: 'Token Mount Disabled',
    category: 'Access Control'
  },
  {
    id: 'secrets-sec',
    name: 'Secrets Management',
    status: 'PASS',
    description: 'Database credentials dynamically injected using secretKeyRef from Kubernetes Secrets. No hardcoded creds.',
    metric: 'exam-db-secret',
    category: 'Secrets'
  },
  {
    id: 'resources-sec',
    name: 'Resource Protection',
    status: 'PASS',
    description: 'Enforces explicit CPU, memory, and ephemeral storage limits. Namespace quotas protect against DoS.',
    metric: 'Quota Active',
    category: 'Denial of Service'
  },
  {
    id: 'image-sec',
    name: 'Image Security',
    status: 'WARNING',
    description: 'Base image upgraded to Node 22-alpine. Local dependency audit is clean, but host CVE scanner was unavailable.',
    metric: 'Node v22.23.2',
    category: 'Supply Chain'
  },
  {
    id: 'runtime-sec',
    name: 'Runtime Verification',
    status: 'PASS',
    description: 'Live runtime checks confirmed healthy status, database connectivity, and active security context controls.',
    metric: '0 Restarts / Healthy',
    category: 'Monitoring'
  }
];

export const WORKLOADS: Workload[] = [
  {
    name: 'exam-app',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    runtimeVersion: 'v22.23.2',
    databaseStatus: 'Connected',
    type: 'Application'
  },
  {
    name: 'exam-db',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    runtimeVersion: 'PostgreSQL 15',
    databaseStatus: 'N/A',
    type: 'Database'
  }
];

export const FINDINGS: Finding[] = [
  {
    id: 'find-1',
    severity: 'INFO',
    title: 'Dedicated container image vulnerability scanner unavailable',
    description: 'Local static security checks and production dependency audit returned 0 vulnerabilities, but a dedicated binary scanner (Trivy/Grype) was not present on the lab host, and docker scout required authentication.',
    category: 'Supply Chain'
  },
  {
    id: 'find-2',
    severity: 'INFO',
    title: 'Student, faculty, and research namespaces outside scope',
    description: 'Hardening was applied exclusively to workloads in the exam namespace. Other namespaces continue to run legacy, unhardened configurations and are currently experiencing initialization issues in the cluster.',
    category: 'Scope Limitation'
  }
];

export const VERIFICATION_TESTS: VerificationTest[] = [
  { name: 'Pod running', status: 'PASS' },
  { name: 'Zero restarts', status: 'PASS' },
  { name: 'Non-root UID 1000', status: 'PASS' },
  { name: 'Privilege escalation disabled', status: 'PASS' },
  { name: 'Linux capabilities dropped', status: 'PASS' },
  { name: 'Read-only root filesystem', status: 'PASS' },
  { name: '/tmp writable', status: 'PASS' },
  { name: 'NetworkPolicy active', status: 'PASS' },
  { name: 'Unauthorized ingress blocked', status: 'PASS' },
  { name: 'PostgreSQL connected', status: 'PASS' },
  { name: 'ResourceQuota active', status: 'PASS' },
  { name: 'LimitRange active', status: 'PASS' },
  { name: 'Node.js 22.23.2 runtime', status: 'PASS' }
];

export const RESOURCE_ALLOCATIONS: Record<string, ResourceDetails> = {
  'exam-app': {
    cpuRequest: '100m',
    cpuLimit: '250m',
    memoryRequest: '64Mi',
    memoryLimit: '128Mi',
    ephemeralRequest: '50Mi',
    ephemeralLimit: '100Mi'
  },
  'exam-db': {
    cpuRequest: '100m',
    cpuLimit: '250m',
    memoryRequest: '64Mi',
    memoryLimit: '128Mi',
    ephemeralRequest: '50Mi',
    ephemeralLimit: '256Mi'
  }
};

export const NAMESPACE_QUOTAS: NamespaceQuota[] = [
  { resource: 'Pods', used: '2', limit: '4' },
  { resource: 'CPU Requests', used: '200m', limit: '500m' },
  { resource: 'Memory Requests', used: '128Mi', limit: '256Mi' },
  { resource: 'CPU Limits', used: '500m', limit: '1' },
  { resource: 'Memory Limits', used: '256Mi', limit: '512Mi' }
];

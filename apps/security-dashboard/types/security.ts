export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  category: string;
}

export type SecurityStatus = 'PASS' | 'WARNING' | 'FAIL' | 'INFO';

export interface SecurityControl {
  id: string;
  name: string;
  status: SecurityStatus;
  description: string;
  metric?: string;
  category: string;
}

export interface Workload {
  name: string;
  namespace?: string;
  status: 'Running' | 'Failed' | 'Pending';
  ready: string;
  restarts: number;
  runtimeVersion?: string;
  databaseStatus?: 'Connected' | 'Disconnected' | 'N/A';
  type: 'Application' | 'Database';
  image?: string;
  resources?: {
    requests: {
      cpu: string;
      memory: string;
    };
    limits: {
      cpu: string;
      memory: string;
    };
  };
  securityContext?: {
    runAsNonRoot: boolean | null;
    readOnlyRootFilesystem: boolean | null;
    privilegeEscalation: boolean;
    capabilitiesDrop: string[];
  };
  hasNetworkPolicy?: boolean;
}

export interface VerificationTest {
  name: string;
  status: 'PASS' | 'FAIL';
}

export interface ResourceDetails {
  cpuRequest: string;
  cpuLimit: string;
  memoryRequest: string;
  memoryLimit: string;
  ephemeralRequest?: string;
  ephemeralLimit?: string;
}

export interface NamespaceQuota {
  resource: string;
  used: string;
  limit: string;
}

export interface LiveWorkload {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  node: string;
  image: string;
  resources?: {
    requests: {
      cpu: string;
      memory: string;
    };
    limits: {
      cpu: string;
      memory: string;
    };
  };
  securityContext?: {
    runAsNonRoot: boolean | null;
    readOnlyRootFilesystem: boolean | null;
    privilegeEscalation: boolean;
    capabilitiesDrop: string[];
  };
}

export interface LiveDeployment {
  name: string;
  replicas: number;
  readyReplicas: number;
  availableReplicas: number;
  image: string;
}

export interface LiveService {
  name: string;
  type: string;
  ports: string[];
}

export interface LiveNetworkPolicy {
  name: string;
  podSelector: string;
  types: string[];
  ingressCount: number;
  egressCount: number;
}

export interface LiveResourceQuota {
  name: string;
  used: Record<string, string>;
  limit: Record<string, string>;
}

export interface LiveLimitRangeItem {
  type: string;
  default: Record<string, string>;
  defaultRequest: Record<string, string>;
}

export interface LiveLimitRange {
  name: string;
  limits: LiveLimitRangeItem[];
}

export interface LiveServiceAccount {
  name: string;
  automountServiceAccountToken: boolean;
}

export interface LiveSecurityStatus {
  score: number;
  status: string;
}

export interface LiveSecurityData {
  cluster: string;
  namespace: string;
  timestamp: string;
  workloads: LiveWorkload[];
  deployments: LiveDeployment[];
  services: LiveService[];
  networkPolicies: LiveNetworkPolicy[];
  resourceQuotas: LiveResourceQuota[];
  limitRanges: LiveLimitRange[];
  serviceAccounts: LiveServiceAccount[];
  securityStatus: LiveSecurityStatus;
}

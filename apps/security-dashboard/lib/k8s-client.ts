import * as k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();

try {
  // Load configuration from in-cluster environment variables and token file
  kc.loadFromCluster();
} catch {
  // Fallback to default kubeconfig file (e.g. ~/.kube/config) for local development
  try {
    kc.loadFromDefault();
  } catch (err) {
    console.warn('Kubernetes client initialization warning: Failed to load kubeconfig.', err);
  }
}

export const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
export const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
export const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);
export default kc;

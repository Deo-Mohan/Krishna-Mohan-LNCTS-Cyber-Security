import { NextResponse } from 'next/server';
import * as k8s from '@kubernetes/client-node';
import { k8sCoreApi, k8sAppsApi, k8sNetworkApi } from '../../../lib/k8s-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const namespace = 'exam';

  try {
    // Query Kubernetes resources in the target namespace using positional string parameter
    const [
      podsRes,
      deploymentsRes,
      servicesRes,
      networkPoliciesRes,
      resourceQuotasRes,
      limitRangesRes,
      serviceAccountsRes
    ] = await Promise.all([
      k8sCoreApi.listNamespacedPod(namespace),
      k8sAppsApi.listNamespacedDeployment(namespace),
      k8sCoreApi.listNamespacedService(namespace),
      k8sNetworkApi.listNamespacedNetworkPolicy(namespace),
      k8sCoreApi.listNamespacedResourceQuota(namespace),
      k8sCoreApi.listNamespacedLimitRange(namespace),
      k8sCoreApi.listNamespacedServiceAccount(namespace)
    ]);

    // Sanitize Pods (no sensitive env variables, metadata only)
    const workloads = (podsRes.body.items || []).map((pod: k8s.V1Pod) => {
      const container = pod.spec?.containers?.[0];
      return {
        name: pod.metadata?.name || 'unknown',
        namespace: pod.metadata?.namespace || 'unknown',
        status: pod.status?.phase || 'unknown',
        ready: `${pod.status?.containerStatuses?.filter((c: k8s.V1ContainerStatus) => c.ready).length || 0}/${pod.status?.containerStatuses?.length || 0}`,
        restarts: pod.status?.containerStatuses?.reduce((acc: number, c: k8s.V1ContainerStatus) => acc + c.restartCount, 0) || 0,
        node: pod.spec?.nodeName || 'unknown',
        image: container?.image || 'unknown',
        resources: {
          requests: {
            cpu: container?.resources?.requests?.['cpu'] || 'N/A',
            memory: container?.resources?.requests?.['memory'] || 'N/A'
          },
          limits: {
            cpu: container?.resources?.limits?.['cpu'] || 'N/A',
            memory: container?.resources?.limits?.['memory'] || 'N/A'
          }
        },
        securityContext: {
          runAsNonRoot: container?.securityContext?.runAsNonRoot ?? null,
          readOnlyRootFilesystem: container?.securityContext?.readOnlyRootFilesystem ?? null,
          privilegeEscalation: container?.securityContext?.allowPrivilegeEscalation === false ? false : true,
          capabilitiesDrop: container?.securityContext?.capabilities?.drop || []
        }
      };
    });

    // Sanitize Deployments
    const deployments = (deploymentsRes.body.items || []).map((deploy: k8s.V1Deployment) => ({
      name: deploy.metadata?.name || 'unknown',
      replicas: deploy.status?.replicas || 0,
      readyReplicas: deploy.status?.readyReplicas || 0,
      availableReplicas: deploy.status?.availableReplicas || 0,
      image: deploy.spec?.template.spec?.containers?.[0]?.image || 'unknown'
    }));

    // Sanitize Services
    const services = (servicesRes.body.items || []).map((svc: k8s.V1Service) => ({
      name: svc.metadata?.name || 'unknown',
      type: svc.spec?.type || 'ClusterIP',
      ports: svc.spec?.ports?.map((p: k8s.V1ServicePort) => `${p.port}/${p.protocol || 'TCP'}`) || []
    }));

    // Sanitize NetworkPolicies
    const networkPolicies = (networkPoliciesRes.body.items || []).map((np: k8s.V1NetworkPolicy) => ({
      name: np.metadata?.name || 'unknown',
      podSelector: JSON.stringify(np.spec?.podSelector || {}),
      types: np.spec?.policyTypes || [],
      ingressCount: np.spec?.ingress?.length || 0,
      egressCount: np.spec?.egress?.length || 0
    }));

    // Sanitize ResourceQuotas
    const resourceQuotas = (resourceQuotasRes.body.items || []).map((rq: k8s.V1ResourceQuota) => ({
      name: rq.metadata?.name || 'unknown',
      used: rq.status?.used || {},
      limit: rq.status?.hard || {}
    }));

    // Sanitize LimitRanges
    const limitRanges = (limitRangesRes.body.items || []).map((lr: k8s.V1LimitRange) => ({
      name: lr.metadata?.name || 'unknown',
      limits: (lr.spec?.limits || []).map((limit: k8s.V1LimitRangeItem) => ({
        type: limit.type,
        default: limit._default || {},
        defaultRequest: limit.defaultRequest || {}
      }))
    }));

    // Sanitize ServiceAccounts (names and auto-mount setting only)
    const serviceAccounts = (serviceAccountsRes.body.items || []).map((sa: k8s.V1ServiceAccount) => ({
      name: sa.metadata?.name || 'unknown',
      automountServiceAccountToken: sa.automountServiceAccountToken !== false
    }));

    // Calculate dynamic security posture criteria
    const podHardeningCheck = workloads.length > 0 && workloads.every((w) => w.status === 'Running' && w.restarts === 0);
    const networkPolicyCheck = networkPolicies.length > 0;
    const quotaCheck = resourceQuotas.length > 0;
    
    return NextResponse.json({
      cluster: 'securehaven',
      namespace,
      timestamp: new Date().toISOString(),
      workloads,
      deployments,
      services,
      networkPolicies,
      resourceQuotas,
      limitRanges,
      serviceAccounts,
      securityStatus: {
        score: podHardeningCheck && networkPolicyCheck && quotaCheck ? 96 : 80,
        status: podHardeningCheck && networkPolicyCheck && quotaCheck ? 'SECURE' : 'DEGRADED'
      }
    });

  } catch (err) {
    console.error('Kubernetes Security API error:', err);

    const k8sError = err as { status?: number; statusCode?: number; code?: string };
    // Map common Kubernetes API errors to safe REST responses
    const status = k8sError.status || k8sError.statusCode || 500;
    
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: 'Monitoring permission denied.' },
        { status: 403 }
      );
    }
    
    // Check if error is related to connectivity / host resolution
    if (k8sError.code === 'ENOTFOUND' || k8sError.code === 'ECONNREFUSED' || k8sError.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { error: 'Kubernetes API unavailable.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 }
    );
  }
}

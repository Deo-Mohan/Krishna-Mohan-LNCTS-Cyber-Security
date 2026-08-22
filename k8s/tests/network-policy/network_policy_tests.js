const fs = require('fs');
const path = require('path');

const K8S_DIR = path.join(__dirname, '..', '..');

const APPS = ['student', 'faculty', 'exam', 'research'];
const DB_PORTS = {
  student: 5432,
  faculty: 3306,
  exam: 1521,
  research: 5432
};

const results = {
  passed: 0,
  failed: 0,
  details: []
};

function recordResult(testName, passed, errorMsg = '') {
  if (passed) {
    results.passed++;
    results.details.push({ test: testName, status: 'PASS' });
    console.log(`[PASS] - ${testName}`);
  } else {
    results.failed++;
    results.details.push({ test: testName, status: 'FAIL', error: errorMsg });
    console.log(`[FAIL] - ${testName} : ${errorMsg}`);
  }
}

// 1. Verify default-deny manifests for each namespace
function verifyDefaultDenyPolicies() {
  console.log('\n--- Checking Default-Deny Network Policies ---');
  for (const app of APPS) {
    const file = `${app}-default-deny.yaml`;
    const filePath = path.join(K8S_DIR, 'network-policies', 'default-deny', file);
    
    if (!fs.existsSync(filePath)) {
      recordResult(`NetworkPolicy file '${file}' exists`, false, `File not found at ${filePath}`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasName = content.includes(`name: ${app}-default-deny`);
    const correctNamespace = content.includes(`namespace: ${app}`);
    const specifiesIngress = content.includes('- Ingress');
    const specifiesEgress = content.includes('- Egress');
    const podSelectorAll = content.includes('podSelector: {}') || content.includes('podSelector:\n    {}') || content.includes('podSelector: {}');
    
    recordResult(`Policy ${file} is named correctly`, hasName, `Should have name: ${app}-default-deny`);
    recordResult(`Policy ${file} has correct namespace`, correctNamespace, `Should have namespace: ${app}`);
    recordResult(`Policy ${file} targets all pods (podSelector: {})`, podSelectorAll, `Should target all pods via podSelector: {}`);
    recordResult(`Policy ${file} includes Ingress in policyTypes`, specifiesIngress, `Missing '- Ingress'`);
    recordResult(`Policy ${file} includes Egress in policyTypes`, specifiesEgress, `Missing '- Egress'`);
  }
}

// 2. Verify DNS controlled egress policies
function verifyDnsEgressPolicies() {
  console.log('\n--- Checking Controlled DNS Egress Policies ---');
  for (const app of APPS) {
    const file = `${app}-dns-egress.yaml`;
    const filePath = path.join(K8S_DIR, 'network-policies', 'dns', file);
    
    if (!fs.existsSync(filePath)) {
      recordResult(`DNS NetworkPolicy file '${file}' exists`, false, `File not found at ${filePath}`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasName = content.includes(`name: ${app}-dns-egress`);
    const correctNamespace = content.includes(`namespace: ${app}`);
    const targetsKubeSystem = content.includes('kubernetes.io/metadata.name: kube-system');
    const targetsKubeDns = content.includes('k8s-app: kube-dns');
    
    const allowsUdp53 = content.includes('port: 53') && content.includes('protocol: UDP');
    const allowsTcp53 = content.includes('port: 53') && content.includes('protocol: TCP');
    
    // Safety check: ensure no wildcard / internet egress is allowed
    const hasWildcardEgress = content.includes('cidr: 0.0.0.0/0') || content.includes('cidr: 0.0.0.0');
    
    recordResult(`DNS Policy ${file} is named correctly`, hasName, `Should have name: ${app}-dns-egress`);
    recordResult(`DNS Policy ${file} has correct namespace`, correctNamespace, `Should have namespace: ${app}`);
    recordResult(`DNS Policy ${file} targets kube-system namespace`, targetsKubeSystem, `Missing selector for kube-system`);
    recordResult(`DNS Policy ${file} targets CoreDNS pods`, targetsKubeDns, `Missing selector matching k8s-app: kube-dns`);
    recordResult(`DNS Policy ${file} allows UDP/53`, allowsUdp53, `Missing UDP port 53 allowance`);
    recordResult(`DNS Policy ${file} allows TCP/53`, allowsTcp53, `Missing TCP port 53 allowance`);
    recordResult(`DNS Policy ${file} restricts wildcard DNS egress`, !hasWildcardEgress, `Wildcard DNS egress detected`);
  }
}

// 3. Verify Database Ingress/Egress allow rules
function verifyDatabasePolicies() {
  console.log('\n--- Checking Database Egress/Ingress Policies ---');
  for (const app of APPS) {
    const file = `${app}-db-policy.yaml`;
    const filePath = path.join(K8S_DIR, 'network-policies', 'database', file);
    
    if (!fs.existsSync(filePath)) {
      recordResult(`Database NetworkPolicy file '${file}' exists`, false, `File not found at ${filePath}`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const port = DB_PORTS[app];
    
    // Check ingress to database
    const hasDbIngressName = content.includes(`name: ${app}-db-ingress`);
    const targetsDbSelector = content.includes(`app: ${app}-db`);
    const allowsAppIngress = content.includes(`app: ${app}-app`);
    const allowsDbPort = content.includes(`port: ${port}`) && content.includes('protocol: TCP');
    
    // Check egress from application
    const hasAppEgressName = content.includes(`name: ${app}-app-egress-to-db`);
    
    recordResult(`DB Ingress Policy in ${file} is named correctly`, hasDbIngressName, `Missing name: ${app}-db-ingress`);
    recordResult(`DB Ingress Policy in ${file} targets ${app}-db pods`, targetsDbSelector, `Missing podSelector matching app: ${app}-db`);
    recordResult(`DB Ingress Policy in ${file} allows inbound from ${app}-app`, allowsAppIngress, `Missing ingress from: app: ${app}-app`);
    recordResult(`DB Ingress Policy in ${file} opens port ${port}`, allowsDbPort, `Missing TCP port ${port} check`);
    recordResult(`App Egress Policy in ${file} is named correctly`, hasAppEgressName, `Missing name: ${app}-app-egress-to-db`);
    
    // Audit other app isolation (e.g. verify research cannot access student-db)
    for (const other of APPS) {
      if (other !== app) {
        const allowsCrossNamespace = content.includes(`app: ${other}-app`) || content.includes(`app: ${other}-db`);
        recordResult(`Policy ${file} blocks cross-namespace access for ${other}`, !allowsCrossNamespace, `Detected premature cross-talk allowance for ${other}`);
      }
    }
  }
}

// 4. Verify no code has been modified to mock/bypass isolation
function verifyCodeSecurity() {
  console.log('\n--- Checking Application Code Integrity ---');
  const appsDir = path.join(K8S_DIR, '..', 'apps');
  for (const app of APPS) {
    const mainJs = path.join(appsDir, app, 'index.js');
    if (fs.existsSync(mainJs)) {
      const content = fs.readFileSync(mainJs, 'utf8');
      const hasIpChecks = content.includes('req.ip') || content.includes('req.connection.remoteAddress');
      recordResult(`Application ${app} does not hardcode client IP access controls`, !hasIpChecks, `Code contains active IP checks instead of relying on NetworkPolicies`);
    }
  }
}

function main() {
  verifyDefaultDenyPolicies();
  verifyDnsEgressPolicies();
  verifyDatabasePolicies();
  verifyCodeSecurity();

  console.log('\n======================================');
  console.log('    KUBERNETES NETWORKPOLICY SUMMARY  ');
  console.log('======================================');
  console.log(`Total Passed: ${results.passed}`);
  console.log(`Total Failed: ${results.failed}`);
  console.log('======================================');

  if (results.failed > 0) {
    console.log('Kubernetes NetworkPolicy validation failed.');
    process.exit(1);
  } else {
    console.log('Kubernetes NetworkPolicy validation passed successfully!');
    process.exit(0);
  }
}

main();

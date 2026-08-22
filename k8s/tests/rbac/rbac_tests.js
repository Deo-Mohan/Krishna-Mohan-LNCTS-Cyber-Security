const fs = require('fs');
const path = require('path');

const K8S_DIR = path.join(__dirname, '..', '..');

const APPS = ['student', 'faculty', 'exam', 'research'];

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

// 1. Verify every app and db has a dedicated ServiceAccount in the correct namespace
function verifyServiceAccounts() {
  console.log('\n--- Checking ServiceAccount Manifests ---');
  for (const app of APPS) {
    const file = `${app}-serviceaccount.yaml`;
    const filePath = path.join(K8S_DIR, 'rbac', file);
    
    if (!fs.existsSync(filePath)) {
      recordResult(`ServiceAccount file '${file}' exists`, false, `File not found at ${filePath}`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check app service account definition
    const hasAppSA = content.includes(`name: ${app}-app-sa`);
    const hasDbSA = content.includes(`name: ${app}-db-sa`);
    const correctNamespace = content.includes(`namespace: ${app}`);
    const automountDisabled = content.includes('automountServiceAccountToken: false');
    
    recordResult(`Dedicated app ServiceAccount defined for ${app}`, hasAppSA, `Missing ${app}-app-sa`);
    recordResult(`Dedicated db ServiceAccount defined for ${app}`, hasDbSA, `Missing ${app}-db-sa`);
    recordResult(`ServiceAccount namespace matches for ${app}`, correctNamespace, `Namespace must be '${app}'`);
    recordResult(`automountServiceAccountToken disabled in SA manifest for ${app}`, automountDisabled, `Missing 'automountServiceAccountToken: false'`);
  }
}

// 2. Verify deployments reference the correct ServiceAccounts and disable token automounting
function verifyDeploymentIdentity() {
  console.log('\n--- Checking Deployment Identity and Security Contexts ---');
  for (const app of APPS) {
    // Audit App Deployment
    const appFile = `${app}-app.yaml`;
    const appPath = path.join(K8S_DIR, 'deployments', appFile);
    if (fs.existsSync(appPath)) {
      const content = fs.readFileSync(appPath, 'utf8');
      
      const hasAppSA = content.includes(`serviceAccountName: ${app}-app-sa`);
      const automountDisabled = content.includes('automountServiceAccountToken: false');
      const runAsNonRoot = content.includes('runAsNonRoot: true');
      const allowEscalationDisabled = content.includes('allowPrivilegeEscalation: false');
      const capabilitiesDropped = content.includes('drop:') && content.includes('- ALL');
      const notPrivileged = !content.includes('privileged: true');

      recordResult(`Deployment ${appFile} uses dedicated app ServiceAccount`, hasAppSA, `Missing 'serviceAccountName: ${app}-app-sa'`);
      recordResult(`Deployment ${appFile} disables token automounting`, automountDisabled, `Missing 'automountServiceAccountToken: false'`);
      recordResult(`Deployment ${appFile} runAsNonRoot is enabled`, runAsNonRoot, `Missing 'runAsNonRoot: true'`);
      recordResult(`Deployment ${appFile} disables privilege escalation`, allowEscalationDisabled, `Missing 'allowPrivilegeEscalation: false'`);
      recordResult(`Deployment ${appFile} drops ALL Linux capabilities`, capabilitiesDropped, `Missing capabilities drop ALL`);
      recordResult(`Deployment ${appFile} is not privileged`, notPrivileged, `Cannot use privileged mode`);
    } else {
      recordResult(`Deployment file '${appFile}' exists`, false, `File not found at ${appPath}`);
    }

    // Audit DB Deployment
    const dbFile = `${app}-db.yaml`;
    const dbPath = path.join(K8S_DIR, 'deployments', dbFile);
    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf8');
      
      const hasDbSA = content.includes(`serviceAccountName: ${app}-db-sa`);
      const automountDisabled = content.includes('automountServiceAccountToken: false');
      const runAsNonRoot = content.includes('runAsNonRoot: true');
      const allowEscalationDisabled = content.includes('allowPrivilegeEscalation: false');
      const capabilitiesDropped = content.includes('drop:') && content.includes('- ALL');
      const notPrivileged = !content.includes('privileged: true');

      recordResult(`Deployment ${dbFile} uses dedicated db ServiceAccount`, hasDbSA, `Missing 'serviceAccountName: ${app}-db-sa'`);
      recordResult(`Deployment ${dbFile} disables token automounting`, automountDisabled, `Missing 'automountServiceAccountToken: false'`);
      recordResult(`Deployment ${dbFile} runAsNonRoot is enabled`, runAsNonRoot, `Missing 'runAsNonRoot: true'`);
      recordResult(`Deployment ${dbFile} disables privilege escalation`, allowEscalationDisabled, `Missing 'allowPrivilegeEscalation: false'`);
      recordResult(`Deployment ${dbFile} drops ALL Linux capabilities`, capabilitiesDropped, `Missing capabilities drop ALL`);
      recordResult(`Deployment ${dbFile} is not privileged`, notPrivileged, `Cannot use privileged mode`);
    } else {
      recordResult(`Deployment file '${dbFile}' exists`, false, `File not found at ${dbPath}`);
    }
  }
}

// 3. Scan for any Roles/RoleBindings or ClusterRoles/ClusterRoleBindings
function verifyNoUnauthorizedRBACBindings() {
  console.log('\n--- Checking for Unauthorized RBAC Bindings ---');
  
  const rbacDir = path.join(K8S_DIR, 'rbac');
  if (fs.existsSync(rbacDir)) {
    const files = fs.readdirSync(rbacDir);
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const content = fs.readFileSync(path.join(rbacDir, file), 'utf8');
        
        // Assert we have no RoleBinding or ClusterRoleBinding for application ServiceAccounts
        const hasRoleBinding = content.includes('kind: RoleBinding');
        const hasClusterRoleBinding = content.includes('kind: ClusterRoleBinding');
        const hasClusterAdmin = content.includes('cluster-admin');
        
        recordResult(
          `RBAC file ${file} does not contain RoleBindings`,
          !hasRoleBinding,
          `Found Kind: RoleBinding in ${file}!`
        );
        recordResult(
          `RBAC file ${file} does not contain ClusterRoleBindings`,
          !hasClusterRoleBinding,
          `Found Kind: ClusterRoleBinding in ${file}!`
        );
        recordResult(
          `RBAC file ${file} does not bind to cluster-admin`,
          !hasClusterAdmin,
          `Found binding to cluster-admin in ${file}!`
        );
      }
    }
  }
}

function main() {
  verifyServiceAccounts();
  verifyDeploymentIdentity();
  verifyNoUnauthorizedRBACBindings();

  console.log('\n======================================');
  console.log('       KUBERNETES RBAC SUMMARY        ');
  console.log('======================================');
  console.log(`Total Passed: ${results.passed}`);
  console.log(`Total Failed: ${results.failed}`);
  console.log('======================================');

  if (results.failed > 0) {
    console.log('Kubernetes RBAC validation failed.');
    process.exit(1);
  } else {
    console.log('Kubernetes RBAC validation passed successfully!');
    process.exit(0);
  }
}

main();

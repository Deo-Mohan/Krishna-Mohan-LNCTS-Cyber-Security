const fs = require('fs');
const path = require('path');

const K8S_DIR = path.join(__dirname, '..');

const REQUIRED_DIRS = [
  'namespaces',
  'deployments',
  'services',
  'config',
  'rbac',
  'network-policies',
  'security',
  'tests',
  'scripts'
];

const REQUIRED_FILES = {
  'namespaces': ['student.yaml', 'faculty.yaml', 'exam.yaml', 'research.yaml'],
  'config': ['student-secrets.yaml', 'faculty-secrets.yaml', 'exam-secrets.yaml', 'research-secrets.yaml'],
  'deployments': [
    'student-db.yaml', 'student-app.yaml',
    'faculty-db.yaml', 'faculty-app.yaml',
    'exam-db.yaml', 'exam-app.yaml',
    'research-db.yaml', 'research-app.yaml'
  ],
  'services': [
    'student-db-service.yaml', 'student-app-service.yaml',
    'faculty-db-service.yaml', 'faculty-app-service.yaml',
    'exam-db-service.yaml', 'exam-app-service.yaml',
    'research-db-service.yaml', 'research-app-service.yaml'
  ]
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

// 1. Verify Directory Structure
function testDirectoryStructure() {
  console.log('\n--- Checking Kubernetes Folder Structure ---');
  for (const dir of REQUIRED_DIRS) {
    const dirPath = path.join(K8S_DIR, dir);
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    recordResult(`Folder '${dir}' exists`, exists, `Missing folder: ${dirPath}`);
  }
}

// 2. Verify Key Manifest Files exist
function testManifestPresence() {
  console.log('\n--- Checking Manifest Files Presence ---');
  for (const [dir, files] of Object.entries(REQUIRED_FILES)) {
    for (const file of files) {
      const filePath = path.join(K8S_DIR, dir, file);
      const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
      recordResult(`Manifest '${dir}/${file}' exists`, exists, `Missing manifest: ${filePath}`);
    }
  }
}

// 3. Static Code Audit of Manifest Content
function auditManifestContents() {
  console.log('\n--- Auditing Manifest Security & Integrity ---');
  
  // Audit Services
  const servicesDir = path.join(K8S_DIR, 'services');
  if (fs.existsSync(servicesDir)) {
    const files = fs.readdirSync(servicesDir);
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');
        
        // 3a. ClusterIP verification
        const isClusterIP = content.includes('type: ClusterIP') || !content.includes('type:');
        recordResult(
          `Service ${file} is ClusterIP`,
          isClusterIP,
          `Service must use ClusterIP (found alternate type configuration)`
        );
        
        // 3b. No NodePort or LoadBalancer
        const isUnexposed = !content.includes('type: NodePort') && !content.includes('type: LoadBalancer');
        recordResult(
          `Service ${file} has no NodePort/LoadBalancer`,
          isUnexposed,
          `Service exposed port externally!`
        );
      }
    }
  }

  // Audit Deployments
  const deploymentsDir = path.join(K8S_DIR, 'deployments');
  if (fs.existsSync(deploymentsDir)) {
    const files = fs.readdirSync(deploymentsDir);
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const content = fs.readFileSync(path.join(deploymentsDir, file), 'utf8');
        
        // 3c. No hardcoded passwords in Deployments
        const hasNoHardcodedPasswords = !content.includes('value: student_dev_pass') &&
                                        !content.includes('value: faculty_dev_pass') &&
                                        !content.includes('value: exam_dev_pass') &&
                                        !content.includes('value: research_dev_pass');
        recordResult(
          `Deployment ${file} has no hardcoded passwords`,
          hasNoHardcodedPasswords,
          `Deployment contains hardcoded credentials!`
        );

        // 3d. Non-root configuration check
        const runsAsNonRoot = content.includes('runAsNonRoot: true');
        recordResult(
          `Deployment ${file} defines runAsNonRoot`,
          runsAsNonRoot,
          `Deployment missing 'runAsNonRoot: true' configuration!`
        );

        // 3e. Probes check
        const hasReadinessProbe = content.includes('readinessProbe:');
        const hasLivenessProbe = content.includes('livenessProbe:');
        recordResult(
          `Deployment ${file} defines readinessProbe`,
          hasReadinessProbe,
          `Deployment missing readinessProbe!`
        );
        recordResult(
          `Deployment ${file} defines livenessProbe`,
          hasLivenessProbe,
          `Deployment missing livenessProbe!`
        );

        // 3f. Resource limits/requests
        const hasResources = content.includes('resources:');
        const hasRequests = content.includes('requests:');
        const hasLimits = content.includes('limits:');
        recordResult(
          `Deployment ${file} defines resource limits & requests`,
          hasResources && hasRequests && hasLimits,
          `Deployment missing resource requests or limits configuration!`
        );
      }
    }
  }

  // Audit Secrets
  const configDir = path.join(K8S_DIR, 'config');
  if (fs.existsSync(configDir)) {
    const files = fs.readdirSync(configDir);
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const content = fs.readFileSync(path.join(configDir, file), 'utf8');
        
        // 3g. Check base64 values
        const isSecretYaml = content.includes('kind: Secret');
        recordResult(
          `Config ${file} is a valid Secret resource`,
          isSecretYaml,
          `Config missing 'kind: Secret'`
        );
      }
    }
  }
}

function main() {
  testDirectoryStructure();
  testManifestPresence();
  auditManifestContents();

  console.log('\n======================================');
  console.log('       KUBERNETES MANIFEST SUMMARY    ');
  console.log('======================================');
  console.log(`Total Passed: ${results.passed}`);
  console.log(`Total Failed: ${results.failed}`);
  console.log('======================================');

  if (results.failed > 0) {
    console.log('Kubernetes manifest validation failed.');
    process.exit(1);
  } else {
    console.log('Kubernetes manifest validation passed successfully!');
    process.exit(0);
  }
}

main();

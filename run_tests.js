const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const APPS = [
  { name: 'student', port: 8081, api: '/api/students', dbPort: 5432 },
  { name: 'faculty', port: 8082, api: '/api/faculty/courses', dbPort: 3306 },
  { name: 'exam', port: 8083, api: '/api/exams/questions', dbPort: 1521 },
  { name: 'research', port: 8084, api: '/api/research/projects', dbPort: 5432 }
];

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

// 1. Secrets Scan Test
function scanForSecrets() {
  console.log('\n--- Running Test 6: Secret Scanning ---');
  let hasSecrets = false;
  
  const scanDirectory = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git') {
          scanDirectory(filePath);
        }
      } else if (file.endsWith('.js') || file.endsWith('.json')) {
        const content = fs.readFileSync(filePath, 'utf8');
        // Search for patterns like password = 'xxx', secret = 'xxx', token = 'xxx'
        const matches = content.match(/(password|secret|token|private_key)\s*[:=]\s*['"`][^'"`\s]{3,}['"`]/gi);
        if (matches) {
          // Exclude dynamic env mappings
          const cleanMatches = matches.filter(m => !m.includes('process.env'));
          if (cleanMatches.length > 0) {
            hasSecrets = true;
            console.log(`Potential hardcoded secret found in ${filePath}:`, cleanMatches);
          }
        }
      }
    }
  };

  try {
    scanDirectory(path.join(__dirname, 'apps'));
    recordResult('No hardcoded secrets committed to source', !hasSecrets, 'Found potential secrets in codebase.');
  } catch (err) {
    recordResult('No hardcoded secrets committed to source', false, err.message);
  }
}

// 2. Dockerfile Configuration and Syntax check
function validateDockerfiles() {
  console.log('\n--- Running Test 7 (Part A): Dockerfile Audit ---');
  for (const app of APPS) {
    const dockerfilePath = path.join(__dirname, 'apps', app.name, 'Dockerfile');
    try {
      if (!fs.existsSync(dockerfilePath)) {
        recordResult(`Dockerfile exists for ${app.name}`, false, 'File does not exist');
        continue;
      }
      
      const content = fs.readFileSync(dockerfilePath, 'utf8');
      const hasNonRootUser = content.includes('USER node') || content.includes('USER ');
      const hasExpose = content.includes(`EXPOSE ${app.port}`);
      
      recordResult(`Dockerfile for ${app.name} runs as non-root`, hasNonRootUser, 'No USER directive found in Dockerfile');
      recordResult(`Dockerfile for ${app.name} exposes correct port ${app.port}`, hasExpose, `Missing EXPOSE ${app.port}`);
    } catch (err) {
      recordResult(`Dockerfile validation for ${app.name}`, false, err.message);
    }
  }
}

// 3. Docker build verification (Best effort check)
function verifyDockerBuild() {
  console.log('\n--- Running Test 7 (Part B): Best-Effort Docker Build ---');
  let dockerAvailable = false;
  try {
    execSync('docker --version', { stdio: 'ignore' });
    dockerAvailable = true;
  } catch (e) {
    console.log('Docker daemon/cli not detected. Skipping live container builds.');
  }

  if (dockerAvailable) {
    for (const app of APPS) {
      const dockerfilePath = path.join(__dirname, 'apps', app.name);
      try {
        console.log(`Building Docker image for ${app.name}-portal...`);
        execSync(`docker build -t ${app.name}-portal-test:latest .`, { cwd: dockerfilePath, stdio: 'ignore' });
        recordResult(`Docker container builds successfully for ${app.name}`, true);
      } catch (err) {
        recordResult(`Docker container builds successfully for ${app.name}`, false, err.message);
      }
    }
  } else {
    console.log('Skipping live docker builds. Syntax validation was completed.');
  }
}

// Helper: HTTP request promise
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', (err) => reject(err));
  });
}

// 4. Server startup, API & Health, and DB connectivity test
async function testAppIntegrity(app) {
  console.log(`\n--- Running Tests for App: ${app.name} ---`);
  
  // Test A: Normal Startup (Mock Database)
  const child = spawn('node', ['src/server.js'], {
    cwd: path.join(__dirname, 'apps', app.name),
    env: { ...process.env, PORT: app.port }
  });

  let serverStarted = false;
  await new Promise((resolve) => {
    child.stdout.on('data', (data) => {
      const line = data.toString();
      if (line.includes('Application started successfully')) {
        serverStarted = true;
        resolve();
      }
    });
    child.stderr.on('data', (data) => {
      console.error(`[App ${app.name} Stderr]:`, data.toString());
    });
    setTimeout(resolve, 8000); // 8 second timeout for startup
  });

  recordResult(`${app.name} starts successfully`, serverStarted);

  if (serverStarted) {
    try {
      // Test B: /health works
      const healthRes = await fetchJson(`http://127.0.0.1:${app.port}/health`);
      recordResult(`${app.name} /health returns 200`, healthRes.status === 200);
      recordResult(`${app.name} /health payload has healthy status`, healthRes.data?.status === 'healthy');
      
      // Test C: API works
      const apiRes = await fetchJson(`http://127.0.0.1:${app.port}${app.api}`);
      recordResult(`${app.name} API endpoint works`, apiRes.status === 200 && apiRes.data?.success === true);
      
      // Test D: Invalid requests handled
      const invalidRes = await fetchJson(`http://127.0.0.1:${app.port}/api/invalid-route`);
      recordResult(`${app.name} invalid requests return 404`, invalidRes.status === 404 && invalidRes.data?.success === false);
      
    } catch (err) {
      recordResult(`${app.name} API & Health tests`, false, err.message);
    }
  }

  // Stop normal server
  child.kill();
  await new Promise(r => setTimeout(r, 500));

  // Test E: Database Connectivity Check (Strict mode with unavailable port)
  const childStrict = spawn('node', ['src/server.js'], {
    cwd: path.join(__dirname, 'apps', app.name),
    env: { 
      ...process.env, 
      PORT: app.port,
      DB_PORT: 9999, // Unused port to guarantee connection failure
      STRICT_DB_CHECK: 'true'
    }
  });

  let strictStarted = false;
  await new Promise((resolve) => {
    childStrict.stdout.on('data', (data) => {
      if (data.toString().includes('Application started successfully')) {
        strictStarted = true;
        resolve();
      }
    });
    setTimeout(resolve, 8000);
  });

  if (strictStarted) {
    try {
      const healthRes = await fetchJson(`http://127.0.0.1:${app.port}/health`);
      recordResult(`${app.name} /health returns 503 on database down`, healthRes.status === 503);
      recordResult(`${app.name} /health payload reflects unhealthy database`, healthRes.data?.status === 'unhealthy');
    } catch (err) {
      recordResult(`${app.name} strict database checks`, false, err.message);
    }
  } else {
    recordResult(`${app.name} starts in strict database check mode`, false, 'App failed to start in strict mode');
  }

  childStrict.kill();
  await new Promise(r => setTimeout(r, 500));
}

async function runAllTests() {
  scanForSecrets();
  validateDockerfiles();
  verifyDockerBuild();
  
  for (const app of APPS) {
    await testAppIntegrity(app);
  }
  
  console.log('\n======================================');
  console.log('             TEST SUMMARY             ');
  console.log('======================================');
  console.log(`Total Passed: ${results.passed}`);
  console.log(`Total Failed: ${results.failed}`);
  console.log('======================================');
  
  if (results.failed > 0) {
    console.log('Some tests failed. Review the log output above.');
    process.exit(1);
  } else {
    console.log('All tests passed successfully!');
    process.exit(0);
  }
}

runAllTests();

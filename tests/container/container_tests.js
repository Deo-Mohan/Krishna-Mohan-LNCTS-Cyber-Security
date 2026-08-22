const { execSync } = require('child_process');

const APPS = ['student-app', 'faculty-app', 'exam-app', 'research-app'];
const DATABASES = [
  { name: 'student-db', port: 5432 },
  { name: 'faculty-db', port: 3306 },
  { name: 'exam-db', port: 1521 },
  { name: 'research-db', port: 5432 }
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

// Check if docker-compose containers are healthy
function checkContainersHealth() {
  console.log('\n--- Checking Container Health Statuses ---');
  try {
    const output = execSync('docker compose ps --format json', { encoding: 'utf8' });
    // Parse output lines or JSON array depending on docker compose version
    console.log('Container status output:\n', output);
    recordResult('Docker compose containers status gathered', true);
  } catch (err) {
    recordResult('Docker compose containers status gathered', false, err.message);
  }
}

// Function to run a network TCP probe inside a container
function probeNetworkConnection(sourceApp, targetDbHost, targetDbPort) {
  // Inline Node.js code to execute inside the source app container
  const nodeCode = `
    const net = require('net');
    const socket = net.connect(${targetDbPort}, '${targetDbHost}', () => {
      console.log('CONNECTED');
      process.exit(0);
    });
    socket.setTimeout(2500);
    socket.on('timeout', () => {
      console.log('TIMEOUT');
      process.exit(1);
    });
    socket.on('error', (err) => {
      console.log('ERROR: ' + err.message);
      process.exit(1);
    });
  `.replace(/\n/g, ' ').replace(/"/g, '\\"');

  try {
    const cmd = `docker compose exec -T ${sourceApp} node -e "${nodeCode}"`;
    const stdout = execSync(cmd, { encoding: 'utf8', timeout: 5000 });
    return { success: stdout.includes('CONNECTED'), output: stdout.trim() };
  } catch (err) {
    return { success: false, output: err.stdout ? err.stdout.trim() : err.message };
  }
}

async function runNetworkIsolationTests() {
  console.log('\n--- Running Allowed/Blocked Connectivity Matrix ---');

  for (const sourceApp of APPS) {
    const sourcePrefix = sourceApp.split('-')[0]; // 'student', 'faculty', etc.

    for (const targetDb of DATABASES) {
      const targetPrefix = targetDb.name.split('-')[0]; // 'student', 'faculty', etc.
      const shouldAllow = (sourcePrefix === targetPrefix);
      const testName = `${sourceApp} -> ${targetDb.name} (${targetDb.port})`;

      console.log(`Testing: ${testName} (Expected: ${shouldAllow ? 'ALLOW' : 'DENY'})`);
      const probe = probeNetworkConnection(sourceApp, targetDb.name, targetDb.port);

      if (shouldAllow) {
        // Expected success
        recordResult(
          `Connection allowed: ${testName}`, 
          probe.success, 
          `Expected connection to succeed but it failed: ${probe.output}`
        );
      } else {
        // Expected failure
        recordResult(
          `Connection blocked: ${testName}`, 
          !probe.success, 
          `Expected connection to fail but it succeeded: ${probe.output}`
        );
      }
    }
  }

  console.log('\n======================================');
  console.log('       CONTAINER NETWORK SUMMARY      ');
  console.log('======================================');
  console.log(`Total Passed: ${results.passed}`);
  console.log(`Total Failed: ${results.failed}`);
  console.log('======================================');

  if (results.failed > 0) {
    console.log('Container network validation failed.');
    process.exit(1);
  } else {
    console.log('Container network validation passed successfully!');
    process.exit(0);
  }
}

async function main() {
  checkContainersHealth();
  await runNetworkIsolationTests();
}

main();

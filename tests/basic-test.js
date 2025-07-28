// Basic test for server functionality
// Run with: node tests/basic-test.js

const http = require('http');

// Test configuration
const testConfig = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  timeout: 5000
};

// Test suite
const tests = [
  {
    name: 'Server responds to homepage',
    path: '/',
    expectedStatus: 200
  },
  {
    name: 'API routes endpoint works',
    path: '/api/routes',
    expectedStatus: 200
  },
  {
    name: 'Static files are served',
    path: '/css/style.css',
    expectedStatus: 200
  },
  {
    name: '404 for non-existent routes',
    path: '/non-existent-route',
    expectedStatus: 404
  }
];

// Simple HTTP test function
function runTest(test) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: testConfig.host,
      port: testConfig.port,
      path: test.path,
      method: 'GET',
      timeout: testConfig.timeout
    };

    const req = http.request(options, (res) => {
      const passed = res.statusCode === test.expectedStatus;
      resolve({
        name: test.name,
        path: test.path,
        expected: test.expectedStatus,
        actual: res.statusCode,
        passed: passed
      });
    });

    req.on('error', (err) => {
      resolve({
        name: test.name,
        path: test.path,
        expected: test.expectedStatus,
        actual: 'ERROR',
        passed: false,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: test.name,
        path: test.path,
        expected: test.expectedStatus,
        actual: 'TIMEOUT',
        passed: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('🧪 Running basic tests for XXXTok...\n');
  console.log(`Testing server at http://${testConfig.host}:${testConfig.port}\n`);

  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    
    if (!result.passed) {
      console.log(`   Expected: ${result.expected}, Got: ${result.actual}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed!');
    process.exit(1);
  }
}

// Check if server is running before testing
function checkServer() {
  return new Promise((resolve) => {
    const options = {
      hostname: testConfig.host,
      port: testConfig.port,
      path: '/',
      method: 'GET',
      timeout: 1000
    };

    const req = http.request(options, () => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Main execution
async function main() {
  console.log('🔍 Checking if server is running...');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running!');
    console.log(`Please start the server first: npm start`);
    console.log(`Expected server at: http://${testConfig.host}:${testConfig.port}`);
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  await runTests();
}

main().catch(console.error);

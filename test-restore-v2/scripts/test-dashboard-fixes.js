/**
 * Test script to verify dashboard fixes
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Dashboard Fixes...\n');

let testsPass = 0;
let testsFail = 0;

// Test 1: Check CORS configuration in dashboard-server-bridge.js
console.log('1️⃣ Testing WebSocket CORS fix...');
try {
  const dashboardFile = fs.readFileSync(join(__dirname, 'dashboard-server-bridge.js'), 'utf-8');
  if (dashboardFile.includes('http://localhost:5183') && 
      dashboardFile.includes('http://localhost:3008')) {
    console.log('✅ CORS configuration includes ports 5183 and 3008');
    testsPass++;
  } else {
    console.log('❌ CORS configuration missing required ports');
    testsFail++;
  }
} catch (e) {
  console.log('❌ Could not read dashboard-server-bridge.js');
  testsFail++;
}

// Test 2: Check async/await fix
console.log('\n2️⃣ Testing async/await fix...');
try {
  const dashboardFile = fs.readFileSync(join(__dirname, 'dashboard-server-bridge.js'), 'utf-8');
  if (dashboardFile.includes('await this.memoryStorage.listMemories()') && 
      !dashboardFile.includes('this.memoryStorage.getAllMemories()')) {
    console.log('✅ Async/await bug is fixed');
    testsPass++;
  } else {
    console.log('❌ Async/await bug still present');
    testsFail++;
  }
} catch (e) {
  console.log('❌ Could not verify async/await fix');
  testsFail++;
}

// Test 3: Check IPv4 fixes in robust-port-finder.js
console.log('\n3️⃣ Testing IPv4 connection fix...');
try {
  const portFinderFile = fs.readFileSync(join(__dirname, 'lib/robust-port-finder.js'), 'utf-8');
  const localhostCount = (portFinderFile.match(/http:\/\/localhost:/g) || []).length;
  const ipv4Count = (portFinderFile.match(/http:\/\/127\.0\.0\.1:/g) || []).length;
  
  if (localhostCount === 0 && ipv4Count > 0) {
    console.log('✅ All localhost references replaced with 127.0.0.1');
    testsPass++;
  } else {
    console.log(`❌ Still has ${localhostCount} localhost references`);
    testsFail++;
  }
} catch (e) {
  console.log('❌ Could not read robust-port-finder.js');
  testsFail++;
}

// Test 4: Check port configuration in apiConfig.ts
console.log('\n4️⃣ Testing dynamic port detection...');
try {
  const apiConfigFile = fs.readFileSync(join(__dirname, 'src/utils/apiConfig.ts'), 'utf-8');
  if (apiConfigFile.includes('3008') && apiConfigFile.includes('3007')) {
    console.log('✅ Port configuration includes 3008 and 3007');
    testsPass++;
  } else {
    console.log('❌ Port configuration missing new ports');
    testsFail++;
  }
} catch (e) {
  console.log('❌ Could not read apiConfig.ts');
  testsFail++;
}

// Test 5: Check startup script exists
console.log('\n5️⃣ Testing startup script...');
try {
  if (fs.existsSync(join(__dirname, 'start-dashboard-windows.bat'))) {
    console.log('✅ Windows startup script exists');
    testsPass++;
  } else {
    console.log('❌ Windows startup script missing');
    testsFail++;
  }
} catch (e) {
  console.log('❌ Could not check startup script');
  testsFail++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Results:');
console.log(`✅ Passed: ${testsPass}`);
console.log(`❌ Failed: ${testsFail}`);
console.log(`📈 Success Rate: ${((testsPass / (testsPass + testsFail)) * 100).toFixed(1)}%`);

if (testsFail === 0) {
  console.log('\n🎉 All dashboard fixes are properly applied!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some fixes are missing or incorrect');
  process.exit(1);
}
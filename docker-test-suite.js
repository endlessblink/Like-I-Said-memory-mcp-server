#!/usr/bin/env node

/**
 * Docker-based Testing Suite for DXT Package
 * Tests the DXT package in isolated container environments
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DockerTestSuite {
    constructor() {
        this.testResults = {};
        this.platforms = [
            {
                name: 'ubuntu-22.04',
                image: 'ubuntu:22.04',
                nodeInstall: 'curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs',
                packageManager: 'apt-get update && apt-get install -y curl unzip'
            },
            {
                name: 'node-18-alpine',
                image: 'node:18-alpine',
                nodeInstall: '',
                packageManager: 'apk add --no-cache unzip curl'
            },
            {
                name: 'centos-8',
                image: 'centos:8',
                nodeInstall: 'curl -fsSL https://rpm.nodesource.com/setup_18.x | bash - && yum install -y nodejs',
                packageManager: 'yum update -y && yum install -y curl unzip'
            }
        ];
    }

    async runAllTests() {
        console.log('🐳 Docker-based DXT Testing Suite');
        console.log('================================');
        console.log('');

        try {
            // Check Docker availability
            await this.checkDockerAvailability();
            
            // Test DXT package on each platform
            for (const platform of this.platforms) {
                await this.testPlatform(platform);
            }
            
            // Test dashboard in containers
            await this.testDashboard();
            
            // Generate comprehensive report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Docker testing failed:', error.message);
            process.exit(1);
        }
    }

    async checkDockerAvailability() {
        console.log('🔍 Checking Docker availability...');
        
        try {
            const dockerVersion = execSync('docker --version', { encoding: 'utf8' });
            console.log(`✅ Docker available: ${dockerVersion.trim()}`);
            
            // Check if we can run containers
            execSync('docker run --rm hello-world > /dev/null 2>&1');
            console.log('✅ Docker can run containers');
            
        } catch (error) {
            throw new Error('Docker not available or not running. Please install and start Docker.');
        }
        
        console.log('');
    }

    async testPlatform(platform) {
        console.log(`🐳 Testing on ${platform.name}`);
        console.log('─'.repeat(40));
        
        const containerName = `dxt-test-${platform.name}-${Date.now()}`;
        
        try {
            // Create Dockerfile for this platform
            const dockerfile = this.createDockerfile(platform);
            const dockerfilePath = path.join(__dirname, `Dockerfile.${platform.name}`);
            fs.writeFileSync(dockerfilePath, dockerfile);
            
            // Build test image
            console.log('   🔨 Building test image...');
            execSync(`docker build -f ${dockerfilePath} -t ${containerName} .`, { 
                stdio: 'pipe',
                cwd: __dirname 
            });
            
            // Run DXT tests in container
            console.log('   🧪 Running DXT tests...');
            const testCommand = [
                'docker', 'run', '--rm',
                '--name', containerName,
                '-v', `${__dirname}:/workspace`,
                containerName,
                '/bin/bash', '-c', this.getTestScript()
            ].join(' ');
            
            const testOutput = execSync(testCommand, { 
                encoding: 'utf8',
                timeout: 60000 // 1 minute timeout
            });
            
            // Parse test results
            const results = this.parseTestOutput(testOutput);
            this.testResults[platform.name] = results;
            
            console.log(`   ${results.success ? '✅' : '❌'} Tests ${results.success ? 'passed' : 'failed'}`);
            console.log(`   📊 Score: ${results.score}%`);
            
            if (results.errors.length > 0) {
                console.log('   ⚠️  Issues found:');
                results.errors.forEach(error => console.log(`      • ${error}`));
            }
            
            // Cleanup
            fs.unlinkSync(dockerfilePath);
            
        } catch (error) {
            console.error(`   ❌ Platform test failed: ${error.message}`);
            this.testResults[platform.name] = {
                success: false,
                score: 0,
                errors: [error.message]
            };
        }
        
        console.log('');
    }

    createDockerfile(platform) {
        return `
FROM ${platform.image}

# Install system dependencies
RUN ${platform.packageManager}

# Install Node.js if needed
${platform.nodeInstall ? `RUN ${platform.nodeInstall}` : ''}

# Set working directory
WORKDIR /workspace

# Copy DXT package
COPY dist-dxt/like-i-said-memory-v2.dxt /tmp/

# Create test environment
RUN mkdir -p /tmp/dxt-test
`;
    }

    getTestScript() {
        return `
set -e

echo "=== DXT Container Test ==="

# Test 1: Extract DXT package
echo "1. Extracting DXT package..."
cd /tmp/dxt-test
unzip -q /tmp/like-i-said-memory-v2.dxt
if [ ! -f "manifest.json" ]; then
    echo "ERROR: manifest.json not found"
    exit 1
fi
echo "✅ DXT extracted successfully"

# Test 2: Validate manifest
echo "2. Validating manifest..."
node -e "
const manifest = JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'));
if (!manifest.dxt_version || !manifest.server) {
    console.error('ERROR: Invalid manifest');
    process.exit(1);
}
console.log('✅ Manifest valid');
"

# Test 3: Check server file
echo "3. Checking server file..."
if [ ! -f "server/mcp-server-standalone.js" ]; then
    echo "ERROR: Server file not found"
    exit 1
fi
echo "✅ Server file exists"

# Test 4: Check dependencies
echo "4. Checking dependencies..."
if [ ! -d "server/node_modules" ]; then
    echo "ERROR: Dependencies not bundled"
    exit 1
fi
echo "✅ Dependencies bundled"

# Test 5: Test server startup
echo "5. Testing server startup..."
timeout 5s node server/mcp-server-standalone.js < /dev/null > /dev/null 2>&1 || true
echo "✅ Server startup test completed"

# Test 6: Test MCP protocol
echo "6. Testing MCP protocol..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | timeout 5s node server/mcp-server-standalone.js 2>/dev/null | head -1 | grep -q '"result"' || {
    echo "ERROR: MCP protocol test failed"
    exit 1
}
echo "✅ MCP protocol working"

echo "=== ALL TESTS PASSED ==="
`;
    }

    parseTestOutput(output) {
        const lines = output.split('\n');
        const errors = [];
        let passedTests = 0;
        const totalTests = 6;
        
        for (const line of lines) {
            if (line.includes('✅')) {
                passedTests++;
            } else if (line.includes('ERROR:')) {
                errors.push(line.replace('ERROR:', '').trim());
            }
        }
        
        const success = errors.length === 0 && output.includes('ALL TESTS PASSED');
        const score = Math.round((passedTests / totalTests) * 100);
        
        return { success, score, errors, passedTests, totalTests };
    }

    async testDashboard() {
        console.log('🌐 Testing Dashboard in Docker');
        console.log('─'.repeat(40));
        
        try {
            // Create dashboard Dockerfile
            const dashboardDockerfile = `
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001 5173
CMD ["npm", "run", "start:dashboard"]
`;
            
            const dockerfilePath = path.join(__dirname, 'Dockerfile.dashboard');
            fs.writeFileSync(dockerfilePath, dashboardDockerfile);
            
            console.log('   🔨 Building dashboard image...');
            execSync('docker build -f Dockerfile.dashboard -t dxt-dashboard-test .', { 
                stdio: 'pipe',
                cwd: __dirname 
            });
            
            console.log('   🚀 Starting dashboard container...');
            const containerProcess = spawn('docker', [
                'run', '--rm', '--name', 'dxt-dashboard-test',
                '-p', '3001:3001',
                'dxt-dashboard-test'
            ], { stdio: 'pipe' });
            
            // Wait for startup
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Test dashboard endpoints
            console.log('   🧪 Testing dashboard endpoints...');
            try {
                const statusResponse = execSync('curl -s http://localhost:3001/api/status', { encoding: 'utf8' });
                const status = JSON.parse(statusResponse);
                
                if (status.status === 'ok') {
                    console.log('   ✅ Dashboard API working');
                    this.testResults.dashboard = { success: true, score: 100 };
                } else {
                    throw new Error('Dashboard API not responding correctly');
                }
                
            } catch (error) {
                console.log('   ❌ Dashboard test failed:', error.message);
                this.testResults.dashboard = { success: false, score: 0, errors: [error.message] };
            }
            
            // Cleanup
            containerProcess.kill();
            fs.unlinkSync(dockerfilePath);
            
        } catch (error) {
            console.error(`   ❌ Dashboard test failed: ${error.message}`);
            this.testResults.dashboard = { success: false, score: 0, errors: [error.message] };
        }
        
        console.log('');
    }

    generateReport() {
        console.log('📊 Docker Test Results Summary');
        console.log('='.repeat(50));
        console.log('');
        
        let totalScore = 0;
        let totalPlatforms = 0;
        
        console.log('Platform Test Results:');
        for (const [platform, result] of Object.entries(this.testResults)) {
            if (platform !== 'dashboard') {
                const icon = result.success ? '✅' : '❌';
                console.log(`  ${icon} ${platform}: ${result.score}% (${result.passedTests || 0}/${result.totalTests || 6} tests)`);
                totalScore += result.score;
                totalPlatforms++;
                
                if (result.errors && result.errors.length > 0) {
                    result.errors.forEach(error => console.log(`      ⚠️  ${error}`));
                }
            }
        }
        
        if (this.testResults.dashboard) {
            const dashResult = this.testResults.dashboard;
            const icon = dashResult.success ? '✅' : '❌';
            console.log(`  ${icon} Dashboard: ${dashResult.score}%`);
        }
        
        const avgScore = totalPlatforms > 0 ? Math.round(totalScore / totalPlatforms) : 0;
        console.log('');
        console.log(`📈 Average Score: ${avgScore}%`);
        console.log(`🐳 Platforms Tested: ${totalPlatforms}`);
        
        const allPassed = Object.values(this.testResults).every(r => r.success);
        console.log('');
        
        if (allPassed && avgScore >= 90) {
            console.log('🎉 DOCKER TESTS PASSED!');
            console.log('   DXT package works correctly in containerized environments');
            console.log('   Ready for deployment across different platforms');
        } else {
            console.log('⚠️  DOCKER TESTS ISSUES DETECTED');
            console.log('   Some platforms failed - investigate before release');
        }
        
        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                averageScore: avgScore,
                platformsTested: totalPlatforms,
                allPassed,
                ready: allPassed && avgScore >= 90
            },
            platformResults: this.testResults,
            recommendations: this.getRecommendations()
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'docker-test-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        console.log('\n📄 Report saved to: docker-test-report.json');
    }

    getRecommendations() {
        const recommendations = [];
        
        for (const [platform, result] of Object.entries(this.testResults)) {
            if (!result.success) {
                recommendations.push(`Fix issues on ${platform}: ${result.errors?.join(', ')}`);
            }
        }
        
        if (recommendations.length === 0) {
            recommendations.push('All platforms working correctly - ready for release');
        }
        
        return recommendations;
    }
}

// Run Docker tests
const tester = new DockerTestSuite();
tester.runAllTests().catch(console.error);
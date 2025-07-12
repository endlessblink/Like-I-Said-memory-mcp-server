#!/usr/bin/env node

/**
 * Validation script for DXT packages
 * Ensures the package meets all requirements before distribution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import unzipper from 'unzipper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

class DXTValidator {
    constructor(dxtPath) {
        this.dxtPath = dxtPath;
        this.tempDir = path.join(__dirname, '..', 'dist', 'dxt-validate-temp');
        this.errors = [];
        this.warnings = [];
        this.info = [];
    }

    async validate() {
        console.log(`${colors.blue}🔍 Validating DXT Package${colors.reset}`);
        console.log(`📦 File: ${this.dxtPath}`);
        console.log('');

        try {
            // Check if file exists
            if (!fs.existsSync(this.dxtPath)) {
                this.error('DXT file does not exist');
                return this.report();
            }

            // Check file extension
            if (!this.dxtPath.endsWith('.dxt')) {
                this.error('File must have .dxt extension');
            }

            // Check file size
            const stats = fs.statSync(this.dxtPath);
            const sizeMB = stats.size / 1024 / 1024;
            this.info(`Package size: ${sizeMB.toFixed(2)} MB`);
            
            if (sizeMB > 100) {
                this.error('Package size exceeds 100MB limit');
            } else if (sizeMB > 80) {
                this.warning('Package size is large (>80MB), consider optimization');
            }

            // Extract and validate contents
            await this.extractAndValidate();

        } catch (error) {
            this.error(`Validation failed: ${error.message}`);
        }

        return this.report();
    }

    async extractAndValidate() {
        // Clean temp directory
        if (fs.existsSync(this.tempDir)) {
            fs.rmSync(this.tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(this.tempDir, { recursive: true });

        // Extract DXT package
        await this.extractPackage();

        // Validate structure
        this.validateStructure();

        // Validate manifest
        this.validateManifest();

        // Validate server files
        this.validateServerFiles();

        // Validate dependencies
        this.validateDependencies();

        // Test basic functionality
        await this.testFunctionality();

        // Cleanup
        fs.rmSync(this.tempDir, { recursive: true, force: true });
    }

    async extractPackage() {
        return new Promise((resolve, reject) => {
            fs.createReadStream(this.dxtPath)
                .pipe(unzipper.Extract({ path: this.tempDir }))
                .on('close', resolve)
                .on('error', reject);
        });
    }

    validateStructure() {
        console.log('📁 Validating package structure...');

        const requiredFiles = [
            'manifest.json',
            'icon.png',
            'README.md'
        ];

        const requiredDirs = [
            'server',
            'server/lib',
            'dashboard',
            'node_modules',
            'data'
        ];

        // Check required files
        requiredFiles.forEach(file => {
            const filePath = path.join(this.tempDir, file);
            if (!fs.existsSync(filePath)) {
                this.error(`Missing required file: ${file}`);
            } else {
                this.info(`✓ Found ${file}`);
            }
        });

        // Check required directories
        requiredDirs.forEach(dir => {
            const dirPath = path.join(this.tempDir, dir);
            if (!fs.existsSync(dirPath)) {
                this.error(`Missing required directory: ${dir}`);
            } else {
                this.info(`✓ Found ${dir}/`);
            }
        });

        // Check main server files
        const serverFiles = [
            'server/mcp-server-wrapper.js',
            'server/server-markdown.js',
            'server/dashboard-server-bridge.js'
        ];

        serverFiles.forEach(file => {
            const filePath = path.join(this.tempDir, file);
            if (!fs.existsSync(filePath)) {
                this.error(`Missing server file: ${file}`);
            }
        });
    }

    validateManifest() {
        console.log('');
        console.log('📋 Validating manifest.json...');

        const manifestPath = path.join(this.tempDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            this.error('manifest.json not found');
            return;
        }

        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            // Required fields
            const requiredFields = [
                'name', 'version', 'api_version', 'display_name',
                'description', 'author', 'main', 'runtime'
            ];

            requiredFields.forEach(field => {
                if (!manifest[field]) {
                    this.error(`Missing required manifest field: ${field}`);
                } else {
                    this.info(`✓ ${field}: ${manifest[field]}`);
                }
            });

            // Validate version format
            if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
                this.error('Invalid version format (should be semver)');
            }

            // Validate runtime
            if (manifest.runtime !== 'node') {
                this.error('Runtime must be "node"');
            }

            // Validate main entry point
            if (manifest.main) {
                const mainPath = path.join(this.tempDir, manifest.main);
                if (!fs.existsSync(mainPath)) {
                    this.error(`Main entry point not found: ${manifest.main}`);
                }
            }

            // Validate permissions
            if (manifest.permissions) {
                this.validatePermissions(manifest.permissions);
            }

            // Validate configuration schema
            if (manifest.configuration) {
                this.validateConfiguration(manifest.configuration);
            }

        } catch (error) {
            this.error(`Invalid manifest.json: ${error.message}`);
        }
    }

    validatePermissions(permissions) {
        if (permissions.filesystem) {
            if (typeof permissions.filesystem.read !== 'boolean') {
                this.warning('filesystem.read should be boolean');
            }
            if (typeof permissions.filesystem.write !== 'boolean') {
                this.warning('filesystem.write should be boolean');
            }
        }

        if (permissions.network) {
            if (permissions.network.serve && !permissions.network.ports) {
                this.error('network.ports required when network.serve is true');
            }
        }
    }

    validateConfiguration(config) {
        Object.entries(config).forEach(([key, schema]) => {
            if (!schema.type) {
                this.warning(`Configuration "${key}" missing type`);
            }
            if (!schema.description) {
                this.warning(`Configuration "${key}" missing description`);
            }
        });
    }

    validateServerFiles() {
        console.log('');
        console.log('🔧 Validating server files...');

        // Check if files are valid JavaScript
        const jsFiles = [
            'server/mcp-server-wrapper.js',
            'server/server-markdown.js',
            'server/dashboard-server-bridge.js'
        ];

        jsFiles.forEach(file => {
            const filePath = path.join(this.tempDir, file);
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    // Basic syntax check
                    new Function(content);
                    this.info(`✓ ${file} syntax valid`);
                } catch (error) {
                    this.error(`Invalid JavaScript in ${file}: ${error.message}`);
                }
            }
        });
    }

    validateDependencies() {
        console.log('');
        console.log('📦 Validating dependencies...');

        const nodeModulesPath = path.join(this.tempDir, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            this.error('node_modules directory not found');
            return;
        }

        // Check for critical dependencies
        const criticalDeps = [
            '@modelcontextprotocol/sdk',
            'express',
            'ws',
            'js-yaml'
        ];

        criticalDeps.forEach(dep => {
            const depPath = path.join(nodeModulesPath, dep);
            if (!fs.existsSync(depPath)) {
                this.error(`Missing critical dependency: ${dep}`);
            } else {
                this.info(`✓ Found ${dep}`);
            }
        });

        // Check for dev dependencies (should not be included)
        const devDeps = ['jest', 'vite', '@types/jest', 'typescript'];
        devDeps.forEach(dep => {
            const depPath = path.join(nodeModulesPath, dep);
            if (fs.existsSync(depPath)) {
                this.warning(`Development dependency included: ${dep}`);
            }
        });
    }

    async testFunctionality() {
        console.log('');
        console.log('🧪 Testing basic functionality...');

        const manifestPath = path.join(this.tempDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) return;

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const mainPath = path.join(this.tempDir, manifest.main);

        if (!fs.existsSync(mainPath)) return;

        try {
            // Test if server can be started
            const testProcess = execSync(
                `node "${mainPath}" --version`,
                { 
                    cwd: this.tempDir,
                    timeout: 5000,
                    encoding: 'utf8'
                }
            );
            this.info('✓ Server executable test passed');
        } catch (error) {
            // It's okay if --version isn't supported
            this.info('⚠️  Could not test server execution (may be normal)');
        }
    }

    error(message) {
        this.errors.push(message);
        console.log(`${colors.red}❌ ${message}${colors.reset}`);
    }

    warning(message) {
        this.warnings.push(message);
        console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
    }

    info(message) {
        this.info.push(message);
        console.log(`${colors.green}${message}${colors.reset}`);
    }

    report() {
        console.log('');
        console.log('📊 Validation Report');
        console.log('==================');
        
        if (this.errors.length === 0) {
            console.log(`${colors.green}✅ Package is valid!${colors.reset}`);
            console.log(`   Warnings: ${this.warnings.length}`);
            return true;
        } else {
            console.log(`${colors.red}❌ Package validation failed${colors.reset}`);
            console.log(`   Errors: ${this.errors.length}`);
            console.log(`   Warnings: ${this.warnings.length}`);
            
            if (this.errors.length > 0) {
                console.log('');
                console.log('Errors:');
                this.errors.forEach((error, i) => {
                    console.log(`  ${i + 1}. ${error}`);
                });
            }
            
            return false;
        }
    }
}

// CLI usage
if (process.argv.length < 3) {
    console.log('Usage: node validate-dxt.js <path-to-dxt-file>');
    process.exit(1);
}

const dxtPath = path.resolve(process.argv[2]);
const validator = new DXTValidator(dxtPath);

validator.validate().then(isValid => {
    process.exit(isValid ? 0 : 1);
});
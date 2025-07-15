#!/usr/bin/env node
/**
 * Enhanced Node.js bridge for Like-I-Said MCP Server
 * Provides fallback execution with comprehensive error handling
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class EnhancedBridge {
    constructor() {
        this.scriptDir = __dirname;
        this.logFile = path.join(this.scriptDir, 'enhanced-bridge.log');
        this.setupLogging();
    }
    
    setupLogging() {
        // Create log stream
        this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
        
        // Override console methods to also write to file
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = (...args) => {
            const message = args.join(' ');
            this.logStream.write(`[${new Date().toISOString()}] INFO: ${message}\n`);
            originalLog.apply(console, args);
        };
        
        console.error = (...args) => {
            const message = args.join(' ');
            this.logStream.write(`[${new Date().toISOString()}] ERROR: ${message}\n`);
            originalError.apply(console, args);
        };
    }
    
    findPython() {
        // Try to find Python executable
        const pythonCommands = ['python3', 'python', 'py'];
        
        for (const cmd of pythonCommands) {
            try {
                const result = require('child_process').execSync(`${cmd} --version`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                console.log(`Found Python: ${cmd} - ${result.trim()}`);
                return cmd;
            } catch (e) {
                // Continue trying
            }
        }
        
        throw new Error('Python not found');
    }
    
    async runPythonServer() {
        const python = this.findPython();
        const serverPath = path.join(this.scriptDir, 'python', 'protocol_compliant_server.py');
        
        console.log(`Starting Python server: ${python} ${serverPath}`);
        
        const pythonProcess = spawn(python, [serverPath], {
            env: { ...process.env, PYTHONUNBUFFERED: '1' },
            stdio: 'inherit'
        });
        
        pythonProcess.on('error', (error) => {
            console.error(`Python server error: ${error.message}`);
            this.fallbackToNodeServer();
        });
        
        pythonProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Python server exited with code ${code}`);
                this.fallbackToNodeServer();
            }
        });
        
        // Handle process termination
        process.on('SIGINT', () => {
            pythonProcess.kill('SIGINT');
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            pythonProcess.kill('SIGTERM');
            process.exit(0);
        });
    }
    
    fallbackToNodeServer() {
        console.log('Falling back to Node.js server...');
        
        const serverPath = path.join(this.scriptDir, 'server-markdown.js');
        
        if (!fs.existsSync(serverPath)) {
            console.error('Node.js server not found!');
            process.exit(1);
        }
        
        // Run the original Node.js server
        require(serverPath);
    }
    
    run() {
        console.log('Enhanced Bridge starting...');
        console.log(`Script directory: ${this.scriptDir}`);
        console.log(`Log file: ${this.logFile}`);
        
        try {
            this.runPythonServer();
        } catch (error) {
            console.error(`Failed to start Python server: ${error.message}`);
            this.fallbackToNodeServer();
        }
    }
}

// Run the bridge
const bridge = new EnhancedBridge();
bridge.run();

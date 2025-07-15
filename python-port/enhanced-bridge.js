#!/usr/bin/env node
/**
 * Enhanced Node.js Bridge for Python MCP Server
 * Supports configuration and better error handling
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

class EnhancedMCPBridge {
    constructor() {
        this.config = this.loadConfig();
        this.pythonProcess = null;
        this.debug = this.config.debug_mode || process.env.DEBUG_MCP === 'true';
        this.logFile = path.join(process.cwd(), 'bridge.log');
    }

    loadConfig() {
        // Try to load configuration from various sources
        const configSources = [
            process.env.MCP_CONFIG ? JSON.parse(process.env.MCP_CONFIG) : null,
            this.tryLoadFile('.mcpconfig.json'),
            this.tryLoadFile('config.json'),
            {}
        ];

        return Object.assign({}, ...configSources.filter(Boolean));
    }

    tryLoadFile(filename) {
        try {
            if (fs.existsSync(filename)) {
                return JSON.parse(fs.readFileSync(filename, 'utf8'));
            }
        } catch (e) {
            // Ignore errors
        }
        return null;
    }

    log(message) {
        if (this.debug) {
            const timestamp = new Date().toISOString();
            const logMsg = `[${timestamp}] ${message}`;
            console.error(logMsg);
            
            try {
                fs.appendFileSync(this.logFile, logMsg + '\n');
            } catch (e) {
                // Ignore file errors
            }
        }
    }

    findPython() {
        // Try user-configured path first
        if (this.config.python_path && fs.existsSync(this.config.python_path)) {
            return this.config.python_path;
        }

        // Try common Python executables
        const candidates = [
            'python3',
            'python',
            'py'
        ];

        for (const candidate of candidates) {
            try {
                require('child_process').execSync(`${candidate} --version`, { stdio: 'ignore' });
                return candidate;
            } catch (e) {
                // Try next candidate
            }
        }

        throw new Error('Python not found. Please install Python or set python_path in configuration.');
    }

    startPython() {
        const pythonExe = this.findPython();
        const scriptPath = path.join(__dirname, 'server', 'windows_robust_server.py');

        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Python script not found: ${scriptPath}`);
        }

        this.log(`Starting Python with: ${pythonExe} ${scriptPath}`);

        this.pythonProcess = spawn(pythonExe, [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PYTHONIOENCODING: 'utf-8'
            }
        });

        this.pythonProcess.on('error', (err) => {
            this.log(`Python process error: ${err.message}`);
            process.exit(1);
        });

        this.pythonProcess.on('exit', (code, signal) => {
            this.log(`Python process exited: code=${code}, signal=${signal}`);
            if (code !== 0 && code !== null) {
                process.exit(code);
            }
        });

        // Setup I/O forwarding
        this.setupIOForwarding();
        
        this.log('Python process started successfully');
    }

    setupIOForwarding() {
        // Forward stdin to Python
        const stdinReader = readline.createInterface({
            input: process.stdin,
            crlfDelay: Infinity
        });

        stdinReader.on('line', (line) => {
            this.log(`Forwarding to Python: ${line.substring(0, 100)}...`);
            this.pythonProcess.stdin.write(line + '\n');
        });

        stdinReader.on('close', () => {
            this.log('Stdin closed, shutting down Python');
            this.pythonProcess.kill();
        });

        // Forward Python stdout to stdout
        const pythonReader = readline.createInterface({
            input: this.pythonProcess.stdout,
            crlfDelay: Infinity
        });

        pythonReader.on('line', (line) => {
            this.log(`Received from Python: ${line.substring(0, 100)}...`);
            console.log(line);
        });

        // Forward Python stderr to our log
        const stderrReader = readline.createInterface({
            input: this.pythonProcess.stderr,
            crlfDelay: Infinity
        });

        stderrReader.on('line', (line) => {
            this.log(`Python stderr: ${line}`);
        });
    }

    start() {
        this.log('Enhanced MCP Bridge starting...');
        this.log(`Config: ${JSON.stringify(this.config)}`);
        
        try {
            this.startPython();
            
            // Setup shutdown handlers
            process.on('SIGINT', () => this.shutdown());
            process.on('SIGTERM', () => this.shutdown());
            
        } catch (error) {
            this.log(`Failed to start: ${error.message}`);
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    }

    shutdown() {
        this.log('Shutting down...');
        if (this.pythonProcess) {
            this.pythonProcess.kill('SIGTERM');
        }
        process.exit(0);
    }
}

// Start the bridge
const bridge = new EnhancedMCPBridge();
bridge.start();
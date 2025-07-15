#!/usr/bin/env node
/**
 * Node.js MCP Bridge for Python Server
 * 
 * This wrapper acts as an intermediary between Claude Desktop and the Python MCP server.
 * It handles stdio communication reliably and spawns the Python process as a child.
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

class NodePythonBridge {
    constructor() {
        this.pythonProcess = null;
        this.initialized = false;
        this.requestQueue = [];
        this.responseHandlers = new Map();
        this.debugLog = process.env.DEBUG_MCP === 'true';
        this.logFile = path.join(process.cwd(), 'node-bridge.log');
        
        // Setup clean shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
        process.on('exit', () => this.shutdown());
    }

    log(message) {
        if (this.debugLog) {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] ${message}\n`;
            process.stderr.write(logMessage);
            
            // Also write to file for debugging
            try {
                fs.appendFileSync(this.logFile, logMessage);
            } catch (e) {
                // Ignore file write errors
            }
        }
    }

    startPythonServer() {
        this.log('Starting Python MCP server...');
        
        // Determine Python executable and script path
        const pythonExe = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.join(__dirname, 'server', 'windows_robust_server.py');
        
        // Check if Python script exists
        if (!fs.existsSync(scriptPath)) {
            this.log(`Error: Python script not found at ${scriptPath}`);
            process.stderr.write(`Error: Python script not found at ${scriptPath}\n`);
            process.exit(1);
        }
        
        // Spawn Python process with proper options
        const spawnOptions = {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PYTHONIOENCODING: 'utf-8'
            }
        };
        
        if (process.platform === 'win32') {
            spawnOptions.shell = false;
            spawnOptions.windowsHide = true;
        }
        
        this.pythonProcess = spawn(pythonExe, [scriptPath], spawnOptions);
        
        this.pythonProcess.on('error', (error) => {
            this.log(`Failed to start Python process: ${error.message}`);
            process.stderr.write(`Failed to start Python process: ${error.message}\n`);
            process.exit(1);
        });
        
        this.pythonProcess.on('exit', (code, signal) => {
            this.log(`Python process exited with code ${code}, signal ${signal}`);
            if (code !== 0 && code !== null) {
                process.exit(code);
            }
        });
        
        // Setup Python stdout reader
        const pythonStdout = readline.createInterface({
            input: this.pythonProcess.stdout,
            crlfDelay: Infinity
        });
        
        pythonStdout.on('line', (line) => {
            this.handlePythonOutput(line);
        });
        
        // Setup Python stderr reader
        const pythonStderr = readline.createInterface({
            input: this.pythonProcess.stderr,
            crlfDelay: Infinity
        });
        
        pythonStderr.on('line', (line) => {
            this.log(`Python stderr: ${line}`);
        });
        
        this.log('Python MCP server started successfully');
    }

    handlePythonOutput(line) {
        if (!line.trim()) return;
        
        this.log(`Python output: ${line.substring(0, 100)}...`);
        
        try {
            const message = JSON.parse(line);
            
            // Forward the message to stdout for Claude Desktop
            console.log(JSON.stringify(message));
            
            // Handle response callbacks if needed
            if (message.id && this.responseHandlers.has(message.id)) {
                const handler = this.responseHandlers.get(message.id);
                this.responseHandlers.delete(message.id);
                handler(message);
            }
        } catch (e) {
            this.log(`Failed to parse Python output: ${e.message}`);
            // Don't forward non-JSON output
        }
    }

    sendToPython(message) {
        if (!this.pythonProcess || this.pythonProcess.killed) {
            this.log('Python process not available');
            return;
        }
        
        const messageStr = JSON.stringify(message);
        this.log(`Sending to Python: ${messageStr.substring(0, 100)}...`);
        
        try {
            this.pythonProcess.stdin.write(messageStr + '\n');
        } catch (e) {
            this.log(`Failed to send to Python: ${e.message}`);
        }
    }

    handleStdinMessage(line) {
        if (!line.trim()) return;
        
        this.log(`Received from stdin: ${line.substring(0, 100)}...`);
        
        try {
            const message = JSON.parse(line);
            
            // Validate JSON-RPC format
            if (!message.jsonrpc || message.jsonrpc !== '2.0') {
                throw new Error('Invalid JSON-RPC version');
            }
            
            // Forward to Python
            this.sendToPython(message);
            
        } catch (e) {
            this.log(`Failed to parse stdin message: ${e.message}`);
            
            // Send error response
            const errorResponse = {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32700,
                    message: `Parse error: ${e.message}`
                }
            };
            
            console.log(JSON.stringify(errorResponse));
        }
    }

    setupStdinReader() {
        this.log('Setting up stdin reader...');
        
        const rl = readline.createInterface({
            input: process.stdin,
            crlfDelay: Infinity
        });
        
        rl.on('line', (line) => {
            this.handleStdinMessage(line);
        });
        
        rl.on('close', () => {
            this.log('Stdin closed, shutting down...');
            this.shutdown();
        });
    }

    shutdown() {
        this.log('Shutting down bridge...');
        
        if (this.pythonProcess && !this.pythonProcess.killed) {
            this.pythonProcess.kill('SIGTERM');
            
            // Give it time to shut down gracefully
            setTimeout(() => {
                if (!this.pythonProcess.killed) {
                    this.pythonProcess.kill('SIGKILL');
                }
            }, 1000);
        }
        
        process.exit(0);
    }

    start() {
        this.log('Node.js Python MCP Bridge starting...');
        this.log(`Platform: ${process.platform}`);
        this.log(`Node version: ${process.version}`);
        
        // Start Python server
        this.startPythonServer();
        
        // Setup stdin reader
        this.setupStdinReader();
        
        this.log('Bridge initialized and ready');
    }
}

// Main entry point
const bridge = new NodePythonBridge();
bridge.start();
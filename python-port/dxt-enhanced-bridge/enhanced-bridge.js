#!/usr/bin/env node
/**
 * Enhanced Node.js Bridge for Protocol-Compliant Python MCP Server
 * Production-ready version with comprehensive error handling and logging
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

class ProductionMCPBridge {
    constructor() {
        this.config = this.loadConfig();
        this.pythonProcess = null;
        this.debug = this.config.debug_mode || process.env.DEBUG_MCP === 'true';
        this.logFile = path.join(process.cwd(), 'enhanced-bridge.log');
        this.isShuttingDown = false;
        this.pendingRequests = new Map();
        this.requestCounter = 0;
    }

    loadConfig() {
        // Try to load configuration from various sources
        const configSources = [
            process.env.MCP_CONFIG ? JSON.parse(process.env.MCP_CONFIG) : null,
            this.tryLoadFile('.mcpconfig.json'),
            this.tryLoadFile('config.json'),
            {
                python_timeout: 30000,
                max_retries: 3,
                restart_on_error: true,
                log_level: 'info'
            }
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

    log(level, message) {
        const shouldLog = this.debug || level === 'error';
        if (shouldLog) {
            const timestamp = new Date().toISOString();
            const logMsg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
            
            // Always log errors to stderr
            if (level === 'error') {
                console.error(logMsg);
            } else if (this.debug) {
                console.error(logMsg);
            }
            
            // Write to log file if enabled
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
        const candidates = process.platform === 'win32' 
            ? ['python', 'py', 'python3']
            : ['python3', 'python', 'py'];

        for (const candidate of candidates) {
            try {
                require('child_process').execSync(`${candidate} --version`, { 
                    stdio: 'ignore',
                    timeout: 5000
                });
                return candidate;
            } catch (e) {
                // Try next candidate
            }
        }

        throw new Error('Python not found. Please install Python or set python_path in configuration.');
    }

    startPython() {
        const pythonExe = this.findPython();
        const scriptPath = path.join(__dirname, 'server', 'enhanced_protocol_server.py');

        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Python script not found: ${scriptPath}`);
        }

        this.log('info', `Starting Python with: ${pythonExe} ${scriptPath}`);

        // Enhanced spawn options for better compatibility
        const spawnOptions = {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PYTHONIOENCODING: 'utf-8',
                // Add additional environment variables for better Windows compatibility
                PYTHONDONTWRITEBYTECODE: '1'
            }
        };

        // Windows-specific options
        if (process.platform === 'win32') {
            spawnOptions.windowsHide = true;
        }

        this.pythonProcess = spawn(pythonExe, [scriptPath], spawnOptions);

        this.pythonProcess.on('error', (err) => {
            this.log('error', `Python process error: ${err.message}`);
            if (!this.isShuttingDown) {
                this.handlePythonError(err);
            }
        });

        this.pythonProcess.on('exit', (code, signal) => {
            this.log('info', `Python process exited: code=${code}, signal=${signal}`);
            if (code !== 0 && !this.isShuttingDown) {
                this.handlePythonExit(code, signal);
            }
        });

        // Setup enhanced I/O forwarding
        this.setupIOForwarding();
        
        this.log('info', 'Python process started successfully');
    }

    setupIOForwarding() {
        // Handle stdin with proper error handling
        const stdinReader = readline.createInterface({
            input: process.stdin,
            crlfDelay: Infinity
        });

        stdinReader.on('line', (line) => {
            if (this.isShuttingDown) return;
            
            try {
                this.log('debug', `Forwarding to Python: ${line.substring(0, 200)}...`);
                
                // Validate JSON before forwarding
                try {
                    JSON.parse(line);
                } catch (e) {
                    this.log('error', `Invalid JSON received: ${e.message}`);
                    return;
                }
                
                if (this.pythonProcess && this.pythonProcess.stdin.writable) {
                    this.pythonProcess.stdin.write(line + '\n');
                } else {
                    this.log('error', 'Python process stdin not writable');
                }
            } catch (error) {
                this.log('error', `Error forwarding to Python: ${error.message}`);
            }
        });

        stdinReader.on('close', () => {
            this.log('info', 'Stdin closed, initiating shutdown');
            this.shutdown();
        });

        stdinReader.on('error', (error) => {
            this.log('error', `Stdin error: ${error.message}`);
        });

        // Handle Python stdout with enhanced error handling
        const pythonReader = readline.createInterface({
            input: this.pythonProcess.stdout,
            crlfDelay: Infinity
        });

        pythonReader.on('line', (line) => {
            if (this.isShuttingDown) return;
            
            try {
                this.log('debug', `Received from Python: ${line.substring(0, 200)}...`);
                
                // Validate JSON before forwarding
                try {
                    JSON.parse(line);
                } catch (e) {
                    this.log('error', `Invalid JSON from Python: ${e.message}, Line: ${line}`);
                    return;
                }
                
                console.log(line);
            } catch (error) {
                this.log('error', `Error processing Python output: ${error.message}`);
            }
        });

        pythonReader.on('error', (error) => {
            this.log('error', `Python stdout error: ${error.message}`);
        });

        // Handle Python stderr
        const stderrReader = readline.createInterface({
            input: this.pythonProcess.stderr,
            crlfDelay: Infinity
        });

        stderrReader.on('line', (line) => {
            this.log('debug', `Python stderr: ${line}`);
        });

        stderrReader.on('error', (error) => {
            this.log('error', `Python stderr reader error: ${error.message}`);
        });
    }

    handlePythonError(error) {
        this.log('error', `Python process encountered an error: ${error.message}`);
        
        if (this.config.restart_on_error && !this.isShuttingDown) {
            this.log('info', 'Attempting to restart Python process...');
            setTimeout(() => {
                try {
                    this.startPython();
                } catch (restartError) {
                    this.log('error', `Failed to restart Python: ${restartError.message}`);
                    process.exit(1);
                }
            }, 1000);
        } else {
            process.exit(1);
        }
    }

    handlePythonExit(code, signal) {
        this.log('error', `Python process exited unexpectedly: code=${code}, signal=${signal}`);
        
        if (this.config.restart_on_error && !this.isShuttingDown) {
            this.log('info', 'Attempting to restart Python process...');
            setTimeout(() => {
                try {
                    this.startPython();
                } catch (restartError) {
                    this.log('error', `Failed to restart Python: ${restartError.message}`);
                    process.exit(code || 1);
                }
            }, 1000);
        } else {
            process.exit(code || 1);
        }
    }

    start() {
        this.log('info', 'Enhanced Production MCP Bridge starting...');
        this.log('info', `Config: ${JSON.stringify(this.config, null, 2)}`);
        
        try {
            this.startPython();
            
            // Setup comprehensive shutdown handlers
            process.on('SIGINT', () => this.shutdown('SIGINT'));
            process.on('SIGTERM', () => this.shutdown('SIGTERM'));
            process.on('SIGQUIT', () => this.shutdown('SIGQUIT'));
            process.on('SIGHUP', () => this.shutdown('SIGHUP'));
            
            // Handle uncaught exceptions
            process.on('uncaughtException', (error) => {
                this.log('error', `Uncaught exception: ${error.message}`);
                this.log('error', `Stack: ${error.stack}`);
                this.shutdown('uncaughtException');
            });
            
            process.on('unhandledRejection', (reason, promise) => {
                this.log('error', `Unhandled rejection at: ${promise}, reason: ${reason}`);
                this.shutdown('unhandledRejection');
            });
            
        } catch (error) {
            this.log('error', `Failed to start: ${error.message}`);
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    }

    shutdown(reason = 'unknown') {
        if (this.isShuttingDown) return;
        
        this.isShuttingDown = true;
        this.log('info', `Shutting down (reason: ${reason})...`);
        
        if (this.pythonProcess) {
            try {
                // Try graceful shutdown first
                this.pythonProcess.kill('SIGTERM');
                
                // Force kill after timeout
                setTimeout(() => {
                    if (this.pythonProcess && !this.pythonProcess.killed) {
                        this.log('warn', 'Forcing Python process termination');
                        this.pythonProcess.kill('SIGKILL');
                    }
                }, 5000);
            } catch (error) {
                this.log('error', `Error during shutdown: ${error.message}`);
            }
        }
        
        // Exit after a brief delay to allow cleanup
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

// Start the enhanced bridge
const bridge = new ProductionMCPBridge();
bridge.start();

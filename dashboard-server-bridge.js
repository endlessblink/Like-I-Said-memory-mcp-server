#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';
import http from 'http';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { MemoryFormat } from './lib/memory-format.js';
import { TaskStorage } from './lib/task-storage.js';
import { MemoryStorageWrapper } from './lib/memory-storage-wrapper.js';
import { UnifiedMemoryStorage, UnifiedTaskStorage } from './lib/unified-storage-adapter.js';
import { SystemSafeguards } from './lib/system-safeguards.js';
import { FileSystemMonitor } from './lib/file-system-monitor.js';
import { ContentAnalyzer } from './lib/content-analyzer.js';
import { AutomationConfig } from './lib/automation-config.js';
import { AutomationScheduler } from './lib/automation-scheduler.js';
import { OllamaClient } from './lib/ollama-client.js';
import { McpSecurity } from './lib/mcp-security.js';
import { AuthSystem } from './lib/auth-system.js';
import { settingsManager } from './lib/settings-manager.js';
import { MemoryDeduplicator } from './lib/memory-deduplicator.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import yaml from 'js-yaml';
import { startServerWithValidation, cleanupPortFile } from './lib/robust-port-finder.js';
import { PathSettings } from './lib/path-settings.js';
import { FolderDiscovery } from './lib/folder-discovery.js';
import { ReflectionEngine } from './lib/reflection-engine.js';
import { PatternLearner } from './lib/pattern-learner.js';
import { readFileSync } from 'fs';

// Read package.json to get current version
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

// Enhanced dashboard server with real-time MCP bridge
class DashboardBridge {
  constructor(port) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = null; // Defer WebSocket initialization to prevent double-bind
    this.clients = new Set();
    
    // Load path settings
    this.pathSettings = new PathSettings();
    const paths = this.pathSettings.getEffectivePaths();
    this.memoriesDir = paths.memories;
    this.tasksDir = paths.tasks;
    
    this.memoryStorage = new UnifiedMemoryStorage(this.memoriesDir);
    this.taskStorage = new UnifiedTaskStorage(this.tasksDir);
    
    // Initialize unified storage systems
    this.initPromise = this.initializeStorage();
    
    this.safeguards = new SystemSafeguards();
    this.contentAnalyzer = new ContentAnalyzer();
    
    // Initialize authentication system
    this.authSystem = new AuthSystem();
    
    // Enhancement logging
    this.enhancementLogs = [];
    this.maxLogEntries = 200;
    
    // Initialize automation configuration
    this.automationConfig = new AutomationConfig();
    this.fileSystemMonitor = new FileSystemMonitor(this.taskStorage, this, this.automationConfig);
    
    // Initialize automation scheduler
    this.automationScheduler = new AutomationScheduler(
      this.taskStorage,
      this.automationConfig,
      this.fileSystemMonitor
    );
    
    // Initialize reflection and self-improvement systems
    this.reflectionEngine = new ReflectionEngine();
    this.patternLearner = new PatternLearner();
    
    this.setupExpress();
    // setupWebSocket() will be called after server starts listening
    this.setupSafeguards();
    this.setupAutomation();
  }

  setupExpress() {
    // Security middleware with CSP
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for React dev tools and dynamic imports
            "'unsafe-eval'", // Required for development mode
            "blob:", // Required for Monaco Editor
            "data:", // Required for inline scripts
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for styled components and CSS-in-JS
            "fonts.googleapis.com"
          ],
          fontSrc: [
            "'self'",
            "fonts.gstatic.com",
            "data:"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "blob:"
          ],
          connectSrc: [
            "'self'",
            "ws:",
            "wss:",
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://localhost:*",
            "https://127.0.0.1:*"
          ],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"]
        },
        reportOnly: false // Disable report-only to eliminate CSP warnings
      },
      crossOriginEmbedderPolicy: false, // Disable to allow iframes if needed
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    
    // Rate limiting - increased limits for development
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // increased from 100 to 1000 for development
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for localhost in development
        const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
        // Skip rate limiting for quality standards endpoint (cached and shared)
        const isQualityEndpoint = req.path === '/api/quality/standards';
        return isLocalhost || isQualityEndpoint;
      }
    });
    this.app.use('/api/', limiter);
    
    // Dynamic CORS configuration to allow all local network access
    const corsOptions = {
      origin: function (origin, callback) {
        // Allow requests with no origin (like Postman or direct API calls)
        if (!origin) return callback(null, true);
        
        // In development, allow all origins from local network
        if (process.env.NODE_ENV !== 'production') {
          const allowedPatterns = [
            /^http:\/\/localhost(:\d+)?$/,        // Allow with or without port
            /^http:\/\/127\.0\.0\.1(:\d+)?$/,     // Allow with or without port
            /^http:\/\/\[::1\](:\d+)?$/,          // IPv6 localhost
            /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,  // Local network
            /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,     // Local network
            /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+(:\d+)?$/ // Docker/VPN/WSL
          ];
          
          const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
          if (isAllowed) {
            callback(null, true);
          } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
          }
        } else {
          // Production: be more restrictive
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
      exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
      preflightContinue: false // Ensure CORS handles preflight completely
    };
    this.app.use(cors(corsOptions));
    
    // Additional middleware to ensure credentials header is set for all responses
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && process.env.NODE_ENV !== 'production') {
        const allowedPatterns = [
          /^http:\/\/localhost(:\d+)?$/,
          /^http:\/\/127\.0\.0\.1(:\d+)?$/,
          /^http:\/\/\[::1\](:\d+)?$/,
          /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
          /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
          /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+(:\d+)?$/
        ];
        
        const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
        if (isAllowed) {
          res.header('Access-Control-Allow-Credentials', 'true');
        }
      }
      next();
    });
    this.app.use(express.json());

    // Health check endpoint for server validation
    this.app.get('/api/health', (req, res) => {
      res.status(200).json({ 
        status: 'ok',
        message: 'Like-I-Said MCP Server Dashboard API',
        version: packageJson.version,
        timestamp: new Date().toISOString()
      });
    });

    // API port endpoint for frontend discovery
    this.app.get('/api-port', (req, res) => {
      res.status(200).json({ 
        port: this.port
      });
    });

    // Simple test endpoint that always works
    this.app.get('/test', (req, res) => {
      res.send('OK');
    });

    // Helper function to conditionally apply auth middleware
    const requireAuth = (options = {}) => {
      if (settingsManager.isAuthEnabled()) {
        return this.authSystem.requireAuth(options);
      }
      // Return a no-op middleware when auth is disabled
      return (req, res, next) => {
        req.user = {
          id: 'anonymous-user',
          username: 'anonymous',
          role: 'admin',
          sessionId: 'no-auth-session'
        };
        next();
      };
    };

    // Authentication routes (public)
    this.app.post('/api/auth/login', this.login.bind(this));
    this.app.post('/api/auth/logout', requireAuth(), this.logout.bind(this));
    this.app.post('/api/auth/refresh', this.refreshToken.bind(this));
    this.app.post('/api/auth/change-password', requireAuth(), this.changePassword.bind(this));
    this.app.get('/api/auth/me', requireAuth(), this.getCurrentUser.bind(this));
    
    // Admin routes
    this.app.get('/api/auth/users', requireAuth({ role: 'admin' }), this.listUsers.bind(this));
    this.app.post('/api/auth/users', requireAuth({ role: 'admin' }), this.createUser.bind(this));
    this.app.delete('/api/auth/users/:username', requireAuth({ role: 'admin' }), this.deleteUser.bind(this));
    this.app.put('/api/auth/users/:username/role', requireAuth({ role: 'admin' }), this.updateUserRole.bind(this));
    this.app.get('/api/auth/stats', requireAuth({ role: 'admin' }), this.getAuthStats.bind(this));

    // Protected API Routes - Memory endpoints
    this.app.get('/api/memories', requireAuth(), this.getMemories.bind(this));
    this.app.get('/api/memories/:id', requireAuth(), this.getMemory.bind(this));
    this.app.post('/api/memories', requireAuth(), this.createMemory.bind(this));
    this.app.put('/api/memories/:id', requireAuth(), this.updateMemory.bind(this));
    this.app.delete('/api/memories/:id', requireAuth(), this.deleteMemory.bind(this));
    this.app.post('/api/memories/suggest-for-task', requireAuth(), this.suggestMemoriesForTask.bind(this));
    
    // Memory deduplication endpoints
    this.app.get('/api/memories/duplicates', requireAuth(), this.getMemoryDuplicates.bind(this));
    this.app.post('/api/memories/deduplicate', requireAuth(), this.deduplicateMemories.bind(this));
    
    this.app.get('/api/projects', requireAuth(), this.getProjects.bind(this));
    this.app.get('/api/status', this.getStatus.bind(this)); // Keep status public for health checks
    
    // Path configuration endpoints - public to allow setup
    this.app.get('/api/paths', this.getPaths.bind(this));
    this.app.post('/api/paths', this.updatePaths.bind(this));

    // Category Analysis API Routes
    this.app.post('/api/analyze/categories', requireAuth(), this.analyzeCategories.bind(this));
    this.app.post('/api/analyze/categories/feedback', requireAuth(), this.submitCategoryFeedback.bind(this));

    // Protected Task API Routes
    this.app.get('/api/tasks', requireAuth(), this.getTasks.bind(this));
    this.app.get('/api/tasks/:id', requireAuth(), this.getTask.bind(this));
    this.app.get('/api/tasks/:id/memories', requireAuth(), this.getTaskMemories.bind(this));
    this.app.post('/api/tasks', requireAuth(), this.createTask.bind(this));
    this.app.put('/api/tasks/:id', requireAuth(), this.updateTask.bind(this));
    this.app.delete('/api/tasks/:id', requireAuth(), this.deleteTask.bind(this));
    
    // V3 Task API Routes (hierarchical tasks)
    this.app.get('/api/v3/tasks', requireAuth(), this.getV3Tasks.bind(this));
    this.app.get('/api/v3/tasks/:id', requireAuth(), this.getV3Task.bind(this));
    this.app.post('/api/v3/tasks', requireAuth(), this.createV3Task.bind(this));
    this.app.patch('/api/v3/tasks/:id', requireAuth(), this.updateV3Task.bind(this));
    this.app.delete('/api/v3/tasks/:id', requireAuth(), this.deleteV3Task.bind(this));
    this.app.post('/api/v3/tasks/:id/move', requireAuth(), this.moveV3Task.bind(this));
    
    // Protected System API Routes
    this.app.get('/api/system/health', requireAuth(), this.getSystemHealth.bind(this));
    this.app.post('/api/system/backup', requireAuth({ role: 'admin' }), this.createSystemBackup.bind(this));
    this.app.post('/api/system/reload', requireAuth({ role: 'admin' }), this.reloadTasks.bind(this));
    
    // Protected Automation API Routes
    this.app.get('/api/automation/config', requireAuth(), this.getAutomationConfig.bind(this));
    this.app.put('/api/automation/config', requireAuth(), this.updateAutomationConfig.bind(this));
    this.app.get('/api/automation/stats', requireAuth(), this.getAutomationStats.bind(this));
    this.app.post('/api/automation/check/:taskId', requireAuth(), this.checkTaskAutomation.bind(this));
    this.app.get('/api/automation/scheduler/status', requireAuth(), this.getSchedulerStatus.bind(this));
    this.app.post('/api/automation/scheduler/force', requireAuth(), this.forceSchedulerCheck.bind(this));

    // Protected Reflection/Self-Improvement API Routes
    this.app.get('/api/reflection/metrics', requireAuth(), this.getReflectionMetrics.bind(this));
    this.app.get('/api/reflection/report', requireAuth(), this.getPerformanceReport.bind(this));
    this.app.get('/api/reflection/data', requireAuth(), this.getReflectionData.bind(this));
    this.app.get('/api/reflection/status', requireAuth(), this.getReflectionStatus.bind(this));
    this.app.get('/api/reflection/settings', requireAuth(), this.getReflectionSettings.bind(this));
    this.app.put('/api/reflection/settings', requireAuth(), this.updateReflectionSettings.bind(this));
    this.app.get('/api/reflection/patterns', requireAuth(), this.getPatterns.bind(this));
    this.app.post('/api/reflection/patterns', requireAuth(), this.createPattern.bind(this));
    this.app.delete('/api/reflection/patterns/:id', requireAuth(), this.deletePattern.bind(this));
    this.app.put('/api/reflection/thresholds', requireAuth(), this.updateThresholds.bind(this));
    this.app.post('/api/reflection/feedback', requireAuth(), this.provideFeedback.bind(this));
    this.app.get('/api/reflection/backups', requireAuth(), this.getReflectionBackups.bind(this));
    this.app.post('/api/reflection/backups', requireAuth(), this.createReflectionBackup.bind(this));
    this.app.post('/api/reflection/rollback', requireAuth(), this.rollbackReflection.bind(this));
    this.app.post('/api/reflection/reset', requireAuth(), this.resetReflection.bind(this));
    this.app.get('/api/reflection/export', requireAuth(), this.exportReflectionData.bind(this));

    // Protected Ollama endpoints (must come before generic MCP route)
    this.app.get('/api/ollama/status', requireAuth(), this.getOllamaStatus.bind(this));
    this.app.post('/api/mcp/batch_enhance_tasks_ollama', requireAuth(), this.batchEnhanceTasksOllama.bind(this));
    this.app.post('/api/mcp-tools/check_ollama_status', requireAuth(), this.checkOllamaStatus.bind(this));
    this.app.post('/api/mcp-tools/batch_enhance_memories_ollama', requireAuth(), this.batchEnhanceMemoriesOllama.bind(this));
    this.app.post('/api/mcp-tools/batch_enhance_tasks_ollama', requireAuth(), this.batchEnhanceTasksOllama.bind(this));
    this.app.post('/api/mcp-tools/batch_link_memories', requireAuth(), this.batchLinkMemories.bind(this));
    
    // Protected Enhancement log endpoints
    this.app.get('/api/enhancement-logs', requireAuth(), this.getEnhancementLogs.bind(this));
    this.app.delete('/api/enhancement-logs', requireAuth({ role: 'admin' }), this.clearEnhancementLogs.bind(this));
    
    // Protected Quality Standards endpoints
    this.app.get('/api/quality/standards', requireAuth(), this.getQualityStandards.bind(this));
    this.app.get('/api/quality/validate/:id', requireAuth(), this.validateMemoryQuality.bind(this));
    this.app.post('/api/quality/validate/:id', requireAuth(), this.validateMemoryQuality.bind(this));
    
    // Protected MCP Tool Routes - MUST come after specific routes to avoid conflicts
    this.app.get('/api/mcp-tools/list-tools', this.listMcpTools.bind(this)); // No auth for proxy
    this.app.post('/api/mcp-tools/:toolName', this.callMcpToolDirect.bind(this)); // No auth for proxy

    // Settings Management Routes (partially protected)
    this.app.get('/api/settings', this.getSettings.bind(this)); // Public - to check auth status
    this.app.get('/api/settings/auth-status', this.getAuthStatus.bind(this)); // Public - to check if auth is enabled
    this.app.put('/api/settings', requireAuth({ role: 'admin' }), this.updateSettings.bind(this));
    this.app.post('/api/settings/reset', requireAuth({ role: 'admin' }), this.resetSettings.bind(this));
    this.app.post('/api/settings/setup-auth', this.setupAuthentication.bind(this)); // Public - for initial setup
    
    // Backup management endpoints
    this.app.get('/api/backups', requireAuth(), this.listBackups.bind(this));
    this.app.post('/api/backups', requireAuth({ role: 'admin' }), this.createBackup.bind(this));
    this.app.post('/api/backups/:name/restore', requireAuth({ role: 'admin' }), this.restoreBackup.bind(this));
    this.app.delete('/api/backups/:name', requireAuth({ role: 'admin' }), this.deleteBackup.bind(this));
    this.app.get('/api/system/health', requireAuth(), this.getSystemHealth.bind(this));

    // Serve static files
    this.app.use(express.static('dist'));
    
    // Serve React app for non-API routes
    // IMPORTANT: Only serve HTML for non-API routes to prevent JSON parse errors
    this.app.get('*', (req, res) => {
      // Skip API routes - they should return 404 if not found
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
        return;
      }
      res.sendFile(path.resolve('dist/index.html'));
    });

    // Global error handler - must be last
    this.app.use((err, req, res, next) => {
      // Log the full error for debugging
      console.error('Express error:', err);
      
      // Don't expose sensitive error details in production
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const statusCode = err.statusCode || err.status || 500;
      
      const errorResponse = {
        error: isDevelopment ? err.message : 'Internal Server Error',
        status: statusCode
      };
      
      // Include stack trace only in development
      if (isDevelopment && err.stack) {
        errorResponse.stack = err.stack;
      }
      
      res.status(statusCode).json(errorResponse);
    });
  }

  initializeWebSocket() {
    // Create WebSocketServer after HTTP server is listening
    this.wss = new WebSocketServer({ 
      server: this.server
    });
    
    // Set up WebSocket event handlers
    this.setupWebSocket();
  }

  setupWebSocket() {
    // Track connections by IP - make it an instance property
    this.connectionsByIP = new Map();
    
    this.wss.on('connection', (ws, req) => {
      const clientIP = req.socket.remoteAddress;
      const clientId = `${clientIP}:${req.socket.remotePort}`;
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      // Basic origin validation
      const origin = req.headers.origin;
      const allowedOrigins = process.env.NODE_ENV === 'production' 
        ? ['https://localhost:3001', 'https://127.0.0.1:3001']
        : [
            // Allow all common development ports
            ...Array.from({length: 20}, (_, i) => `http://localhost:${3000 + i}`),
            ...Array.from({length: 20}, (_, i) => `http://127.0.0.1:${3000 + i}`),
            // Add current server port dynamically
            `http://localhost:${this.port}`,
            `http://127.0.0.1:${this.port}`,
            // Additional development ports
            'http://localhost:5173', 'http://127.0.0.1:5173',
            'http://localhost:8777', 'http://127.0.0.1:8777',
            'http://localhost:8778', 'http://127.0.0.1:8778',
            'http://localhost:5183', 'http://127.0.0.1:5183',
            'http://localhost:8080', 'http://127.0.0.1:8080'
          ];
      
      if (origin && !allowedOrigins.includes(origin)) {
        console.warn(`🚫 WebSocket connection rejected from unauthorized origin: ${origin}`);
        ws.close(1003, 'Unauthorized origin');
        return;
      }
      
      // Get current connections for this IP
      let currentConnections = this.connectionsByIP.get(clientIP);
      if (!currentConnections) {
        currentConnections = new Set();
        this.connectionsByIP.set(clientIP, currentConnections);
      }
      
      // Clean up any dead connections first
      const deadConnections = [];
      currentConnections.forEach(conn => {
        if (conn.readyState === 2 || conn.readyState === 3) { // CLOSING or CLOSED
          deadConnections.push(conn);
        }
      });
      deadConnections.forEach(conn => currentConnections.delete(conn));
      
      // Prevent connection spam - limit to 10 concurrent connections per IP (increased for dev hot reload)
      if (currentConnections.size >= 10) {
        console.log(`🚫 Too many connections from ${clientIP}, rejecting (current: ${currentConnections.size})`);
        ws.close(1008, 'Too many connections');
        return;
      }
      
      console.log(`📡 Dashboard client connected (${clientId}) - Total: ${this.clients.size + 1}`);
      
      // Store connection with IP tracking
      ws._clientIP = clientIP;
      this.clients.add(ws);
      currentConnections.add(ws);
      
      // Send current status
      ws.send(JSON.stringify({
        type: 'status',
        data: { connected: true, memories: this.countMemories() }
      }));

      ws.on('close', (code, reason) => {
        console.log(`📡 Dashboard client disconnected (${clientId}): ${code} ${reason || ''}`);
        this.clients.delete(ws);
        
        // Remove from IP tracking
        const ipConnections = this.connectionsByIP.get(clientIP);
        if (ipConnections) {
          ipConnections.delete(ws);
          if (ipConnections.size === 0) {
            this.connectionsByIP.delete(clientIP);
          }
        }
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error (${clientId}):`, error);
        this.clients.delete(ws);
        
        // Remove from IP tracking
        const ipConnections = this.connectionsByIP.get(clientIP);
        if (ipConnections) {
          ipConnections.delete(ws);
          if (ipConnections.size === 0) {
            this.connectionsByIP.delete(clientIP);
          }
        }
      });

      // Add ping/pong for connection health
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Setup ping interval to detect broken connections
    const pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.terminate();
          this.clients.delete(ws);
          
          // Clean up IP tracking for terminated connections
          if (ws._clientIP) {
            const ipConnections = this.connectionsByIP.get(ws._clientIP);
            if (ipConnections) {
              ipConnections.delete(ws);
              if (ipConnections.size === 0) {
                this.connectionsByIP.delete(ws._clientIP);
              }
            }
          }
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Ping every 30 seconds

    this.wss.on('close', () => {
      clearInterval(pingInterval);
    });
  }

  async initializeStorage() {
    try {
      console.log('📁 Initializing unified storage for dashboard...');
      await this.memoryStorage.initialize();
      await this.taskStorage.initialize();
      console.log('✅ Dashboard unified storage initialized');
    } catch (error) {
      console.error('❌ Failed to initialize dashboard unified storage:', error.message);
      throw error;
    }
  }

  async setupFileWatcher() {
    try {
      await fsPromises.access(this.memoriesDir);
    } catch {
      await fsPromises.mkdir(this.memoriesDir, { recursive: true });
    }

    // Watch for markdown file changes
    this.watcher = chokidar.watch(`${this.memoriesDir}/**/*.md`, {
      ignored: /[\/\\]\./,
      persistent: true,
      ignoreInitial: false
    });

    this.watcher
      .on('add', (filePath) => {
        console.log('📄 Memory file added:', path.basename(filePath));
        this.broadcastChange('add', filePath);
      })
      .on('change', (filePath) => {
        console.log('📝 Memory file changed:', path.basename(filePath));
        this.broadcastChange('change', filePath);
      })
      .on('unlink', (filePath) => {
        console.log('🗑️ Memory file deleted:', path.basename(filePath));
        this.broadcastChange('delete', filePath);
      });

    console.log('👀 File watcher started for memories directory');
    
    // Watch quality standards config file
    // IMPORTANT: memory-quality-standards.md is located in docs/ directory
    // If you move this file, also update lib/standards-config-parser.cjs:13
    const standardsPath = path.join(path.dirname(this.memoriesDir), 'docs', 'memory-quality-standards.md');
    this.standardsWatcher = chokidar.watch(standardsPath, {
      persistent: true,
      ignoreInitial: true
    });
    
    this.standardsWatcher.on('change', () => {
      console.log('📋 Quality standards updated');
      this.broadcastStandardsUpdate();
    });
  }
  
  broadcastStandardsUpdate() {
    const message = {
      type: 'standards-update',
      data: {
        timestamp: new Date().toISOString()
      }
    };
    
    // Broadcast to all connected WebSocket clients
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  broadcastChange(type, filePath) {
    const message = {
      type: 'file_change',
      data: {
        action: type,
        file: path.basename(filePath),
        project: path.basename(path.dirname(filePath)),
        timestamp: new Date().toISOString()
      }
    };

    // Broadcast to all connected WebSocket clients
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  async countMemories() {
    let count = 0;
    try {
      await fsPromises.access(this.memoriesDir);
      const projects = await fsPromises.readdir(this.memoriesDir);
      for (const project of projects) {
        const projectPath = path.join(this.memoriesDir, project);
        try {
          const stat = await fsPromises.stat(projectPath);
          if (stat.isDirectory()) {
            const files = await fsPromises.readdir(projectPath);
            count += files.filter(f => f.endsWith('.md')).length;
          }
        } catch {
          // Skip if can't access project directory
        }
      }
    } catch {
      // Memories directory doesn't exist
    }
    return count;
  }

  parseMarkdownFile(filePath) {
    // Use the shared memory format parser
    return MemoryFormat.parseMemoryFile(filePath);
  }

  // Authentication route handlers
  async login(req, res) {
    try {
      // Check if authentication is enabled
      if (!settingsManager.isAuthEnabled()) {
        return res.status(400).json({ 
          error: 'Authentication is disabled. All API endpoints are publicly accessible.',
          authEnabled: false,
          message: 'No login required - authentication is disabled in settings'
        });
      }

      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const clientInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      };

      const result = await this.authSystem.authenticateUser(username, password, clientInfo);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  async logout(req, res) {
    try {
      const sessionId = req.user?.sessionId;
      if (sessionId) {
        this.authSystem.logout(sessionId);
      }
      
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const result = await this.authSystem.refreshAccessToken(refreshToken);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const username = req.user?.username;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      await this.authSystem.changePassword(username, currentPassword, newPassword);
      
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const userInfo = this.authSystem.getUserInfo(req.user.username);
      if (!userInfo) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ success: true, user: userInfo });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  }

  async listUsers(req, res) {
    try {
      const users = this.authSystem.listUsers();
      res.json({ success: true, users });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Failed to list users' });
    }
  }

  async createUser(req, res) {
    try {
      const { username, password, role, displayName } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = await this.authSystem.createUser(username, password, role, displayName);
      
      res.status(201).json({ success: true, user });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const { username } = req.params;
      
      this.authSystem.deleteUser(username);
      
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async updateUserRole(req, res) {
    try {
      const { username } = req.params;
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ error: 'Role is required' });
      }

      this.authSystem.updateUserRole(username, role);
      
      res.json({ success: true, message: 'User role updated successfully' });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async getAuthStats(req, res) {
    try {
      const stats = this.authSystem.getAuthStats();
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Get auth stats error:', error);
      res.status(500).json({ error: 'Failed to get authentication statistics' });
    }
  }

  async getMemories(req, res) {
    try {
      const memories = [];
      const { 
        project, 
        page = 1, 
        limit = 10000, // Increased default to show all consolidated data
        sort = 'timestamp', 
        order = 'desc',
        filter_search,
        filter_tags,
        filter_categories,
        filter_content_type
      } = req.query;
      
      // Validate pagination parameters (increased limits for consolidated storage)
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(20000, Math.max(1, parseInt(limit) || 10000)); // Show all consolidated data
      const offset = (pageNum - 1) * limitNum;
      
      try {
        await fsPromises.access(this.memoriesDir);
      } catch {
        return res.json({
          data: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        });
      }

      const allItems = await fsPromises.readdir(this.memoriesDir);
      const projects = [];
      
      // Filter directories asynchronously
      for (const item of allItems) {
        try {
          const dirPath = path.join(this.memoriesDir, item);
          const stat = await fsPromises.stat(dirPath);
          if (stat.isDirectory()) {
            projects.push(item);
          }
        } catch {
          // Skip if can't access
        }
      }

      for (const proj of projects) {
        if (project && proj !== project) continue;
        
        const projectPath = path.join(this.memoriesDir, proj);
        
        // Recursive async function to find all .md files in nested directories
        const findMemoryFiles = async (dir, currentProject = proj) => {
          try {
            const items = await fsPromises.readdir(dir);
            
            for (const item of items) {
              const itemPath = path.join(dir, item);
              try {
                const stat = await fsPromises.stat(itemPath);
                
                if (stat.isDirectory()) {
                  // For nested directories, use the subdirectory name as the project
                  const nestedProject = dir === projectPath ? item : currentProject;
                  await findMemoryFiles(itemPath, nestedProject);
                } else if (item.endsWith('.md')) {
                  const memory = this.parseMarkdownFile(itemPath);
                  if (memory) {
                    // Use the nested directory structure to determine project
                    if (proj === 'default' && currentProject !== 'default') {
                      memory.project = currentProject;
                    } else {
                      memory.project = proj === 'default' ? undefined : proj;
                    }
                    memories.push(memory);
                  }
                }
              } catch {
                // Skip if can't access item
              }
            }
          } catch {
            // Skip if can't read directory
          }
        };
        
        await findMemoryFiles(projectPath);
      }

      // Remove duplicates based on memory ID
      const uniqueMemories = [];
      const seenIds = new Set();
      
      for (const memory of memories) {
        if (!seenIds.has(memory.id)) {
          seenIds.add(memory.id);
          uniqueMemories.push(memory);
        }
      }

      // Apply server-side filters for performance
      let filteredMemories = uniqueMemories;
      
      if (filter_search) {
        const searchTerm = filter_search.toLowerCase();
        filteredMemories = filteredMemories.filter(memory => 
          memory.content?.toLowerCase().includes(searchTerm) ||
          memory.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }
      
      if (filter_tags) {
        const filterTags = filter_tags.split(',').map(tag => tag.trim());
        filteredMemories = filteredMemories.filter(memory => 
          memory.tags && filterTags.some(tag => memory.tags.includes(tag))
        );
      }
      
      if (filter_categories) {
        const filterCategories = filter_categories.split(',').map(cat => cat.trim());
        filteredMemories = filteredMemories.filter(memory => 
          memory.category && filterCategories.includes(memory.category)
        );
      }
      
      if (filter_content_type) {
        const filterTypes = filter_content_type.split(',').map(type => type.trim());
        filteredMemories = filteredMemories.filter(memory => 
          memory.metadata?.content_type && filterTypes.includes(memory.metadata.content_type)
        );
      }
      
      // Sort by specified field and order
      filteredMemories.sort((a, b) => {
        let aVal, bVal;
        switch (sort) {
          case 'timestamp':
            aVal = new Date(a.timestamp).getTime();
            bVal = new Date(b.timestamp).getTime();
            break;
          case 'priority':
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            aVal = priorityOrder[a.priority] || 0;
            bVal = priorityOrder[b.priority] || 0;
            break;
          case 'complexity':
            aVal = a.complexity || 0;
            bVal = b.complexity || 0;
            break;
          case 'size':
            aVal = a.metadata?.size || 0;
            bVal = b.metadata?.size || 0;
            break;
          default:
            aVal = new Date(a.timestamp).getTime();
            bVal = new Date(b.timestamp).getTime();
        }
        
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      });

      // Calculate pagination
      const total = filteredMemories.length;
      const totalPages = Math.ceil(total / limitNum);
      const paginatedMemories = filteredMemories.slice(offset, offset + limitNum);

      // Truncate content for better performance (keep first 500 chars for list view)
      const { truncate = 'true' } = req.query;
      const shouldTruncate = truncate === 'true';
      
      const optimizedMemories = shouldTruncate ? paginatedMemories.map(memory => ({
        ...memory,
        content: memory.content && memory.content.length > 500 
          ? memory.content.substring(0, 500) + '...' 
          : memory.content,
        // Keep all other fields intact
        truncated: memory.content && memory.content.length > 500
      })) : paginatedMemories;

      res.json({
        data: optimizedMemories,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          sort,
          order
        }
      });
    } catch (error) {
      console.error('Error getting memories:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getMemory(req, res) {
    try {
      const { id } = req.params;
      const memories = await this.getAllMemories();
      const memory = memories.find(m => m.id === id);
      
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      res.json(memory);
    } catch (error) {
      console.error('Error getting memory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getAllMemories() {
    const memories = [];
    
    try {
      await fsPromises.access(this.memoriesDir);
    } catch {
      return memories;
    }

    const allItems = await fsPromises.readdir(this.memoriesDir);
    const projects = [];
    
    // Filter directories asynchronously
    for (const item of allItems) {
      try {
        const dirPath = path.join(this.memoriesDir, item);
        const stat = await fsPromises.stat(dirPath);
        if (stat.isDirectory()) {
          projects.push(item);
        }
      } catch {
        // Skip if can't access
      }
    }

    for (const proj of projects) {
      const projectPath = path.join(this.memoriesDir, proj);
      
      // Recursive async function to find all .md files in nested directories
      const findMemoryFiles = async (dir, currentProject = proj) => {
        try {
          const items = await fsPromises.readdir(dir);
          
          for (const item of items) {
            const itemPath = path.join(dir, item);
            try {
              const stat = await fsPromises.stat(itemPath);
              
              if (stat.isDirectory()) {
                // For nested directories, use the subdirectory name as the project
                const nestedProject = dir === projectPath ? item : currentProject;
                await findMemoryFiles(itemPath, nestedProject);
              } else if (item.endsWith('.md')) {
                const memory = this.parseMarkdownFile(itemPath);
                if (memory) {
                  // Use the nested directory structure to determine project
                  if (proj === 'default' && currentProject !== 'default') {
                    memory.project = currentProject;
                  } else {
                    memory.project = proj === 'default' ? undefined : proj;
                  }
                  memories.push(memory);
                }
              }
            } catch {
              // Skip if can't access item
            }
          }
        } catch {
          // Skip if can't read directory
        }
      };
      
      await findMemoryFiles(projectPath);
    }
    
    // Remove duplicates based on memory ID
    const uniqueMemories = [];
    const seenIds = new Set();
    
    for (const memory of memories) {
      if (!seenIds.has(memory.id)) {
        seenIds.add(memory.id);
        uniqueMemories.push(memory);
      }
    }
    
    return uniqueMemories;
  }

  async createMemory(req, res) {
    try {
      const { content, tags = [], category, project } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      // Generate unique ID
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const id = `${timestamp}${randomStr}`;
      
      // Create filename
      const titleSlug = content.trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 40);
      const shortId = timestamp.toString().slice(-6);
      const filename = `${new Date().toISOString().split('T')[0]}-${titleSlug}-${shortId}.md`;
      
      // Determine project directory
      const projectDir = project || 'default';
      const projectPath = path.join(this.memoriesDir, projectDir);
      
      // Ensure project directory exists
      try {
        await fsPromises.access(projectPath);
      } catch {
        await fsPromises.mkdir(projectPath, { recursive: true });
      }
      
      // Create memory object
      const memory = {
        id,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        complexity: 1,
        category: category || undefined,
        project: project && project !== 'default' ? project : undefined,
        tags: tags || [],
        priority: 'medium',
        status: 'active',
        access_count: 0,
        last_accessed: new Date().toISOString(),
        metadata: {
          content_type: 'text',
          size: content.length,
          mermaid_diagram: false
        }
      };
      
      // Generate standardized markdown content
      const fileContent = MemoryFormat.generateMarkdownContent(memory);
      
      // Write markdown file
      const filePath = path.join(projectPath, filename);
      await fsPromises.writeFile(filePath, fileContent, 'utf8');
      
      // Return created memory
      const createdMemory = this.parseMarkdownFile(filePath);
      res.status(201).json(createdMemory);
      
    } catch (error) {
      console.error('Error creating memory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateMemory(req, res) {
    try {
      const { id } = req.params;
      const { content, tags = [] } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }
      
      // Find the memory file
      const memories = await this.getAllMemories();
      const memory = memories.find(m => m.id === id);
      
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      // Update memory object with new content
      memory.content = content.trim();
      memory.tags = tags || [];
      memory.timestamp = new Date().toISOString();
      memory.last_accessed = new Date().toISOString();
      memory.metadata.size = content.length;
      
      // Generate standardized markdown content
      const fileContent = MemoryFormat.generateMarkdownContent(memory);
      
      // Write updated file
      await fsPromises.writeFile(memory.filepath, fileContent, 'utf8');
      
      // Return updated memory
      const updatedMemory = this.parseMarkdownFile(memory.filepath);
      res.json(updatedMemory);
      
    } catch (error) {
      console.error('Error updating memory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async deleteMemory(req, res) {
    try {
      const { id } = req.params;
      const memories = await this.getAllMemories();
      const memory = memories.find(m => m.id === id);
      
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      // Delete the markdown file
      fs.unlinkSync(memory.filepath);
      
      res.json({ success: true, message: 'Memory deleted successfully' });
    } catch (error) {
      console.error('Error deleting memory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getMemoryDuplicates(req, res) {
    try {
      const deduplicator = new MemoryDeduplicator(this.memoryStorage);
      const duplicates = await deduplicator.previewDeduplication();
      
      // Format the response with duplicate groups
      const response = {
        totalDuplicates: duplicates.totalDuplicateFiles || 0,
        statistics: {
          totalMemories: duplicates.totalMemories || 0,
          uniqueMemories: duplicates.uniqueMemories || 0,
          duplicatedIds: duplicates.duplicatedIds || 0
        },
        groups: (duplicates.duplicates || []).map(group => ({
          id: group.id,
          originalFile: group.keepFile,
          duplicates: group.removeFiles,
          duplicateCount: group.removeFiles.length
        }))
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error finding memory duplicates:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async deduplicateMemories(req, res) {
    try {
      const { previewOnly = false } = req.body;
      
      const deduplicator = new MemoryDeduplicator(this.memoryStorage);
      
      if (previewOnly) {
        const duplicates = await deduplicator.previewDeduplication();
        
        res.json({
          preview: true,
          totalToRemove: duplicates.totalDuplicateFiles || 0,
          statistics: {
            totalMemories: duplicates.totalMemories || 0,
            uniqueMemories: duplicates.uniqueMemories || 0,
            duplicatedIds: duplicates.duplicatedIds || 0,
            totalDuplicateFiles: duplicates.totalDuplicateFiles || 0
          },
          duplicateGroups: duplicates.duplicates || []
        });
      } else {
        const result = await deduplicator.deduplicateMemories();
        
        // Broadcast update to WebSocket clients (if available)
        try {
          if (this.broadcastUpdate && typeof this.broadcastUpdate === 'function') {
            this.broadcastUpdate({
              type: 'deduplication_complete',
              data: {
                filesRemoved: result.filesRemoved || 0,
                message: 'Memory deduplication completed'
              }
            });
          }
        } catch (error) {
          console.warn('Failed to broadcast deduplication update:', error.message);
        }
        
        res.json({
          success: true,
          filesRemoved: result.filesRemoved || 0,
          duplicatesRemoved: result.duplicateFiles || 0,
          message: `Successfully removed ${result.filesRemoved || 0} duplicate files`
        });
      }
    } catch (error) {
      console.error('Error deduplicating memories:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getProjects(req, res) {
    try {
      const projects = [];
      
      try {
        await fsPromises.access(this.memoriesDir);
        const allItems = await fsPromises.readdir(this.memoriesDir);
        
        for (const item of allItems) {
          try {
            const dirPath = path.join(this.memoriesDir, item);
            const stat = await fsPromises.stat(dirPath);
            
            if (stat.isDirectory()) {
              const files = await fsPromises.readdir(dirPath);
              const mdFiles = files.filter(f => f.endsWith('.md'));
              
              projects.push({
                name: item === 'default' ? 'Default' : item,
                id: item,
                count: mdFiles.length
              });
            }
          } catch {
            // Skip if can't access directory
          }
        }
      } catch {
        // Memories directory doesn't exist
      }
      
      res.json(projects);
    } catch (error) {
      console.error('Error getting projects:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      let projectCount = 0;
      try {
        await fsPromises.access(this.memoriesDir);
        const items = await fsPromises.readdir(this.memoriesDir);
        projectCount = items.length;
      } catch {
        // Directory doesn't exist
      }
      
      const status = {
        status: 'ok', // Add this for compatibility
        server: 'Dashboard Bridge',
        version: packageJson.version,
        storage: 'markdown',
        memories: await this.countMemories(),
        projects: projectCount,
        websocket_clients: this.clients.size,
        file_watcher: !!this.watcher
      };
      
      res.json(status);
    } catch (error) {
      console.error('Error getting status:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getPaths(req, res) {
    try {
      // Return current paths and whether they exist
      const checkPath = async (dirPath) => {
        try {
          await fsPromises.access(dirPath);
          const stats = await fsPromises.stat(dirPath);
          return {
            exists: true,
            isDirectory: stats.isDirectory(),
            absolute: path.resolve(dirPath)
          };
        } catch {
          return {
            exists: false,
            isDirectory: false,
            absolute: path.resolve(dirPath)
          };
        }
      };

      const memoryInfo = await checkPath(this.memoriesDir);
      const taskInfo = await checkPath(this.tasksDir);

      res.json({
        memories: {
          path: this.memoriesDir,
          ...memoryInfo,
          fromEnv: !!process.env.MEMORY_DIR
        },
        tasks: {
          path: this.tasksDir,
          ...taskInfo,
          fromEnv: !!process.env.TASK_DIR
        },
        suggestions: await this.getSuggestedPaths()
      });
    } catch (error) {
      console.error('Error getting paths:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updatePaths(req, res) {
    try {
      const { memoryPath, taskPath } = req.body;
      
      console.log('📁 Path update request:', { memoryPath, taskPath });
      
      // Validate paths
      if (!memoryPath || !taskPath) {
        return res.status(400).json({ error: 'Both memory and task paths are required' });
      }

      // Use robust path update with validation
      const updateResult = await this.pathSettings.safeUpdatePaths(memoryPath, taskPath);
      
      // Update runtime paths
      this.memoriesDir = updateResult.memories.path;
      this.tasksDir = updateResult.tasks.path;
      
      // Update storage instances
      this.memoryStorage = new UnifiedMemoryStorage(this.memoriesDir);
      this.taskStorage = new UnifiedTaskStorage(this.tasksDir);
      
      // Log the storage status
      const memories = await this.memoryStorage.listMemories();
      console.log('📊 Storage reload status:', {
        memoriesCount: memories.length,
        tasksCount: this.taskStorage.getAllTasks().length,
        memoriesHasData: updateResult.memories.hasData,
        tasksHasData: updateResult.tasks.hasData
      });
      
      // Restart file watchers
      await this.setupFileWatcher();
      
      // Update environment variables for backward compatibility
      process.env.MEMORY_DIR = this.memoriesDir;
      process.env.TASK_DIR = this.tasksDir;
      
      res.json({
        success: true,
        paths: {
          memories: updateResult.memories,
          tasks: updateResult.tasks
        },
        backup: updateResult.backup,
        message: 'Paths updated successfully with validation and backup'
      });
    } catch (error) {
      console.error('Error updating paths:', error);
      res.status(500).json({ 
        error: error.message,
        type: 'path_update_error'
      });
    }
  }

  async getSuggestedPaths() {
    const suggestions = [];
    const home = process.env.HOME || process.env.USERPROFILE;
    
    // First, add discovered folders
    try {
      const discovery = new FolderDiscovery();
      const discovered = await discovery.discoverFolders();
      
      discovered.forEach(folder => {
        suggestions.push({
          name: `📁 ${folder.name} (${folder.memoryCount} memories, ${folder.taskCount} tasks)`,
          memories: folder.memoriesPath,
          tasks: folder.tasksPath,
          discovered: true,
          lastModified: folder.lastModified,
          stats: {
            memoryCount: folder.memoryCount,
            taskCount: folder.taskCount,
            projectCount: folder.projectCount
          }
        });
      });
    } catch (error) {
      console.warn('Failed to discover folders:', error);
    }
    
    // Then add standard suggestions
    if (home) {
      // Common Claude Desktop paths
      suggestions.push({
        name: 'Claude Desktop Default',
        memories: path.join(home, 'memories'),
        tasks: path.join(home, 'tasks'),
        discovered: false
      });
      
      suggestions.push({
        name: 'Like-I-Said Directory',
        memories: path.join(home, 'like-i-said-mcp', 'memories'),
        tasks: path.join(home, 'like-i-said-mcp', 'tasks'),
        discovered: false
      });
      
      suggestions.push({
        name: 'Documents Folder',
        memories: path.join(home, 'Documents', 'like-i-said', 'memories'),
        tasks: path.join(home, 'Documents', 'like-i-said', 'tasks'),
        discovered: false
      });
    }
    
    return suggestions;
  }

  /**
   * Sanitize data to remove invalid Unicode characters
   * Prevents JSON.stringify errors from lone surrogates
   */
  sanitizeUnicode(obj) {
    if (typeof obj === 'string') {
      // Replace lone surrogates and other invalid Unicode sequences
      return obj.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeUnicode(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeUnicode(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  async callMcpTool(req, res) {
    try {
      const { toolName } = req.params;
      const toolArgs = req.body;

      console.log(`🔧 MCP Tool Call: ${toolName}`, toolArgs);

      // Sanitize toolArgs to prevent Unicode errors
      const sanitizedArgs = this.sanitizeUnicode(toolArgs);

      // Create basic MCP request
      const mcpRequest = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: sanitizedArgs
        }
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(mcpRequest);

      // Call the MCP server with JSON string
      const result = await this.executeMcpCommand(jsonString);
      
      if (result.error) {
        return res.status(400).json({ error: result.error.message || 'MCP tool error' });
      }

      // Parse response based on tool type
      if (toolName === 'list_tasks') {
        const tasks = this.parseTaskListResponse(result.result.content[0].text);
        res.json({ tasks });
      } else if (toolName === 'get_task_context') {
        try {
          // Debug logging
          console.log('MCP get_task_context result:', JSON.stringify(result, null, 2));
          
          if (!result.result || !result.result.content || !result.result.content[0]) {
            console.error('Invalid MCP response structure:', result);
            return res.status(500).json({ error: 'Invalid response from MCP server' });
          }
          
          const context = this.parseTaskContextResponse(result.result.content[0].text);
          res.json({ context });
        } catch (parseError) {
          console.error('Error parsing task context response:', parseError);
          console.error('Raw response text:', result.result?.content?.[0]?.text);
          return res.status(500).json({ error: 'Failed to parse task context response' });
        }
      } else {
        // Return raw response for other tools
        res.json({ 
          success: true,
          message: result.result.content[0].text,
          raw: result
        });
      }

    } catch (error) {
      console.error('Error calling MCP tool:', toolName, error);
      console.error('Request params:', params);
      res.status(500).json({ error: error.message });
    }
  }

  async executeMcpCommand(input) {
    return new Promise((resolve, reject) => {
      let child;
      
      // Timeout for command execution
      const timeout = setTimeout(() => {
        if (child && !child.killed) {
          child.kill('SIGKILL');
        }
        reject(new Error('MCP command timed out after 15 seconds'));
      }, 15000);

      // Spawn MCP server process  
      child = spawn('node', ['server-markdown.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB limit

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        if (stdout.length + chunk.length > MAX_BUFFER_SIZE) {
          child.kill('SIGTERM');
          clearTimeout(timeout);
          reject(new Error('MCP server output too large'));
          return;
        }
        stdout += chunk;
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        if (stderr.length + chunk.length > MAX_BUFFER_SIZE) {
          child.kill('SIGTERM');
          clearTimeout(timeout);
          reject(new Error('MCP server error output too large'));
          return;
        }
        stderr += chunk;
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        try {
          if (code !== 0) {
            reject(new Error(`MCP server exited with code ${code}: ${stderr}`));
            return;
          }

          // Parse the JSON response - look for the actual JSON response line
          const lines = stdout.trim().split('\n');
          let jsonResponse = null;
          
          for (const line of lines) {
            try {
              // Sanitize the line before parsing to handle invalid Unicode
              const sanitizedLine = this.sanitizeUnicode(line);
              const parsed = JSON.parse(sanitizedLine);
              if (parsed.jsonrpc && parsed.result) {
                jsonResponse = parsed;
                break;
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }

          if (!jsonResponse) {
            reject(new Error(`No valid JSON response found in output: ${stdout}`));
            return;
          }

          resolve(jsonResponse);
        } catch (error) {
          reject(new Error(`Failed to parse MCP response: ${error.message}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn MCP server: ${error.message}`));
      });

      // Send the input with newline (required for JSON-RPC)
      child.stdin.write(input + '\n');
      child.stdin.end();
    });
  }

  parseTaskListResponse(text) {
    const tasks = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('|') && (line.includes('TASK-') || line.includes('⏳') || line.includes('🔄') || line.includes('✅') || line.includes('🚫'))) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 4) {
          const [statusPart, serialPart, titlePart, projectPart, memoryPart, subtaskPart] = parts;
          
          const statusMap = {
            '⏳': 'todo',
            '🔄': 'in_progress', 
            '✅': 'done',
            '🚫': 'blocked'
          };
          
          const statusIcon = statusPart.charAt(0);
          const status = statusMap[statusIcon] || 'todo';
          const serial = serialPart;
          const title = titlePart;
          const project = projectPart.replace('📁 ', '');
          const memoryCount = memoryPart ? parseInt(memoryPart.replace('🧠 ', '')) || 0 : 0;
          const subtaskCount = subtaskPart ? parseInt(subtaskPart.replace('📝 ', '').split(' ')[0]) || 0 : 0;
          const isSubtask = subtaskPart && subtaskPart.includes('(subtask)');
          
          tasks.push({
            id: serial, // Use serial as ID for now
            serial,
            title,
            status,
            project,
            memory_connections: Array(memoryCount).fill(null),
            subtasks: Array(subtaskCount).fill(null),
            parent_task: isSubtask ? 'unknown' : null,
            priority: 'medium',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          });
        }
      }
    }
    
    return tasks;
  }

  parseTaskContextResponse(text) {
    const context = {
      task: null,
      direct_memories: [],
      related_tasks: [],
      related_memories: []
    };

    const lines = text.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
      if (line.includes('Task Context:')) {
        const titleMatch = line.match(/Task Context: (.+)/);
        if (titleMatch) {
          context.task = { title: titleMatch[1] };
        }
      } else if (line.includes('🆔 ID:')) {
        if (context.task) {
          context.task.id = line.replace('🆔 ID:', '').trim();
        }
      } else if (line.includes('📌 Serial:')) {
        if (context.task) {
          context.task.serial = line.replace('📌 Serial:', '').trim();
        }
      } else if (line.includes('📊 Status:')) {
        if (context.task) {
          context.task.status = line.replace('📊 Status:', '').trim();
        }
      } else if (line.includes('Connected Memories')) {
        currentSection = 'memories';
      } else if (line.startsWith('- ') && currentSection === 'memories') {
        const memoryMatch = line.match(/- (\w+) \((\w+), relevance: (\d+)%\)/);
        if (memoryMatch) {
          const [, id, type, relevance] = memoryMatch;
          context.direct_memories.push({
            id,
            content: '', // Will be filled in by subsequent lines
            connection: {
              type,
              relevance: parseInt(relevance) / 100
            }
          });
        }
      } else if (line.trim() && currentSection === 'memories' && context.direct_memories.length > 0) {
        // Add content to the last memory
        const lastMemory = context.direct_memories[context.direct_memories.length - 1];
        if (!lastMemory.content) {
          lastMemory.content = line.trim();
        } else {
          lastMemory.content += ' ' + line.trim();
        }
      }
    }

    return context;
  }

  // Task management methods
  parseTaskFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Try standard frontmatter format first
      let frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      
      // If that fails, try the malformed format where --- is attached to content
      if (!frontmatterMatch) {
        frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---(.*)$/m);
      }
      
      if (!frontmatterMatch) return null;
      
      const frontmatterText = frontmatterMatch[1];
      const description = frontmatterMatch[2].trim();
      
      // Parse YAML frontmatter
      const frontmatter = yaml.load(frontmatterText);
      
      return {
        ...frontmatter,
        description,
        filepath: filePath
      };
    } catch (error) {
      console.error(`Error parsing task file ${filePath}:`, error);
      return null;
    }
  }

  async getTasks(req, res) {
    try {
      const { 
        project, 
        status, 
        priority,
        page = 1, 
        limit = 10000, // Increased default to show all consolidated data
        sort = 'updated', 
        order = 'desc' 
      } = req.query;
      
      // Validate pagination parameters (increased for consolidated storage)
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(20000, Math.max(1, parseInt(limit) || 10000)); // Show all consolidated data
      const offset = (pageNum - 1) * limitNum;
      
      let tasks = this.taskStorage.getAllTasks();
      
      // Apply filters
      if (project) {
        tasks = tasks.filter(task => task.project === project);
      }
      
      if (status) {
        tasks = tasks.filter(task => task.status === status);
      }
      
      if (priority) {
        tasks = tasks.filter(task => task.priority === priority);
      }
      
      // Sort by specified field and order
      tasks.sort((a, b) => {
        let aVal, bVal;
        switch (sort) {
          case 'updated':
            aVal = new Date(a.updated).getTime();
            bVal = new Date(b.updated).getTime();
            break;
          case 'created':
            aVal = new Date(a.created).getTime();
            bVal = new Date(b.created).getTime();
            break;
          case 'priority':
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            aVal = priorityOrder[a.priority] || 0;
            bVal = priorityOrder[b.priority] || 0;
            break;
          case 'title':
            aVal = (a.title || '').toLowerCase();
            bVal = (b.title || '').toLowerCase();
            break;
          case 'status':
            const statusOrder = { todo: 1, in_progress: 2, done: 3, blocked: 4 };
            aVal = statusOrder[a.status] || 0;
            bVal = statusOrder[b.status] || 0;
            break;
          default:
            aVal = new Date(a.updated).getTime();
            bVal = new Date(b.updated).getTime();
        }
        
        if (typeof aVal === 'string') {
          return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      });

      // Calculate pagination
      const total = tasks.length;
      const totalPages = Math.ceil(total / limitNum);
      const paginatedTasks = tasks.slice(offset, offset + limitNum);

      res.json({
        data: paginatedTasks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
          sort,
          order
        },
        filters: {
          project: project || null,
          status: status || null,
          priority: priority || null
        }
      });
    } catch (error) {
      console.error('Error getting tasks:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getTask(req, res) {
    try {
      const { id } = req.params;
      
      const task = this.taskStorage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.json(task);
    } catch (error) {
      console.error('Error getting task:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createTask(req, res) {
    try {
      const { title, description, project, status, priority, category, tags } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }
      
      const newTask = {
        title: title.trim(),
        description: description.trim(),
        project: project || 'default',
        status: status || 'todo',
        priority: priority || 'medium',
        category: category || 'task',
        tags: tags || []
      };
      
      const savedTask = await this.taskStorage.saveTask(newTask);
      
      // Broadcast to WebSocket clients
      this.broadcastToClients({
        type: 'taskCreated',
        task: savedTask
      });
      
      res.status(201).json(savedTask);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedTask = await this.taskStorage.updateTask(id, updates);
      
      // Broadcast to WebSocket clients
      this.broadcastToClients({
        type: 'taskUpdated',
        task: updatedTask
      });
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      
      await this.taskStorage.deleteTask(id);
      
      // Broadcast to WebSocket clients
      this.broadcastToClients({
        type: 'taskDeleted',
        taskId: id
      });
      
      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting task:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  setupSafeguards() {
    // Start file system monitoring
    this.fileSystemMonitor.startMonitoring();
    
    // Create initial backup
    this.safeguards.createBackup('startup').catch(error => {
      console.error('❌ Failed to create startup backup:', error);
    });
    
    // Start automatic backup timer if enabled
    this.safeguards.startAutoBackup();
    
    // Periodic health checks
    setInterval(async () => {
      try {
        const health = await this.safeguards.checkSystemHealth();
        if (health.status !== 'healthy') {
          console.warn('⚠️ System health warning:', health.issues);
        }
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 300000); // Every 5 minutes
  }
  
  setupAutomation() {
    // Start automation scheduler if enabled
    if (this.automationConfig.get('enableScheduledAutomation')) {
      this.automationScheduler.start();
      console.log('🤖 Automation scheduler started');
    } else {
      console.log('🤖 Automation scheduler disabled by configuration');
    }
    
    // Watch for configuration changes
    this.automationConfig.onConfigChange = (key, value) => {
      if (key === 'enableScheduledAutomation') {
        if (value) {
          this.automationScheduler.start();
        } else {
          this.automationScheduler.stop();
        }
      }
    };
  }

  // New API Methods
  async getTaskMemories(req, res) {
    try {
      const { id } = req.params;
      const task = this.taskStorage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const memories = [];
      
      // Get connected memories
      if (task.memory_connections && task.memory_connections.length > 0) {
        const allMemories = await this.getAllMemories();
        
        for (const connection of task.memory_connections) {
          const memory = allMemories.find(m => m.id === connection.memory_id);
          if (memory) {
            memories.push({
              ...memory,
              connection: connection
            });
          }
        }
      }
      
      res.json({
        task: {
          id: task.id,
          title: task.title,
          project: task.project
        },
        memories: memories,
        total: memories.length
      });
    } catch (error) {
      console.error('Error getting task memories:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getSystemHealth(req, res) {
    try {
      const health = await this.safeguards.checkSystemHealth();
      const fsStats = await this.fileSystemMonitor.getFileSystemStats();
      const monitorStatus = this.fileSystemMonitor.getStatus();
      
      res.json({
        ...health,
        fileSystem: fsStats,
        monitor: monitorStatus
      });
    } catch (error) {
      console.error('Error getting system health:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createSystemBackup(req, res) {
    try {
      const { operation = 'manual' } = req.body;
      const backupPath = await this.safeguards.createBackup(operation);
      
      res.json({
        success: true,
        backupPath: backupPath,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async reloadTasks(req, res) {
    try {
      await this.fileSystemMonitor.forceReload();
      
      res.json({
        success: true,
        message: 'Tasks reloaded successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error reloading tasks:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async checkOllamaStatus(req, res) {
    try {
      console.log('🔍 Checking Ollama status...');
      const { show_models, show_diagnostics } = req.body;
      
      // Use imported OllamaClient with debug mode
      const originalDebug = process.env.DEBUG_MCP;
      process.env.DEBUG_MCP = 'true'; // Enable debug for this check
      
      const ollamaClient = new OllamaClient();
      console.log('📍 Using base URL:', ollamaClient.baseUrl);
      
      // Check if Ollama is available
      console.log('🔄 Testing availability...');
      const isAvailable = await ollamaClient.isAvailable();
      console.log('✅ Available:', isAvailable);
      
      // Restore original debug setting
      process.env.DEBUG_MCP = originalDebug;
      
      if (!isAvailable) {
        // Get diagnostics for better error reporting
        const diagnostics = await ollamaClient.getDiagnostics();
        
        let response = `❌ Ollama server is not available

🔧 Environment Information:
   Platform: ${diagnostics.environment.platform}
   WSL Environment: ${diagnostics.environment.isWSL ? 'Yes' : 'No'}
   Primary URL: ${diagnostics.connectivity.primary?.url}
   Primary Error: ${diagnostics.connectivity.primary?.error}

🔧 Setup Instructions:`;
        
        if (diagnostics.environment.isWSL) {
          response += `
1. On Windows, configure Ollama to bind to all interfaces:
   Set-Variable -Name "OLLAMA_HOST" -Value "0.0.0.0:11434" -Scope Machine
2. Allow port 11434 through Windows Firewall:
   New-NetFirewallRule -DisplayName "Ollama WSL" -Direction Inbound -Protocol TCP -LocalPort 11434 -Action Allow
3. Start Ollama: ollama serve
4. Pull model: ollama pull llama3.1:8b

🌐 Alternative URLs tested:`;
          if (diagnostics.connectivity.alternatives) {
            diagnostics.connectivity.alternatives.forEach(alt => {
              response += `\n   ${alt.success ? '✅' : '❌'} ${alt.url} - ${alt.error || 'OK'}`;
            });
          }
        } else {
          response += `
1. Install Ollama: curl -fsSL https://ollama.ai/install.sh | sh
2. Start server: ollama serve
3. Pull model: ollama pull llama3.1:8b`;
        }
        
        response += `

📋 Recommendations:
${diagnostics.recommendations.map(r => `   • ${r}`).join('\n')}

📊 Status: Not Available`;
        
        return res.json({ content: response });
      }
      
      // Get list of models if requested
      let modelsText = '';
      if (show_models) {
        const models = await ollamaClient.listModels();
        if (models && models.length > 0) {
          modelsText = '\n\n📦 Available Models:\n';
          models.forEach(model => {
            const size = model.size ? `${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB` : 'size unknown';
            modelsText += `   → ${model.name} (${size})\n`;
          });
        } else {
          modelsText = '\n\n⚠️ No models installed. Run: ollama pull llama3.1:8b';
        }
      }
      
      const response = {
        content: `✅ Ollama server is running at ${ollamaClient.baseUrl}${modelsText}

📊 Status: Available
🚀 Ready for memory enhancement!`
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error checking Ollama status:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async batchEnhanceMemoriesOllama(req, res) {
    try {
      const { limit = 50, model = 'llama3.1:8b', batch_size = 5, skip_existing = true, project, category } = req.body;
      
      // Use imported OllamaClient
      const ollamaClient = new OllamaClient(null, { model, batchSize: batch_size });
      
      // Check if Ollama is available
      const isAvailable = await ollamaClient.isAvailable();
      if (!isAvailable) {
        return res.status(503).json({ 
          error: 'Ollama server is not available',
          content: '❌ Ollama server is not running. Please start it first.'
        });
      }
      
      // Get memories to enhance
      let memories = await this.getAllMemories();
      
      // Filter by project if specified
      if (project) {
        memories = memories.filter(m => m.project === project);
      }
      
      // Filter by category if specified
      if (category && category !== 'all') {
        memories = memories.filter(m => m.category === category);
      }
      
      // Filter out memories that already have titles if skip_existing is true
      if (skip_existing) {
        memories = memories.filter(m => !m.title || m.title.trim() === '');
      }
      
      // Limit the number of memories to process
      memories = memories.slice(0, limit);
      
      if (memories.length === 0) {
        return res.json({
          content: '📭 No memories found to enhance based on the selected filters.'
        });
      }
      
      // Process memories
      const startTime = Date.now();
      const results = await ollamaClient.enhanceMemoriesBatch(memories, (current, total) => {
        console.log(`Processing memory ${current}/${total}`);
      });
      
      // Update memories with enhanced titles and summaries
      let successCount = 0;
      let failedCount = 0;
      
      for (const result of results) {
        const startTime = Date.now();
        
        if (result.success && result.enhancement) {
          try {
            // Capture before state
            const beforeState = {
              title: result.memory.title || null,
              summary: result.memory.summary || null,
              content: result.memory.content ? result.memory.content.substring(0, 100) + '...' : ''
            };
            
            // Update the memory with new title and summary
            const updatedMemory = {
              ...result.memory,
              title: result.enhancement.title,
              summary: result.enhancement.summary,
              metadata: {
                ...result.memory.metadata,
                enhanced_by: 'ollama',
                enhanced_model: model,
                enhanced_at: new Date().toISOString()
              }
            };
            
            // Generate updated markdown content
            const fileContent = MemoryFormat.generateMarkdownContent(updatedMemory);
            
            // Write updated file
            fs.writeFileSync(result.memory.filepath, fileContent, 'utf8');
            
            // Log successful enhancement
            this.addEnhancementLog({
              memoryId: result.memory.id,
              status: 'success',
              model: model,
              processingTime: (Date.now() - startTime) / 1000,
              before: beforeState,
              after: {
                title: result.enhancement.title,
                summary: result.enhancement.summary
              }
            });
            
            successCount++;
          } catch (error) {
            console.error(`Failed to save enhanced memory ${result.memory.id}:`, error);
            
            // Log failed save
            this.addEnhancementLog({
              memoryId: result.memory.id,
              status: 'failed',
              model: model,
              processingTime: (Date.now() - startTime) / 1000,
              before: {
                title: result.memory.title || null,
                summary: result.memory.summary || null,
                content: result.memory.content ? result.memory.content.substring(0, 100) + '...' : ''
              },
              after: null,
              error: `Failed to save: ${error.message}`
            });
            
            failedCount++;
          }
        } else {
          // Log failed enhancement
          this.addEnhancementLog({
            memoryId: result.memory.id,
            status: 'failed',
            model: model,
            processingTime: (Date.now() - startTime) / 1000,
            before: {
              title: result.memory.title || null,
              summary: result.memory.summary || null,
              content: result.memory.content ? result.memory.content.substring(0, 100) + '...' : ''
            },
            after: null,
            error: result.error || 'Enhancement failed'
          });
          
          failedCount++;
        }
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      const response = {
        content: `🎉 Batch enhancement completed!

📊 Results:
✅ Successfully enhanced: ${successCount}
❌ Failed to enhance: ${failedCount}
📊 Total processed: ${results.length}
⏱️ Duration: ${duration} seconds

🤖 Model used: ${model}
📦 Batch size: ${batch_size}`
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error in batch enhancement:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getOllamaStatus(req, res) {
    try {
      // Use the OllamaClient to check status
      const ollamaClient = new OllamaClient();
      const available = await ollamaClient.isAvailable();
      
      let models = [];
      if (available) {
        models = await ollamaClient.listModels();
      }
      
      res.json({
        available,
        models: models.map(model => model.name || model)
      });
    } catch (error) {
      console.error('Error checking Ollama status:', error);
      res.json({
        available: false,
        models: [],
        error: error.message
      });
    }
  }

  async batchEnhanceTasksOllama(req, res) {
    try {
      const { limit = 50, model = 'llama3.1:8b', batch_size = 5, skip_existing = true, project, category, status } = req.body;
      
      // Use imported OllamaClient
      const ollamaClient = new OllamaClient(null, { model, batchSize: batch_size });
      
      // Check if Ollama is available
      const isAvailable = await ollamaClient.isAvailable();
      if (!isAvailable) {
        return res.status(503).json({ 
          error: 'Ollama server is not available',
          content: '❌ Ollama server is not running. Please start it first.'
        });
      }
      
      // Get tasks to enhance
      let tasks = await this.taskStorage.getAllTasks();
      
      // Filter by project if specified
      if (project) {
        tasks = tasks.filter(t => t.project === project);
      }
      
      // Filter by category if specified
      if (category && category !== 'all') {
        tasks = tasks.filter(t => t.category === category);
      }
      
      // Filter by status if specified
      if (status && status !== 'all') {
        tasks = tasks.filter(t => t.status === status);
      }
      
      // Filter out tasks that already have enhanced titles/descriptions if skip_existing is true
      if (skip_existing) {
        tasks = tasks.filter(t => !t.title || t.title.trim() === '' || !t.description || t.description.trim() === '');
      }
      
      // Limit the number of tasks to process
      tasks = tasks.slice(0, limit);
      
      if (tasks.length === 0) {
        return res.json({
          content: '📭 No tasks found to enhance based on the selected filters.'
        });
      }
      
      // Prepare tasks for Ollama processing (convert to memory-like format)
      const taskMemories = tasks.map(task => ({
        id: task.id,
        content: `Task: ${task.title || 'Untitled Task'}\n\nDescription: ${task.description || 'No description provided'}${task.subtasks && task.subtasks.length > 0 ? `\n\nSubtasks:\n${task.subtasks.map(st => `- ${st.title || st.description}`).join('\n')}` : ''}`,
        category: task.category || 'work',
        project: task.project
      }));
      
      // Process tasks
      const startTime = Date.now();
      const results = await ollamaClient.enhanceMemoriesBatch(taskMemories, (current, total) => {
        console.log(`Processing task ${current}/${total}`);
      });
      
      // Update tasks with enhanced titles and descriptions
      let successCount = 0;
      let failedCount = 0;
      
      for (const result of results) {
        const startTime = Date.now();
        
        if (result.success && result.enhancement) {
          try {
            const originalTask = tasks.find(t => t.id === result.memory.id);
            
            if (originalTask) {
              // Capture before state
              const beforeState = {
                title: originalTask.title || null,
                description: originalTask.description || null
              };
              
              // Update the task with new title and description
              const updatedTask = {
                ...originalTask,
                title: result.enhancement.title,
                description: result.enhancement.summary,
                metadata: {
                  ...originalTask.metadata,
                  enhanced_by: 'ollama',
                  enhanced_model: model,
                  enhanced_at: new Date().toISOString()
                }
              };
              
              await this.taskStorage.updateTask(originalTask.id, updatedTask);
              
              // Log successful enhancement
              this.addEnhancementLog({
                taskId: originalTask.id,
                type: 'task',
                status: 'success',
                model: model,
                processingTime: (Date.now() - startTime) / 1000,
                before: beforeState,
                after: {
                  title: result.enhancement.title,
                  description: result.enhancement.summary
                }
              });
              
              successCount++;
            }
          } catch (error) {
            console.error(`Failed to save enhanced task ${result.memory.id}:`, error);
            
            // Log failed save
            this.addEnhancementLog({
              taskId: result.memory.id,
              type: 'task',
              status: 'failed',
              model: model,
              processingTime: (Date.now() - startTime) / 1000,
              before: {
                title: tasks.find(t => t.id === result.memory.id)?.title || null,
                description: tasks.find(t => t.id === result.memory.id)?.description || null
              },
              after: null,
              error: `Failed to save: ${error.message}`
            });
            
            failedCount++;
          }
        } else {
          // Log failed enhancement
          this.addEnhancementLog({
            taskId: result.memory.id,
            type: 'task',
            status: 'failed',
            model: model,
            processingTime: (Date.now() - startTime) / 1000,
            before: {
              title: tasks.find(t => t.id === result.memory.id)?.title || null,
              description: tasks.find(t => t.id === result.memory.id)?.description || null
            },
            after: null,
            error: result.error || 'Enhancement failed'
          });
          
          failedCount++;
        }
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      const response = {
        content: `🎉 Task enhancement completed!

📊 Results:
✅ Successfully enhanced: ${successCount}
❌ Failed to enhance: ${failedCount}
📊 Total processed: ${results.length}
⏱️ Duration: ${duration} seconds

🤖 Model used: ${model}
📦 Batch size: ${batch_size}`
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error in task enhancement:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async batchLinkMemories(req, res) {
    try {
      const { task_ids, project, category, status, limit = 100 } = req.body;
      
      // Get tasks to link memories to
      let tasks = await this.taskStorage.getAllTasks();
      
      // Filter by specific task IDs if provided
      if (task_ids && Array.isArray(task_ids)) {
        tasks = tasks.filter(t => task_ids.includes(t.id));
      } else {
        // Filter by project if specified
        if (project) {
          tasks = tasks.filter(t => t.project === project);
        }
        
        // Filter by category if specified
        if (category && category !== 'all') {
          tasks = tasks.filter(t => t.category === category);
        }
        
        // Filter by status if specified
        if (status && status !== 'all') {
          tasks = tasks.filter(t => t.status === status);
        }
        
        // Filter out tasks that already have memory connections
        tasks = tasks.filter(t => !t.memory_connections || t.memory_connections.length === 0);
      }
      
      // Limit the number of tasks to process
      tasks = tasks.slice(0, limit);
      
      if (tasks.length === 0) {
        return res.json({
          content: '📭 No tasks found that need memory linking.'
        });
      }
      
      const startTime = Date.now();
      let successCount = 0;
      let failedCount = 0;
      let totalConnections = 0;
      
      // Process each task
      for (const task of tasks) {
        try {
          // Use the task-memory linker to find and link relevant memories
          const linkedMemories = await this.taskStorage.taskMemoryLinker.autoLinkMemories(task);
          
          if (linkedMemories && linkedMemories.length > 0) {
            // Update the task with new memory connections
            task.memory_connections = linkedMemories;
            await this.taskStorage.updateTask(task.id, task);
            
            // Update each linked memory with task connection
            for (const memConn of linkedMemories) {
              await this.taskStorage.taskMemoryLinker.updateMemoryWithTaskConnection(memConn.memory_id, {
                task_id: task.id,
                task_serial: task.serial,
                connection_type: memConn.connection_type,
                relevance: memConn.relevance
              });
            }
            
            successCount++;
            totalConnections += linkedMemories.length;
          } else {
            successCount++; // Still count as success even if no memories found
          }
        } catch (error) {
          console.error(`Failed to link memories for task ${task.id}:`, error);
          failedCount++;
        }
      }
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      const response = {
        content: `🔗 Memory linking completed!

📊 Results:
✅ Successfully processed: ${successCount} tasks
❌ Failed to process: ${failedCount} tasks
🧠 Total memories linked: ${totalConnections}
📊 Total tasks processed: ${tasks.length}
⏱️ Duration: ${duration} seconds

💡 Memory connections are based on content similarity and relevance.`
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error in batch memory linking:', error);
      res.status(500).json({ error: error.message });
    }
  }

  broadcastToClients(message) {
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // Enhancement logging methods
  addEnhancementLog(logEntry) {
    // Add timestamp if not provided
    if (!logEntry.timestamp) {
      logEntry.timestamp = new Date().toISOString();
    }
    
    // Add unique ID if not provided
    if (!logEntry.id) {
      logEntry.id = `enhancement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    this.enhancementLogs.unshift(logEntry);
    
    // Limit log size
    if (this.enhancementLogs.length > this.maxLogEntries) {
      this.enhancementLogs = this.enhancementLogs.slice(0, this.maxLogEntries);
    }
    
    // Broadcast to WebSocket clients
    this.broadcastToClients({
      type: 'enhancementLog',
      data: logEntry
    });
  }
  
  async getEnhancementLogs(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const logs = this.enhancementLogs.slice(offset, offset + limit);
      
      res.json({
        logs,
        total: this.enhancementLogs.length,
        hasMore: offset + limit < this.enhancementLogs.length
      });
    } catch (error) {
      console.error('Error getting enhancement logs:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  async clearEnhancementLogs(req, res) {
    try {
      this.enhancementLogs = [];
      
      // Broadcast clear event
      this.broadcastToClients({
        type: 'enhancementLogsCleared'
      });
      
      res.json({ success: true, message: 'Enhancement logs cleared' });
    } catch (error) {
      console.error('Error clearing enhancement logs:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // Automation API methods
  async getAutomationConfig(req, res) {
    try {
      const config = this.automationConfig.export();
      res.json(config);
    } catch (error) {
      console.error('Error getting automation config:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  async updateAutomationConfig(req, res) {
    try {
      const updates = req.body;
      
      // Update each setting
      for (const [key, value] of Object.entries(updates)) {
        this.automationConfig.set(key, value);
      }
      
      // Broadcast config change
      this.broadcastToClients({
        type: 'automationConfigUpdated',
        config: this.automationConfig.export(),
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        config: this.automationConfig.export()
      });
    } catch (error) {
      console.error('Error updating automation config:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  async getAutomationStats(req, res) {
    try {
      const stats = this.automationConfig.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting automation stats:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  async checkTaskAutomation(req, res) {
    try {
      const { taskId } = req.params;
      const task = this.taskStorage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Manually trigger automation check
      await this.fileSystemMonitor.triggerAutomationCheck(task, 'manual');
      
      res.json({
        success: true,
        taskId: taskId,
        message: 'Automation check triggered'
      });
    } catch (error) {
      console.error('Error checking task automation:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  async getSchedulerStatus(req, res) {
    try {
      const status = this.automationScheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting scheduler status:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  async forceSchedulerCheck(req, res) {
    try {
      await this.automationScheduler.forceCheck();
      res.json({
        success: true,
        message: 'Forced automation check triggered',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error forcing scheduler check:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getQualityStandards(req, res) {
    try {
      const { StandardsConfigParser } = await import('./lib/standards-config-parser.cjs');
      const parser = new StandardsConfigParser();
      const config = parser.loadConfig();
      
      const standards = {
        titleMinLength: config.title?.length?.min_length || 15,
        titleMaxLength: config.title?.length?.max_length || 80,
        descriptionMinLength: config.description?.length?.min_length || 50,
        descriptionMaxLength: config.description?.length?.max_length || 300,
        forbiddenPatterns: config.title?.forbiddenPatterns?.map(p => p.pattern.source) || [
          'dashboard improvements',
          'session\\s*\\(',
          '\\(\\s*\\w+\\s+\\d{1,2},?\\s+\\d{4}\\s*\\)',
          'major|complete|comprehensive',
          'status|update|progress'
        ],
        weakWords: config.title?.weakWords || ['improvements', 'session', 'update', 'status', 'changes', 'modifications'],
        strongActions: config.title?.strongActions || ['implement', 'fix', 'add', 'create', 'configure', 'optimize', 'refactor'],
        qualityThresholds: {
          excellent: config.compliance?.excellent || 90,
          good: config.compliance?.good || 70,
          fair: config.compliance?.fair || 60,
          poor: config.compliance?.poor || 40,
          critical: config.compliance?.critical || 0,
          passing: config.compliance?.passing_score || 70
        }
      };
      
      res.json(standards);
    } catch (error) {
      console.error('Error getting quality standards:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async validateMemoryQuality(req, res) {
    try {
      const { id } = req.params;
      let memory;
      
      // Handle POST requests with memory data in body
      if (req.method === 'POST' && req.body) {
        memory = req.body;
      } else {
        // Handle GET requests for existing memories
        memory = await this.memoryStorage.getMemory(id);
        
        if (!memory) {
          return res.status(404).json({ error: 'Memory not found' });
        }
      }
      
      const { MemoryTaskAnalyzer } = await import('./lib/memory-task-analyzer.js');
      const analyzer = new MemoryTaskAnalyzer();
      const analysis = analyzer.analyzeMemoryQuality(memory);
      
      res.json({
        memoryId: id,
        quality: {
          score: analysis.overallScore,
          level: analysis.compliance.meetsStandards ? 
            (analysis.overallScore >= 90 ? 'excellent' :
             analysis.overallScore >= 70 ? 'good' :
             analysis.overallScore >= 60 ? 'fair' : 'poor') : 'critical',
          issues: analysis.titleAnalysis.issues.concat(analysis.descriptionAnalysis.issues),
          suggestions: analysis.titleAnalysis.suggestions.concat(analysis.descriptionAnalysis.suggestions),
          meetsStandards: analysis.compliance.meetsStandards
        }
      });
    } catch (error) {
      console.error('Error validating memory quality:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Settings Management Methods
  async getSettings(req, res) {
    try {
      const settings = settingsManager.getSettings();
      res.json({
        settings: settings,
        info: settingsManager.getSettingsInfo()
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  }

  async getAuthStatus(req, res) {
    try {
      const isEnabled = settingsManager.isAuthEnabled();
      const isRequired = settingsManager.isAuthRequired();
      
      res.json({
        authEnabled: isEnabled,
        authRequired: isRequired,
        allowRegistration: settingsManager.getSetting('authentication.allowRegistration') || false,
        message: isEnabled ? 
          'Authentication is enabled' : 
          'Authentication is disabled - all API endpoints are publicly accessible'
      });
    } catch (error) {
      console.error('Get auth status error:', error);
      res.status(500).json({ error: 'Failed to get auth status' });
    }
  }

  async updateSettings(req, res) {
    try {
      const updates = req.body;
      
      // Validate settings structure
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'Invalid settings format' });
      }

      // Update settings
      settingsManager.updateSettings(updates);
      
      res.json({
        success: true,
        message: 'Settings updated successfully',
        requiresRestart: updates.authentication !== undefined,
        settings: settingsManager.getSettings()
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async resetSettings(req, res) {
    try {
      settingsManager.resetToDefaults();
      
      res.json({
        success: true,
        message: 'Settings reset to defaults',
        requiresRestart: true,
        settings: settingsManager.getSettings()
      });
    } catch (error) {
      console.error('Reset settings error:', error);
      res.status(500).json({ error: 'Failed to reset settings' });
    }
  }

  async setupAuthentication(req, res) {
    try {
      // Check if auth is already enabled
      if (settingsManager.isAuthEnabled()) {
        return res.status(400).json({ 
          error: 'Authentication is already enabled. Use settings to modify configuration.' 
        });
      }

      const { username, password, email } = req.body;

      // Validate input
      if (!username || !password) {
        return res.status(400).json({ 
          error: 'Username and password are required for initial setup' 
        });
      }

      // Enable authentication in settings
      settingsManager.updateSetting('authentication.enabled', true);
      settingsManager.updateSetting('authentication.requireAuth', true);

      // Create initial admin user
      // Note: This requires server restart to take effect
      res.json({
        success: true,
        message: 'Authentication setup initiated. Please restart the server to complete setup.',
        instructions: [
          '1. Restart the server for authentication to take effect',
          '2. The default admin user will be created on restart',
          '3. Use the provided credentials to login',
          '4. Change the default password after first login'
        ],
        settings: {
          authEnabled: true,
          requireAuth: true
        }
      });
    } catch (error) {
      console.error('Setup authentication error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Suggest memories for task creation
  async suggestMemoriesForTask(req, res) {
    try {
      const { title, description, project, category, tags } = req.body;
      
      if (!title?.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Create a mock task object for the linker
      const mockTask = {
        title: title.trim(),
        description: description?.trim() || '',
        project: project || 'default',
        category: category || 'code',
        tags: Array.isArray(tags) ? tags : []
      };

      // Use the task-memory linker to find related memories
      if (this.taskStorage.taskMemoryLinker) {
        const suggestions = await this.taskStorage.taskMemoryLinker.autoLinkMemories(mockTask);
        
        // Convert to frontend format
        const memories = [];
        for (const suggestion of suggestions) {
          try {
            const memory = await this.memoryStorage.getMemory(suggestion.memory_id);
            if (memory) {
              memories.push({
                id: suggestion.memory_id,
                title: memory.title || this.extractTitle(memory.content),
                content: memory.content,
                relevance: suggestion.relevance,
                connection_type: suggestion.connection_type,
                matched_terms: suggestion.matched_terms
              });
            }
          } catch (err) {
            console.warn('Failed to load suggested memory:', suggestion.memory_id, err.message);
          }
        }

        res.json(memories);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error('Suggest memories error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Category Analysis API Methods
  async analyzeCategories(req, res) {
    try {
      const { content, tags = [], maxSuggestions = 3, minConfidence = 0.15 } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required for analysis' });
      }

      // Get existing memories to improve suggestions via learning
      try {
        const existingMemories = await this.getAllMemories();
        this.contentAnalyzer.learnFromExistingData(existingMemories);
      } catch (err) {
        console.warn('Could not load existing memories for learning:', err.message);
      }

      // Analyze content for category suggestions
      const suggestions = this.contentAnalyzer.suggestCategories(content, {
        maxSuggestions,
        minConfidence,
        tags // Pass tags to enhance analysis
      });

      // Log analysis for monitoring
      console.log(`📊 Category analysis: ${suggestions.length} suggestions for ${content.length} chars`);

      res.json({
        suggestions,
        analysis: {
          contentLength: content.length,
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          tagCount: tags.length,
          suggestionsCount: suggestions.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Category analysis error:', error);
      res.status(500).json({ 
        error: 'Failed to analyze categories',
        details: error.message 
      });
    }
  }

  async submitCategoryFeedback(req, res) {
    try {
      const { suggestion, action, content, tags = [], userCategory } = req.body;
      
      if (!suggestion || !action || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ 
          error: 'Valid suggestion and action (accept/reject) are required' 
        });
      }

      // Store feedback for future improvements
      const feedback = {
        timestamp: new Date().toISOString(),
        suggestion,
        action,
        content: content?.substring(0, 500), // Store partial content for context
        tags,
        userCategory,
        contentLength: content?.length || 0,
        confidence: suggestion.confidence
      };

      // TODO: Implement feedback storage system to improve future suggestions
      // This could be stored in a feedback.json file or database
      console.log(`📝 Category feedback: ${action} for ${suggestion.category} (${suggestion.confidence}% confidence)`);

      // For now, just log and acknowledge
      res.json({
        success: true,
        message: `Feedback recorded: ${action} for ${suggestion.category}`,
        feedback: {
          action,
          category: suggestion.category,
          confidence: suggestion.confidence,
          timestamp: feedback.timestamp
        }
      });
    } catch (error) {
      console.error('Category feedback error:', error);
      res.status(500).json({ 
        error: 'Failed to record feedback',
        details: error.message 
      });
    }
  }

  // Helper method to extract title from content
  extractTitle(content) {
    if (!content) return 'Untitled';
    
    // Try to find markdown header
    const headerMatch = content.match(/^#+\s+(.+)$/m);
    if (headerMatch) return headerMatch[1].trim();
    
    // Fallback to first line
    const firstLine = content.split('\n')[0].trim();
    return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
  }

  async start() {
    // Initialize unified storage first
    await this.initPromise;
    
    // Initialize async components
    await this.setupFileWatcher();
    
    // Debug: Log all registered routes
    console.log('📋 Registered routes:');
    this.app._router.stack
      .filter(layer => layer.route)
      .forEach(layer => {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`   ${methods} ${layer.route.path}`);
      });
    
    try {
      // Use robust port finder with validation
      const result = await startServerWithValidation(this.server, this.port);
      
      // Update instance port after successful startup
      this.port = result.port;
      
      // Initialize WebSocket server AFTER HTTP server is successfully listening
      this.initializeWebSocket();
      console.log(`🔌 WebSocket server initialized`);
      
      console.log(`📁 Watching: ${path.resolve(this.memoriesDir)}`);
      console.log(`🤖 Task automation enabled with file change monitoring`);
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to start server: ${error.message}`);
      throw error;
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
    if (this.standardsWatcher) {
      this.standardsWatcher.close();
    }
    if (this.fileSystemMonitor) {
      this.fileSystemMonitor.stopMonitoring();
    }
    // Stop automatic backups
    if (this.safeguards) {
      this.safeguards.stopAutoBackup();
    }
    if (this.wss) {
      this.wss.close();
    }
    this.server.close();
  }

  // Backup management methods
  async listBackups(req, res) {
    try {
      const backups = await this.safeguards.listBackups();
      res.json(backups);
    } catch (error) {
      console.error('Error listing backups:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createBackup(req, res) {
    try {
      const { operation = 'manual' } = req.body || {};
      const backupPath = await this.safeguards.createBackup(operation);
      
      // Get backup details
      const backups = await this.safeguards.listBackups();
      const backup = backups.find(b => b.path === backupPath);
      
      res.json({
        success: true,
        backup,
        message: `Backup created successfully at ${backupPath}`
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async restoreBackup(req, res) {
    try {
      const { name } = req.params;
      const backupPath = path.join(this.safeguards.backupDir, name);
      
      const manifest = await this.safeguards.recoverFromBackup(backupPath);
      
      // Broadcast restore event to all clients
      this.broadcastToClients({
        type: 'system_restore',
        data: {
          backup: name,
          timestamp: new Date().toISOString()
        }
      });
      
      res.json({
        success: true,
        manifest,
        message: `System restored from backup ${name}`
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async deleteBackup(req, res) {
    try {
      const { name } = req.params;
      const backupPath = path.join(this.safeguards.backupDir, name);
      
      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ error: 'Backup not found' });
      }
      
      fs.rmSync(backupPath, { recursive: true });
      
      res.json({
        success: true,
        message: `Backup ${name} deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting backup:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getSystemHealth(req, res) {
    try {
      const health = await this.safeguards.checkSystemHealth();
      res.json(health);
    } catch (error) {
      console.error('Error getting system health:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // V3 Hierarchical Task API Methods
  async getV3Tasks(req, res) {
    try {
      const { project, status, level } = req.query;
      
      // For now, return sample data
      // TODO: Integrate with SemanticHybridTaskManager
      const sampleTasks = [
        {
          id: 'project-001',
          title: 'Like-I-Said V3 Development',
          description: 'Complete V3 hierarchical task management system',
          level: 'master',
          parent_id: null,
          path: '001',
          path_order: 1,
          status: 'in_progress',
          project: 'like-i-said-v3',
          priority: 'high',
          semantic_path: '001-PROJECT-like-i-said-v3-development-project-001',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'stage-001',
          title: 'Phase 1: Core Hierarchy System',
          description: 'Implement basic 4-level hierarchy with SQLite backend',
          level: 'epic',
          parent_id: 'project-001',
          path: '001.001',
          path_order: 1,
          status: 'in_progress',
          project: 'like-i-said-v3',
          priority: 'high',
          semantic_path: '001-PROJECT-like-i-said-v3-development-project-001/001-STAGE-phase-1-core-hierarchy-stage-001',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'task-001',
          title: 'Build basic hierarchy UI with React-Window',
          description: 'Create virtualized tree component for task hierarchy',
          level: 'task',
          parent_id: 'stage-001',
          path: '001.001.001',
          path_order: 1,
          status: 'in_progress',
          project: 'like-i-said-v3',
          priority: 'high',
          semantic_path: '001-PROJECT-like-i-said-v3-development-project-001/001-STAGE-phase-1-core-hierarchy-stage-001/001-TASK-build-hierarchy-ui-task-001',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      res.json({ tasks: sampleTasks });
    } catch (error) {
      console.error('Error fetching V3 tasks:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getV3Task(req, res) {
    try {
      const { id } = req.params;
      
      // Sample task for demo
      const sampleTask = {
        id,
        title: 'Sample V3 Task',
        description: 'This is a sample hierarchical task',
        level: 'task',
        parent_id: 'stage-001',
        path: '001.001.001',
        path_order: 1,
        status: 'todo',
        project: 'like-i-said-v3',
        priority: 'medium',
        semantic_path: '001-PROJECT-sample/001-STAGE-demo/001-TASK-sample-task',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      res.json(sampleTask);
    } catch (error) {
      console.error('Error fetching V3 task:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createV3Task(req, res) {
    try {
      const taskData = req.body;
      
      // Generate ID if not provided
      const newTask = {
        id: taskData.id || crypto.randomUUID(),
        ...taskData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // TODO: Create task with SemanticHybridTaskManager
      console.log('Creating V3 task:', newTask);
      
      res.status(201).json(newTask);
    } catch (error) {
      console.error('Error creating V3 task:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateV3Task(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // TODO: Update task with SemanticHybridTaskManager
      console.log('Updating V3 task:', id, updates);
      
      const updatedTask = {
        id,
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating V3 task:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async deleteV3Task(req, res) {
    try {
      const { id } = req.params;
      
      // TODO: Delete task with SemanticHybridTaskManager
      console.log('Deleting V3 task:', id);
      
      res.json({ success: true, message: 'Task deleted' });
    } catch (error) {
      console.error('Error deleting V3 task:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async moveV3Task(req, res) {
    try {
      const { id } = req.params;
      const { newParentId } = req.body;
      
      // TODO: Move task with SemanticHybridTaskManager
      console.log('Moving V3 task:', id, 'to parent:', newParentId);
      
      res.json({ success: true, message: 'Task moved' });
    } catch (error) {
      console.error('Error moving V3 task:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // === REFLECTION API METHODS ===

  async getReflectionMetrics(req, res) {
    try {
      const metrics = this.reflectionEngine.getMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error getting reflection metrics:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getPerformanceReport(req, res) {
    try {
      const { period = 'weekly' } = req.query;
      const report = this.reflectionEngine.generateReport(period);
      res.json(report);
    } catch (error) {
      console.error('Error getting performance report:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getReflectionData(req, res) {
    try {
      const patterns = this.patternLearner.patterns?.patterns || [];
      const thresholds = this.patternLearner.getThresholds();
      const stats = this.patternLearner.getStatistics();
      
      res.json({
        patterns,
        thresholds,
        confidence: {
          overall: stats.overallConfidence,
          byCategory: {}
        },
        lastLearning: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting reflection data:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getReflectionStatus(req, res) {
    try {
      const metrics = this.reflectionEngine.getMetrics();
      const status = metrics.system.uptime > 0 ? 'healthy' : 'starting';
      res.json({ status });
    } catch (error) {
      console.error('Error getting reflection status:', error);
      res.status(500).json({ error: error.message, status: 'error' });
    }
  }

  async getReflectionSettings(req, res) {
    try {
      // Mock settings - in real implementation, these would be stored in config
      const settings = {
        reflectionEnabled: true,
        autoThresholdAdjustment: true,
        sandboxMode: true,
        learningRate: 0.1,
        confidenceThreshold: 0.6,
        maxPatternsToTrack: 50,
        autoRollbackOnFailure: true
      };
      res.json(settings);
    } catch (error) {
      console.error('Error getting reflection settings:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateReflectionSettings(req, res) {
    try {
      const settings = req.body;
      // Mock update - in real implementation, save to config
      console.log('Updating reflection settings:', settings);
      
      // Broadcast settings update to WebSocket clients
      this.broadcastToClients({
        type: 'reflectionSettingsUpdated',
        settings,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error updating reflection settings:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getPatterns(req, res) {
    try {
      const patterns = this.patternLearner.patterns?.patterns || [];
      res.json(patterns);
    } catch (error) {
      console.error('Error getting patterns:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createPattern(req, res) {
    try {
      const { type, description, indicators, confidence } = req.body;
      
      // Create a pattern manually since PatternLearner doesn't have createPattern
      const pattern = {
        id: `pattern-${Date.now()}`,
        type,
        description,
        indicators,
        confidence,
        successRate: 0.5,
        timesTriggered: 0,
        created: new Date().toISOString(),
        lastTriggered: new Date().toISOString()
      };
      
      // Add to patterns
      this.patternLearner.patterns.patterns.push(pattern);
      this.patternLearner.savePatterns();
      
      // Broadcast pattern creation to WebSocket clients
      this.broadcastToClients({
        type: 'patternCreated',
        pattern,
        timestamp: new Date().toISOString()
      });
      
      res.json(pattern);
    } catch (error) {
      console.error('Error creating pattern:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async deletePattern(req, res) {
    try {
      const { id } = req.params;
      
      // Remove pattern manually
      const index = this.patternLearner.patterns.patterns.findIndex(p => p.id === id);
      if (index !== -1) {
        this.patternLearner.patterns.patterns.splice(index, 1);
        this.patternLearner.savePatterns();
      }
      
      res.json({ success: index !== -1 });
    } catch (error) {
      console.error('Error deleting pattern:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateThresholds(req, res) {
    try {
      const thresholds = req.body;
      
      // Update thresholds manually
      Object.entries(thresholds).forEach(([key, value]) => {
        if (this.patternLearner.patterns.thresholds[key]) {
          this.patternLearner.patterns.thresholds[key].value = value;
          this.patternLearner.patterns.thresholds[key].lastUpdated = new Date().toISOString();
        }
      });
      
      this.patternLearner.savePatterns();
      
      // Broadcast threshold updates to WebSocket clients
      this.broadcastToClients({
        type: 'thresholdsUpdated',
        thresholds,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating thresholds:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async provideFeedback(req, res) {
    try {
      const { patternId, feedback } = req.body;
      
      // Use the recordFeedback method
      this.patternLearner.recordFeedback(patternId, feedback);
      this.patternLearner.savePatterns();
      
      // Broadcast feedback to WebSocket clients
      this.broadcastToClients({
        type: 'patternFeedback',
        patternId,
        feedback,
        timestamp: new Date().toISOString()
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error providing feedback:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getReflectionBackups(req, res) {
    try {
      // Mock backups - in real implementation, scan backup directory
      const backups = [
        {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          settings: {},
          patterns: [],
          thresholds: {}
        }
      ];
      res.json(backups);
    } catch (error) {
      console.error('Error getting reflection backups:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async createReflectionBackup(req, res) {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        settings: {},
        patterns: this.patternLearner.patterns?.patterns || [],
        thresholds: this.patternLearner.getThresholds()
      };
      console.log('Creating reflection backup:', backup.timestamp);
      res.json({ success: true, backup });
    } catch (error) {
      console.error('Error creating reflection backup:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async rollbackReflection(req, res) {
    try {
      const { backupTimestamp } = req.body;
      console.log('Rolling back reflection to:', backupTimestamp);
      res.json({ success: true });
    } catch (error) {
      console.error('Error rolling back reflection:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async resetReflection(req, res) {
    try {
      console.log('Resetting reflection to defaults');
      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting reflection:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async exportReflectionData(req, res) {
    try {
      const stats = this.patternLearner.getStatistics();
      const data = {
        metrics: this.reflectionEngine.getMetrics(),
        patterns: this.patternLearner.patterns?.patterns || [],
        thresholds: this.patternLearner.getThresholds(),
        confidence: {
          overall: stats.overallConfidence,
          byCategory: {}
        },
        exportDate: new Date().toISOString()
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=reflection-data.json');
      res.json(data);
    } catch (error) {
      console.error('Error exporting reflection data:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * List available MCP tools for proxy server
   * Direct execution without spawning new processes
   */
  async listMcpTools(req, res) {
    try {
      // Return the same tool definitions that the MCP server would provide
      const tools = [
        {
          name: 'add_memory',
          description: 'AUTOMATICALLY use when user shares important information, code snippets, decisions, learnings, or context that should be remembered for future sessions. Includes smart categorization and auto-linking.',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              content: { type: 'string', description: 'The memory content to store', minLength: 1 },
              tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags for the memory' },
              category: { type: 'string', description: 'Memory category (personal, work, code, research, conversations, preferences)' },
              project: { type: 'string', description: 'Project name to organize memory files' },
              priority: { type: 'string', description: 'Priority level (low, medium, high)' },
              status: { type: 'string', description: 'Memory status (active, archived, reference)' },
              related_memories: { type: 'array', items: { type: 'string' }, description: 'IDs of related memories for cross-referencing' },
              language: { type: 'string', description: 'Programming language for code content' }
            },
            required: ['content'],
            additionalProperties: false
          }
        },
        {
          name: 'get_memory',
          description: 'Retrieve a memory by ID',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The memory ID to retrieve' }
            },
            required: ['id'],
            additionalProperties: false
          }
        },
        {
          name: 'list_memories',
          description: 'List all stored memories or memories from a specific project',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              limit: { type: 'integer', description: 'Maximum number of memories to return', minimum: 1 },
              project: { type: 'string', description: 'Filter by project name' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'delete_memory',
          description: 'Delete a memory by ID',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              id: { type: 'string', description: 'The memory ID to delete' }
            },
            required: ['id'],
            additionalProperties: false
          }
        },
        {
          name: 'search_memories',
          description: 'AUTOMATICALLY use when user asks about past work, previous decisions, looking for examples, or needs context from earlier sessions. Provides semantic and keyword-based search.',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query', minLength: 1 },
              project: { type: 'string', description: 'Limit search to specific project' }
            },
            required: ['query'],
            additionalProperties: false
          }
        },
        {
          name: 'test_tool',
          description: 'Simple test tool to verify MCP is working',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              message: { type: 'string', description: 'Test message', minLength: 1 }
            },
            required: ['message'],
            additionalProperties: false
          }
        },
        {
          name: 'create_task',
          description: 'Create a new task with intelligent memory linking. Tasks start in "todo" status.',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Task title', minLength: 1 },
              description: { type: 'string', description: 'Detailed task description', minLength: 1 },
              project: { type: 'string', description: 'Project identifier' },
              category: { type: 'string', description: 'Task category' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority' },
              status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'blocked'], description: 'Task status' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Task tags' },
              parent_task: { type: 'string', description: 'Parent task ID for subtasks' },
              depends_on: { type: 'array', items: { type: 'string' }, description: 'Task IDs this task depends on' },
              blocks: { type: 'array', items: { type: 'string' }, description: 'Task IDs blocked by this task' },
              memory_connections: { type: 'array', items: { type: 'string' }, description: 'Related memory IDs' }
            },
            required: ['title', 'description'],
            additionalProperties: false
          }
        },
        {
          name: 'update_task',
          description: 'Update existing task status or details. Use this to track progress on tasks.',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Task ID to update' },
              status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'blocked'], description: 'New task status' },
              description: { type: 'string', description: 'Updated task description' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Updated priority' },
              completion_notes: { type: 'string', description: 'Notes about task completion' }
            },
            required: ['id'],
            additionalProperties: false
          }
        },
        {
          name: 'list_tasks',
          description: 'List tasks with optional filtering',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              project: { type: 'string', description: 'Filter by project' },
              status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'blocked'], description: 'Filter by status' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Filter by priority' },
              include_subtasks: { type: 'boolean', description: 'Include subtasks in response', default: true },
              limit: { type: 'integer', description: 'Maximum number of tasks to return', minimum: 1 }
            },
            additionalProperties: false
          }
        },
        {
          name: 'get_task_context',
          description: 'Get full context for a task including related memories and subtasks',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Task ID to get context for' },
              include_memories: { type: 'boolean', description: 'Include related memories', default: true },
              include_subtasks: { type: 'boolean', description: 'Include subtasks', default: true },
              include_dependencies: { type: 'boolean', description: 'Include dependency information', default: true }
            },
            required: ['id'],
            additionalProperties: false
          }
        },
        {
          name: 'delete_task',
          description: 'Delete a task',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Task ID to delete' }
            },
            required: ['id'],
            additionalProperties: false
          }
        },
        {
          name: 'generate_dropoff',
          description: 'Generate conversation dropoff document for session handoff',
          inputSchema: {
            "$schema": "https://json-schema.org/draft-07/schema",
            type: 'object',
            properties: {
              session_summary: { type: 'string', description: 'Brief summary of work done in this session', default: 'Session work completed' },
              include_recent_memories: { type: 'boolean', description: 'Include recent memories in the dropoff', default: true },
              include_git_status: { type: 'boolean', description: 'Include git status and recent commits', default: true },
              recent_memory_count: { type: 'integer', description: 'Number of recent memories to include', default: 5, minimum: 1 },
              output_format: { type: 'string', description: 'Output format: markdown or json', enum: ['markdown', 'json'], default: 'markdown' },
              output_path: { type: 'string', description: 'Custom output directory path', default: null }
            },
            additionalProperties: false
          }
        }
      ];
      
      res.json({ tools });
    } catch (error) {
      console.error('[Dashboard] Error listing MCP tools:', error);
      res.status(500).json({ 
        isError: true, 
        content: [{ type: 'text', text: `Failed to list tools: ${error.message}` }] 
      });
    }
  }

  /**
   * Execute MCP tool directly without spawning process
   * Uses existing storage instances for state management
   */
  async callMcpToolDirect(req, res) {
    const { toolName } = req.params;
    const args = req.body || {};
    
    try {
      console.log(`[Dashboard] Executing MCP tool directly: ${toolName}`);
      
      let result;
      
      // Execute tools using existing storage instances
      switch (toolName) {
        // Memory tools
        case 'add_memory': {
          // Use the memory format module directly
          const { MemoryFormat } = await import('./lib/memory-format.js');
          const fs = await import('fs');
          const path = await import('path');
          
          // Simple category detection inline
          const detectCategory = (content) => {
            const lowerContent = content.toLowerCase();
            if (lowerContent.includes('function') || lowerContent.includes('class') || lowerContent.includes('const')) return 'code';
            if (lowerContent.includes('research') || lowerContent.includes('study')) return 'research';
            if (lowerContent.includes('task') || lowerContent.includes('todo')) return 'work';
            if (lowerContent.includes('note') || lowerContent.includes('idea')) return 'notes';
            return 'general';
          };
          
          // Simple complexity detection inline  
          const detectComplexity = (memory) => {
            const contentLength = memory.content.length;
            const hasCode = /```|function|class|const|let|var/.test(memory.content);
            const hasTags = memory.tags && memory.tags.length > 0;
            
            if (contentLength > 2000 || (hasCode && contentLength > 500)) return 4;
            if (contentLength > 1000 || hasCode) return 3;
            if (contentLength > 500 || hasTags) return 2;
            return 1;
          };
          
          // Create memory object with proper structure
          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: args.content,
            tags: args.tags || [],
            category: args.category || detectCategory(args.content),
            project: args.project || 'default',
            priority: args.priority || 'medium',
            status: args.status || 'active',
            related_memories: args.related_memories || [],
            language: args.language,
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString()
          };
          
          // Add complexity
          memory.complexity = detectComplexity(memory);
          
          // Format as markdown using the correct method name
          const markdownContent = MemoryFormat.generateMarkdownContent(memory);
          
          // Save to file
          const projectDir = path.join(this.memoriesDir, memory.project || 'default');
          if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
          }
          
          const filename = `memory-${memory.id}.md`;
          const filepath = path.join(projectDir, filename);
          fs.writeFileSync(filepath, markdownContent, 'utf8');
          
          // Auto-link with tasks
          if (this.taskMemoryLinker && memory && memory.id) {
            await this.taskMemoryLinker.analyzeAndLink(memory.id);
          }
          
          result = {
            content: [{
              type: 'text',
              text: `Memory saved successfully with ID: ${memory.id}\n` +
                    `Category: ${memory.category}\n` +
                    `Complexity: L${memory.complexity}\n` +
                    `Project: ${memory.project}`
            }]
          };
          break;
        }
        
        case 'get_memory': {
          // Use the memory storage wrapper to get memory
          const memories = await this.memoryStorage.listMemories();
          const memory = memories.find(m => m.id === args.id);
          if (!memory) {
            throw new Error(`Memory not found: ${args.id}`);
          }
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify(memory, null, 2)
            }]
          };
          break;
        }
        
        case 'list_memories': {
          const memories = await this.memoryStorage.listMemories(args.limit, args.project);
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify(memories, null, 2)
            }]
          };
          break;
        }
        
        case 'delete_memory': {
          // Find and delete the memory file
          const fs = await import('fs');
          const path = await import('path');
          const memories = await this.memoryStorage.listMemories();
          const memory = memories.find(m => m.id === args.id);
          
          if (memory) {
            const projectDir = path.join(this.memoriesDir, memory.project || 'default');
            const filename = `memory-${memory.id}.md`;
            const filepath = path.join(projectDir, filename);
            if (fs.existsSync(filepath)) {
              fs.unlinkSync(filepath);
            }
          }
          result = {
            content: [{
              type: 'text',
              text: `Memory ${args.id} deleted successfully`
            }]
          };
          break;
        }
        
        case 'search_memories': {
          // Search memories using the memory storage wrapper
          const memories = await this.memoryStorage.listMemories();
          const query = args.query.toLowerCase();
          const results = memories.filter(m => {
            if (args.project && m.project !== args.project) return false;
            return m.content.toLowerCase().includes(query) ||
                   (m.tags && m.tags.some(t => t.toLowerCase().includes(query)));
          });
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }]
          };
          break;
        }
        
        // Task tools
        case 'create_task': {
          // Create task using the same method as the dashboard
          const newTask = {
            title: args.title,
            description: args.description,
            project: args.project || 'default',
            category: args.category || 'task',
            priority: args.priority || 'medium',
            status: args.status || 'todo',
            tags: args.tags || [],
            parent_task: args.parent_task,
            depends_on: args.depends_on || [],
            blocks: args.blocks || [],
            memory_connections: args.memory_connections || []
          };
          
          const task = await this.taskStorage.saveTask(newTask);
          
          // Auto-link with memories
          if (this.taskMemoryLinker && task && task.id) {
            await this.taskMemoryLinker.analyzeAndLinkTask(task.id);
          }
          
          result = {
            content: [{
              type: 'text',
              text: `Task created successfully!\n` +
                    `ID: ${task.id}\n` +
                    `Serial: ${task.serial || task.id.substring(0,8)}\n` +
                    `Title: ${task.title}\n` +
                    `Status: ${task.status}\n` +
                    `Priority: ${task.priority}`
            }]
          };
          break;
        }
        
        case 'update_task': {
          const task = await this.taskStorage.updateTask(args.id, {
            status: args.status,
            description: args.description,
            priority: args.priority,
            completion_notes: args.completion_notes
          });
          
          result = {
            content: [{
              type: 'text',
              text: `Task ${task.serial} updated successfully.\n` +
                    `Status: ${task.status}\n` +
                    (args.completion_notes ? `Completion notes: ${args.completion_notes}` : '')
            }]
          };
          break;
        }
        
        case 'list_tasks': {
          const tasks = await this.taskStorage.listTasks({
            project: args.project,
            status: args.status,
            priority: args.priority,
            include_subtasks: args.include_subtasks !== false,
            limit: args.limit
          });
          
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify(tasks, null, 2)
            }]
          };
          break;
        }
        
        case 'get_task_context': {
          const context = await this.taskStorage.getTaskContext(args.id, {
            include_memories: args.include_memories !== false,
            include_subtasks: args.include_subtasks !== false,
            include_dependencies: args.include_dependencies !== false
          });
          
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify(context, null, 2)
            }]
          };
          break;
        }
        
        case 'delete_task': {
          await this.taskStorage.deleteTask(args.id);
          result = {
            content: [{
              type: 'text',
              text: `Task ${args.id} deleted successfully`
            }]
          };
          break;
        }
        
        // Special tools
        case 'test_tool': {
          result = {
            content: [{
              type: 'text',
              text: `✅ MCP Proxy is working!\nMessage received: ${args.message}\nTimestamp: ${new Date().toISOString()}`
            }]
          };
          break;
        }
        
        case 'generate_dropoff': {
          // Import the dropoff generator module
          const { DropoffGenerator } = await import('./lib/dropoff-generator.js');
          const dropoffGenerator = new DropoffGenerator();
          
          const dropoffContent = await dropoffGenerator.generateDropoff({
            sessionSummary: args.session_summary || 'Session work completed',
            includeRecentMemories: args.include_recent_memories !== false,
            includeGitStatus: args.include_git_status !== false,
            recentMemoryCount: args.recent_memory_count || 5,
            outputFormat: args.output_format || 'markdown'
          });
          
          // Save the dropoff to a file
          const fs = await import('fs');
          const path = await import('path');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `SESSION-DROPOFF-${timestamp}.md`;
          const outputDir = args.output_path || '.';
          const filepath = path.join(outputDir, filename);
          
          if (args.output_format === 'markdown' || !args.output_format) {
            fs.writeFileSync(filepath, dropoffContent, 'utf8');
          }
          
          result = {
            content: [{
              type: 'text',
              text: args.output_format === 'json' 
                ? `Session dropoff generated (JSON format):\n\n${dropoffContent}`
                : `Session dropoff generated successfully!\n\nFile: ${filename}\nLocation: ${filepath}\n\nContent Preview:\n\n${dropoffContent.substring(0, 500)}${dropoffContent.length > 500 ? '...' : ''}`
            }]
          };
          break;
        }
        
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
      
      // Return result in MCP format
      res.json(result);
      
    } catch (error) {
      console.error(`[Dashboard] Error executing tool ${toolName}:`, error);
      res.status(500).json({
        isError: true,
        content: [{
          type: 'text',
          text: `Tool execution failed: ${error.message}`
        }]
      });
    }
  }
}

// Start the bridge server with dynamic port detection
async function startServer() {
  const preferredPort = parseInt(process.env.PORT || '8776');
  try {
    // Start the server - it will find its own port if needed
    const bridge = new DashboardBridge(preferredPort);
    await bridge.start();
    
    // Cleanup on shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Dashboard Bridge...');
      cleanupPortFile();
      bridge.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      cleanupPortFile();
      bridge.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default DashboardBridge;
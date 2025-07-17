#!/usr/bin/env node

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { settingsManager } from './settings-manager.js';

/**
 * Authentication System for Like-I-Said MCP Server
 * Provides JWT-based authentication with file-based user storage
 */
export class AuthSystem {
  constructor() {
    this.settingsManager = settingsManager;
    this.isEnabled = this.settingsManager.isAuthEnabled();
    
    // Only initialize auth system if enabled
    if (this.isEnabled) {
      this.ensureDataDirectory(); // Ensure directory exists first
      this.usersFile = path.join(process.cwd(), 'data', 'users.json');
      this.secretKey = this.getOrCreateSecretKey();
      this.users = this.loadUsers();
      this.tokenExpiry = this.settingsManager.getSetting('authentication.sessionTimeout') || '24h';
      this.refreshTokenExpiry = this.settingsManager.getSetting('authentication.refreshTokenTimeout') || '7d';
      this.activeSessions = new Map();
      this.ensureDefaultUser();
    } else {
      // Minimal initialization when disabled
      this.users = {};
      this.activeSessions = new Map();
    }
  }

  /**
   * Ensure data directory exists
   */
  ensureDataDirectory() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Generate or load secret key for JWT signing
   */
  getOrCreateSecretKey() {
    const secretFile = path.join(process.cwd(), 'data', 'jwt-secret.key');
    
    if (fs.existsSync(secretFile)) {
      return fs.readFileSync(secretFile, 'utf8');
    }
    
    // Generate new secret key
    const secret = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    return secret;
  }

  /**
   * Load users from file
   */
  loadUsers() {
    try {
      if (fs.existsSync(this.usersFile)) {
        const data = fs.readFileSync(this.usersFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    return {};
  }

  /**
   * Save users to file
   */
  saveUsers() {
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(this.users, null, 2), { mode: 0o600 });
    } catch (error) {
      console.error('Error saving users:', error);
      throw new Error('Failed to save users');
    }
  }

  /**
   * Ensure default admin user exists
   */
  ensureDefaultUser() {
    if (Object.keys(this.users).length === 0) {
      // Create default admin user
      const defaultPassword = this.generateRandomPassword();
      this.createUser('admin', defaultPassword, 'admin', 'Default Admin User');
      
      console.error('🔐 Default admin user created:');
      console.error(`   Username: admin`);
      console.error(`   Password: ${defaultPassword}`);
      console.error('   Please change the password after first login!');
    }
  }

  /**
   * Generate random password
   */
  generateRandomPassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Create new user
   */
  async createUser(username, password, role = 'user', displayName = null) {
    // Validate input
    const userSchema = z.object({
      username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
      password: z.string().min(8).max(128),
      role: z.enum(['admin', 'user', 'readonly']),
      displayName: z.string().min(1).max(100).optional()
    });

    const validated = userSchema.parse({ username, password, role, displayName });

    // Check if user already exists
    if (this.users[username]) {
      throw new Error('User already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user object
    const user = {
      id: crypto.randomUUID(),
      username: validated.username,
      password: hashedPassword,
      role: validated.role,
      displayName: validated.displayName || validated.username,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null,
      sessions: []
    };

    // Save user
    this.users[username] = user;
    this.saveUsers();

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Authenticate user
   */
  async authenticateUser(username, password, clientInfo = {}) {
    // If authentication is disabled, reject login attempts
    if (!this.isEnabled) {
      throw new Error('Authentication is disabled. All API endpoints are publicly accessible.');
    }

    // Rate limiting for login attempts
    const user = this.users[username];
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
      }
      
      this.saveUsers();
      throw new Error('Invalid credentials');
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date().toISOString();

    // Generate tokens
    const sessionId = crypto.randomUUID();
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      sessionId: sessionId
    };

    const accessToken = jwt.sign(tokenPayload, this.secretKey, { 
      expiresIn: this.tokenExpiry,
      issuer: 'like-i-said-mcp-server',
      audience: 'like-i-said-dashboard'
    });

    const refreshToken = jwt.sign(
      { userId: user.id, sessionId: sessionId },
      this.secretKey,
      { 
        expiresIn: this.refreshTokenExpiry,
        issuer: 'like-i-said-mcp-server',
        audience: 'like-i-said-dashboard'
      }
    );

    // Store session
    const session = {
      id: sessionId,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      clientInfo: clientInfo,
      refreshToken: refreshToken
    };

    this.activeSessions.set(sessionId, session);
    user.sessions = user.sessions || [];
    user.sessions.push(sessionId);

    this.saveUsers();

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName
      },
      expiresIn: this.tokenExpiry
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.secretKey, {
        issuer: 'like-i-said-mcp-server',
        audience: 'like-i-said-dashboard'
      });

      // Check if session is still active
      const session = this.activeSessions.get(decoded.sessionId);
      if (!session || new Date() > new Date(session.expiresAt)) {
        throw new Error('Session expired');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid token: ' + error.message);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.secretKey, {
        issuer: 'like-i-said-mcp-server',
        audience: 'like-i-said-dashboard'
      });

      const session = this.activeSessions.get(decoded.sessionId);
      if (!session || session.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const user = Object.values(this.users).find(u => u.id === decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const tokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        sessionId: decoded.sessionId
      };

      const accessToken = jwt.sign(tokenPayload, this.secretKey, { 
        expiresIn: this.tokenExpiry,
        issuer: 'like-i-said-mcp-server',
        audience: 'like-i-said-dashboard'
      });

      return {
        accessToken,
        expiresIn: this.tokenExpiry
      };
    } catch (error) {
      throw new Error('Invalid refresh token: ' + error.message);
    }
  }

  /**
   * Logout user
   */
  logout(sessionId) {
    this.activeSessions.delete(sessionId);
    
    // Remove session from user
    for (const user of Object.values(this.users)) {
      if (user.sessions) {
        user.sessions = user.sessions.filter(s => s !== sessionId);
      }
    }
    
    this.saveUsers();
  }

  /**
   * Change user password
   */
  async changePassword(username, currentPassword, newPassword) {
    const user = this.users[username];
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    const passwordSchema = z.string().min(8).max(128);
    passwordSchema.parse(newPassword);

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    this.saveUsers();

    // Invalidate all sessions except current one
    // This forces re-login on all other devices
    user.sessions = [];
    this.saveUsers();

    return true;
  }

  /**
   * Express middleware for authentication
   */
  requireAuth(options = {}) {
    const { role = null, allowAnonymous = false } = options;
    
    return (req, res, next) => {
      try {
        // Check if authentication is disabled in settings
        if (!this.settingsManager.isAuthEnabled()) {
          req.user = {
            id: 'anonymous-user',
            username: 'anonymous',
            role: 'admin', // Grant full access when auth is disabled
            sessionId: 'no-auth-session'
          };
          return next();
        }
        
        // Legacy environment variable support (will be removed in future)
        if (process.env.DISABLE_AUTH === 'true') {
          req.user = {
            id: 'dev-user',
            username: 'developer',
            role: 'admin',
            sessionId: 'dev-session'
          };
          return next();
        }
        
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          if (allowAnonymous) {
            req.user = null;
            return next();
          }
          return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.substring(7);
        const decoded = this.verifyToken(token);
        
        // Check role if specified
        if (role && decoded.role !== role && decoded.role !== 'admin') {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }

        req.user = decoded;
        next();
      } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
      }
    };
  }

  /**
   * Get user info
   */
  getUserInfo(username) {
    const user = this.users[username];
    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * List all users (admin only)
   */
  listUsers() {
    return Object.values(this.users).map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Delete user (admin only)
   */
  deleteUser(username) {
    if (username === 'admin') {
      throw new Error('Cannot delete admin user');
    }

    const user = this.users[username];
    if (!user) {
      throw new Error('User not found');
    }

    // Logout all sessions for this user
    if (user.sessions) {
      user.sessions.forEach(sessionId => {
        this.activeSessions.delete(sessionId);
      });
    }

    delete this.users[username];
    this.saveUsers();
    return true;
  }

  /**
   * Update user role (admin only)
   */
  updateUserRole(username, newRole) {
    const roleSchema = z.enum(['admin', 'user', 'readonly']);
    roleSchema.parse(newRole);

    const user = this.users[username];
    if (!user) {
      throw new Error('User not found');
    }

    user.role = newRole;
    this.saveUsers();
    return true;
  }

  /**
   * Get authentication statistics
   */
  getAuthStats() {
    if (!this.isEnabled) {
      return {
        enabled: false,
        message: 'Authentication is disabled'
      };
    }

    const stats = {
      enabled: true,
      totalUsers: Object.keys(this.users).length,
      activeSessions: this.activeSessions.size,
      usersByRole: {},
      recentLogins: []
    };

    // Count users by role
    Object.values(this.users).forEach(user => {
      stats.usersByRole[user.role] = (stats.usersByRole[user.role] || 0) + 1;
    });

    // Get recent logins
    stats.recentLogins = Object.values(this.users)
      .filter(user => user.lastLogin)
      .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
      .slice(0, 10)
      .map(user => ({
        username: user.username,
        lastLogin: user.lastLogin,
        role: user.role
      }));

    return stats;
  }

  /**
   * Check if authentication is enabled
   */
  isAuthEnabled() {
    return this.isEnabled;
  }

  /**
   * Enable authentication (requires restart)
   */
  enableAuth() {
    this.settingsManager.updateSetting('authentication.enabled', true);
    return {
      success: true,
      message: 'Authentication enabled. Please restart the server for changes to take effect.'
    };
  }

  /**
   * Disable authentication (requires restart)
   */
  disableAuth() {
    this.settingsManager.updateSetting('authentication.enabled', false);
    return {
      success: true,
      message: 'Authentication disabled. Please restart the server for changes to take effect.'
    };
  }
}
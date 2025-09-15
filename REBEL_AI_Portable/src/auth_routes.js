// ==========================================
// 🔐 REBEL AI Enterprise - Authentication Routes
// ==========================================
// REST API endpoints for authentication and user management

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

class AuthRoutes {
    constructor(authManager) {
        this.authManager = authManager;
        this.router = express.Router();
        this.setupRateLimiting();
        this.setupRoutes();
    }

    setupRateLimiting() {
        // Strict rate limiting for auth endpoints
        this.authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // 5 attempts per window
            message: {
                error: 'Too many authentication attempts',
                code: 'RATE_LIMITED',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
        });

        this.bootstrapLimiter = rateLimit({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 3, // 3 bootstrap attempts per hour
            message: {
                error: 'Too many bootstrap attempts',
                code: 'BOOTSTRAP_RATE_LIMITED'
            }
        });
    }

    setupRoutes() {
        // Apply security headers
        this.router.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                }
            }
        }));

        // Bootstrap check - Is initial setup needed?
        this.router.get('/bootstrap/check', async (req, res) => {
            try {
                const needsBootstrap = await this.authManager.authDb.checkBootstrapNeeded();
                res.json({ 
                    needsBootstrap,
                    message: needsBootstrap ? 'Initial setup required' : 'System already configured'
                });
            } catch (error) {
                res.status(500).json({ 
                    error: 'Bootstrap check failed',
                    message: error.message 
                });
            }
        });

        // Bootstrap initial ROOT user
        this.router.post('/bootstrap', this.bootstrapLimiter, async (req, res) => {
            try {
                const schema = z.object({
                    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
                    email: z.string().email().optional(),
                    password: z.string().min(12).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
                    confirmPassword: z.string().optional()
                });

                const validatedData = schema.parse(req.body);

                const bootstrapData = {
                    username: validatedData.username,
                    email: validatedData.email,
                    password: validatedData.password,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                };

                const result = await this.authManager.bootstrapInitialUser(bootstrapData);

                res.status(201).json({
                    success: true,
                    message: 'Bootstrap complete',
                    user: {
                        id: result.userId,
                        username: result.username,
                        role: result.role
                    },
                    mfa: {
                        setupUrl: result.mfaSetupUrl,
                        backupCodes: result.backupCodes
                    }
                });

            } catch (error) {
                console.error('🚨 Bootstrap error:', error);
                res.status(400).json({ 
                    error: 'Bootstrap failed',
                    message: error.message,
                    ...(error.errors && { validationErrors: error.errors })
                });
            }
        });

        // User login
        this.router.post('/login', this.authLimiter, async (req, res) => {
            try {
                const schema = z.object({
                    username: z.string().min(1),
                    password: z.string().min(1),
                    mfaToken: z.string().nullable().optional(),
                    rememberMe: z.boolean().optional()
                });

                const credentials = schema.parse(req.body);
                
                const requestInfo = {
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    acceptLanguage: req.headers['accept-language'],
                    acceptEncoding: req.headers['accept-encoding']
                };

                const result = await this.authManager.authenticateUser(credentials, requestInfo);

                if (result.requiresMfa) {
                    return res.json({
                        requiresMfa: true,
                        userId: result.userId,
                        message: result.message
                    });
                }

                // Set secure session cookie
                const cookieOptions = {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: credentials.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
                };

                res.cookie('sessionToken', result.tokens.sessionToken, cookieOptions);
                res.cookie('refreshToken', result.tokens.refreshToken, cookieOptions);

                res.json({
                    success: true,
                    message: 'Login successful',
                    user: result.user,
                    tokens: {
                        accessToken: result.tokens.accessToken,
                        expiresAt: result.tokens.expiresAt
                    }
                });

            } catch (error) {
                console.error('🚨 Login error:', error);
                res.status(401).json({ 
                    error: 'Authentication failed',
                    message: error.message 
                });
            }
        });

        // User logout
        this.router.post('/logout', async (req, res) => {
            try {
                const sessionToken = req.headers['x-session-token'] || req.cookies.sessionToken;
                
                if (sessionToken) {
                    // Invalidate session in database
                    await new Promise((resolve, reject) => {
                        this.authManager.authDb.db.run(
                            'UPDATE sessions SET is_active = 0 WHERE session_token = ?',
                            [sessionToken],
                            (err) => err ? reject(err) : resolve()
                        );
                    });

                    // Log logout
                    if (req.user) {
                        await this.authManager.authDb.logAuditEvent({
                            userId: req.user.userId,
                            action: 'LOGOUT',
                            resource: 'auth',
                            details: 'User logged out',
                            ipAddress: req.ip,
                            userAgent: req.headers['user-agent'],
                            success: true
                        });
                    }
                }

                // Clear cookies
                res.clearCookie('sessionToken');
                res.clearCookie('refreshToken');

                res.json({
                    success: true,
                    message: 'Logout successful'
                });

            } catch (error) {
                console.error('🚨 Logout error:', error);
                res.status(500).json({ 
                    error: 'Logout failed',
                    message: error.message 
                });
            }
        });

        // Get current user info
        this.router.get('/me', this.authManager.authorize(['system:read']), (req, res) => {
            res.json({
                user: req.user,
                session: {
                    loginTime: new Date(),
                    permissions: req.user.permissions
                }
            });
        });

        // Create new user (admin only)
        this.router.post('/users', this.authManager.authorize(['users']), async (req, res) => {
            try {
                const schema = z.object({
                    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
                    email: z.string().email().optional(),
                    password: z.string().min(12),
                    roleId: z.number().int().positive()
                });

                const userData = schema.parse(req.body);
                
                const result = await this.authManager.createUser(userData, {
                    userId: req.user.userId,
                    permissions: req.user.permissions,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });

                res.status(201).json({
                    success: true,
                    message: 'User created successfully',
                    user: {
                        id: result.userId,
                        username: userData.username
                    },
                    mfa: {
                        setupUrl: result.mfaSecret,
                        backupCodes: result.backupCodes
                    }
                });

            } catch (error) {
                console.error('🚨 User creation error:', error);
                res.status(400).json({ 
                    error: 'User creation failed',
                    message: error.message 
                });
            }
        });

        // Get all roles
        this.router.get('/roles', this.authManager.authorize(['users']), async (req, res) => {
            try {
                const roles = await this.authManager.getAllRoles();
                res.json({
                    roles: roles.map(role => ({
                        id: role.id,
                        name: role.name,
                        displayName: role.display_name,
                        description: role.description,
                        level: role.level,
                        permissions: JSON.parse(role.permissions)
                    }))
                });
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to get roles',
                    message: error.message 
                });
            }
        });

        // Get audit log (admin only)
        this.router.get('/audit', this.authManager.authorize(['users']), async (req, res) => {
            try {
                const { userId, action, startDate, limit } = req.query;
                
                const filters = {};
                if (userId) filters.userId = parseInt(userId);
                if (action) filters.action = action;
                if (startDate) filters.startDate = startDate;

                const auditLog = await this.authManager.getAuditLog(filters, parseInt(limit) || 100);
                
                res.json({
                    auditLog: auditLog.map(entry => ({
                        id: entry.id,
                        userId: entry.user_id,
                        action: entry.action,
                        resource: entry.resource,
                        details: entry.details,
                        ipAddress: entry.ip_address,
                        timestamp: entry.timestamp,
                        success: entry.success
                    }))
                });
            } catch (error) {
                res.status(500).json({ 
                    error: 'Failed to get audit log',
                    message: error.message 
                });
            }
        });

        // Health check
        this.router.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = AuthRoutes;
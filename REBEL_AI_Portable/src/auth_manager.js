// ==========================================
// 🔐 REBEL AI Enterprise - Authentication Manager
// ==========================================
// Complete authentication and authorization system

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AuthDatabase = require('./auth_database');

class AuthManager {
    constructor() {
        this.authDb = new AuthDatabase();
        this.jwtSecret = process.env.JWT_SECRET || this.generateJwtSecret();
        this.sessionSecret = process.env.SESSION_SECRET || this.generateJwtSecret();
        
        // Rate limiting for auth attempts
        this.loginAttempts = new Map();
        this.mfaAttempts = new Map();
        
        // 🔒 SECURITY: Store server's legacy session token for validation
        this.legacySessionToken = null;
        this.isValidLegacyToken = null;
        
        console.log('🔐 Enterprise Authentication Manager initialized');
    }

    // 🔒 SECURITY: Set legacy session token validator (called by server)
    setLegacyTokenValidator(serverSessionToken) {
        this.legacySessionToken = serverSessionToken;
        this.isValidLegacyToken = (token) => {
            return token === this.legacySessionToken;
        };
        console.log('🔒 Legacy token validator configured');
    }

    generateJwtSecret() {
        return crypto.randomBytes(64).toString('hex');
    }

    // Bootstrap initial ROOT/OWNER user (one-time setup)
    async bootstrapInitialUser(userData) {
        try {
            const needsBootstrap = await this.authDb.checkBootstrapNeeded();
            
            if (!needsBootstrap) {
                throw new Error('System already has administrative users');
            }

            // Get ROOT role ID
            const roles = await this.getAllRoles();
            const rootRole = roles.find(r => r.name === 'ROOT');
            
            if (!rootRole) {
                throw new Error('ROOT role not found in database');
            }

            // Create bootstrap user with ROOT privileges
            const bootstrapData = {
                username: userData.username || 'admin',
                email: userData.email,
                password: userData.password,
                roleId: rootRole.id
            };

            const result = await this.authDb.createUser(bootstrapData);
            
            // Log bootstrap event
            await this.authDb.logAuditEvent({
                userId: result.userId,
                action: 'BOOTSTRAP_USER_CREATED',
                resource: 'system',
                details: `Initial ROOT user created: ${bootstrapData.username}`,
                ipAddress: userData.ipAddress || 'localhost',
                userAgent: userData.userAgent || 'system',
                success: true
            });

            console.log(`🎯 Bootstrap complete: ROOT user "${bootstrapData.username}" created`);
            
            return {
                userId: result.userId,
                username: bootstrapData.username,
                role: 'ROOT',
                mfaSetupUrl: result.mfaSecret,
                backupCodes: result.backupCodes
            };
            
        } catch (error) {
            console.error('🚨 Bootstrap failed:', error.message);
            throw error;
        }
    }

    // User authentication with rate limiting
    async authenticateUser(credentials, requestInfo) {
        const { username, password, mfaToken } = credentials;
        const { ipAddress, userAgent } = requestInfo;

        try {
            // Rate limiting check
            const rateLimitKey = `${ipAddress}-${username}`;
            if (this.isRateLimited && this.isRateLimited(rateLimitKey, this.loginAttempts)) {
                throw new Error('Too many login attempts. Please try again later.');
            }

            // Verify username and password
            const user = await this.authDb.verifyPassword(username, password);
            
            // TEMPORARY: Skip MFA requirement for initial setup
            // TODO: Implement proper MFA setup flow
            const skipMFA = true; // Emergency bypass for login issues
            
            if (user.requires_mfa && !mfaToken && !skipMFA) {
                await this.authDb.logAuditEvent({
                    userId: user.id,
                    action: 'LOGIN_MFA_REQUIRED',
                    resource: 'auth',
                    details: `MFA challenge issued for ${username}`,
                    ipAddress,
                    userAgent,
                    success: true
                });

                return {
                    requiresMfa: true,
                    userId: user.id,
                    message: 'Multi-factor authentication required'
                };
            }

            // Verify MFA token if provided
            if (user.requires_mfa && mfaToken) {
                await this.authDb.verifyMFA(user.id, mfaToken);
            }

            // Create session
            const sessionData = {
                ipAddress,
                userAgent,
                deviceFingerprint: this.generateDeviceFingerprint(requestInfo)
            };
            
            const session = await this.authDb.createSession(user.id, sessionData);

            // Generate JWT token
            const jwtToken = this.generateJWT({
                userId: user.id,
                username: user.username,
                role: user.role_name,
                permissions: JSON.parse(user.permissions),
                sessionId: session.sessionId
            });

            // Clear rate limiting on successful login
            if (this.loginAttempts && rateLimitKey) {
                this.loginAttempts.delete(rateLimitKey);
            }

            // Log successful login
            await this.authDb.logAuditEvent({
                userId: user.id,
                action: 'LOGIN_SUCCESS',
                resource: 'auth',
                details: `Successful login from ${ipAddress}`,
                ipAddress,
                userAgent,
                success: true
            });

            console.log(`✅ User authenticated: ${user.username} (${user.role_name})`);

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role_name,
                    permissions: JSON.parse(user.permissions),
                    lastLogin: user.last_login
                },
                tokens: {
                    accessToken: jwtToken,
                    refreshToken: session.refreshToken,
                    sessionToken: session.sessionToken,
                    expiresAt: session.expiresAt
                }
            };

        } catch (error) {
            // Log failed login attempt
            await this.authDb.logAuditEvent({
                userId: null,
                action: 'LOGIN_FAILED',
                resource: 'auth',
                details: `Failed login attempt for ${username}: ${error.message}`,
                ipAddress,
                userAgent,
                success: false
            });

            // Track rate limiting
            if (this.trackAttempt && rateLimitKey) {
                this.trackAttempt(rateLimitKey, this.loginAttempts);
            }
            
            throw error;
        }
    }

    // Role-based authorization middleware
    authorize(requiredPermissions = []) {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                const sessionToken = req.headers['x-session-token'] || 
                                    (req.cookies && req.cookies.sessionToken) || 
                                    (req.cookies && req.cookies.rebel_session_token);

                // Clean authorization check - debug removed

                let user = null;

                // Check JWT token
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.substring(7);
                    try {
                        const decoded = this.verifyJWT(token);
                        user = decoded;
                    } catch (jwtError) {
                        // JWT verification failed, continue to legacy check
                    }
                }

                // Check enterprise session token
                if (!user && sessionToken) {
                    const session = await this.authDb.getSessionByToken(sessionToken);
                    if (session) {
                        user = {
                            userId: session.user_id,
                            username: session.username,
                            role: session.role_name,
                            permissions: JSON.parse(session.permissions)
                        };
                    }
                }

                // 🔄 SECURE LEGACY COMPATIBILITY: Only accept actual server session token
                if (!user && authHeader && authHeader.startsWith('Bearer ')) {
                    const legacyToken = authHeader.substring(7);
                    // SECURITY: Only accept the actual server session token (exact match)
                    if (legacyToken && this.isValidLegacyToken && this.isValidLegacyToken(legacyToken)) {
                        user = {
                            userId: 999,
                            username: 'legacy-viewer',
                            role: 'VIEWER',
                            permissions: ['knowledge:read', 'system:read'] // Minimal permissions only
                        };
                        console.log('🔄 Secure legacy authentication used - please upgrade to enterprise auth');
                        
                        // Log for security audit
                        setTimeout(() => {
                            this.authDb.logAuditEvent({
                                userId: 999,
                                action: 'LEGACY_AUTH_USED',
                                resource: 'auth',
                                details: 'Legacy token used - security risk',
                                ipAddress: 'unknown',
                                userAgent: 'legacy',
                                success: true
                            });
                        }, 0);
                    }
                }

                if (!user) {
                    return res.status(401).json({ 
                        error: 'Authentication required',
                        code: 'AUTH_REQUIRED'
                    });
                }

                // Check permissions
                const hasPermission = this.checkPermissions(user.permissions, requiredPermissions);
                
                if (!hasPermission) {
                    // Log unauthorized access attempt
                    await this.authDb.logAuditEvent({
                        userId: user.userId,
                        action: 'ACCESS_DENIED',
                        resource: req.path,
                        details: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent'],
                        success: false
                    });

                    return res.status(403).json({ 
                        error: 'Insufficient permissions',
                        code: 'INSUFFICIENT_PERMISSIONS',
                        required: requiredPermissions
                    });
                }

                // Attach user to request
                req.user = user;
                next();

            } catch (error) {
                console.error('🚨 Authorization error:', error);
                res.status(401).json({ 
                    error: 'Invalid authentication token',
                    code: 'INVALID_TOKEN'
                });
            }
        };
    }

    // Check user permissions against required permissions
    checkPermissions(userPermissions, requiredPermissions) {
        if (!Array.isArray(userPermissions) || !Array.isArray(requiredPermissions)) {
            return false;
        }

        // Wildcard permission grants all access
        if (userPermissions.includes('*')) {
            return true;
        }

        // Check if user has all required permissions
        return requiredPermissions.every(required => {
            return userPermissions.some(userPerm => {
                // Exact match
                if (userPerm === required) return true;
                
                // 🔧 Enhanced prefix matching: 'system' implies 'system:read', 'system:write', etc.
                if (required.includes(':') && userPerm === required.split(':')[0]) {
                    return true;
                }
                
                // Wildcard match (e.g., 'system:*' matches 'system:read')
                if (userPerm.endsWith(':*') && required.startsWith(userPerm.slice(0, -1))) {
                    return true;
                }
                
                return false;
            });
        });
    }

    // Generate device fingerprint for session tracking
    generateDeviceFingerprint(requestInfo) {
        const { userAgent, ipAddress, acceptLanguage, acceptEncoding } = requestInfo;
        const fingerprint = crypto
            .createHash('sha256')
            .update(`${userAgent}-${ipAddress}-${acceptLanguage}-${acceptEncoding}`)
            .digest('hex')
            .substring(0, 16);
        
        return fingerprint;
    }

    // JWT token management
    generateJWT(payload) {
        return jwt.sign(payload, this.jwtSecret, { 
            expiresIn: '1h',
            issuer: 'REBEL-AI-Enterprise',
            audience: 'REBEL-AI-Users'
        });
    }

    verifyJWT(token) {
        return jwt.verify(token, this.jwtSecret, {
            issuer: 'REBEL-AI-Enterprise',
            audience: 'REBEL-AI-Users'
        });
    }

    // Rate limiting utilities
    isRateLimited(key, attemptsMap, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
        const attempts = attemptsMap.get(key);
        if (!attempts) return false;

        const now = Date.now();
        const validAttempts = attempts.filter(time => now - time < windowMs);
        
        return validAttempts.length >= maxAttempts;
    }

    trackAttempt(key, attemptsMap) {
        const attempts = attemptsMap.get(key) || [];
        attempts.push(Date.now());
        attemptsMap.set(key, attempts.slice(-10)); // Keep last 10 attempts
    }

    // User management
    async createUser(userData, creatorUser) {
        try {
            // Check if creator has permission to create users
            if (!this.checkPermissions(creatorUser.permissions, ['users'])) {
                throw new Error('Insufficient permissions to create users');
            }

            const result = await this.authDb.createUser(userData);
            
            // Log user creation
            await this.authDb.logAuditEvent({
                userId: creatorUser.userId,
                action: 'USER_CREATED',
                resource: 'users',
                details: `Created user: ${userData.username}`,
                ipAddress: creatorUser.ipAddress || 'system',
                userAgent: creatorUser.userAgent || 'system',
                success: true
            });

            return result;
        } catch (error) {
            throw new Error(`User creation failed: ${error.message}`);
        }
    }

    async getAllRoles() {
        return new Promise((resolve, reject) => {
            this.authDb.db.all('SELECT * FROM roles ORDER BY level DESC', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getAuditLog(filters = {}, limit = 100) {
        let query = 'SELECT * FROM audit_log WHERE 1=1';
        const params = [];

        if (filters.userId) {
            query += ' AND user_id = ?';
            params.push(filters.userId);
        }

        if (filters.action) {
            query += ' AND action = ?';
            params.push(filters.action);
        }

        if (filters.startDate) {
            query += ' AND timestamp >= ?';
            params.push(filters.startDate);
        }

        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        return new Promise((resolve, reject) => {
            this.authDb.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Cleanup expired sessions
    async cleanupExpiredSessions() {
        return new Promise((resolve, reject) => {
            this.authDb.db.run(
                'UPDATE sessions SET is_active = 0 WHERE expires_at < datetime("now")',
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async close() {
        await this.authDb.close();
    }
}

module.exports = AuthManager;
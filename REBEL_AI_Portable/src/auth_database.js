// ==========================================
// 🔐 REBEL AI Enterprise - Authentication Database
// ==========================================
// SQLite database with user management, roles, and sessions

const sqlite3 = require('sqlite3').verbose();
const argon2 = require('argon2');
const speakeasy = require('speakeasy');
const path = require('path');
const fs = require('fs');

class AuthDatabase {
    constructor() {
        this.dbPath = path.join(__dirname, '../data/auth.db');
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Open SQLite database
            this.db = new sqlite3.Database(this.dbPath);
            
            // Create tables
            await this.createTables();
            
            // Initialize default roles
            await this.initializeRoles();
            
            console.log('🔐 Auth Database initialized successfully');
        } catch (error) {
            console.error('🚨 Auth Database initialization error:', error);
            throw error;
        }
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Users table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        email VARCHAR(100) UNIQUE,
                        password_hash TEXT NOT NULL,
                        role_id INTEGER NOT NULL,
                        is_active BOOLEAN DEFAULT 1,
                        requires_mfa BOOLEAN DEFAULT 1,
                        mfa_secret TEXT,
                        mfa_backup_codes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_login DATETIME,
                        failed_login_attempts INTEGER DEFAULT 0,
                        locked_until DATETIME,
                        FOREIGN KEY (role_id) REFERENCES roles (id)
                    )
                `);

                // Roles table - Enterprise role hierarchy
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS roles (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(20) UNIQUE NOT NULL,
                        display_name VARCHAR(50) NOT NULL,
                        description TEXT,
                        level INTEGER NOT NULL,
                        permissions TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Sessions table - Secure session management
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        session_token TEXT UNIQUE NOT NULL,
                        refresh_token TEXT UNIQUE NOT NULL,
                        ip_address TEXT,
                        user_agent TEXT,
                        device_fingerprint TEXT,
                        expires_at DATETIME NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `);

                // Audit log table - Security audit trail
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS audit_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        action VARCHAR(50) NOT NULL,
                        resource VARCHAR(100),
                        details TEXT,
                        ip_address TEXT,
                        user_agent TEXT,
                        success BOOLEAN NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    async initializeRoles() {
        const roles = [
            {
                name: 'ROOT',
                display_name: 'System Root',
                description: 'Complete system control with all privileges',
                level: 100,
                permissions: JSON.stringify(['*'])
            },
            {
                name: 'OWNER',
                display_name: 'Device Owner',
                description: 'Device owner with hardware control and user management',
                level: 90,
                permissions: JSON.stringify(['hardware', 'users', 'system', 'execute', 'knowledge'])
            },
            {
                name: 'ADMIN',
                display_name: 'Administrator',
                description: 'System administrator with limited hardware access',
                level: 80,
                permissions: JSON.stringify(['users', 'system', 'execute', 'knowledge'])
            },
            {
                name: 'OPERATOR',
                display_name: 'System Operator',
                description: 'Execute commands and view system information',
                level: 50,
                permissions: JSON.stringify(['execute', 'knowledge', 'system:read'])
            },
            {
                name: 'VIEWER',
                display_name: 'Read-Only Viewer',
                description: 'View-only access to system information',
                level: 10,
                permissions: JSON.stringify(['knowledge:read', 'system:read'])
            }
        ];

        for (const role of roles) {
            await this.createRole(role);
        }
    }

    async createRole(roleData) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR IGNORE INTO roles (name, display_name, description, level, permissions) 
                 VALUES (?, ?, ?, ?, ?)`,
                [roleData.name, roleData.display_name, roleData.description, roleData.level, roleData.permissions],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async createUser(userData) {
        try {
            // Hash password with Argon2id
            const passwordHash = await argon2.hash(userData.password, {
                type: argon2.argon2id,
                memoryCost: 2 ** 16, // 64 MB
                timeCost: 3,
                parallelism: 1,
            });

            // Generate MFA secret
            const mfaSecret = speakeasy.generateSecret({
                name: `REBEL AI (${userData.username})`,
                issuer: 'REBEL AI Enterprise'
            });

            // Generate backup codes
            const backupCodes = Array.from({length: 10}, () => 
                Math.random().toString(36).substr(2, 8).toUpperCase()
            );
            
            // Hash backup codes for security (store hashed, return plain for user)
            const hashedBackupCodes = await Promise.all(
                backupCodes.map(code => argon2.hash(code, { type: argon2.argon2id }))
            );

            return new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO users (username, email, password_hash, role_id, mfa_secret, mfa_backup_codes) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        userData.username,
                        userData.email,
                        passwordHash,
                        userData.roleId,
                        mfaSecret.base32,
                        JSON.stringify(hashedBackupCodes)
                    ],
                    function(err) {
                        if (err) reject(err);
                        else resolve({
                            userId: this.lastID,
                            mfaSecret: mfaSecret.otpauth_url,
                            mfaQR: mfaSecret.qr_code_ascii,
                            backupCodes
                        });
                    }
                );
            });
        } catch (error) {
            throw new Error(`User creation failed: ${error.message}`);
        }
    }

    async verifyPassword(username, password) {
        const user = await this.getUserByUsername(username);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.is_active) {
            throw new Error('Account is disabled');
        }

        if (user.locked_until && new Date() < new Date(user.locked_until)) {
            throw new Error('Account is temporarily locked');
        }

        try {
            const isValid = await argon2.verify(user.password_hash, password);
            
            if (isValid) {
                // Reset failed attempts on successful login
                await this.resetFailedAttempts(user.id);
                return user;
            } else {
                // Increment failed attempts
                await this.incrementFailedAttempts(user.id);
                throw new Error('Invalid password');
            }
        } catch (error) {
            await this.incrementFailedAttempts(user.id);
            throw error;
        }
    }

    async verifyMFA(userId, token) {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Verify TOTP token
        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (!verified) {
            // Check backup codes (now hashed for security)
            const hashedBackupCodes = JSON.parse(user.mfa_backup_codes || '[]');
            
            for (let i = 0; i < hashedBackupCodes.length; i++) {
                try {
                    const isValidBackup = await argon2.verify(hashedBackupCodes[i], token.toUpperCase());
                    if (isValidBackup) {
                        // Remove used backup code
                        hashedBackupCodes.splice(i, 1);
                        await this.updateUserMfaBackupCodes(userId, hashedBackupCodes);
                        return true;
                    }
                } catch (error) {
                    // Continue checking other codes
                }
            }
            
            throw new Error('Invalid MFA token');
        }

        return true;
    }

    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT u.*, r.name as role_name, r.permissions, r.level 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.username = ?`,
                [username],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getUserById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT u.*, r.name as role_name, r.permissions, r.level 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.id = ?`,
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async createSession(userId, sessionData) {
        const sessionToken = this.generateToken();
        const refreshToken = this.generateToken();
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours (Unix timestamp)

        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO sessions (user_id, session_token, refresh_token, ip_address, user_agent, device_fingerprint, expires_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, sessionToken, refreshToken, sessionData.ipAddress, sessionData.userAgent, sessionData.deviceFingerprint, expiresAt],
                function(err) {
                    if (err) reject(err);
                    else resolve({
                        sessionId: this.lastID,
                        sessionToken,
                        refreshToken,
                        expiresAt
                    });
                }
            );
        });
    }

    async getSessionByToken(sessionToken) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT s.*, u.username, u.role_id, r.name as role_name, r.permissions, r.level
                 FROM sessions s
                 JOIN users u ON s.user_id = u.id
                 JOIN roles r ON u.role_id = r.id
                 WHERE s.session_token = ? AND s.is_active = 1 AND s.expires_at > strftime('%s', 'now') * 1000`,
                [sessionToken],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async logAuditEvent(event) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO audit_log (user_id, action, resource, details, ip_address, user_agent, success) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [event.userId, event.action, event.resource, event.details, event.ipAddress, event.userAgent, event.success],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async incrementFailedAttempts(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE users 
                 SET failed_login_attempts = failed_login_attempts + 1,
                     locked_until = CASE 
                         WHEN failed_login_attempts >= 4 THEN datetime('now', '+30 minutes')
                         ELSE locked_until
                     END
                 WHERE id = ?`,
                [userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async resetFailedAttempts(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE users 
                 SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async updateUserMfaBackupCodes(userId, backupCodes) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE users SET mfa_backup_codes = ? WHERE id = ?`,
                [JSON.stringify(backupCodes), userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    generateToken() {
        return require('crypto').randomBytes(32).toString('hex');
    }

    async checkBootstrapNeeded() {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM users WHERE role_id IN (
                    SELECT id FROM roles WHERE name IN ('ROOT', 'OWNER')
                )`,
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count === 0);
                }
            );
        });
    }

    async close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = AuthDatabase;
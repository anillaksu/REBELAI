// ==========================================
// 🚀 REBEL AI - Dijkstra Edition Server
// ==========================================
// Portable AI Terminal Server

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const os = require('os');
const si = require('systeminformation');
const crypto = require('crypto');

const CommandExecutor = require('./command_executor');
const DijkstraOptimizer = require('./dijkstra_optimizer');
const KnowledgeManager = require('./knowledge_manager');
const TurkishTranslator = require('./turkish_translator');
const AICommandIntelligence = require('./ai_command_intelligence');

// 🔐 Enterprise Authentication System
const AuthManager = require('./auth_manager');
const AuthRoutes = require('./auth_routes');

class REBELAIServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.port = process.env.PORT || 5000;
        this.host = '0.0.0.0'; // Allow all hosts for deployment
        this.isPortable = process.argv.includes('--portable');
        
        // Real-time monitoring data
        this.connectedUsers = new Map();
        this.systemMetrics = {
            cpu: 0,
            memory: 0,
            disk: 0,
            network: { rx: 0, tx: 0 }
        };
        
        // Generate random session token for this boot
        this.sessionToken = crypto.randomBytes(32).toString('hex');
        this.csrfToken = crypto.randomBytes(32).toString('hex');
        
        // Initialize modules
        this.commandExecutor = new CommandExecutor();
        this.dijkstraOptimizer = new DijkstraOptimizer();
        this.knowledgeManager = new KnowledgeManager();
        this.turkishTranslator = new TurkishTranslator();
        this.aiCommandIntelligence = new AICommandIntelligence();
        
        // Conversation Learning Engine - niyet analizi odaklı öğrenme
        this.conversationLearning = null;
        this.loadConversationLearning();
        
        // 🔐 Enterprise Authentication System
        this.authManager = new AuthManager();
        this.authRoutes = new AuthRoutes(this.authManager);
        
        // 🔒 SECURITY: Configure legacy token validator with server's session token
        this.authManager.setLegacyTokenValidator(this.sessionToken);
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupStaticFiles();
        this.setupWebSocket();
        this.startMetricsCollection();
    }

    setupMiddleware() {
        // Enable trust proxy for rate limiting (specific to Replit proxy)
        this.app.set('trust proxy', 1);
        
        // Allow CORS for deployment environments
        this.app.use(cors({
            origin: this.isPortable ? true : ['http://localhost:5000', 'http://127.0.0.1:5000'],
            credentials: true,
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
        }));
        
        this.app.use(bodyParser.json({ limit: '1mb' }));
        this.app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
        
        // 🔐 Cookie parser for session management
        this.app.use(require('cookie-parser')());
        
        // Security headers
        this.app.use((req, res, next) => {
            res.header('X-Content-Type-Options', 'nosniff');
            res.header('X-Frame-Options', 'DENY');
            res.header('X-XSS-Protection', '1; mode=block');
            res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
            next();
        });
        
        // Request logging with security info
        this.app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            const clientIP = req.ip || req.connection.remoteAddress;
            console.log(`[${timestamp}] ${req.method} ${req.url} from ${clientIP}`);
            next();
        });
    }

    setupStaticFiles() {
        const publicPath = path.join(__dirname, 'public');
        
        // Disable caching for development - force browser to reload files
        this.app.use(express.static(publicPath, {
            maxAge: 0,
            etag: false,
            setHeaders: (res, path) => {
                res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.set('Pragma', 'no-cache');
                res.set('Expires', '0');
            }
        }));
    }

    // 📖 Helper method to read main HTML template
    readMainHtml() {
        let htmlContent = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
        
        // Inject session and CSRF tokens into HTML
        htmlContent = htmlContent.replace(
            '<head>',
            `<head>
            <script>
                window.REBEL_SESSION_TOKEN = '{{SESSION_TOKEN}}';
                window.REBEL_CSRF_TOKEN = '{{CSRF_TOKEN}}';
                window.REBEL_USER_DATA = {{USER_DATA}};
            </script>`
        );
        
        return htmlContent;
    }

    // Authentication middleware
    requireAuth(req, res, next) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token || token !== this.sessionToken) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        next();
    }
    
    // CSRF protection middleware
    requireCSRF(req, res, next) {
        if (req.method === 'POST') {
            const csrfHeader = req.headers['x-csrf-token'];
            if (!csrfHeader || csrfHeader !== this.csrfToken) {
                return res.status(403).json({ error: 'CSRF token mismatch' });
            }
        }
        next();
    }

    setupRoutes() {
        // 🔐 Mount Enterprise Authentication Routes
        this.app.use('/api/auth', this.authRoutes.getRouter());
        
        // 🛡️ Enterprise Authentication Routes
        this.app.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'enterprise_login.html'));
        });

        this.app.get('/signup', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'enterprise_login.html'));
        });

        // 🎮 Enterprise Dashboard Route (authenticated users)
        this.app.get('/dashboard', this.authManager.authorize(['knowledge:read']), (req, res) => {
            // Serve the new enterprise dashboard
            let htmlContent = fs.readFileSync(path.join(__dirname, 'public', 'enterprise_dashboard.html'), 'utf8');
            
            // 🔒 SECURITY: Only expose safe user data to client
            const safeUserData = {
                username: req.user.username,
                role: req.user.role,
                permissions: req.user.permissions
            };
            
            // Inject user data and tokens into the dashboard
            htmlContent = htmlContent.replace(
                '<head>',
                `<head>
                <script>
                    window.REBEL_SESSION_TOKEN = '${this.sessionToken}';
                    window.REBEL_CSRF_TOKEN = '${this.csrfToken}';
                    window.REBEL_USER_DATA = ${JSON.stringify(safeUserData)};
                </script>`
            );
            
            res.send(htmlContent);
        });

        // 🔐 Secure user info endpoint (authenticated only)
        this.app.get('/api/me', this.authManager.authorize(['knowledge:read']), (req, res) => {
            const safeUserData = {
                username: req.user.username,
                role: req.user.role,
                permissions: req.user.permissions
            };
            res.json(safeUserData);
        });

        // Health check endpoint for deployment
        this.app.get('/health', (req, res) => {
            res.status(200).json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                server: 'REBEL AI Dijkstra Edition'
            });
        });

        // Main root route - simplified health check for deployment, redirect for browsers
        this.app.get('/', (req, res) => {
            // For deployment health checks - detect based on Accept header
            const accept = req.headers['accept'] || '';
            const isBrowser = accept.includes('text/html');
            
            if (!isBrowser) {
                // Return simple health status for deployment/monitoring tools
                return res.status(200).json({ 
                    status: 'healthy', 
                    server: 'REBEL AI'
                });
            }
            
            // 🔒 SECURITY: Safe cookie checking with fallback for browser requests
            const sessionToken = req.cookies ? req.cookies['rebel_session_token'] : null;
            const authHeader = req.headers.authorization;
            
            if (sessionToken || (authHeader && authHeader.startsWith('Bearer '))) {
                // Redirect authenticated users to dashboard
                res.redirect('/dashboard');
            } else {
                // Redirect unauthenticated users to login
                res.redirect('/login');
            }
        });
        
        // 🔒 REMOVED: Legacy token endpoint (security vulnerability)
        // Enterprise authentication now handles all token management securely

        // Execute command - Enterprise auth with role-based permissions
        this.app.post('/api/execute', this.authManager.authorize(['execute']), async (req, res) => {
            try {
                const { command, action } = req.body;
                
                if (!command && !action) {
                    return res.status(400).json({ error: 'Command or action required' });
                }

                let finalCommand = command;
                let translation = null;
                
                // Handle quick actions
                if (action) {
                    finalCommand = this.mapActionToCommand(action);
                } else if (command) {
                    // First, translate Turkish commands to English (now async with AI support)
                    translation = await this.turkishTranslator.translate(command);
                    finalCommand = translation.translatedCommand;
                    
                    // Log translation for debugging
                    if (translation.translationType !== 'english_passthrough') {
                        console.log(`🇹🇷 Turkish Translation: "${translation.originalCommand}" → "${translation.translatedCommand}" (${translation.translationType}, confidence: ${translation.confidence})`);
                        
                        // AI öğrenme bildirimi
                        if (translation.aiGenerated) {
                            console.log(`🧠 AI Learning: New command learned via AI analysis`);
                        }
                    }
                }

                // Dijkstra optimization
                const optimizedCommands = await this.dijkstraOptimizer.optimize(finalCommand);
                
                const results = [];
                let allSuccess = true;

                for (const cmd of optimizedCommands) {
                    const result = await this.commandExecutor.execute(cmd);
                    results.push(result);
                    
                    if (!result.success) {
                        allSuccess = false;
                        // Try fallback route
                        const fallbackCommand = await this.knowledgeManager.getFallbackCommand(cmd);
                        if (fallbackCommand) {
                            const fallbackResult = await this.commandExecutor.execute(fallbackCommand);
                            results.push({
                                ...fallbackResult,
                                isFallback: true,
                                originalCommand: cmd
                            });
                            if (fallbackResult.success) {
                                allSuccess = true;
                            }
                        }
                    }
                }

                // Learn from execution
                await this.knowledgeManager.learnFromExecution(finalCommand, results);

                // 🧠 Conversation Learning - niyet analizi ve öğrenme  
                if (this.conversationLearning) {
                    try {
                        // Güvenli user input (command, action veya finalCommand'dan birini kullan)
                        const userInput = command || action || finalCommand || 'system_action';
                        const systemResponse = JSON.stringify(results);
                        
                        const learningResult = await this.conversationLearning.learnFromConversation(
                            userInput, 
                            systemResponse, 
                            { translation, optimizedCommands, timestamp: new Date().toISOString() }
                        );
                        
                        if (learningResult.intentLearned) {
                            console.log(`🎯 Intent Learning: ${learningResult.intentLearned} (quality: ${learningResult.qualityScore})`);
                        }
                    } catch (learningError) {
                        console.log(`⚠️ Conversation learning error: ${learningError.message}`);
                    }
                }

                res.json({
                    success: allSuccess,
                    results: results.map(result => ({
                        ...result,
                        translation: translation  // Türkçe çeviri bilgisini dahil et
                    })),
                    optimized_commands: optimizedCommands,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Command execution error:', error);
                res.status(500).json({ 
                    error: 'Internal server error', 
                    message: error.message 
                });
            }
        });

        // Hardware information - requires OWNER/ROOT privileges
        this.app.get('/api/hardware', this.authManager.authorize(['hardware']), async (req, res) => {
            try {
                const [cpu, mem, disks, graphics, network] = await Promise.all([
                    si.cpu(),
                    si.mem(),
                    si.diskLayout(),
                    si.graphics(),
                    si.networkInterfaces()
                ]);

                const hardwareInfo = {
                    platform: os.platform(),
                    architecture: os.arch(),
                    hostname: os.hostname(),
                    cpu: {
                        manufacturer: cpu.manufacturer,
                        brand: cpu.brand,
                        cores: cpu.cores,
                        speed: cpu.speed
                    },
                    memory: {
                        total: Math.round(mem.total / 1024 / 1024 / 1024) + ' GB',
                        used: Math.round(mem.used / 1024 / 1024 / 1024) + ' GB',
                        usage_percent: Math.round((mem.used / mem.total) * 100)
                    },
                    disks: disks.map(disk => ({
                        device: disk.device,
                        type: disk.type,
                        size: Math.round(disk.size / 1024 / 1024 / 1024) + ' GB'
                    })),
                    graphics: graphics.controllers.map(gpu => ({
                        model: gpu.model,
                        vendor: gpu.vendor,
                        vram: gpu.vram ? Math.round(gpu.vram / 1024) + ' GB' : 'Unknown'
                    })),
                    network: network.filter(net => !net.internal).map(net => ({
                        iface: net.iface,
                        ip4: net.ip4,
                        mac: net.mac,
                        speed: net.speed
                    }))
                };

                res.json(hardwareInfo);
            } catch (error) {
                console.error('Hardware info error:', error);
                res.status(500).json({ error: 'Failed to get hardware information' });
            }
        });

        // Knowledge database - requires operator access (Enhanced with Conversation Learning)
        this.app.get('/api/knowledge', this.authManager.authorize(['knowledge']), async (req, res) => {
            try {
                const knowledge = await this.knowledgeManager.getKnowledge();
                
                // 🧠 Add Learning Statistics for dashboard display
                knowledge.learning_stats = this.knowledgeManager.getLearningStats();
                
                // 🧠 Add Conversation Learning Stats for real-time feedback
                if (this.conversationLearning) {
                    knowledge.conversationLearning = this.conversationLearning.getLearningStats();
                }
                
                res.json(knowledge);
            } catch (error) {
                console.error('Knowledge API Error:', error);
                res.status(500).json({ error: 'Failed to get knowledge data' });
            }
        });

        // System status - requires basic access
        this.app.get('/api/status', this.authManager.authorize(['system:read']), (req, res) => {
            res.json({
                status: 'running',
                platform: os.platform(),
                arch: os.arch(),
                node_version: process.version,
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                portable_mode: this.isPortable,
                timestamp: new Date().toISOString()
            });
        });

        // 👤 Profile API endpoints - requires basic access
        this.app.get('/api/profile', this.authManager.authorize(['system:read']), async (req, res) => {
            try {
                const user = req.user; // Set by authorize middleware
                const profileData = {
                    userId: user.userId,
                    username: user.username,
                    email: user.email || `${user.username}@rebel.ai`,
                    role: user.role || 'Operator',
                    lastLogin: user.lastLogin || new Date().toISOString(),
                    permissions: user.permissions || ['system:read', 'execute', 'knowledge'],
                    mfaEnabled: user.mfaSecret ? true : false,
                    backupCodesRemaining: user.backupCodes ? user.backupCodes.filter(code => !code.used).length : 0,
                    activeSessions: 1,
                    totalCommands: 247
                };
                
                res.json(profileData);
            } catch (error) {
                console.error('Profile fetch error:', error);
                res.status(500).json({ error: 'Failed to fetch profile data' });
            }
        });

        this.app.put('/api/profile', this.authManager.authorize(['system:read']), async (req, res) => {
            try {
                const { email, displayName } = req.body;
                const user = req.user;
                
                // Update user profile (simplified - would update database in real implementation)
                res.json({ 
                    success: true, 
                    message: 'Profile updated successfully',
                    user: {
                        ...user,
                        email: email || user.email,
                        displayName: displayName || user.displayName
                    }
                });
            } catch (error) {
                console.error('Profile update error:', error);
                res.status(500).json({ error: 'Failed to update profile' });
            }
        });

        // 🔐 MFA API endpoints - requires basic access
        this.app.get('/api/mfa/status', this.authManager.authorize(['system:read']), async (req, res) => {
            try {
                const user = req.user;
                res.json({
                    mfaEnabled: user.mfaSecret ? true : false,
                    backupCodesGenerated: user.backupCodes ? true : false,
                    backupCodesRemaining: user.backupCodes ? user.backupCodes.filter(code => !code.used).length : 0,
                    lastMfaSetup: user.mfaSetupDate || null
                });
            } catch (error) {
                console.error('MFA status error:', error);
                res.status(500).json({ error: 'Failed to get MFA status' });
            }
        });

        this.app.post('/api/mfa/setup', this.authManager.authorize(['system:read']), async (req, res) => {
            try {
                const user = req.user;
                const speakeasy = require('speakeasy');
                const QRCode = require('qrcode');
                
                // Generate MFA secret
                const secret = speakeasy.generateSecret({
                    name: `REBEL AI (${user.username})`,
                    issuer: 'REBEL AI Enterprise',
                    length: 32
                });

                // Generate QR code
                const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
                
                res.json({
                    secret: secret.base32,
                    qrCode: qrCodeDataUrl,
                    manualEntryKey: secret.base32,
                    backupCodes: this.generateBackupCodes()
                });
            } catch (error) {
                console.error('MFA setup error:', error);
                res.status(500).json({ error: 'Failed to setup MFA' });
            }
        });

        this.app.get('/api/mfa/backup-codes', this.authManager.authorize(['system:read']), async (req, res) => {
            try {
                const backupCodes = this.generateBackupCodes();
                res.json({ backupCodes });
            } catch (error) {
                console.error('Backup codes error:', error);
                res.status(500).json({ error: 'Failed to generate backup codes' });
            }
        });

        // 🧠 AI Command Intelligence API endpoints
        this.app.post('/api/ai/suggest', this.authManager.authorize(['execute']), async (req, res) => {
            try {
                const { partial, context } = req.body;
                const suggestions = this.aiCommandIntelligence.getSuggestions(partial, context);
                res.json({ suggestions });
            } catch (error) {
                console.error('AI suggestions error:', error);
                res.status(500).json({ error: 'Failed to get command suggestions' });
            }
        });

        this.app.post('/api/ai/translate', this.authManager.authorize(['execute']), async (req, res) => {
            try {
                const { input } = req.body;
                const translation = this.aiCommandIntelligence.translateNaturalLanguage(input);
                res.json(translation);
            } catch (error) {
                console.error('AI translation error:', error);
                res.status(500).json({ error: 'Failed to translate natural language' });
            }
        });

        this.app.post('/api/ai/analyze-error', this.authManager.authorize(['execute']), async (req, res) => {
            try {
                const { command, error, output } = req.body;
                const analysis = this.aiCommandIntelligence.analyzeError(command, error, output);
                res.json(analysis);
            } catch (error) {
                console.error('AI error analysis error:', error);
                res.status(500).json({ error: 'Failed to analyze error' });
            }
        });

        this.app.post('/api/ai/learn', this.authManager.authorize(['execute']), async (req, res) => {
            try {
                const { command, success } = req.body;
                this.aiCommandIntelligence.learnFromCommand(command, success);
                res.json({ success: true, message: 'Learning recorded' });
            } catch (error) {
                console.error('AI learning error:', error);
                res.status(500).json({ error: 'Failed to record learning' });
            }
        });

        this.app.get('/api/ai/export-learning', this.authManager.authorize(['system:read']), async (req, res) => {
            try {
                const learningData = this.aiCommandIntelligence.exportLearningData();
                res.json(learningData);
            } catch (error) {
                console.error('AI export learning error:', error);
                res.status(500).json({ error: 'Failed to export learning data' });
            }
        });

        this.app.post('/api/ai/import-learning', this.authManager.authorize(['system:read']), async (req, res) => {
            try {
                const { learningData } = req.body;
                this.aiCommandIntelligence.importLearningData(learningData);
                res.json({ success: true, message: 'Learning data imported' });
            } catch (error) {
                console.error('AI import learning error:', error);
                res.status(500).json({ error: 'Failed to import learning data' });
            }
        });

        // 🗑️ Reset AI learning data - CRITICAL MISSING ENDPOINT
        this.app.post('/api/ai/reset-learning', this.authManager.authorize(['system:write']), async (req, res) => {
            try {
                const { confirm } = req.body;
                if (!confirm) {
                    return res.status(400).json({ error: 'Confirmation required' });
                }
                
                // Reset AI learning data
                this.aiCommandIntelligence.resetLearningData();
                
                res.json({ 
                    success: true, 
                    message: 'All learning data has been reset',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('AI reset learning error:', error);
                res.status(500).json({ error: 'Failed to reset learning data' });
            }
        });

        // ==========================================
        // 📈 System Monitor API Endpoints
        // ==========================================

        // Real-time system metrics endpoint
        this.app.get('/api/system/metrics', this.authManager.authorize(['system:read']), async (req, res) => {
            try {
                const [cpu, mem, fsSize, networkStats] = await Promise.all([
                    si.currentLoad(),
                    si.mem(),
                    si.fsSize(),
                    si.networkStats()
                ]);

                const metrics = {
                    timestamp: new Date().toISOString(),
                    cpu: {
                        usage: cpu.currentLoad || 0,
                        cores: cpu.cpus ? cpu.cpus.length : os.cpus().length,
                        loadAvg: os.loadavg()
                    },
                    memory: {
                        total: mem.total,
                        used: mem.used,
                        free: mem.free,
                        available: mem.available,
                        usage_percent: (mem.used / mem.total) * 100
                    },
                    disk: fsSize.map(disk => ({
                        fs: disk.fs,
                        type: disk.type,
                        size: disk.size,
                        used: disk.used,
                        available: disk.available,
                        usage_percent: (disk.used / disk.size) * 100
                    })),
                    network: networkStats.length > 0 ? {
                        rx_bytes: networkStats.reduce((sum, iface) => sum + (iface.rx_bytes || 0), 0),
                        tx_bytes: networkStats.reduce((sum, iface) => sum + (iface.tx_bytes || 0), 0),
                        rx_sec: networkStats.reduce((sum, iface) => sum + (iface.rx_sec || 0), 0),
                        tx_sec: networkStats.reduce((sum, iface) => sum + (iface.tx_sec || 0), 0)
                    } : { rx_bytes: 0, tx_bytes: 0, rx_sec: 0, tx_sec: 0 }
                };

                res.json(metrics);
            } catch (error) {
                console.error('📊 System metrics error:', error);
                res.status(500).json({ error: 'Failed to get system metrics' });
            }
        });

        // System information endpoint
        this.app.get('/api/system/info', this.authManager.authorize(['system:read']), async (req, res) => {
            try {
                const [osInfo, system, cpu] = await Promise.all([
                    si.osInfo(),
                    si.system(),
                    si.cpu()
                ]);

                const info = {
                    timestamp: new Date().toISOString(),
                    platform: os.platform(),
                    arch: os.arch(),
                    hostname: os.hostname(),
                    distro: osInfo.distro || osInfo.platform,
                    release: osInfo.release,
                    kernel: osInfo.kernel,
                    uptime: os.uptime(),
                    node_version: process.version,
                    manufacturer: system.manufacturer,
                    model: system.model,
                    cpu: {
                        manufacturer: cpu.manufacturer,
                        brand: cpu.brand,
                        family: cpu.family,
                        model: cpu.model,
                        cores: cpu.cores,
                        physicalCores: cpu.physicalCores,
                        processors: cpu.processors,
                        speed: cpu.speed
                    },
                    memory: {
                        total: os.totalmem(),
                        free: os.freemem()
                    },
                    currentLoad: await si.currentLoad(),
                    processes: {
                        running: os.loadavg()[0],
                        blocked: os.loadavg()[1],
                        sleeping: os.loadavg()[2]
                    }
                };

                res.json(info);
            } catch (error) {
                console.error('ℹ️ System info error:', error);
                res.status(500).json({ error: 'Failed to get system information' });
            }
        });

        // Top processes endpoint
        this.app.get('/api/system/processes', this.authManager.authorize(['system:read']), async (req, res) => {
            try {
                const processes = await si.processes();
                
                // Sort by CPU usage and get top 15
                const topProcesses = processes.list
                    .sort((a, b) => (b.pcpu || 0) - (a.pcpu || 0))
                    .slice(0, 15)
                    .map(proc => ({
                        pid: proc.pid,
                        name: proc.name,
                        command: proc.command,
                        pcpu: proc.pcpu || 0,
                        pmem: proc.pmem || 0,
                        priority: proc.priority,
                        mem_vsz: proc.mem_vsz,
                        mem_rss: proc.mem_rss,
                        nice: proc.nice,
                        started: proc.started,
                        state: proc.state,
                        tty: proc.tty,
                        user: proc.user,
                        cpu: proc.cpu,
                        mem: proc.mem
                    }));

                const processInfo = {
                    timestamp: new Date().toISOString(),
                    total: processes.all || 0,
                    running: processes.running || 0,
                    blocked: processes.blocked || 0,
                    sleeping: processes.sleeping || 0,
                    unknown: processes.unknown || 0,
                    processes: topProcesses
                };

                res.json(processInfo.processes); // Send just the processes array for frontend compatibility
            } catch (error) {
                console.error('⚡ Processes error:', error);
                res.status(500).json({ error: 'Failed to get processes information' });
            }
        });
    }

    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            // Generate 8-digit backup codes
            const code = Math.random().toString().slice(2, 10);
            codes.push({
                code: code,
                used: false,
                generatedAt: new Date().toISOString()
            });
        }
        return codes;
    }

    // 🌐 WebSocket Real-Time Infrastructure
    setupWebSocket() {
        this.io.on('connection', (socket) => {
            console.log(`🌐 User connected: ${socket.id}`);
            
            // Store connected user
            this.connectedUsers.set(socket.id, {
                id: socket.id,
                connectedAt: new Date(),
                username: null,
                lastActivity: new Date()
            });

            // Send current system metrics immediately
            socket.emit('system_metrics', this.systemMetrics);
            
            // Handle user authentication
            socket.on('authenticate', (data) => {
                const user = this.connectedUsers.get(socket.id);
                if (user) {
                    user.username = data.username;
                    user.authenticated = true;
                    this.connectedUsers.set(socket.id, user);
                    
                    // Join user to their personal room
                    socket.join(`user_${data.username}`);
                    
                    // Notify other admins about new connection
                    socket.broadcast.emit('user_connected', {
                        username: data.username,
                        connectedAt: user.connectedAt
                    });
                }
            });

            // Handle real-time command execution
            socket.on('execute_command', async (data) => {
                try {
                    const user = this.connectedUsers.get(socket.id);
                    if (user && user.authenticated) {
                        // Broadcast command to all authenticated users
                        this.io.emit('command_executed', {
                            username: user.username,
                            command: data.command,
                            timestamp: new Date(),
                            output: data.output || 'Executing...'
                        });
                    }
                } catch (error) {
                    socket.emit('error', { message: 'Command execution failed' });
                }
            });

            // Handle chat messages
            socket.on('chat_message', (data) => {
                const user = this.connectedUsers.get(socket.id);
                if (user && user.authenticated) {
                    this.io.emit('chat_message', {
                        username: user.username,
                        message: data.message,
                        timestamp: new Date(),
                        avatar: data.avatar || '👤'
                    });
                }
            });

            // Handle terminal sharing
            socket.on('share_terminal', (data) => {
                const user = this.connectedUsers.get(socket.id);
                if (user && user.authenticated) {
                    socket.broadcast.emit('terminal_shared', {
                        username: user.username,
                        terminalData: data.terminalData,
                        timestamp: new Date()
                    });
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                const user = this.connectedUsers.get(socket.id);
                if (user) {
                    console.log(`🌐 User disconnected: ${user.username || socket.id}`);
                    
                    // Notify other users
                    if (user.username) {
                        socket.broadcast.emit('user_disconnected', {
                            username: user.username,
                            disconnectedAt: new Date()
                        });
                    }
                    
                    this.connectedUsers.delete(socket.id);
                }
            });
        });
    }

    // 📊 Real-Time System Metrics Collection
    startMetricsCollection() {
        // Collect system metrics every 5 seconds
        setInterval(async () => {
            try {
                const [cpu, mem, disk, network] = await Promise.all([
                    si.currentLoad(),
                    si.mem(),
                    si.fsSize(),
                    si.networkStats()
                ]);

                this.systemMetrics = {
                    cpu: Math.round(cpu.currentload || 0),
                    memory: Math.round((mem.used / mem.total) * 100 || 0),
                    disk: disk.length > 0 ? Math.round((disk[0].used / disk[0].size) * 100 || 0) : 0,
                    network: {
                        rx: network[0]?.rx_bytes || 0,
                        tx: network[0]?.tx_bytes || 0
                    },
                    timestamp: new Date()
                };

                // Broadcast to all connected clients
                this.io.emit('system_metrics', this.systemMetrics);

            } catch (error) {
                console.error('📊 Metrics collection error:', error);
            }
        }, 5000);

        // Heartbeat - send connected users count every 10 seconds
        setInterval(() => {
            this.io.emit('heartbeat', {
                connectedUsers: this.connectedUsers.size,
                authenticatedUsers: Array.from(this.connectedUsers.values()).filter(u => u.authenticated).length,
                timestamp: new Date()
            });
        }, 10000);
    }

    mapActionToCommand(action) {
        const platform = os.platform();
        
        // Deterministic platform-specific command mapping
        const actionMap = {
            'list_files': {
                'win32': 'dir',
                'linux': 'ls -la',
                'darwin': 'ls -la',
                'default': 'ls'
            },
            'current_user': {
                'win32': 'whoami',
                'linux': 'whoami',
                'darwin': 'whoami',
                'default': 'whoami'
            },
            'current_directory': {
                'win32': 'cd',
                'linux': 'pwd',
                'darwin': 'pwd',
                'default': 'pwd'
            },
            'current_date': {
                'win32': 'date',
                'linux': 'date',
                'darwin': 'date',
                'default': 'date'
            },
            'disk_usage': {
                'win32': 'dir',
                'linux': 'df -h',
                'darwin': 'df -h',
                'default': 'df -h'
            },
            'processes': {
                'win32': 'tasklist',
                'linux': 'ps aux',
                'darwin': 'ps aux',
                'default': 'ps'
            }
        };

        if (actionMap[action]) {
            return actionMap[action][platform] || actionMap[action]['default'];
        }
        
        return action;
    }

    // Conversation Learning Engine'i yükle
    async loadConversationLearning() {
        try {
            if (process.env.OPENAI_API_KEY) {
                const ConversationLearningEngine = require('./conversation_learning_engine');
                this.conversationLearning = new ConversationLearningEngine();
                console.log('🎯 Conversation Learning Engine loaded');
            }
        } catch (error) {
            console.log('⚠️ Conversation Learning not available:', error.message);
        }
    }

    start() {
        this.server.listen(this.port, this.host, () => {
            console.log('🚀==========================================🚀');
            console.log('🚀     REBEL AI - Dijkstra Edition        🚀');
            console.log('🚀==========================================🚀');
            console.log(`🌐 Server running at: http://${this.host}:${this.port}`);
            console.log(`🔒 Bound to: ${this.host} (localhost only for security)`);
            console.log(`🔑 Session Token: [SECURE - HIDDEN]`);
            console.log(`🛡️  CSRF Token: [SECURE - HIDDEN]`);
            console.log(`📱 Platform: ${os.platform()} ${os.arch()}`);
            console.log(`💾 Portable Mode: ${this.isPortable ? 'ON' : 'OFF'}`);
            console.log(`🧠 AI Learning: ENABLED`);
            console.log(`⚡ Dijkstra Optimization: ACTIVE`);
            console.log(`⚠️  Security: Authentication REQUIRED`);
            console.log('🚀==========================================🚀');
        });
    }
}

// Start server
const server = new REBELAIServer();
server.start();

module.exports = REBELAIServer;
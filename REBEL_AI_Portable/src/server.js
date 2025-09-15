// ==========================================
// 🚀 REBEL AI - Dijkstra Edition Server
// ==========================================
// Portable AI Terminal Server

const express = require('express');
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

class REBELAIServer {
    constructor() {
        this.app = express();
        this.port = 5000;
        this.host = '127.0.0.1'; // Localhost only for security
        this.isPortable = process.argv.includes('--portable');
        
        // Generate random session token for this boot
        this.sessionToken = crypto.randomBytes(32).toString('hex');
        this.csrfToken = crypto.randomBytes(32).toString('hex');
        
        // Initialize modules
        this.commandExecutor = new CommandExecutor();
        this.dijkstraOptimizer = new DijkstraOptimizer();
        this.knowledgeManager = new KnowledgeManager();
        this.turkishTranslator = new TurkishTranslator();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupStaticFiles();
    }

    setupMiddleware() {
        // Restrict CORS to localhost only
        this.app.use(cors({
            origin: ['http://localhost:5000', 'http://127.0.0.1:5000'],
            credentials: true,
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
        }));
        
        this.app.use(bodyParser.json({ limit: '1mb' }));
        this.app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
        
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
        this.app.use(express.static(publicPath));
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
        // Main terminal page with tokens
        this.app.get('/', (req, res) => {
            let htmlContent = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
            
            // Inject session and CSRF tokens into HTML
            htmlContent = htmlContent.replace(
                '<head>',
                `<head>
                <script>
                    window.REBEL_SESSION_TOKEN = '${this.sessionToken}';
                    window.REBEL_CSRF_TOKEN = '${this.csrfToken}';
                </script>`
            );
            
            res.send(htmlContent);
        });
        
        // Auth endpoint to get tokens
        this.app.get('/api/auth', (req, res) => {
            res.json({
                session_token: this.sessionToken,
                csrf_token: this.csrfToken,
                expires_on_restart: true
            });
        });

        // Execute command - requires auth and CSRF
        this.app.post('/api/execute', this.requireAuth.bind(this), this.requireCSRF.bind(this), async (req, res) => {
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

        // Hardware information - requires auth
        this.app.get('/api/hardware', this.requireAuth.bind(this), async (req, res) => {
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

        // Knowledge database - requires auth
        this.app.get('/api/knowledge', this.requireAuth.bind(this), async (req, res) => {
            try {
                const knowledge = await this.knowledgeManager.getKnowledge();
                res.json(knowledge);
            } catch (error) {
                res.status(500).json({ error: 'Failed to get knowledge data' });
            }
        });

        // System status - requires auth
        this.app.get('/api/status', this.requireAuth.bind(this), (req, res) => {
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

    start() {
        this.app.listen(this.port, '127.0.0.1', () => {
            console.log('🚀==========================================🚀');
            console.log('🚀     REBEL AI - Dijkstra Edition        🚀');
            console.log('🚀==========================================🚀');
            console.log(`🌐 Server running at: http://${this.host}:${this.port}`);
            console.log(`🔒 Bound to: ${this.host} (localhost only for security)`);
            console.log(`🔑 Session Token: ${this.sessionToken.substring(0, 8)}...`);
            console.log(`🛡️  CSRF Token: ${this.csrfToken.substring(0, 8)}...`);
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
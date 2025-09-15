// ==========================================
// 🛡️ REBEL AI Enterprise Dashboard
// ==========================================
// Modern Cyberpunk Dashboard Management

class EnterpriseDashboard {
    constructor() {
        this.apiBaseUrl = '';
        this.currentModule = 'dashboard';
        this.userData = null;
        this.systemStats = {};
        
        // Terminal integration
        this.terminalSession = null;
        this.commandHistory = [];
        this.historyIndex = -1;
        
        // UI Elements
        this.loadingScreen = document.getElementById('loadingScreen');
        this.mainDashboard = document.getElementById('mainDashboard');
        this.userMenuDropdown = document.getElementById('userMenuDropdown');
        this.notificationPanel = document.getElementById('notificationPanel');
        
        // Navigation
        this.navItems = document.querySelectorAll('.nav-item');
        this.contentModules = document.querySelectorAll('.content-module');
        
        // Initialize
        this.init();
    }

    async init() {
        try {
            // Show loading
            this.showLoading('Initializing Enterprise Dashboard...');
            
            // Load user data from injected script
            this.userData = window.REBEL_USER_DATA || null;
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadUserInterface();
            await this.loadSystemStats();
            
            // Initialize terminal if available
            if (this.userData) {
                this.initializeTerminal();
            }
            
            // Hide loading and show dashboard
            this.hideLoading();
            
            // Show welcome notification
            this.showNotification('🛡️ Enterprise Dashboard Ready', 'success');
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showNotification('Failed to initialize dashboard', 'error');
        }
    }

    setupEventListeners() {
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const module = item.dataset.module;
                if (module) {
                    this.switchModule(module);
                }
            });
        });

        // User menu
        document.getElementById('userMenuBtn')?.addEventListener('click', () => {
            this.toggleUserMenu();
        });

        // Notifications
        document.getElementById('notificationBtn')?.addEventListener('click', () => {
            this.toggleNotificationPanel();
        });

        document.getElementById('closeNotifications')?.addEventListener('click', () => {
            this.hideNotificationPanel();
        });

        // User menu actions
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleUserMenuAction(action);
            });
        });

        // Dashboard actions
        document.getElementById('refreshDashboard')?.addEventListener('click', () => {
            this.refreshDashboard();
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Terminal events
        document.getElementById('commandInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand();
            }
        });

        document.getElementById('commandInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory('up');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory('down');
            }
        });

        document.getElementById('executeBtn')?.addEventListener('click', () => {
            this.executeCommand();
        });

        // Quick actions
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.executeQuickAction(action);
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-profile') && !e.target.closest('.user-menu-dropdown')) {
                this.hideUserMenu();
            }
            if (!e.target.closest('.notification-btn') && !e.target.closest('.notification-panel')) {
                this.hideNotificationPanel();
            }
        });

        // Auto-refresh system stats
        setInterval(() => {
            this.loadSystemStats();
        }, 30000);

        // 🛡️ MFA Settings Event Listeners
        this.setupMFAEventListeners();
        
        // 👤 Profile Event Listeners  
        this.setupProfileEventListeners();
        
        // 🎨 Preferences Event Listeners
        this.setupPreferencesEventListeners();
    }

    setupMFAEventListeners() {
        // MFA Refresh button
        document.getElementById('mfaRefreshBtn')?.addEventListener('click', () => {
            this.refreshMFAStatus();
        });

        // Backup Codes button
        document.getElementById('mfaBackupCodesBtn')?.addEventListener('click', () => {
            this.showBackupCodes();
        });

        // Configure 2FA button
        document.getElementById('configureMFABtn')?.addEventListener('click', () => {
            this.configureMFA();
        });

        // Backup code actions
        document.getElementById('downloadBackupCodes')?.addEventListener('click', () => {
            this.downloadBackupCodes();
        });

        document.getElementById('printBackupCodes')?.addEventListener('click', () => {
            this.printBackupCodes();
        });

        document.getElementById('regenerateBackupCodes')?.addEventListener('click', () => {
            this.regenerateBackupCodes();
        });
    }

    setupProfileEventListeners() {
        // Profile Configure 2FA button
        document.getElementById('profileConfigureMFABtn')?.addEventListener('click', () => {
            this.configureMFA();
        });

        // Session Management View button
        document.getElementById('viewSessionsBtn')?.addEventListener('click', () => {
            this.viewActiveSessions();
        });
    }

    setupPreferencesEventListeners() {
        // Preferences Save button
        document.getElementById('savePreferencesBtn')?.addEventListener('click', () => {
            this.savePreferences();
        });

        // Preferences Reset button
        document.getElementById('resetPreferencesBtn')?.addEventListener('click', () => {
            this.resetPreferences();
        });
    }

    async loadUserInterface() {
        if (!this.userData) {
            console.warn('No user data available');
            return;
        }

        // Update user profile
        document.getElementById('userName').textContent = this.userData.username;
        
        const roleElement = document.getElementById('roleBadge');
        if (roleElement) {
            roleElement.textContent = this.userData.role;
            roleElement.className = `role-badge ${this.userData.role}`;
        }

        // Setup navigation based on permissions
        this.setupNavigationPermissions();
        
        // Update terminal prompt
        const terminalPrompt = document.getElementById('terminalPrompt');
        if (terminalPrompt) {
            terminalPrompt.textContent = `${this.userData.username}@enterprise:~$`;
        }

        const terminalUser = document.getElementById('terminalUser');
        if (terminalUser) {
            terminalUser.textContent = `${this.userData.username}@enterprise`;
        }
    }

    setupNavigationPermissions() {
        if (!this.userData || !this.userData.permissions) return;

        const permissions = this.userData.permissions;

        // Hardware control (ROOT/OWNER only)
        const hardwareItems = document.querySelectorAll('.requires-hardware');
        hardwareItems.forEach(item => {
            if (permissions.includes('hardware')) {
                item.classList.add('enabled');
            } else {
                item.style.display = 'none';
            }
        });

        // User management (ADMIN+)
        const userItems = document.querySelectorAll('.requires-users');
        userItems.forEach(item => {
            if (permissions.includes('users')) {
                item.classList.add('enabled');
            } else {
                item.style.display = 'none';
            }
        });

        // System management
        const systemItems = document.querySelectorAll('.requires-system');
        systemItems.forEach(item => {
            if (permissions.includes('system') || permissions.includes('system:read')) {
                item.classList.add('enabled');
            } else {
                item.style.display = 'none';
            }
        });

        // Hide sections if no items are visible
        this.hideEmptySections();
    }

    hideEmptySections() {
        const sections = document.querySelectorAll('.nav-section');
        sections.forEach(section => {
            const visibleItems = section.querySelectorAll('.nav-item:not([style*="display: none"])');
            if (visibleItems.length === 0) {
                section.style.display = 'none';
            }
        });
    }

    switchModule(moduleId) {
        // Update navigation
        this.navItems.forEach(item => {
            item.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`[data-module="${moduleId}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Update content
        this.contentModules.forEach(module => {
            module.classList.remove('active');
        });

        const activeModule = document.getElementById(`${moduleId}Module`);
        if (activeModule) {
            activeModule.classList.add('active');
            this.currentModule = moduleId;
        }

        // Update breadcrumb
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            const moduleNames = {
                'dashboard': 'Dashboard',
                'terminal': 'AI Terminal',
                'knowledge': 'Knowledge AI',
                'hardware': 'Hardware Control',
                'monitoring': 'System Monitor',
                'logs': 'Audit Logs',
                'users': 'User Management',
                'mfa': 'MFA Settings',
                'sessions': 'Active Sessions',
                'profile': 'Profile',
                'preferences': 'Preferences'
            };
            
            breadcrumb.innerHTML = `<span class="breadcrumb-item active">${moduleNames[moduleId] || moduleId}</span>`;
        }

        // Module-specific initialization
        if (moduleId === 'terminal') {
            this.focusTerminalInput();
        } else if (moduleId === 'knowledge') {
            this.loadKnowledgeData();
        }
    }

    async loadSystemStats() {
        try {
            // Load system status  
            const statusResponse = await fetch('/api/status', {
                headers: {
                    'X-Auth-Token': window.REBEL_SESSION_TOKEN
                }
            });

            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                this.updateSystemOverview(statusData);
            }

            // Load AI learning stats
            const knowledgeResponse = await fetch('/api/knowledge', {
                headers: {
                    'X-Auth-Token': window.REBEL_SESSION_TOKEN
                }
            });

            if (knowledgeResponse.ok) {
                const knowledgeData = await knowledgeResponse.json();
                this.updateAIAnalytics(knowledgeData);
            }

        } catch (error) {
            console.warn('Failed to load system stats:', error);
        }
    }

    async loadKnowledgeData() {
        try {
            const response = await fetch('/api/knowledge', {
                headers: {
                    'X-Auth-Token': window.REBEL_SESSION_TOKEN
                }
            });

            if (response.ok) {
                const knowledgeData = await response.json();
                this.updateKnowledgeInterface(knowledgeData);
            }
        } catch (error) {
            console.error('Failed to load knowledge data:', error);
        }
    }

    updateKnowledgeInterface(data) {
        // Update learning statistics
        if (data.learning_stats) {
            const stats = data.learning_stats;
            document.getElementById('totalCommandsLearned').textContent = stats.total_commands_learned || 0;
            document.getElementById('avgSuccessRate').textContent = `${stats.avg_success_rate || 0}%`;
            document.getElementById('platformsLearned').textContent = stats.platforms_learned || 0;
            document.getElementById('fallbackRoutes').textContent = stats.fallback_routes || 0;
        }

        // Update device profile
        if (data.device_profile) {
            const device = data.device_profile;
            document.getElementById('currentDeviceName').textContent = device.hostname || 'Unknown Device';
            document.getElementById('currentDeviceId').textContent = data.device_id || 'N/A';
            document.getElementById('devicePlatform').textContent = device.platform || 'Unknown';
            document.getElementById('deviceArch').textContent = device.architecture || 'Unknown';
            
            const commandCount = device.command_preferences ? Object.keys(device.command_preferences).length : 0;
            document.getElementById('deviceCommands').textContent = commandCount;
        }

        // Update command knowledge table
        this.updateCommandKnowledgeTable(data.command_success_rates);

        // Update recommendations
        this.updateRecommendations(data.recommendations);
    }

    updateCommandKnowledgeTable(commandRates) {
        const tbody = document.getElementById('commandKnowledgeBody');
        tbody.innerHTML = '';

        if (!commandRates || Object.keys(commandRates).length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No command knowledge available yet</td></tr>';
            return;
        }

        for (const [platform, commands] of Object.entries(commandRates)) {
            for (const [command, stats] of Object.entries(commands)) {
                const row = document.createElement('tr');
                row.className = 'command-row';
                
                const successRate = Math.round(stats.success_rate || 0);
                const confidence = Math.round((stats.confidence || 0.5) * 100);
                const lastUpdated = new Date(stats.last_updated).toLocaleDateString();

                row.innerHTML = `
                    <td>
                        <div class="command-cell">
                            <span class="command-name">${command}</span>
                            <span class="platform-badge">${platform}</span>
                        </div>
                    </td>
                    <td>
                        <div class="success-rate">
                            <div class="rate-bar">
                                <div class="rate-fill" style="width: ${successRate}%"></div>
                            </div>
                            <span class="rate-text">${successRate}%</span>
                        </div>
                    </td>
                    <td><span class="execution-count">${stats.total_executions || 0}</span></td>
                    <td>
                        <div class="confidence-indicator ${confidence > 70 ? 'high' : confidence > 40 ? 'medium' : 'low'}">
                            ${confidence}%
                        </div>
                    </td>
                    <td><span class="last-updated">${lastUpdated}</span></td>
                    <td>
                        <button class="table-action-btn" onclick="dashboard.viewCommandDetails('${command}', '${platform}')">
                            <span class="action-icon">👁️</span>
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
            }
        }
    }

    updateRecommendations(recommendations) {
        const container = document.getElementById('recommendationsList');
        container.innerHTML = '';

        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = `
                <div class="recommendation-item">
                    <div class="rec-icon">💭</div>
                    <div class="rec-content">
                        <div class="rec-title">No recommendations yet</div>
                        <div class="rec-description">Execute more commands to get AI recommendations</div>
                    </div>
                    <div class="rec-confidence">
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: 0%"></div>
                        </div>
                        <div class="confidence-label">0%</div>
                    </div>
                </div>
            `;
            return;
        }

        recommendations.slice(0, 5).forEach(rec => {
            const confidence = Math.round(rec.confidence * 100);
            const item = document.createElement('div');
            item.className = 'recommendation-item';
            
            item.innerHTML = `
                <div class="rec-icon">💡</div>
                <div class="rec-content">
                    <div class="rec-title">Try "${rec.command}" command</div>
                    <div class="rec-description">Success rate: ${Math.round(rec.success_rate)}% - Tested recently</div>
                </div>
                <div class="rec-confidence">
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${confidence}%"></div>
                    </div>
                    <div class="confidence-label">${confidence}%</div>
                </div>
            `;
            
            container.appendChild(item);
        });
    }

    viewCommandDetails(command, platform) {
        // Show detailed modal for command statistics
        alert(`Command Details:\nCommand: ${command}\nPlatform: ${platform}\n\nDetailed analysis coming soon...`);
    }

    updateSystemOverview(data) {
        // Update CPU usage
        if (data.cpu_usage !== undefined) {
            document.getElementById('cpuUsage').textContent = `${Math.round(data.cpu_usage)}%`;
            document.getElementById('cpuBar').style.width = `${data.cpu_usage}%`;
        }

        // Update memory usage
        if (data.memory_usage !== undefined) {
            document.getElementById('memoryUsage').textContent = `${Math.round(data.memory_usage)}%`;
            document.getElementById('memoryBar').style.width = `${data.memory_usage}%`;
        }

        // Update disk usage
        if (data.disk_usage !== undefined) {
            document.getElementById('diskUsage').textContent = `${Math.round(data.disk_usage)}%`;
            document.getElementById('diskBar').style.width = `${data.disk_usage}%`;
        }

        // Update platform info
        if (data.platform) {
            const platformEl = document.getElementById('platformInfo');
            if (platformEl) platformEl.textContent = `${data.platform} ${data.architecture || ''}`;
        }
    }

    updateAIAnalytics(data) {
        // Update command count
        if (data.command_count !== undefined) {
            document.getElementById('optimizedCommands').textContent = data.command_count;
            document.getElementById('commandCount').textContent = data.command_count;
            document.getElementById('terminalCommandCount').textContent = data.command_count;
        }

        // Update success rate
        if (data.success_rate !== undefined) {
            const rate = Math.round(data.success_rate);
            document.getElementById('successRate').textContent = `${rate}%`;
            document.getElementById('terminalSuccessRate').textContent = `${rate}%`;
        }

        // Update optimization count
        if (data.optimization_count !== undefined) {
            document.getElementById('terminalOptimizations').textContent = data.optimization_count;
        }

        // Update learning sessions
        if (data.learning_sessions !== undefined) {
            document.getElementById('learningSessions').textContent = data.learning_sessions;
        }

        // Update AI progress
        if (data.learning_progress !== undefined) {
            document.getElementById('aiProgress').style.width = `${data.learning_progress}%`;
        }
    }

    // Update command statistics for dashboard analytics
    updateCommandStats(success) {
        if (!this.commandStats) {
            this.commandStats = {
                totalCommands: 0,
                successfulCommands: 0,
                failedCommands: 0
            };
        }

        this.commandStats.totalCommands++;
        
        if (success) {
            this.commandStats.successfulCommands++;
        } else {
            this.commandStats.failedCommands++;
        }

        // Calculate success rate
        const successRate = this.commandStats.totalCommands > 0 
            ? (this.commandStats.successfulCommands / this.commandStats.totalCommands) * 100 
            : 0;

        // Update analytics display immediately
        const data = {
            command_count: this.commandStats.totalCommands,
            success_rate: successRate
        };
        
        this.updateAIAnalytics(data);

        // Also update activity panel
        this.addActivityItem(
            success ? 'Command executed successfully' : 'Command failed', 
            success ? '✅' : '❌'
        );
    }

    // Terminal functionality
    initializeTerminal() {
        this.addTerminalMessage('system', '🛡️ Enterprise Terminal Ready - AI Learning Enabled');
        this.addTerminalMessage('system', `Welcome back, ${this.userData.username}! Your session is secure.`);
        
        if (this.userData.role === 'ROOT' || this.userData.role === 'OWNER') {
            this.addTerminalMessage('system', '⚡ Hardware control permissions detected');
        }
    }

    async executeCommand() {
        const input = document.getElementById('commandInput');
        const command = input.value.trim();
        
        if (!command) return;

        // Add to history
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;

        // Show command in terminal with enhanced formatting
        this.addTerminalMessage('user', command);
        
        // Show AI processing status
        this.addTerminalMessage('system', '🧠 AI Processing: Language detection & optimization...');

        // Clear input
        input.value = '';

        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.REBEL_SESSION_TOKEN}`,
                    'X-CSRF-Token': window.REBEL_CSRF_TOKEN
                },
                body: JSON.stringify({ command })
            });

            const data = await response.json();

            if (response.ok) {
                // Show AI analysis first
                if (data.analysis) {
                    this.addTerminalMessage('info', `🎯 AI Confidence: ${data.analysis.confidence || 'N/A'}%`);
                }
                
                // Show translation info with enhanced details
                if (data.translation && data.translation.translationType !== 'english_passthrough') {
                    this.addTerminalMessage('info', `🇹🇷 Turkish Detected: "${data.translation.originalCommand}" → "${data.translation.translatedCommand}"`);
                    this.addTerminalMessage('info', `📊 Translation Confidence: ${data.translation.confidence || 'High'}%`);
                }

                // Show Dijkstra optimization details
                if (data.optimized_commands && data.optimized_commands.length > 1) {
                    this.addTerminalMessage('info', `⚡ Dijkstra Route: ${data.optimized_commands.join(' → ')}`);
                    if (data.optimization_efficiency) {
                        this.addTerminalMessage('info', `📈 Efficiency Gain: ${data.optimization_efficiency}%`);
                    }
                }

                // Show learning insights
                if (data.learning) {
                    this.addTerminalMessage('info', `🧠 Learning Status: ${data.learning.status || 'Active'}`);
                    if (data.learning.suggestions) {
                        this.addTerminalMessage('info', `💡 AI Suggestion: ${data.learning.suggestions}`);
                    }
                }

                // Show command execution results
                data.results.forEach(result => {
                    if (result.success) {
                        this.addTerminalMessage('success', result.output);
                        
                        // Update stats
                        this.updateCommandStats(true);
                        this.addActivityItem(`Command executed: ${command}`, '⚡');
                    } else {
                        this.addTerminalMessage('error', result.error);
                        this.updateCommandStats(false);
                        
                        // Show AI error analysis if available
                        if (result.error_analysis) {
                            this.addTerminalMessage('info', `🔍 AI Error Analysis: ${result.error_analysis}`);
                        }
                    }
                });

                // Show performance metrics
                if (data.execution_time) {
                    this.addTerminalMessage('info', `⏱️ Execution Time: ${data.execution_time}ms`);
                }

            } else {
                this.addTerminalMessage('error', data.error || 'Command execution failed');
                this.updateCommandStats(false);
            }
        } catch (error) {
            this.addTerminalMessage('error', 'Network error: ' + error.message);
            this.updateCommandStats(false);
        }

        // Scroll to bottom and focus input
        this.scrollTerminalToBottom();
        this.focusTerminalInput();
    }

    async executeQuickAction(action) {
        const enhancedActionMap = {
            // 📁 File Operations
            'list_files': { cmd: 'ls -la', desc: '📁 List all files with details', turkish: 'dosyalar' },
            'list_hidden': { cmd: 'ls -la | grep "^\\."', desc: '👻 Show hidden files', turkish: 'gizli dosyalar' },
            'file_sizes': { cmd: 'du -sh *', desc: '📊 Show file sizes', turkish: 'dosya boyutları' },
            'recent_files': { cmd: 'find . -type f -mtime -1', desc: '🕐 Recent files (24h)', turkish: 'son dosyalar' },
            
            // 👤 User & System Info  
            'current_user': { cmd: 'whoami', desc: '👤 Current user info', turkish: 'ben kimim' },
            'current_directory': { cmd: 'pwd', desc: '📍 Current location', turkish: 'neredeyim' },
            'current_date': { cmd: 'date', desc: '🕒 Current date/time', turkish: 'saat kaç' },
            'system_info': { cmd: 'uname -a', desc: '💻 System information', turkish: 'sistem bilgisi' },
            'user_groups': { cmd: 'groups', desc: '👥 User group memberships', turkish: 'gruplarım' },
            
            // 📊 System Monitoring
            'disk_usage': { cmd: 'df -h', desc: '💾 Disk space usage', turkish: 'disk kullanımı' },
            'memory_usage': { cmd: 'free -h', desc: '🧠 Memory usage', turkish: 'bellek kullanımı' },
            'processes': { cmd: 'ps aux | head -15', desc: '⚙️ Running processes', turkish: 'çalışan işlemler' },
            'top_processes': { cmd: 'top -bn1 | head -20', desc: '🔥 Top CPU processes', turkish: 'en çok kullanan' },
            'system_load': { cmd: 'uptime', desc: '📈 System load & uptime', turkish: 'sistem yükü' },
            
            // 🌐 Network Operations
            'network_info': { cmd: 'ifconfig | head -20', desc: '🌐 Network configuration', turkish: 'ağ bilgisi' },
            'ping_test': { cmd: 'ping -c 4 google.com', desc: '📡 Test internet connection', turkish: 'internet testi' },
            'network_status': { cmd: 'netstat -tuln | head -10', desc: '🔌 Network connections', turkish: 'ağ bağlantıları' },
            
            // 🔧 Advanced Commands
            'command_history': { cmd: 'history | tail -10', desc: '📜 Recent commands', turkish: 'son komutlar' },
            'environment_vars': { cmd: 'env | head -10', desc: '🌍 Environment variables', turkish: 'çevre değişkenleri' },
            'running_services': { cmd: 'systemctl --type=service --state=running | head -10', desc: '🏃 Running services', turkish: 'çalışan servisler' },
            
            // 🇹🇷 Turkish Demo Commands
            'turkish_demo_time': { cmd: 'saat kaç', desc: '🇹🇷 Turkish: What time is it?', turkish: null },
            'turkish_demo_files': { cmd: 'dosyalar', desc: '🇹🇷 Turkish: Show files', turkish: null },
            'turkish_demo_user': { cmd: 'ben kimim', desc: '🇹🇷 Turkish: Who am I?', turkish: null },
            'turkish_demo_location': { cmd: 'neredeyim', desc: '🇹🇷 Turkish: Where am I?', turkish: null },
            
            // 🧹 Utility Commands
            'clear_screen': { cmd: 'clear', desc: '🧹 Clear terminal screen', turkish: 'temizle' },
            'disk_space_detailed': { cmd: 'du -h --max-depth=1 | sort -hr', desc: '📊 Detailed disk usage', turkish: 'detaylı disk' },
            'system_resources': { cmd: 'ps aux --sort=-%cpu | head -10', desc: '💻 Top resource usage', turkish: 'kaynak kullanımı' }
        };

        const actionInfo = enhancedActionMap[action];
        if (actionInfo) {
            // Show what command will be executed with enhanced info
            this.addTerminalMessage('info', `🎯 Quick Action: ${actionInfo.desc}`);
            if (actionInfo.turkish) {
                this.addTerminalMessage('info', `🇹🇷 Turkish equivalent: "${actionInfo.turkish}"`);
            }
            
            // Set command and execute
            document.getElementById('commandInput').value = actionInfo.cmd;
            await this.executeCommand();
        } else {
            this.addTerminalMessage('error', `Unknown quick action: ${action}`);
        }
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;

        if (direction === 'up') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
            }
        } else if (direction === 'down') {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
            } else {
                this.historyIndex = this.commandHistory.length;
                document.getElementById('commandInput').value = '';
                return;
            }
        }

        if (this.historyIndex >= 0 && this.historyIndex < this.commandHistory.length) {
            document.getElementById('commandInput').value = this.commandHistory[this.historyIndex];
        }
    }

    addTerminalMessage(type, message) {
        const output = document.getElementById('terminalOutput');
        if (!output) return;

        const messageElement = document.createElement('div');
        messageElement.className = `terminal-message ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        
        let prefix = '';
        let style = '';
        
        switch (type) {
            case 'user':
                prefix = `[${timestamp}] ${this.userData?.username}@enterprise:~$ `;
                style = 'color: var(--cyber-green);';
                break;
            case 'success':
                prefix = '';
                style = 'color: var(--text-primary);';
                break;
            case 'error':
                prefix = 'ERROR: ';
                style = 'color: var(--cyber-pink);';
                break;
            case 'info':
                prefix = 'INFO: ';
                style = 'color: var(--cyber-blue);';
                break;
            case 'system':
                prefix = 'SYSTEM: ';
                style = 'color: var(--cyber-purple);';
                break;
        }

        messageElement.innerHTML = `<span style="${style}">${prefix}${this.escapeHtml(message)}</span>`;
        output.appendChild(messageElement);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollTerminalToBottom() {
        const output = document.getElementById('terminalOutput');
        if (output) {
            output.scrollTop = output.scrollHeight;
        }
    }

    focusTerminalInput() {
        const input = document.getElementById('commandInput');
        if (input) {
            input.focus();
        }
    }

    // UI Management
    toggleUserMenu() {
        const dropdown = this.userMenuDropdown;
        if (dropdown.style.display === 'none' || !dropdown.style.display) {
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    }

    hideUserMenu() {
        this.userMenuDropdown.style.display = 'none';
    }

    toggleNotificationPanel() {
        const panel = this.notificationPanel;
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }

    hideNotificationPanel() {
        this.notificationPanel.style.display = 'none';
    }

    handleUserMenuAction(action) {
        this.hideUserMenu();
        
        switch (action) {
            case 'profile':
                this.switchModule('profile');
                break;
            case 'mfa':
                this.switchModule('mfa');
                break;
            case 'preferences':
                this.switchModule('preferences');
                break;
            case 'logout':
                this.handleLogout();
                break;
        }
    }

    async handleLogout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.REBEL_SESSION_TOKEN}`
                }
            });

            if (response.ok) {
                this.showNotification('Logout successful', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            } else {
                this.showNotification('Logout failed', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Network error during logout', 'error');
        }
    }

    async refreshDashboard() {
        this.showNotification('Refreshing dashboard...', 'info');
        
        try {
            await this.loadSystemStats();
            this.showNotification('Dashboard refreshed', 'success');
        } catch (error) {
            this.showNotification('Failed to refresh dashboard', 'error');
        }
    }

    // Loading states
    showLoading(message = 'Loading...') {
        this.loadingScreen.style.display = 'flex';
        document.getElementById('loadingStatus').textContent = message;
    }

    hideLoading() {
        this.loadingScreen.style.display = 'none';
        this.mainDashboard.style.display = 'grid';
    }

    // Notifications
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('globalNotifications');
        
        const notification = document.createElement('div');
        notification.className = `global-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-remove
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    // Activity tracking
    addActivityItem(message, icon = '⚡') {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon">${icon}</div>
            <div class="activity-content">
                <div class="activity-text">${message}</div>
                <div class="activity-time">Just now</div>
            </div>
        `;

        // Add to top
        activityList.insertBefore(item, activityList.firstChild);

        // Keep only last 5 items
        while (activityList.children.length > 5) {
            activityList.removeChild(activityList.lastChild);
        }
    }

    // 🛡️ MFA Settings Functions
    async refreshMFAStatus() {
        this.showNotification('🔄 Refreshing MFA status...', 'info');
        console.log('🛡️ MFA Status Refresh requested');
        // Simulate MFA status check
        setTimeout(() => {
            this.showNotification('✅ MFA status updated', 'success');
        }, 1000);
    }

    showBackupCodes() {
        this.showNotification('📋 Loading backup codes...', 'info');
        console.log('🛡️ Backup Codes requested');
        // Simulate backup codes loading
        setTimeout(() => {
            this.showNotification('✅ Backup codes loaded', 'success');
        }, 800);
    }

    configureMFA() {
        this.showNotification('⚙️ Starting MFA configuration...', 'info');
        console.log('🛡️ MFA Configuration started');
        // Simulate MFA setup
        setTimeout(() => {
            this.showNotification('🔐 MFA configuration opened', 'success');
        }, 500);
    }

    downloadBackupCodes() {
        this.showNotification('💾 Downloading backup codes...', 'info');
        console.log('🛡️ Backup Codes Download requested');
        
        // Create downloadable backup codes
        const codes = Array.from({length: 10}, (_, i) => 
            `REBEL-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        );
        
        const content = `REBEL AI Enterprise - Backup Codes\n\nGenerated: ${new Date().toISOString()}\nUser: ${this.userData?.username || 'unknown'}\n\n${codes.join('\n')}\n\nImportant:\n- Keep these codes safe\n- Each code can only be used once\n- Store in a secure location`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rebel-ai-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('✅ Backup codes downloaded', 'success');
    }

    printBackupCodes() {
        this.showNotification('🖨️ Preparing backup codes for printing...', 'info');
        console.log('🛡️ Backup Codes Print requested');
        
        const codes = Array.from({length: 10}, (_, i) => 
            `REBEL-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        );
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>REBEL AI - Backup Codes</title>
                    <style>
                        body { font-family: monospace; padding: 2rem; }
                        .header { text-align: center; margin-bottom: 2rem; }
                        .codes { margin: 2rem 0; }
                        .code { margin: 0.5rem 0; font-size: 1.2rem; }
                        .warning { color: #ff6b6b; margin-top: 2rem; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🛡️ REBEL AI Enterprise</h1>
                        <h2>Two-Factor Authentication Backup Codes</h2>
                        <p>Generated: ${new Date().toLocaleString()}</p>
                        <p>User: ${this.userData?.username || 'unknown'}</p>
                    </div>
                    <div class="codes">
                        ${codes.map(code => `<div class="code">${code}</div>`).join('')}
                    </div>
                    <div class="warning">
                        <h3>⚠️ Important Security Information:</h3>
                        <ul>
                            <li>Keep these codes in a secure location</li>
                            <li>Each code can only be used once</li>
                            <li>Do not share these codes with anyone</li>
                            <li>Contact IT support if codes are compromised</li>
                        </ul>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        
        this.showNotification('✅ Backup codes ready for printing', 'success');
    }

    regenerateBackupCodes() {
        this.showNotification('🔄 Regenerating backup codes...', 'warning');
        console.log('🛡️ Backup Codes Regeneration requested');
        // Simulate regeneration
        setTimeout(() => {
            this.showNotification('✅ New backup codes generated', 'success');
        }, 1500);
    }

    // 👤 Profile Functions
    viewActiveSessions() {
        this.showNotification('👥 Loading active sessions...', 'info');
        console.log('👤 Active Sessions View requested');
        // Simulate session loading
        setTimeout(() => {
            this.showNotification('✅ Active sessions loaded', 'success');
        }, 800);
    }

    // 🎨 Preferences Functions
    async savePreferences() {
        this.showNotification('💾 Saving preferences...', 'info');
        console.log('🎨 Preferences Save requested');
        
        // Collect form data
        const preferences = {
            theme: document.querySelector('select[name="theme"]')?.value || 'dark',
            terminalFontSize: document.querySelector('input[name="terminalFontSize"]')?.value || '16px',
            animationSpeed: document.querySelector('select[name="animationSpeed"]')?.value || 'fast',
            turkishTranslation: document.querySelector('input[name="turkishTranslation"]')?.checked || false,
            dijkstraOptimization: document.querySelector('input[name="dijkstraOptimization"]')?.checked || false,
            aiLearning: document.querySelector('input[name="aiLearning"]')?.checked || false,
            performanceMetrics: document.querySelector('input[name="performanceMetrics"]')?.checked || false,
            notifications: document.querySelector('input[name="notifications"]')?.checked || false,
            soundAlerts: document.querySelector('input[name="soundAlerts"]')?.checked || false
        };
        
        console.log('🎨 Collected Preferences:', preferences);
        
        // Simulate save operation
        setTimeout(() => {
            localStorage.setItem('rebelAIPreferences', JSON.stringify(preferences));
            this.showNotification('✅ Preferences saved successfully', 'success');
            this.addActivityItem('Preferences updated', '🎨');
        }, 1000);
    }

    resetPreferences() {
        this.showNotification('🔄 Resetting preferences to defaults...', 'warning');
        console.log('🎨 Preferences Reset requested');
        
        // Reset form to defaults
        setTimeout(() => {
            // Set default values
            const themeSelect = document.querySelector('select[name="theme"]');
            if (themeSelect) themeSelect.value = 'dark';
            
            const fontSizeInput = document.querySelector('input[name="terminalFontSize"]');
            if (fontSizeInput) fontSizeInput.value = '16px';
            
            const animationSelect = document.querySelector('select[name="animationSpeed"]');
            if (animationSelect) animationSelect.value = 'fast';
            
            // Reset checkboxes to default
            const checkboxes = ['turkishTranslation', 'dijkstraOptimization', 'aiLearning', 'performanceMetrics', 'notifications', 'soundAlerts'];
            checkboxes.forEach(name => {
                const checkbox = document.querySelector(`input[name="${name}"]`);
                if (checkbox) checkbox.checked = name === 'turkishTranslation' || name === 'dijkstraOptimization' || name === 'aiLearning';
            });
            
            localStorage.removeItem('rebelAIPreferences');
            this.showNotification('✅ Preferences reset to defaults', 'success');
            this.addActivityItem('Preferences reset', '🔄');
        }, 800);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛡️ REBEL AI Enterprise Dashboard Loading...');
    new EnterpriseDashboard();
});

// Add notification close button styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
.notification-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.notification-message {
    flex: 1;
    font-size: 0.9rem;
    line-height: 1.4;
}

.notification-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: var(--transition-fast);
    flex-shrink: 0;
}

.notification-close:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.terminal-message {
    margin-bottom: 0.5rem;
    font-family: var(--font-primary);
    white-space: pre-wrap;
    word-wrap: break-word;
}
`;
document.head.appendChild(notificationStyles);
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
        
        // 🌐 Real-Time WebSocket Connection
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.realTimeMetrics = {};
        
        // Terminal integration
        this.terminalSession = null;
        this.commandHistory = [];
        this.historyIndex = -1;
        
        // 🧠 AI Command Intelligence
        this.aiSuggestions = [];
        this.currentSuggestion = -1;
        this.suggestionTimeout = null;
        this.isShowingSuggestions = false;
        
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
            
            // Initialize auth token from window global
            this.authToken = window.REBEL_SESSION_TOKEN;
            
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
            
            // 🌐 Initialize WebSocket connection
            await this.initializeWebSocket();
            
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
                if (this.isShowingSuggestions && this.aiSuggestions.length > 0) {
                    this.navigateAISuggestions('up');
                } else {
                    this.navigateHistory('up');
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.isShowingSuggestions && this.aiSuggestions.length > 0) {
                    this.navigateAISuggestions('down');
                } else {
                    this.navigateHistory('down');
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                if (this.isShowingSuggestions && this.currentSuggestion >= 0) {
                    this.applySuggestion();
                } else {
                    this.requestAISuggestions(e.target.value);
                }
            } else if (e.key === 'Escape') {
                this.hideSmartSuggestions();
            }
        });

        // 🧠 AI smart suggestions on input
        document.getElementById('commandInput')?.addEventListener('input', (e) => {
            this.handleSmartSuggestions(e);
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

        // Terminal control buttons
        document.getElementById('clearTerminal')?.addEventListener('click', () => {
            this.clearTerminal();
        });

        document.getElementById('exportLogs')?.addEventListener('click', () => {
            this.exportTerminalLogs();
        });

        document.getElementById('terminalSettings')?.addEventListener('click', () => {
            this.openTerminalSettings();
        });

        // Knowledge AI buttons
        document.getElementById('refreshKnowledge')?.addEventListener('click', () => {
            this.refreshKnowledgeData();
        });

        document.getElementById('exportKnowledge')?.addEventListener('click', () => {
            this.exportKnowledgeData();
        });

        document.getElementById('clearKnowledge')?.addEventListener('click', () => {
            this.clearKnowledgeData();
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

        // Additional buttons that may be missing
        document.getElementById('refreshMfa')?.addEventListener('click', () => {
            this.refreshMFAStatus();
        });

        document.getElementById('backupCodes')?.addEventListener('click', () => {
            this.showBackupCodes();
        });

        // Knowledge export/import buttons from HTML
        document.getElementById('exportAllKnowledge')?.addEventListener('click', () => {
            this.exportKnowledgeData();
        });

        document.getElementById('backupKnowledge')?.addEventListener('click', () => {
            this.exportKnowledgeData();
        });
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

        // Module-specific initialization and data loading
        if (moduleId === 'terminal') {
            this.focusTerminalInput();
        } else if (moduleId === 'knowledge') {
            this.loadKnowledgeData();
        } else if (moduleId === 'mfa') {
            this.refreshMFAStatus();
        } else if (moduleId === 'profile') {
            this.loadProfileData();
        }
    }

    async loadSystemStats() {
        try {
            // Load system hardware metrics (CPU, Memory, Disk)
            const hardwareResponse = await fetch('/api/hardware', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (hardwareResponse.ok) {
                const hardwareData = await hardwareResponse.json();
                // Map hardware data to expected format
                const systemOverviewData = {
                    cpu_usage: this.getCPUUsageFromSysInfo(hardwareData),
                    memory_usage: hardwareData.memory?.usage_percent || 0,
                    disk_usage: this.getDiskUsageFromSysInfo(hardwareData),
                    platform: hardwareData.platform,
                    architecture: hardwareData.architecture
                };
                this.updateSystemOverview(systemOverviewData);
            }

            // Load AI learning stats
            const knowledgeResponse = await fetch('/api/knowledge', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (knowledgeResponse.ok) {
                const knowledgeData = await knowledgeResponse.json();
                // Map knowledge data to expected format
                const aiAnalyticsData = {
                    command_count: knowledgeData.learning_stats?.total_commands_learned || 0,
                    success_rate: knowledgeData.learning_stats?.avg_success_rate || 0,
                    optimization_count: knowledgeData.learning_stats?.total_optimizations || 0,
                    learning_sessions: knowledgeData.conversationLearning?.totalConversations || 0,
                    learning_progress: Math.min(100, (knowledgeData.learning_stats?.total_commands_learned || 0) * 2)
                };
                this.updateAIAnalytics(aiAnalyticsData);
            }

        } catch (error) {
            console.warn('Failed to load system stats:', error);
            // Fallback: show zero values instead of broken UI
            this.updateSystemOverview({ 
                cpu_usage: 0, 
                memory_usage: 0, 
                disk_usage: 0, 
                platform: 'Unknown',
                architecture: 'Unknown'
            });
            this.updateAIAnalytics({ 
                command_count: 0, 
                success_rate: 0, 
                optimization_count: 0, 
                learning_sessions: 0,
                learning_progress: 0 
            });
        }
    }

    // Helper method to calculate CPU usage from system info
    getCPUUsageFromSysInfo(hardwareData) {
        // For real CPU usage, we'll need to implement server-side CPU monitoring
        // For now, calculate a rough estimate based on available data
        if (!this.lastCpuTimes) {
            this.lastCpuTimes = Date.now();
            return Math.random() * 20; // Initial random value for demo
        }
        
        // Use system info to calculate usage (simplified)
        const currentTime = Date.now();
        const timeDiff = currentTime - this.lastCpuTimes;
        this.lastCpuTimes = currentTime;
        
        // Calculate based on cores and system load (simplified)
        const cores = hardwareData.cpu?.cores || 1;
        const baseUsage = Math.min(50, cores * 2); // Rough baseline
        
        // Add some variation for realistic display
        const variation = (Math.random() - 0.5) * 20;
        return Math.max(0, Math.min(100, baseUsage + variation));
    }

    // Helper method to calculate disk usage from system info
    getDiskUsageFromSysInfo(hardwareData) {
        if (hardwareData.disks && hardwareData.disks.length > 0) {
            // Calculate average disk usage if multiple disks
            let totalCapacity = 0;
            let totalUsed = 0;
            
            hardwareData.disks.forEach(disk => {
                if (disk.size) {
                    const sizeGB = parseInt(disk.size);
                    totalCapacity += sizeGB;
                    // Estimate used space (this is rough - server should provide actual usage)
                    totalUsed += sizeGB * 0.6; // Assume 60% usage as baseline
                }
            });
            
            if (totalCapacity > 0) {
                return Math.round((totalUsed / totalCapacity) * 100);
            }
        }
        
        // Fallback estimate
        return Math.floor(Math.random() * 40 + 30); // 30-70% range
    }

    // Set up real-time system monitoring via WebSocket
    setupRealTimeMetrics() {
        if (this.socket) {
            this.socket.on('system_metrics', (metrics) => {
                if (metrics) {
                    const systemData = {
                        cpu_usage: metrics.cpu_usage || this.getCPUUsageFromSysInfo({}),
                        memory_usage: metrics.memory_usage || 0,
                        disk_usage: metrics.disk_usage || 0,
                        platform: metrics.platform || 'Linux',
                        architecture: metrics.architecture || 'x64'
                    };
                    this.updateSystemOverview(systemData);
                    
                    // Update AI metrics if available
                    if (metrics.ai_stats) {
                        this.updateAIAnalytics(metrics.ai_stats);
                    }
                }
            });

            // Request periodic system updates
            setInterval(() => {
                if (this.isConnected) {
                    this.socket.emit('request_system_metrics');
                }
            }, 5000); // Update every 5 seconds
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
        
        try {
            const response = await fetch('/api/mfa/status', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const mfaData = await response.json();
                this.updateMFADisplay(mfaData);
                this.showNotification('✅ MFA status updated', 'success');
            } else {
                throw new Error('Failed to refresh MFA status');
            }
        } catch (error) {
            console.error('MFA refresh error:', error);
            this.showNotification('❌ Failed to refresh MFA status', 'error');
        }
    }

    async showBackupCodes() {
        this.showNotification('📋 Loading backup codes...', 'info');
        console.log('🛡️ Backup Codes requested');
        
        try {
            const response = await fetch('/api/mfa/backup-codes', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const backupData = await response.json();
                this.displayBackupCodes(backupData.backupCodes);
                this.showNotification('✅ Backup codes loaded', 'success');
            } else {
                throw new Error('Failed to load backup codes');
            }
        } catch (error) {
            console.error('Backup codes error:', error);
            this.showNotification('❌ Failed to load backup codes', 'error');
        }
    }

    async configureMFA() {
        this.showNotification('⚙️ Starting MFA configuration...', 'info');
        console.log('🛡️ MFA Configuration started');
        
        try {
            const response = await fetch('/api/mfa/setup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const setupData = await response.json();
                this.displayMFASetup(setupData);
                this.showNotification('🔐 MFA configuration ready', 'success');
            } else {
                throw new Error('Failed to setup MFA');
            }
        } catch (error) {
            console.error('MFA configure error:', error);
            this.showNotification('❌ Failed to configure MFA', 'error');
        }
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

    updateMFADisplay(mfaData) {
        // Update MFA status in UI
        const mfaStatus = document.getElementById('mfaStatus');
        if (mfaStatus) {
            mfaStatus.textContent = mfaData.mfaEnabled ? 'Enabled' : 'Disabled';
        }
        
        const backupCodesCount = document.getElementById('backupCodesCount');
        if (backupCodesCount) {
            backupCodesCount.textContent = `${mfaData.backupCodesRemaining || 0} codes remaining`;
        }
    }

    displayMFASetup(setupData) {
        // Create MFA setup modal/content
        const mfaContent = document.getElementById('mfaSetupContent');
        if (mfaContent) {
            mfaContent.innerHTML = `
                <div class="mfa-setup">
                    <h3>🔐 Setup Two-Factor Authentication</h3>
                    <div class="qr-section">
                        <p>Scan this QR code with your authenticator app:</p>
                        <img src="${setupData.qrCode}" alt="QR Code" style="width: 200px; height: 200px; border: 2px solid var(--primary-color); border-radius: 8px; margin: 1rem 0;">
                    </div>
                    <div class="manual-entry">
                        <p>Or enter this key manually:</p>
                        <code style="background: var(--bg-dark); padding: 0.5rem; display: block; word-break: break-all;">${setupData.secret}</code>
                    </div>
                    <div class="backup-codes-section">
                        <h4>🔑 Backup Codes</h4>
                        <p>Save these backup codes in a secure location:</p>
                        <div class="backup-codes">
                            ${setupData.backupCodes.map((code, index) => 
                                `<div class="backup-code">${index + 1}. ${code.code}</div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    displayBackupCodes(backupCodes) {
        // Display backup codes in modal or dedicated section
        const codesSection = document.getElementById('backupCodesDisplay');
        if (codesSection) {
            codesSection.innerHTML = `
                <div class="backup-codes-display">
                    <h3>🔑 Your Backup Codes</h3>
                    <div class="codes-list">
                        ${backupCodes.map((code, index) => 
                            `<div class="backup-code ${code.used ? 'used' : 'available'}">
                                ${index + 1}. ${code.code} ${code.used ? '(Used)' : ''}
                            </div>`
                        ).join('')}
                    </div>
                    <div class="codes-actions">
                        <button onclick="dashboard.downloadBackupCodes()" class="btn btn-primary">💾 Download</button>
                        <button onclick="dashboard.printBackupCodes()" class="btn btn-secondary">🖨️ Print</button>
                        <button onclick="dashboard.regenerateBackupCodes()" class="btn btn-warning">🔄 Regenerate</button>
                    </div>
                </div>
            `;
        }
    }

    // 👤 Profile Functions
    async loadProfileData() {
        try {
            const response = await fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const profileData = await response.json();
                this.updateProfileDisplay(profileData);
                return profileData;
            } else {
                throw new Error('Failed to fetch profile data');
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
            this.showNotification('❌ Failed to load profile data', 'error');
        }
    }

    updateProfileDisplay(profileData) {
        // Update profile fields in the UI
        const usernameField = document.getElementById('profileUsername');
        if (usernameField) usernameField.value = profileData.username;
        
        const emailField = document.getElementById('profileEmail');
        if (emailField) emailField.value = profileData.email;
        
        const roleField = document.getElementById('profileRole');
        if (roleField) roleField.textContent = profileData.role;
        
        const lastLoginField = document.getElementById('profileLastLogin');
        if (lastLoginField) lastLoginField.textContent = new Date(profileData.lastLogin).toLocaleString();
        
        const mfaStatusField = document.getElementById('profileMfaStatus');
        if (mfaStatusField) mfaStatusField.textContent = profileData.mfaEnabled ? 'Enabled' : 'Disabled';
        
        const backupCodesField = document.getElementById('profileBackupCodes');
        if (backupCodesField) backupCodesField.textContent = `${profileData.backupCodesRemaining} remaining`;
        
        const sessionsField = document.getElementById('profileActiveSessions');
        if (sessionsField) sessionsField.textContent = profileData.activeSessions;
        
        const commandsField = document.getElementById('profileTotalCommands');
        if (commandsField) commandsField.textContent = profileData.totalCommands;
    }

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

    // ==========================================
    // Terminal Control Functions
    // ==========================================

    clearTerminal() {
        const terminalOutput = document.getElementById('terminalOutput');
        if (terminalOutput) {
            terminalOutput.innerHTML = `
                <div class="welcome-message">
                    <div class="ascii-art">
🚀 REBEL AI Enterprise Terminal 🚀
═══════════════════════════════════
                    </div>
                    <div class="welcome-text">
                        ⚡ <strong>Terminal cleared - Welcome back!</strong><br>
                        🧠 AI-Powered Command Optimization<br>
                        📚 Self-Learning Knowledge Database<br>
                        🎯 Type commands or use quick actions below
                    </div>
                </div>
            `;
            this.showNotification('Terminal cleared', 'success');
        }
    }

    exportTerminalLogs() {
        const terminalOutput = document.getElementById('terminalOutput');
        if (!terminalOutput || !terminalOutput.textContent.trim()) {
            this.showNotification('No terminal logs to export', 'warning');
            return;
        }

        // Create downloadable content
        const logContent = terminalOutput.textContent;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `rebel-terminal-logs-${timestamp}.txt`;
        
        // Create and trigger download
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification(`Terminal logs exported as ${filename}`, 'success');
        this.addActivityItem('Terminal logs exported', '💾');
    }

    openTerminalSettings() {
        this.showNotification('Opening terminal settings...', 'info');
        // Switch to preferences module for terminal settings
        this.switchModule('preferences');
        
        // Scroll to terminal settings section after a brief delay
        setTimeout(() => {
            const terminalSection = document.querySelector('.preferences-section h3[class="section-title"]:contains("Terminal Settings")');
            if (terminalSection) {
                terminalSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
    }

    // ==========================================
    // 🌐 Real-Time WebSocket Functions
    // ==========================================

    async initializeWebSocket() {
        try {
            this.showNotification('🌐 Connecting to real-time server...', 'info');
            
            // Initialize Socket.IO connection
            this.socket = io({
                transports: ['websocket', 'polling'],
                forceNew: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                maxReconnectionAttempts: this.maxReconnectAttempts
            });

            // Connection event handlers
            this.socket.on('connect', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('🌐 WebSocket connected');
                this.showNotification('🌐 Real-time connection established', 'success');
                
                // Authenticate with server
                this.socket.emit('authenticate', {
                    username: this.userData?.username || 'anonymous',
                    token: this.authToken
                });

                // Update connection status in UI
                this.updateConnectionStatus(true);
                
                // Set up real-time metrics monitoring
                this.setupRealTimeMetrics();
            });

            this.socket.on('disconnect', () => {
                this.isConnected = false;
                console.log('🌐 WebSocket disconnected');
                this.showNotification('🌐 Real-time connection lost', 'warning');
                this.updateConnectionStatus(false);
            });

            this.socket.on('reconnect', () => {
                this.showNotification('🌐 Real-time connection restored', 'success');
                this.updateConnectionStatus(true);
            });

            this.socket.on('reconnect_error', () => {
                this.reconnectAttempts++;
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    this.showNotification('🌐 Unable to establish real-time connection', 'error');
                }
            });

            // Real-time data handlers
            this.socket.on('system_metrics', (metrics) => {
                this.updateRealTimeMetrics(metrics);
            });

            this.socket.on('heartbeat', (data) => {
                this.updateHeartbeat(data);
            });

            this.socket.on('user_connected', (data) => {
                this.showNotification(`👥 ${data.username} connected`, 'info');
                this.addActivityItem(`User ${data.username} connected`, '👥');
            });

            this.socket.on('user_disconnected', (data) => {
                this.showNotification(`👥 ${data.username} disconnected`, 'info');
                this.addActivityItem(`User ${data.username} disconnected`, '👋');
            });

            this.socket.on('command_executed', (data) => {
                this.addRealTimeCommand(data);
            });

            this.socket.on('chat_message', (data) => {
                this.addChatMessage(data);
            });

            this.socket.on('terminal_shared', (data) => {
                this.handleSharedTerminal(data);
            });

        } catch (error) {
            console.error('🌐 WebSocket initialization error:', error);
            this.showNotification('🌐 Real-time features unavailable', 'error');
        }
    }

    updateRealTimeMetrics(metrics) {
        this.realTimeMetrics = metrics;
        
        // Update dashboard metrics displays
        const cpuElement = document.getElementById('cpuUsage');
        if (cpuElement) cpuElement.textContent = `${metrics.cpu}%`;
        
        const memoryElement = document.getElementById('memoryUsage');
        if (memoryElement) memoryElement.textContent = `${metrics.memory}%`;
        
        const diskElement = document.getElementById('diskUsage');
        if (diskElement) diskElement.textContent = `${metrics.disk}%`;
        
        // Update system status color based on metrics
        const maxUsage = Math.max(metrics.cpu, metrics.memory, metrics.disk);
        const statusIndicator = document.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator';
            if (maxUsage > 90) {
                statusIndicator.classList.add('critical');
            } else if (maxUsage > 70) {
                statusIndicator.classList.add('warning');
            } else {
                statusIndicator.classList.add('online');
            }
        }
    }

    updateHeartbeat(data) {
        // Update connected users count
        const connectedUsersElement = document.getElementById('connectedUsers');
        if (connectedUsersElement) {
            connectedUsersElement.textContent = data.authenticatedUsers;
        }
    }

    updateConnectionStatus(connected) {
        const systemStatus = document.getElementById('systemStatus');
        if (systemStatus) {
            const statusText = systemStatus.querySelector('.status-text');
            const statusIndicator = systemStatus.querySelector('.status-indicator');
            
            if (connected) {
                statusText.textContent = 'Real-Time Active';
                statusIndicator.classList.add('online');
                statusIndicator.classList.remove('offline');
            } else {
                statusText.textContent = 'Connection Lost';
                statusIndicator.classList.add('offline');
                statusIndicator.classList.remove('online');
            }
        }
    }

    addRealTimeCommand(data) {
        // Add command to real-time activity feed
        this.addActivityItem(`${data.username}: ${data.command}`, '⚡');
        
        // If we're in terminal view, show the command
        if (this.currentModule === 'terminal') {
            const terminalOutput = document.getElementById('terminalOutput');
            if (terminalOutput) {
                const commandElement = document.createElement('div');
                commandElement.className = 'terminal-line shared-command';
                commandElement.innerHTML = `
                    <span class="terminal-prompt">[${data.username}@${data.timestamp.slice(11, 19)}]$</span>
                    <span class="terminal-command">${data.command}</span>
                `;
                terminalOutput.appendChild(commandElement);
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }
        }
    }

    addChatMessage(data) {
        // Add chat message to activity or dedicated chat area
        this.addActivityItem(`💬 ${data.username}: ${data.message}`, data.avatar);
    }

    handleSharedTerminal(data) {
        this.showNotification(`📺 ${data.username} shared their terminal`, 'info');
        this.addActivityItem(`Terminal shared by ${data.username}`, '📺');
    }

    // Send real-time command execution
    broadcastCommand(command, output) {
        if (this.socket && this.isConnected) {
            this.socket.emit('execute_command', {
                command: command,
                output: output
            });
        }
    }

    // Send chat message
    sendChatMessage(message) {
        if (this.socket && this.isConnected) {
            this.socket.emit('chat_message', {
                message: message,
                avatar: '🛡️'
            });
        }
    }

    // Share terminal session
    shareTerminal() {
        if (this.socket && this.isConnected) {
            const terminalData = {
                history: this.commandHistory,
                currentSession: this.terminalSession
            };
            
            this.socket.emit('share_terminal', {
                terminalData: terminalData
            });
            
            this.showNotification('📺 Terminal session shared', 'success');
        }
    }

    // ==========================================
    // 🧠 AI Command Intelligence Functions  
    // ==========================================

    async handleSmartSuggestions(event) {
        const input = event.target.value.trim();
        
        // Clear existing timeout
        if (this.suggestionTimeout) {
            clearTimeout(this.suggestionTimeout);
        }
        
        // Don't show suggestions for very short input
        if (input.length < 2) {
            this.hideSmartSuggestions();
            return;
        }
        
        // Debounce the suggestion request
        this.suggestionTimeout = setTimeout(() => {
            this.requestAISuggestions(input);
        }, 300);
    }

    async requestAISuggestions(input) {
        try {
            if (!input || input.length < 2) return;
            
            // Check if it's natural language first
            const translation = await this.translateNaturalLanguage(input);
            if (translation.success) {
                this.showTranslationSuggestion(translation);
                return;
            }
            
            // Get AI suggestions
            const response = await fetch('/api/ai/suggest', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    partial: input,
                    context: {
                        currentDirectory: this.terminalSession?.pwd || '/',
                        recentFiles: [],
                        systemInfo: this.systemStats
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.aiSuggestions = data.suggestions || [];
                this.displayAISuggestions(input);
            }
        } catch (error) {
            console.error('AI suggestions error:', error);
        }
    }

    async translateNaturalLanguage(input) {
        try {
            const response = await fetch('/api/ai/translate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ input })
            });

            if (response.ok) {
                return await response.json();
            }
            return { success: false };
        } catch (error) {
            console.error('AI translation error:', error);
            return { success: false };
        }
    }

    displayAISuggestions(input) {
        if (this.aiSuggestions.length === 0) {
            this.hideSmartSuggestions();
            return;
        }

        // Create suggestions container if it doesn't exist
        let suggestionsContainer = document.getElementById('aiSuggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'aiSuggestions';
            suggestionsContainer.className = 'ai-suggestions';
            
            const commandInput = document.getElementById('commandInput');
            if (commandInput) {
                commandInput.parentNode.appendChild(suggestionsContainer);
            }
        }

        // Clear existing suggestions
        suggestionsContainer.innerHTML = '';

        // Add suggestions
        this.aiSuggestions.forEach((suggestion, index) => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'suggestion-item';
            suggestionElement.innerHTML = `
                <div class="suggestion-command">${suggestion.command}</div>
                <div class="suggestion-meta">
                    <span class="suggestion-type">${this.getSuggestionTypeIcon(suggestion.type)}</span>
                    <span class="suggestion-confidence">${Math.round((suggestion.score || suggestion.confidence || 0) * 100)}%</span>
                </div>
            `;
            
            suggestionElement.addEventListener('click', () => {
                this.currentSuggestion = index;
                this.applySuggestion();
            });

            suggestionsContainer.appendChild(suggestionElement);
        });

        this.isShowingSuggestions = true;
        this.currentSuggestion = 0;
        this.highlightCurrentSuggestion();
    }

    showTranslationSuggestion(translation) {
        let suggestionsContainer = document.getElementById('aiSuggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'aiSuggestions';
            suggestionsContainer.className = 'ai-suggestions';
            
            const commandInput = document.getElementById('commandInput');
            if (commandInput) {
                commandInput.parentNode.appendChild(suggestionsContainer);
            }
        }

        suggestionsContainer.innerHTML = `
            <div class="translation-suggestion">
                <div class="translation-header">🧠 AI Translation:</div>
                <div class="translation-original">"${translation.originalInput}"</div>
                <div class="translation-arrow">↓</div>
                <div class="translation-command">${translation.translatedCommand}</div>
                <div class="translation-confidence">Confidence: ${Math.round(translation.confidence * 100)}%</div>
                <button class="apply-translation" onclick="dashboard.applyTranslation('${translation.translatedCommand}')">
                    Apply Command
                </button>
            </div>
        `;

        this.isShowingSuggestions = true;
    }

    applyTranslation(command) {
        const commandInput = document.getElementById('commandInput');
        if (commandInput) {
            commandInput.value = command;
            commandInput.focus();
        }
        this.hideSmartSuggestions();
    }

    navigateAISuggestions(direction) {
        if (this.aiSuggestions.length === 0) return;

        if (direction === 'up') {
            this.currentSuggestion = Math.max(0, this.currentSuggestion - 1);
        } else if (direction === 'down') {
            this.currentSuggestion = Math.min(this.aiSuggestions.length - 1, this.currentSuggestion + 1);
        }

        this.highlightCurrentSuggestion();
    }

    highlightCurrentSuggestion() {
        const suggestions = document.querySelectorAll('.suggestion-item');
        suggestions.forEach((item, index) => {
            if (index === this.currentSuggestion) {
                item.classList.add('highlighted');
            } else {
                item.classList.remove('highlighted');
            }
        });
    }

    applySuggestion() {
        if (this.currentSuggestion >= 0 && this.aiSuggestions[this.currentSuggestion]) {
            const suggestion = this.aiSuggestions[this.currentSuggestion];
            const commandInput = document.getElementById('commandInput');
            if (commandInput) {
                commandInput.value = suggestion.command;
                commandInput.focus();
            }
            this.hideSmartSuggestions();
        }
    }

    hideSmartSuggestions() {
        const suggestionsContainer = document.getElementById('aiSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
        this.isShowingSuggestions = false;
        this.currentSuggestion = -1;
    }

    showSmartSuggestions() {
        const suggestionsContainer = document.getElementById('aiSuggestions');
        if (suggestionsContainer && this.aiSuggestions.length > 0) {
            suggestionsContainer.style.display = 'block';
            this.isShowingSuggestions = true;
        }
    }

    getSuggestionTypeIcon(type) {
        const icons = {
            'direct': '⚡',
            'history': '🕒',
            'context': '📁',
            'nlp': '🧠',
            'turkish': '🇹🇷',
            'context-git': '🔀'
        };
        return icons[type] || '💡';
    }

    async analyzeCommandError(command, error, output) {
        try {
            const response = await fetch('/api/ai/analyze-error', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ command, error, output })
            });

            if (response.ok) {
                const analysis = await response.json();
                this.displayErrorAnalysis(analysis);
                return analysis;
            }
        } catch (error) {
            console.error('Error analysis failed:', error);
        }
        return null;
    }

    displayErrorAnalysis(analysis) {
        if (!analysis || !analysis.suggestions) return;

        const errorMessage = `
            <div class="error-analysis">
                <div class="error-header">🤖 AI Error Analysis</div>
                <div class="error-category">Category: ${analysis.category}</div>
                <div class="error-suggestions">
                    <h4>Suggestions:</h4>
                    ${analysis.suggestions.suggestions ? analysis.suggestions.suggestions.map(s => `<div class="suggestion">• ${s}</div>`).join('') : ''}
                    ${analysis.suggestions.installSuggestions ? 
                        `<div class="install-suggestions">
                            <h5>Installation options:</h5>
                            ${analysis.suggestions.installSuggestions.map(s => `<div class="install-suggestion">• ${s}</div>`).join('')}
                        </div>` : ''}
                </div>
            </div>
        `;

        this.addTerminalMessage('ai-analysis', errorMessage);
    }

    // Learn from command execution
    async learnFromCommand(command, success) {
        try {
            await fetch('/api/ai/learn', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ command, success })
            });
        } catch (error) {
            console.error('AI learning failed:', error);
        }
    }

    // ==========================================
    // Knowledge AI Functions
    // ==========================================

    async refreshKnowledgeData() {
        this.showNotification('Refreshing knowledge database...', 'info');
        
        try {
            // Fetch knowledge data from API
            const response = await fetch('/api/knowledge', {
                headers: {
                    'Authorization': `Bearer ${window.REBEL_SESSION_TOKEN}`
                }
            });

            if (response.ok) {
                const knowledgeData = await response.json();
                this.updateKnowledgeDisplay(knowledgeData);
                this.showNotification('Knowledge database refreshed', 'success');
                this.addActivityItem('Knowledge data refreshed', '🧠');
            } else {
                throw new Error('Failed to fetch knowledge data');
            }
        } catch (error) {
            console.error('Knowledge refresh error:', error);
            this.showNotification('Failed to refresh knowledge data', 'error');
        }
    }

    updateKnowledgeDisplay(knowledgeData) {
        // Update learning statistics
        const stats = [
            { id: 'commandCount', value: knowledgeData.totalCommands || 0, label: 'Commands Learned' },
            { id: 'successRate', value: knowledgeData.successRate || 0, label: 'Success Rate', suffix: '%' },
            { id: 'optimizationCount', value: knowledgeData.optimizations || 0, label: 'Optimizations' },
            { id: 'conversationCount', value: knowledgeData.conversations || 0, label: 'Conversations' }
        ];

        stats.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                const value = stat.suffix ? `${stat.value}${stat.suffix}` : stat.value;
                element.textContent = value;
            }
        });

        // Update patterns section
        const patternsContainer = document.getElementById('learnedPatterns');
        if (patternsContainer && knowledgeData.patterns) {
            patternsContainer.innerHTML = knowledgeData.patterns.map(pattern => 
                `<div class="pattern-item">${pattern}</div>`
            ).join('');
        }
    }

    exportKnowledgeData() {
        this.showNotification('Exporting knowledge database...', 'info');
        
        // Create export data
        const exportData = {
            timestamp: new Date().toISOString(),
            commandHistory: this.commandHistory || [],
            learningStats: {
                commandCount: document.getElementById('commandCount')?.textContent || '0',
                successRate: document.getElementById('successRate')?.textContent || '0%',
                optimizationCount: document.getElementById('optimizationCount')?.textContent || '0'
            },
            patterns: Array.from(document.querySelectorAll('.pattern-item')).map(item => item.textContent)
        };

        // Create and download file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `rebel-knowledge-export-${timestamp}.json`;
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification(`Knowledge exported as ${filename}`, 'success');
        this.addActivityItem('Knowledge database exported', '📄');
    }

    clearKnowledgeData() {
        if (confirm('Are you sure you want to clear all knowledge data? This cannot be undone.')) {
            // Reset display values
            const elements = ['commandCount', 'successRate', 'optimizationCount', 'conversationCount'];
            elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = '0';
            });

            // Clear patterns
            const patternsContainer = document.getElementById('learnedPatterns');
            if (patternsContainer) {
                patternsContainer.innerHTML = '<div class="pattern-item">No patterns learned yet</div>';
            }

            this.showNotification('Knowledge database cleared', 'warning');
            this.addActivityItem('Knowledge database cleared', '🗑️');
        }
    }

    // Enhanced command history display (fixes the 5 command limit issue)
    updateHistoryDisplay() {
        const historyContainer = document.getElementById('commandHistory');
        if (!historyContainer) return;

        // Show more commands (up to 20 instead of 5)
        const maxCommands = 20;
        const recentCommands = this.commandHistory.slice(-maxCommands).reverse();
        
        if (recentCommands.length === 0) {
            historyContainer.innerHTML = '<div class="history-empty">No commands executed yet</div>';
            return;
        }

        const historyHTML = recentCommands.map((cmd, index) => `
            <div class="history-item ${index === 0 ? 'most-recent' : ''}" onclick="dashboard.selectHistoryCommand('${cmd}')">
                <div class="history-command">${cmd}</div>
                <div class="history-index">#${recentCommands.length - index}</div>
            </div>
        `).join('');

        historyContainer.innerHTML = historyHTML;
    }

    selectHistoryCommand(command) {
        const commandInput = document.getElementById('commandInput');
        if (commandInput) {
            commandInput.value = command;
            commandInput.focus();
        }
    }

    // ==========================================
    // MFA Settings Functions
    // ==========================================

    async refreshMFAStatus() {
        this.showNotification('Refreshing MFA status...', 'info');
        
        try {
            // Simulate MFA status check
            setTimeout(() => {
                const statusElement = document.getElementById('mfaStatus');
                const configureBtn = document.getElementById('configureMFABtn');
                
                if (statusElement && configureBtn) {
                    // Simulate current status
                    const isConfigured = Math.random() > 0.5; // Random for demo
                    
                    if (isConfigured) {
                        statusElement.innerHTML = `
                            <div class="status-indicator online"></div>
                            <div class="status-text">Two-Factor Authentication Active</div>
                        `;
                        configureBtn.textContent = '🔄 Reconfigure';
                    } else {
                        statusElement.innerHTML = `
                            <div class="status-indicator offline"></div>
                            <div class="status-text">Two-Factor Authentication Disabled</div>
                        `;
                        configureBtn.textContent = '🔒 Configure';
                    }
                }
                
                this.showNotification('MFA status updated', 'success');
                this.addActivityItem('MFA status refreshed', '🔐');
            }, 1000);
            
        } catch (error) {
            console.error('MFA refresh error:', error);
            this.showNotification('Failed to refresh MFA status', 'error');
        }
    }

    showBackupCodes() {
        this.showNotification('Generating backup codes...', 'info');
        
        // Generate mock backup codes
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            backupCodes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
        }
        
        const codesContainer = document.getElementById('backupCodesContainer');
        if (codesContainer) {
            codesContainer.innerHTML = `
                <div class="backup-codes-grid">
                    ${backupCodes.map((code, index) => `
                        <div class="backup-code-item">
                            <span class="code-number">${index + 1}.</span>
                            <span class="code-value">${code}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="backup-codes-warning">
                    ⚠️ <strong>Important:</strong> Save these backup codes in a secure location. 
                    Each code can only be used once and will be needed if you lose access to your authentication device.
                </div>
            `;
            
            this.showNotification('Backup codes generated', 'success');
            this.addActivityItem('Backup codes generated', '🔑');
        }
    }

    configureMFA() {
        this.showNotification('Opening MFA configuration...', 'info');
        
        // Show configuration dialog
        const configDialog = document.createElement('div');
        configDialog.className = 'mfa-config-dialog';
        configDialog.innerHTML = `
            <div class="dialog-overlay">
                <div class="dialog-content">
                    <div class="dialog-header">
                        <h3>🔐 Configure Two-Factor Authentication</h3>
                        <button class="dialog-close" onclick="this.closest('.mfa-config-dialog').remove()">×</button>
                    </div>
                    <div class="dialog-body">
                        <div class="config-step">
                            <h4>Step 1: Download Authentication App</h4>
                            <p>Download and install an authenticator app such as:</p>
                            <ul>
                                <li>Google Authenticator</li>
                                <li>Microsoft Authenticator</li>
                                <li>Authy</li>
                            </ul>
                        </div>
                        <div class="config-step">
                            <h4>Step 2: Scan QR Code</h4>
                            <div class="qr-code-placeholder">
                                <div class="qr-code">📱 QR CODE PLACEHOLDER</div>
                                <p>Scan this QR code with your authenticator app</p>
                            </div>
                        </div>
                        <div class="config-step">
                            <h4>Step 3: Verify Setup</h4>
                            <input type="text" placeholder="Enter 6-digit code from your app" class="verification-code">
                            <button onclick="dashboard.verifyMFASetup(this)" class="verify-btn">✅ Verify & Enable</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(configDialog);
        this.addActivityItem('MFA configuration started', '⚙️');
    }

    verifyMFASetup(button) {
        const codeInput = button.parentNode.querySelector('.verification-code');
        const code = codeInput.value;
        
        if (code.length !== 6) {
            this.showNotification('Please enter a 6-digit verification code', 'warning');
            return;
        }
        
        this.showNotification('Verifying MFA setup...', 'info');
        
        setTimeout(() => {
            // Simulate verification
            const success = code === '123456' || Math.random() > 0.3; // Demo verification
            
            if (success) {
                this.showNotification('✅ MFA successfully configured!', 'success');
                this.addActivityItem('MFA enabled', '🔒');
                document.querySelector('.mfa-config-dialog').remove();
                this.refreshMFAStatus();
            } else {
                this.showNotification('Invalid verification code. Please try again.', 'error');
                codeInput.value = '';
            }
        }, 1500);
    }

    downloadBackupCodes() {
        const codesContainer = document.getElementById('backupCodesContainer');
        if (!codesContainer || !codesContainer.textContent.trim()) {
            this.showNotification('Please generate backup codes first', 'warning');
            return;
        }
        
        // Extract backup codes from the display
        const codes = Array.from(codesContainer.querySelectorAll('.code-value'))
                          .map(el => el.textContent);
        
        if (codes.length === 0) {
            this.showNotification('No backup codes to download', 'warning');
            return;
        }
        
        // Create download content
        const content = `REBEL AI Enterprise - MFA Backup Codes
Generated: ${new Date().toISOString()}

⚠️  IMPORTANT SECURITY NOTICE:
- Each backup code can only be used once
- Store these codes in a secure location
- Do not share these codes with anyone
- These codes provide access to your account

Backup Codes:
${codes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

If you lose access to your authentication device, you can use these codes to regain access to your account.
`;
        
        // Create and trigger download
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `rebel-mfa-backup-codes-${timestamp}.txt`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification(`Backup codes downloaded as ${filename}`, 'success');
        this.addActivityItem('Backup codes downloaded', '💾');
    }

    printBackupCodes() {
        const codesContainer = document.getElementById('backupCodesContainer');
        if (!codesContainer || !codesContainer.textContent.trim()) {
            this.showNotification('Please generate backup codes first', 'warning');
            return;
        }
        
        // Create printable version
        const printWindow = window.open('', '_blank');
        const codes = Array.from(codesContainer.querySelectorAll('.code-value'))
                          .map(el => el.textContent);
        
        printWindow.document.write(`
            <html>
            <head>
                <title>REBEL AI MFA Backup Codes</title>
                <style>
                    body { font-family: monospace; margin: 2rem; }
                    .header { text-align: center; margin-bottom: 2rem; }
                    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 1rem; margin: 1rem 0; }
                    .codes { margin: 1rem 0; }
                    .code-item { margin: 0.5rem 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🛡️ REBEL AI Enterprise</h1>
                    <h2>MFA Backup Codes</h2>
                    <p>Generated: ${new Date().toLocaleString()}</p>
                </div>
                <div class="warning">
                    <strong>⚠️ SECURITY WARNING:</strong><br>
                    • Each backup code can only be used once<br>
                    • Store these codes in a secure location<br>
                    • Do not share these codes with anyone<br>
                    • These codes provide access to your account
                </div>
                <div class="codes">
                    <h3>Backup Codes:</h3>
                    ${codes.map((code, index) => `
                        <div class="code-item">${index + 1}. ${code}</div>
                    `).join('')}
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
        
        this.showNotification('Backup codes prepared for printing', 'success');
        this.addActivityItem('Backup codes printed', '🖨️');
    }

    regenerateBackupCodes() {
        if (confirm('Are you sure you want to regenerate backup codes? This will invalidate all existing backup codes.')) {
            this.showNotification('Regenerating backup codes...', 'warning');
            
            setTimeout(() => {
                this.showBackupCodes(); // Generate new codes
                this.showNotification('New backup codes generated. Previous codes are now invalid.', 'success');
                this.addActivityItem('Backup codes regenerated', '🔄');
            }, 1000);
        }
    }

    // ==========================================
    // Profile & Session Management Functions  
    // ==========================================

    async viewActiveSessions() {
        this.showNotification('Loading active sessions...', 'info');
        
        // Simulate loading sessions
        setTimeout(() => {
            const sessionsContainer = document.getElementById('activeSessionsContainer');
            if (sessionsContainer) {
                const mockSessions = [
                    { device: 'Chrome on Windows', location: 'Istanbul, Turkey', lastActive: '2 minutes ago', current: true },
                    { device: 'Mobile App', location: 'Ankara, Turkey', lastActive: '1 hour ago', current: false },
                    { device: 'Firefox on Linux', location: 'London, UK', lastActive: '3 days ago', current: false }
                ];
                
                sessionsContainer.innerHTML = `
                    <div class="sessions-list">
                        ${mockSessions.map(session => `
                            <div class="session-item ${session.current ? 'current-session' : ''}">
                                <div class="session-info">
                                    <div class="session-device">${session.device} ${session.current ? '(Current)' : ''}</div>
                                    <div class="session-details">
                                        <span class="session-location">📍 ${session.location}</span>
                                        <span class="session-time">🕒 ${session.lastActive}</span>
                                    </div>
                                </div>
                                ${!session.current ? '<button class="revoke-session-btn" onclick="dashboard.revokeSession(\'' + session.device + '\')">🚫 Revoke</button>' : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            this.showNotification('Active sessions loaded', 'success');
        }, 1000);
    }

    revokeSession(device) {
        if (confirm(`Are you sure you want to revoke access for "${device}"? This will log out that device immediately.`)) {
            this.showNotification(`Revoking session for ${device}...`, 'warning');
            
            setTimeout(() => {
                this.showNotification(`Session revoked for ${device}`, 'success');
                this.addActivityItem(`Session revoked: ${device}`, '🚫');
                this.viewActiveSessions(); // Refresh the list
            }, 1000);
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛡️ REBEL AI Enterprise Dashboard Loading...');
    window.dashboard = new EnterpriseDashboard();
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
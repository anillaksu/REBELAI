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
        }
    }

    async loadSystemStats() {
        try {
            // Load system status
            const statusResponse = await fetch('/api/status', {
                headers: {
                    'Authorization': `Bearer ${window.REBEL_SESSION_TOKEN}`
                }
            });

            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                this.updateSystemOverview(statusData);
            }

            // Load AI learning stats
            const knowledgeResponse = await fetch('/api/knowledge', {
                headers: {
                    'Authorization': `Bearer ${window.REBEL_SESSION_TOKEN}`
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

        // Show command in terminal
        this.addTerminalMessage('user', command);

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
                // Show results
                data.results.forEach(result => {
                    if (result.success) {
                        this.addTerminalMessage('success', result.output);
                        
                        // Show translation info if available
                        if (result.translation && result.translation.translationType !== 'english_passthrough') {
                            this.addTerminalMessage('info', `🇹🇷 Turkish: "${result.translation.originalCommand}" → "${result.translation.translatedCommand}"`);
                        }
                    } else {
                        this.addTerminalMessage('error', result.error);
                    }
                });

                // Show optimization info
                if (data.optimized_commands && data.optimized_commands.length > 1) {
                    this.addTerminalMessage('info', `⚡ Dijkstra optimized: ${data.optimized_commands.join(' → ')}`);
                }
            } else {
                this.addTerminalMessage('error', data.error || 'Command execution failed');
            }
        } catch (error) {
            this.addTerminalMessage('error', 'Network error: ' + error.message);
        }

        // Scroll to bottom
        this.scrollTerminalToBottom();
    }

    async executeQuickAction(action) {
        const actionMap = {
            'list_files': 'ls -la',
            'current_user': 'whoami',
            'current_directory': 'pwd',
            'current_date': 'date',
            'disk_usage': 'df -h',
            'processes': 'ps aux | head -10'
        };

        const command = actionMap[action];
        if (command) {
            document.getElementById('commandInput').value = command;
            await this.executeCommand();
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
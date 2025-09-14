// ==========================================
// 🚀 REBEL AI - Dijkstra Edition Frontend
// ==========================================
// Portable AI Terminal User Interface

class REBELTerminalUI {
    constructor() {
        this.apiBaseUrl = '';
        this.commandHistory = [];
        this.historyIndex = -1;
        this.isExecuting = false;
        this.socket = null;
        
        // Authentication tokens (injected by server)
        this.sessionToken = window.REBEL_SESSION_TOKEN || null;
        this.csrfToken = window.REBEL_CSRF_TOKEN || null;
        
        // Validate tokens on startup
        if (!this.sessionToken || !this.csrfToken) {
            console.error('Authentication tokens not found! Server authentication required.');
        }
        
        // DOM Elements
        this.loadingScreen = document.getElementById('loadingScreen');
        this.mainApp = document.getElementById('mainApp');
        this.terminalOutput = document.getElementById('terminalOutput');
        this.commandInput = document.getElementById('commandInput');
        this.executeBtn = document.getElementById('executeBtn');
        this.platformInfo = document.getElementById('platformInfo');
        this.statusInfo = document.getElementById('statusInfo');
        
        // Learning stats elements
        this.commandCount = document.getElementById('commandCount');
        this.successRate = document.getElementById('successRate');
        this.optimizationCount = document.getElementById('optimizationCount');
        this.deviceId = document.getElementById('deviceId');
        
        // Initialize
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoading('Initializing REBEL AI...');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check server status
            await this.checkServerStatus();
            
            // Load initial data
            await this.loadInitialData();
            
            // Hide loading and show main app
            this.hideLoading();
            
            // Focus on command input
            this.commandInput.focus();
            
            // Show welcome notification
            this.showNotification('🚀 REBEL AI Portable Terminal ready!', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize REBEL AI. Please check if the server is running.');
        }
    }

    setupEventListeners() {
        // Command execution
        this.executeBtn.addEventListener('click', () => this.executeCommand());
        this.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isExecuting) {
                this.executeCommand();
            }
        });

        // Command history navigation
        this.commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory('up');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory('down');
            }
        });

        // Quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.executeQuickAction(action);
            });
        });

        // System command buttons
        document.querySelectorAll('.system-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                this.commandInput.value = command;
                this.executeCommand();
            });
        });

        // Modal controls
        document.getElementById('hardwareBtn').addEventListener('click', () => this.showHardwareInfo());
        document.getElementById('knowledgeBtn').addEventListener('click', () => this.showKnowledgeInfo());
        document.getElementById('statsBtn').addEventListener('click', () => this.showStatsInfo());

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.dataset.modal;
                this.closeModal(modal);
            });
        });

        // History controls
        document.getElementById('clearHistory').addEventListener('click', () => this.clearHistory());
        document.getElementById('exportHistory').addEventListener('click', () => this.exportHistory());
        document.getElementById('refreshStats').addEventListener('click', () => this.refreshLearningStats());

        // Context menu
        this.terminalOutput.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY);
        });

        // Click outside to close context menu
        document.addEventListener('click', () => this.hideContextMenu());

        // Auto-refresh stats every 30 seconds
        setInterval(() => this.refreshLearningStats(), 30000);
    }

    async checkServerStatus() {
        try {
            const response = await fetch('/api/status', {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            if (response.ok) {
                const status = await response.json();
                this.updateSystemInfo(status);
                return true;
            } else if (response.status === 401) {
                throw new Error('Authentication failed - please refresh the page');
            }
        } catch (error) {
            console.error('Server status check failed:', error);
            throw new Error(error.message || 'Server is not responding');
        }
        return false;
    }

    async loadInitialData() {
        try {
            // Load learning stats
            await this.refreshLearningStats();
            
            // Update command history display
            this.updateHistoryDisplay();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    async executeCommand(command = null) {
        if (this.isExecuting) return;

        const cmd = command || this.commandInput.value.trim();
        if (!cmd) return;

        this.isExecuting = true;
        this.updateExecuteButton(true);

        try {
            // Add command to output immediately
            this.addCommandToOutput(cmd);
            
            // Add to history
            this.addToHistory(cmd);
            
            // Clear input if not provided externally
            if (!command) {
                this.commandInput.value = '';
            }

            // Execute command with authentication
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify({ command: cmd })
            });

            if (response.ok) {
                const result = await response.json();
                this.displayCommandResult(result);
                
                // Update learning stats
                this.refreshLearningStats();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('Command execution error:', error);
            this.displayError(`❌ Error: ${error.message}`);
        } finally {
            this.isExecuting = false;
            this.updateExecuteButton(false);
            this.scrollToBottom();
        }
    }

    async executeQuickAction(action) {
        if (this.isExecuting) return;

        this.isExecuting = true;
        this.updateExecuteButton(true);

        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify({ action: action })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Add to output and history
                const commandUsed = result.results[0]?.command || action;
                this.addCommandToOutput(commandUsed, true);
                this.addToHistory(commandUsed);
                
                this.displayCommandResult(result);
                this.refreshLearningStats();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            console.error('Quick action error:', error);
            this.displayError(`❌ Error executing ${action}: ${error.message}`);
        } finally {
            this.isExecuting = false;
            this.updateExecuteButton(false);
            this.scrollToBottom();
        }
    }

    addCommandToOutput(command, isQuickAction = false) {
        const entry = document.createElement('div');
        entry.className = 'command-entry slide-up';
        
        const commandLine = document.createElement('div');
        commandLine.className = 'command-line';
        commandLine.innerHTML = `<span style="color: #00ff41;">rebel@portable:~$</span> ${command}`;
        
        if (isQuickAction) {
            commandLine.innerHTML += ' <span style="color: #888; font-style: italic;">(quick action)</span>';
        }
        
        entry.appendChild(commandLine);
        this.terminalOutput.appendChild(entry);
        
        return entry;
    }

    displayCommandResult(result) {
        if (!result.results || result.results.length === 0) {
            this.displayError('No results returned');
            return;
        }

        result.results.forEach((cmdResult, index) => {
            const outputDiv = document.createElement('div');
            
            if (cmdResult.success) {
                outputDiv.className = 'command-output';
                
                if (cmdResult.output) {
                    outputDiv.textContent = cmdResult.output;
                } else {
                    outputDiv.innerHTML = '<span style="color: #44ff44;">✓ Command executed successfully</span>';
                }
                
                if (cmdResult.isFallback) {
                    const fallbackNote = document.createElement('div');
                    fallbackNote.style.color = '#ffaa00';
                    fallbackNote.style.fontStyle = 'italic';
                    fallbackNote.textContent = `(Used fallback: ${cmdResult.command} instead of ${cmdResult.originalCommand})`;
                    outputDiv.appendChild(fallbackNote);
                }
                
            } else {
                outputDiv.className = 'command-error';
                outputDiv.textContent = cmdResult.error || 'Command failed';
            }
            
            // Add execution time
            if (cmdResult.execution_time) {
                const timeDiv = document.createElement('div');
                timeDiv.style.color = '#666';
                timeDiv.style.fontSize = '0.8rem';
                timeDiv.style.marginTop = '0.5rem';
                timeDiv.textContent = `Execution time: ${cmdResult.execution_time}ms`;
                outputDiv.appendChild(timeDiv);
            }
            
            this.terminalOutput.appendChild(outputDiv);
        });

        // Show optimization info if available
        if (result.optimized_commands && result.optimized_commands.length > 1) {
            const optimizationDiv = document.createElement('div');
            optimizationDiv.style.color = '#00ff41';
            optimizationDiv.style.fontStyle = 'italic';
            optimizationDiv.style.marginTop = '0.5rem';
            optimizationDiv.textContent = `🧠 Dijkstra Optimization: ${result.optimized_commands.length} commands optimized`;
            this.terminalOutput.appendChild(optimizationDiv);
        }
    }

    displayError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'command-error slide-up';
        errorDiv.textContent = message;
        this.terminalOutput.appendChild(errorDiv);
    }

    addToHistory(command) {
        if (command && !this.commandHistory.includes(command)) {
            this.commandHistory.unshift(command);
            
            // Limit history size
            if (this.commandHistory.length > 50) {
                this.commandHistory = this.commandHistory.slice(0, 50);
            }
            
            this.historyIndex = -1;
            this.updateHistoryDisplay();
        }
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;

        if (direction === 'up') {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.commandInput.value = this.commandHistory[this.historyIndex];
            }
        } else if (direction === 'down') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.commandInput.value = this.commandHistory[this.historyIndex];
            } else if (this.historyIndex === 0) {
                this.historyIndex = -1;
                this.commandInput.value = '';
            }
        }
    }

    updateHistoryDisplay() {
        const historyContainer = document.getElementById('commandHistory');
        
        if (this.commandHistory.length === 0) {
            historyContainer.innerHTML = '<div class="history-empty">No commands executed yet</div>';
            return;
        }

        historyContainer.innerHTML = '';
        
        // Show last 10 commands
        this.commandHistory.slice(0, 10).forEach(cmd => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = cmd;
            historyItem.title = cmd;
            
            historyItem.addEventListener('click', () => {
                this.commandInput.value = cmd;
                this.commandInput.focus();
            });
            
            historyContainer.appendChild(historyItem);
        });
    }

    updateExecuteButton(isExecuting) {
        if (isExecuting) {
            this.executeBtn.textContent = '⏳ Executing...';
            this.executeBtn.disabled = true;
        } else {
            this.executeBtn.textContent = '⚡ Execute';
            this.executeBtn.disabled = false;
        }
    }

    updateSystemInfo(status) {
        this.platformInfo.textContent = `${status.platform} ${status.arch}`;
        this.statusInfo.style.color = '#44ff44';
        this.statusInfo.title = `Node.js ${status.node_version} | Uptime: ${Math.round(status.uptime)}s`;
    }

    async refreshLearningStats() {
        try {
            const authHeaders = {
                'Authorization': `Bearer ${this.sessionToken}`
            };
            
            const [knowledgeResponse, statusResponse] = await Promise.all([
                fetch('/api/knowledge', { headers: authHeaders }),
                fetch('/api/status', { headers: authHeaders })
            ]);

            if (knowledgeResponse.ok && statusResponse.ok) {
                const knowledge = await knowledgeResponse.json();
                const status = await statusResponse.json();

                this.updateLearningStatsDisplay(knowledge, status);
            }
        } catch (error) {
            console.error('Failed to refresh learning stats:', error);
        }
    }

    updateLearningStatsDisplay(knowledge, status) {
        // Count total commands learned
        let totalCommands = 0;
        let totalSuccessful = 0;
        let totalExecutions = 0;

        for (const platform in knowledge.command_success_rates) {
            const platformCommands = knowledge.command_success_rates[platform];
            for (const cmd in platformCommands) {
                const stats = platformCommands[cmd];
                totalCommands++;
                totalExecutions += stats.total_executions || 0;
                totalSuccessful += stats.successful_executions || 0;
            }
        }

        const successRate = totalExecutions > 0 ? Math.round((totalSuccessful / totalExecutions) * 100) : 0;

        // Count optimization opportunities
        let optimizationCount = 0;
        for (const platform in knowledge.fallback_routes) {
            optimizationCount += Object.keys(knowledge.fallback_routes[platform]).length;
        }

        // Update display
        this.commandCount.textContent = totalCommands;
        this.successRate.textContent = `${successRate}%`;
        this.optimizationCount.textContent = optimizationCount;
        
        // Generate simple device ID from hostname and platform
        const deviceHash = this.simpleHash(`${status.platform}-${status.arch}`);
        this.deviceId.textContent = deviceHash.slice(0, 8);
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    async showHardwareInfo() {
        const modal = document.getElementById('hardwareModal');
        const content = document.getElementById('hardwareInfo');
        
        content.innerHTML = '<div class="loading">Loading hardware information...</div>';
        modal.style.display = 'flex';

        try {
            const response = await fetch('/api/hardware', {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            if (response.ok) {
                const hardware = await response.json();
                this.displayHardwareInfo(hardware, content);
            } else if (response.status === 401) {
                throw new Error('Authentication failed - please refresh the page');
            } else {
                throw new Error('Failed to load hardware information');
            }
        } catch (error) {
            content.innerHTML = `<div class="error">❌ ${error.message}</div>`;
        }
    }

    displayHardwareInfo(hardware, container) {
        container.innerHTML = '';

        // System Info
        const systemSection = this.createHardwareSection('System', {
            'Platform': hardware.platform,
            'Architecture': hardware.architecture,
            'Hostname': hardware.hostname
        });
        container.appendChild(systemSection);

        // CPU Info
        const cpuSection = this.createHardwareSection('CPU', {
            'Manufacturer': hardware.cpu.manufacturer,
            'Model': hardware.cpu.brand,
            'Cores': hardware.cpu.cores,
            'Speed': `${hardware.cpu.speed} GHz`
        });
        container.appendChild(cpuSection);

        // Memory Info
        const memorySection = this.createHardwareSection('Memory', {
            'Total': hardware.memory.total,
            'Used': hardware.memory.used,
            'Usage': `${hardware.memory.usage_percent}%`
        });
        container.appendChild(memorySection);

        // Disk Info
        if (hardware.disks && hardware.disks.length > 0) {
            const diskData = {};
            hardware.disks.forEach((disk, index) => {
                diskData[`Disk ${index + 1}`] = `${disk.device} (${disk.type}, ${disk.size})`;
            });
            const diskSection = this.createHardwareSection('Storage', diskData);
            container.appendChild(diskSection);
        }

        // Graphics Info
        if (hardware.graphics && hardware.graphics.length > 0) {
            const graphicsData = {};
            hardware.graphics.forEach((gpu, index) => {
                graphicsData[`GPU ${index + 1}`] = `${gpu.vendor} ${gpu.model}`;
                if (gpu.vram && gpu.vram !== 'Unknown') {
                    graphicsData[`VRAM ${index + 1}`] = gpu.vram;
                }
            });
            const graphicsSection = this.createHardwareSection('Graphics', graphicsData);
            container.appendChild(graphicsSection);
        }

        // Network Info
        if (hardware.network && hardware.network.length > 0) {
            const networkData = {};
            hardware.network.forEach((net, index) => {
                networkData[`Interface ${index + 1}`] = `${net.iface} (${net.ip4})`;
                networkData[`MAC ${index + 1}`] = net.mac;
            });
            const networkSection = this.createHardwareSection('Network', networkData);
            container.appendChild(networkSection);
        }
    }

    createHardwareSection(title, data) {
        const section = document.createElement('div');
        section.className = 'hardware-section';

        const header = document.createElement('h4');
        header.textContent = title;
        section.appendChild(header);

        for (const [key, value] of Object.entries(data)) {
            const item = document.createElement('div');
            item.className = 'hardware-item';

            const label = document.createElement('span');
            label.className = 'hardware-label';
            label.textContent = key + ':';

            const valueSpan = document.createElement('span');
            valueSpan.className = 'hardware-value';
            valueSpan.textContent = value || 'Unknown';

            item.appendChild(label);
            item.appendChild(valueSpan);
            section.appendChild(item);
        }

        return section;
    }

    async showKnowledgeInfo() {
        const modal = document.getElementById('knowledgeModal');
        const content = document.getElementById('knowledgeInfo');
        
        content.innerHTML = '<div class="loading">Loading knowledge data...</div>';
        modal.style.display = 'flex';

        try {
            const response = await fetch('/api/knowledge', {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            if (response.ok) {
                const knowledge = await response.json();
                this.displayKnowledgeInfo(knowledge, content);
            } else if (response.status === 401) {
                throw new Error('Authentication failed - please refresh the page');
            } else {
                throw new Error('Failed to load knowledge data');
            }
        } catch (error) {
            content.innerHTML = `<div class="error">❌ ${error.message}</div>`;
        }
    }

    displayKnowledgeInfo(knowledge, container) {
        container.innerHTML = '';

        // Platform Commands
        const platformSection = document.createElement('div');
        platformSection.className = 'knowledge-section';
        platformSection.innerHTML = '<h4>📊 Command Success Rates by Platform</h4>';

        for (const [platform, commands] of Object.entries(knowledge.command_success_rates)) {
            const platformDiv = document.createElement('div');
            platformDiv.innerHTML = `<strong>${platform.toUpperCase()}:</strong>`;
            
            for (const [cmd, stats] of Object.entries(commands)) {
                const cmdDiv = document.createElement('div');
                cmdDiv.style.marginLeft = '1rem';
                cmdDiv.style.fontSize = '0.9rem';
                const rate = stats.success_rate || 0;
                const color = rate > 80 ? '#44ff44' : rate > 50 ? '#ffaa00' : '#ff4444';
                cmdDiv.innerHTML = `<span style="color: ${color};">${cmd}</span>: ${rate.toFixed(1)}% (${stats.total_executions || 0} runs)`;
                platformDiv.appendChild(cmdDiv);
            }
            
            platformSection.appendChild(platformDiv);
        }
        container.appendChild(platformSection);

        // Fallback Routes
        const fallbackSection = document.createElement('div');
        fallbackSection.className = 'knowledge-section';
        fallbackSection.innerHTML = '<h4>🔄 Learned Fallback Routes</h4>';

        for (const [platform, routes] of Object.entries(knowledge.fallback_routes)) {
            if (Object.keys(routes).length > 0) {
                const routeDiv = document.createElement('div');
                routeDiv.innerHTML = `<strong>${platform.toUpperCase()}:</strong>`;
                
                for (const [cmd, fallback] of Object.entries(routes)) {
                    const itemDiv = document.createElement('div');
                    itemDiv.style.marginLeft = '1rem';
                    itemDiv.style.fontSize = '0.9rem';
                    itemDiv.innerHTML = `${cmd} → ${fallback.alternatives.join(', ')}`;
                    routeDiv.appendChild(itemDiv);
                }
                
                fallbackSection.appendChild(routeDiv);
            }
        }
        
        if (fallbackSection.children.length === 1) {
            fallbackSection.innerHTML += '<div style="color: #888; font-style: italic;">No fallback routes learned yet</div>';
        }
        
        container.appendChild(fallbackSection);

        // Device Profiles
        const deviceSection = document.createElement('div');
        deviceSection.className = 'knowledge-section';
        deviceSection.innerHTML = '<h4>🖥️ Device Profiles</h4>';

        const deviceCount = Object.keys(knowledge.device_profiles).length;
        deviceSection.innerHTML += `<div>Total devices: ${deviceCount}</div>`;

        container.appendChild(deviceSection);
    }

    async showStatsInfo() {
        const modal = document.getElementById('statsModal');
        const content = document.getElementById('statsInfo');
        
        content.innerHTML = '<div class="loading">Loading statistics...</div>';
        modal.style.display = 'flex';

        try {
            const authHeaders = {
                'Authorization': `Bearer ${this.sessionToken}`
            };
            
            const [statusResponse, knowledgeResponse] = await Promise.all([
                fetch('/api/status', { headers: authHeaders }),
                fetch('/api/knowledge', { headers: authHeaders })
            ]);

            if (statusResponse.ok && knowledgeResponse.ok) {
                const status = await statusResponse.json();
                const knowledge = await knowledgeResponse.json();
                this.displayStatsInfo(status, knowledge, content);
            } else {
                throw new Error('Failed to load statistics');
            }
        } catch (error) {
            content.innerHTML = `<div class="error">❌ ${error.message}</div>`;
        }
    }

    displayStatsInfo(status, knowledge, container) {
        container.innerHTML = '';

        // Server Stats
        const serverSection = this.createStatsSection('🚀 Server Statistics', {
            'Status': status.status.toUpperCase(),
            'Platform': `${status.platform} ${status.arch}`,
            'Node.js Version': status.node_version,
            'Uptime': `${Math.floor(status.uptime / 60)} minutes`,
            'Memory Usage': `${Math.round(status.memory_usage.heapUsed / 1024 / 1024)} MB`,
            'Portable Mode': status.portable_mode ? 'ON' : 'OFF'
        });
        container.appendChild(serverSection);

        // Learning Stats
        let totalCommands = 0;
        let totalExecutions = 0;
        let totalSuccessful = 0;

        for (const platform in knowledge.command_success_rates) {
            const platformCommands = knowledge.command_success_rates[platform];
            for (const cmd in platformCommands) {
                const stats = platformCommands[cmd];
                totalCommands++;
                totalExecutions += stats.total_executions || 0;
                totalSuccessful += stats.successful_executions || 0;
            }
        }

        const successRate = totalExecutions > 0 ? (totalSuccessful / totalExecutions) * 100 : 0;

        const learningSection = this.createStatsSection('🧠 Learning Statistics', {
            'Commands Learned': totalCommands,
            'Total Executions': totalExecutions,
            'Successful Executions': totalSuccessful,
            'Overall Success Rate': `${successRate.toFixed(1)}%`,
            'Platforms': Object.keys(knowledge.command_success_rates).length,
            'Device Profiles': Object.keys(knowledge.device_profiles).length
        });
        container.appendChild(learningSection);

        // Command History Stats
        const historySection = this.createStatsSection('📜 Session Statistics', {
            'Commands in History': this.commandHistory.length,
            'Current Session': 'Active',
            'Last Command': this.commandHistory[0] || 'None'
        });
        container.appendChild(historySection);
    }

    createStatsSection(title, data) {
        const section = document.createElement('div');
        section.className = 'stats-section';
        section.style.marginBottom = '1.5rem';

        const header = document.createElement('h4');
        header.textContent = title;
        header.style.color = '#00ff41';
        header.style.marginBottom = '0.5rem';
        header.style.borderBottom = '1px solid #333';
        header.style.paddingBottom = '0.3rem';
        section.appendChild(header);

        for (const [key, value] of Object.entries(data)) {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.padding = '0.3rem 0';
            item.style.borderBottom = '1px solid #222';

            const label = document.createElement('span');
            label.style.color = '#888';
            label.textContent = key + ':';

            const valueSpan = document.createElement('span');
            valueSpan.style.color = '#ccc';
            valueSpan.style.fontWeight = 'bold';
            valueSpan.textContent = value;

            item.appendChild(label);
            item.appendChild(valueSpan);
            section.appendChild(item);
        }

        return section;
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    clearHistory() {
        this.commandHistory = [];
        this.historyIndex = -1;
        this.updateHistoryDisplay();
        this.showNotification('Command history cleared', 'success');
    }

    exportHistory() {
        if (this.commandHistory.length === 0) {
            this.showNotification('No command history to export', 'warning');
            return;
        }

        const historyData = {
            exported_at: new Date().toISOString(),
            commands: this.commandHistory,
            total_commands: this.commandHistory.length
        };

        const blob = new Blob([JSON.stringify(historyData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `rebel_ai_history_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Command history exported', 'success');
    }

    showContextMenu(x, y) {
        const contextMenu = document.getElementById('contextMenu');
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;

        // Handle context menu actions
        contextMenu.querySelectorAll('.context-item').forEach(item => {
            item.onclick = () => {
                const action = item.dataset.action;
                this.handleContextAction(action);
                this.hideContextMenu();
            };
        });
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        contextMenu.style.display = 'none';
    }

    handleContextAction(action) {
        switch (action) {
            case 'copy':
                // Copy selected text or last output
                if (window.getSelection().toString()) {
                    navigator.clipboard.writeText(window.getSelection().toString());
                    this.showNotification('Text copied to clipboard', 'success');
                }
                break;
            case 'paste':
                // Paste from clipboard to command input
                navigator.clipboard.readText().then(text => {
                    this.commandInput.value = text;
                    this.commandInput.focus();
                });
                break;
            case 'clear':
                // Clear terminal output
                this.clearTerminal();
                break;
            case 'help':
                // Show help
                this.showHelp();
                break;
        }
    }

    clearTerminal() {
        this.terminalOutput.innerHTML = `
            <div class="welcome-message">
                <div class="ascii-art">
🚀 REBEL AI - Dijkstra Edition 🚀
═══════════════════════════════════
Portable AI Terminal with Self-Learning
Cross-Platform | Optimized | Intelligent
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

    showHelp() {
        const helpText = `
🚀 REBEL AI - Dijkstra Edition Help

KEYBOARD SHORTCUTS:
• Enter: Execute command
• ↑/↓: Navigate command history
• Right-click: Context menu

QUICK ACTIONS:
• 📁 Files: List files and directories
• 👤 Who Am I: Current user information
• 📍 Location: Current directory
• 🕒 Date: Current date and time
• 💾 Disk: Disk usage information
• ⚙️ Processes: Running processes

FEATURES:
• Cross-platform command execution
• AI-powered command optimization
• Self-learning knowledge database
• Automatic fallback routes
• Command history and export
        `;

        this.addCommandToOutput('help');
        const helpDiv = document.createElement('div');
        helpDiv.className = 'command-output';
        helpDiv.style.whiteSpace = 'pre-line';
        helpDiv.textContent = helpText;
        this.terminalOutput.appendChild(helpDiv);
        this.scrollToBottom();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        const container = document.getElementById('notifications');
        container.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    scrollToBottom() {
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }

    showLoading(message) {
        const loadingStatus = document.querySelector('.loading-status');
        if (loadingStatus) {
            loadingStatus.textContent = message;
        }
    }

    hideLoading() {
        this.loadingScreen.style.display = 'none';
        this.mainApp.style.display = 'grid';
        this.mainApp.classList.add('fade-in');
    }

    showError(message) {
        this.hideLoading();
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.background = '#ff4444';
        errorDiv.style.color = '#fff';
        errorDiv.style.padding = '2rem';
        errorDiv.style.borderRadius = '10px';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.zIndex = '10000';
        errorDiv.innerHTML = `
            <h3>❌ Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #fff; color: #000; border: none; border-radius: 5px; cursor: pointer;">Reload Page</button>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Initialize the terminal when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rebelTerminal = new REBELTerminalUI();
});

// Handle page visibility changes for optimization
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.rebelTerminal) {
        // Refresh stats when page becomes visible
        window.rebelTerminal.refreshLearningStats();
    }
});

console.log('🚀 REBEL AI - Dijkstra Edition Frontend Loaded');
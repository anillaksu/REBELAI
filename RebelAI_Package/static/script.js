// ==========================================
// ⚡ REBEL AI - Terminal Interface JavaScript
// ==========================================
// Cross-platform Command Manager Frontend

class REBELTerminal {
    constructor() {
        this.authToken = null;
        this.currentCommand = '';
        this.commandHistory = [];
        this.historyIndex = -1;
        this.isExecuting = false;
        
        // DOM Elements
        this.authOverlay = document.getElementById('authOverlay');
        this.appContainer = document.getElementById('appContainer');
        this.terminalOutput = document.getElementById('terminalOutput');
        this.commandInput = document.getElementById('commandInput');
        this.terminalPrompt = document.getElementById('terminalPrompt');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Initialize
        this.setupEventListeners();
        this.checkAuthentication();
        
        console.log('⚡ REBEL AI Terminal initialized');
    }
    
    setupEventListeners() {
        // Authentication
        document.getElementById('authToken').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.authenticate();
        });
        
        // Command input
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
        
        // Focus on command input
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sidebar') && !e.target.closest('.modal')) {
                this.commandInput.focus();
            }
        });
        
        // Auto-refresh status
        setInterval(() => {
            if (this.authToken) {
                this.loadSystemStatus();
            }
        }, 30000); // 30 seconds
    }
    
    checkAuthentication() {
        // Check if token exists in sessionStorage
        const storedToken = sessionStorage.getItem('rebel_auth_token');
        if (storedToken) {
            this.authToken = storedToken;
            this.showMainApp();
        } else {
            this.showAuthOverlay();
        }
    }
    
    async authenticate() {
        const tokenInput = document.getElementById('authToken');
        const token = tokenInput.value.trim();
        const errorDiv = document.getElementById('authError');
        
        if (!token) {
            this.showError(errorDiv, 'Token gerekli!');
            return;
        }
        
        try {
            // Test token with a simple API call
            const response = await fetch('/api/status', {
                headers: {
                    'X-Auth-Token': token
                }
            });
            
            if (response.ok) {
                this.authToken = token;
                sessionStorage.setItem('rebel_auth_token', token);
                this.showMainApp();
                this.addToOutput('🎉 REBEL AI sistemine başarıyla giriş yapıldı!', 'success');
                this.loadInitialData();
            } else {
                this.showError(errorDiv, 'Geçersiz token!');
            }
        } catch (error) {
            this.showError(errorDiv, 'Bağlantı hatası: ' + error.message);
        }
    }
    
    logout() {
        this.authToken = null;
        sessionStorage.removeItem('rebel_auth_token');
        this.showAuthOverlay();
        this.clearOutput();
    }
    
    showAuthOverlay() {
        this.authOverlay.style.display = 'flex';
        this.appContainer.style.display = 'none';
        document.getElementById('authToken').focus();
    }
    
    showMainApp() {
        this.authOverlay.style.display = 'none';
        this.appContainer.style.display = 'grid';
        this.commandInput.focus();
    }
    
    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
    
    async loadInitialData() {
        try {
            // Load system status
            await this.loadSystemStatus();
            
            // Load command history
            await this.loadHistory();
            
            // Load favorites
            await this.loadFavorites();
            
            // Update platform info
            this.updatePlatformInfo();
            
        } catch (error) {
            console.error('Initial data loading error:', error);
        }
    }
    
    async loadSystemStatus() {
        try {
            const response = await fetch('/api/status', {
                headers: { 'X-Auth-Token': this.authToken }
            });
            
            if (response.ok) {
                const status = await response.json();
                this.updateStatusDisplay(status);
            }
        } catch (error) {
            console.error('Status loading error:', error);
        }
    }
    
    updateStatusDisplay(status) {
        // Update header
        document.getElementById('platformInfo').textContent = 
            `Platform: ${status.platform} (${status.shell})`;
        
        document.getElementById('aiStatus').textContent = 
            `🤖 AI: ${status.ai_status.openai_available ? '✅ Aktif' : '❌ Pasif'}`;
        
        // Update sidebar status
        document.getElementById('statusPlatform').textContent = status.platform;
        document.getElementById('statusShell').textContent = status.shell;
        document.getElementById('statusAI').textContent = 
            status.ai_status.openai_available ? '✅ Aktif' : '❌ Pasif';
        document.getElementById('statusScheduler').textContent = 
            status.scheduler_enabled ? '✅ Aktif' : '❌ Pasif';
        
        // Update terminal prompt
        this.terminalPrompt.textContent = `rebel@${status.platform}:~$`;
    }
    
    updatePlatformInfo() {
        // This is called after authentication to show initial info
        this.addToOutput('🔍 Sistem bilgileri yükleniyor...', 'info');
    }
    
    async executeCommand() {
        if (this.isExecuting) return;
        
        const command = this.commandInput.value.trim();
        if (!command) return;
        
        // Add to history
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        
        // Show command in output
        this.addCommandToOutput(command);
        
        // Clear input
        this.commandInput.value = '';
        
        // Show loading
        this.showLoading();
        this.isExecuting = true;
        
        try {
            const useAI = document.getElementById('useAI').checked;
            const useScheduler = document.getElementById('useScheduler').checked;
            
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Token': this.authToken
                },
                body: JSON.stringify({
                    command: command,
                    use_ai: useAI,
                    use_scheduler: useScheduler
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.displayCommandResult(result);
            } else {
                const error = await response.json();
                this.addToOutput(`❌ Hata: ${error.error}`, 'error');
            }
            
        } catch (error) {
            this.addToOutput(`❌ Bağlantı hatası: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
            this.isExecuting = false;
            this.commandInput.focus();
        }
    }
    
    addCommandToOutput(command) {
        const timestamp = new Date().toLocaleTimeString();
        const prompt = this.terminalPrompt.textContent;
        
        const entry = document.createElement('div');
        entry.className = 'command-entry';
        // Secure DOM manipulation instead of innerHTML
        const commandInputDiv = document.createElement('div');
        commandInputDiv.className = 'command-input';
        commandInputDiv.textContent = `${prompt} ${command}`;
        
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'timestamp';
        timestampDiv.textContent = timestamp;
        
        entry.appendChild(commandInputDiv);
        entry.appendChild(timestampDiv);
        
        this.terminalOutput.appendChild(entry);
        this.scrollToBottom();
    }
    
    displayCommandResult(result) {
        const entry = this.terminalOutput.lastElementChild;
        
        // AI explanation
        if (result.ai_explanation && result.ai_explanation !== 'AI kullanılmadı') {
            const aiDiv = document.createElement('div');
            aiDiv.className = 'ai-explanation';
            aiDiv.textContent = `🤖 AI: ${result.ai_explanation}`;
            entry.appendChild(aiDiv);
        }
        
        // Optimization info
        if (result.optimization_info && result.optimization_info.optimization_applied) {
            const optDiv = document.createElement('div');
            optDiv.className = 'ai-explanation';
            optDiv.textContent = `🧠 Scheduler: ${result.optimized_commands.length} komut optimize edildi`;
            entry.appendChild(optDiv);
        }
        
        // Command results
        result.results.forEach((cmdResult, index) => {
            if (result.optimized_commands.length > 1) {
                const cmdDiv = document.createElement('div');
                cmdDiv.className = 'command-input';
                cmdDiv.textContent = `${index + 1}. ${result.optimized_commands[index]}`;
                entry.appendChild(cmdDiv);
            }
            
            const outputDiv = document.createElement('div');
            outputDiv.className = `command-output ${cmdResult.success ? 'command-success' : 'command-error'}`;
            
            let outputText = '';
            if (cmdResult.output) {
                outputText += cmdResult.output;
            }
            if (cmdResult.error) {
                outputText += cmdResult.error;
            }
            if (!outputText) {
                outputText = cmdResult.success ? '✅ Komut başarıyla çalıştırıldı' : '❌ Komut çalıştırma hatası';
            }
            
            outputDiv.textContent = outputText;
            entry.appendChild(outputDiv);
            
            // AI error analysis
            if (cmdResult.ai_error_analysis) {
                const errorAnalysisDiv = document.createElement('div');
                errorAnalysisDiv.className = 'ai-explanation';
                errorAnalysisDiv.textContent = `🔍 AI Analiz: ${cmdResult.ai_error_analysis}`;
                entry.appendChild(errorAnalysisDiv);
            }
        });
        
        this.scrollToBottom();
    }
    
    addToOutput(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'command-entry';
        
        const outputDiv = document.createElement('div');
        outputDiv.className = `command-output command-${type}`;
        outputDiv.textContent = `[${timestamp}] ${message}`;
        
        entry.appendChild(outputDiv);
        this.terminalOutput.appendChild(entry);
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
    }
    
    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;
        
        if (direction === 'up') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.commandInput.value = this.commandHistory[this.historyIndex];
            }
        } else if (direction === 'down') {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.commandInput.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.commandInput.value = '';
            }
        }
    }
    
    insertCommand(command) {
        this.commandInput.value = command;
        this.commandInput.focus();
    }
    
    clearOutput() {
        this.terminalOutput.innerHTML = `
            <div class="welcome-message">
                <div class="ascii-art">
██████╗ ███████╗██████╗ ███████╗██╗         █████╗ ██╗
██╔══██╗██╔════╝██╔══██╗██╔════╝██║        ██╔══██╗██║
██████╔╝█████╗  ██████╔╝█████╗  ██║        ███████║██║
██╔══██╗██╔══╝  ██╔══██╗██╔══╝  ██║        ██╔══██║██║
██║  ██║███████╗██████╔╝███████╗███████╗   ██║  ██║██║
╚═╝  ╚═╝╚══════╝╚═════╝ ╚══════╝╚══════╝   ╚═╝  ╚═╝╚═╝
                </div>
                <div class="welcome-text">
                    🌟 <strong>REBEL AI Komut Yöneticisi'ne Hoş Geldiniz!</strong><br>
                    🚀 Cross-Platform | 🤖 AI-Powered | 🧠 Dijkstra Optimized<br>
                    💬 Doğal dilde komut yazın, AI yorumlayacak!
                </div>
            </div>
        `;
    }
    
    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }
    
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
    
    async loadHistory() {
        try {
            const response = await fetch('/api/history', {
                headers: { 'X-Auth-Token': this.authToken }
            });
            
            if (response.ok) {
                const history = await response.json();
                this.displayHistory(history);
            }
        } catch (error) {
            console.error('History loading error:', error);
        }
    }
    
    displayHistory(history) {
        const historyList = document.getElementById('historyList');
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-empty">Henüz komut çalıştırılmadı</div>';
            return;
        }
        
        historyList.innerHTML = history.slice(-10).reverse().map(item => `
            <div class="history-item" onclick="terminal.insertCommand('${item.command.replace(/'/g, "\\'")}')">
                <div class="command">${item.command}</div>
                <div class="timestamp">${new Date(item.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
    }
    
    async loadFavorites() {
        try {
            const response = await fetch('/api/favorites', {
                headers: { 'X-Auth-Token': this.authToken }
            });
            
            if (response.ok) {
                const favorites = await response.json();
                this.displayFavorites(favorites);
            }
        } catch (error) {
            console.error('Favorites loading error:', error);
        }
    }
    
    displayFavorites(favorites) {
        const favoritesList = document.getElementById('favoritesList');
        
        if (favorites.length === 0) {
            favoritesList.innerHTML = '<div class="history-empty">Henüz favori eklenmedi</div>';
            return;
        }
        
        favoritesList.innerHTML = favorites.map(item => `
            <div class="favorite-item" onclick="terminal.insertCommand('${item.replace(/'/g, "\\'")}')">
                <div class="command">${item}</div>
            </div>
        `).join('');
    }
    
    clearHistory() {
        if (confirm('Komut geçmişini temizlemek istediğinizden emin misiniz?')) {
            this.commandHistory = [];
            this.historyIndex = -1;
            document.getElementById('historyList').innerHTML = 
                '<div class="history-empty">Geçmiş temizlendi</div>';
        }
    }
    
    exportHistory() {
        if (this.commandHistory.length === 0) {
            alert('Dışa aktarılacak geçmiş bulunamadı');
            return;
        }
        
        const content = this.commandHistory.map((cmd, index) => 
            `${index + 1}. ${cmd}`
        ).join('\\n');
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rebel-ai-history-${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    addToFavorites() {
        const command = this.commandInput.value.trim();
        if (!command) {
            const lastCommand = this.commandHistory[this.commandHistory.length - 1];
            if (lastCommand) {
                this.addFavoriteCommand(lastCommand);
            } else {
                alert('Favorilere eklenecek komut bulunamadı');
            }
        } else {
            this.addFavoriteCommand(command);
        }
    }
    
    addFavoriteCommand(command) {
        // This would typically make an API call to save the favorite
        // For now, we'll just add it to the display
        const favoritesList = document.getElementById('favoritesList');
        
        const item = document.createElement('div');
        item.className = 'favorite-item';
        item.onclick = () => this.insertCommand(command);
        item.innerHTML = `<div class="command">${command}</div>`;
        
        favoritesList.appendChild(item);
        
        this.addToOutput(`⭐ Favorilere eklendi: ${command}`, 'success');
    }
    
    async viewLogs() {
        const modal = document.getElementById('logsModal');
        const content = document.getElementById('logsContent');
        
        modal.style.display = 'flex';
        content.textContent = 'Loglar yükleniyor...';
        
        try {
            const response = await fetch('/api/logs', {
                headers: { 'X-Admin-Token': this.authToken }
            });
            
            if (response.ok) {
                const logs = await response.text();
                content.textContent = logs;
            } else {
                content.textContent = 'Loglar yüklenemedi. Admin yetkisi gerekebilir.';
            }
        } catch (error) {
            content.textContent = `Log yükleme hatası: ${error.message}`;
        }
    }
    
    async downloadLogs() {
        try {
            const response = await fetch('/api/logs', {
                headers: { 'X-Admin-Token': this.authToken }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rebel-ai-logs-${new Date().toISOString().slice(0,10)}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                alert('Log indirme hatası. Admin yetkisi gerekebilir.');
            }
        } catch (error) {
            alert(`Log indirme hatası: ${error.message}`);
        }
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
}

// Global functions for HTML onclick handlers
let terminal;

function authenticate() {
    terminal.authenticate();
}

function logout() {
    terminal.logout();
}

function executeCommand() {
    terminal.executeCommand();
}

function insertCommand(command) {
    terminal.insertCommand(command);
}

function clearOutput() {
    terminal.clearOutput();
}

function loadHistory() {
    terminal.loadHistory();
}

function clearHistory() {
    terminal.clearHistory();
}

function exportHistory() {
    terminal.exportHistory();
}

function addToFavorites() {
    terminal.addToFavorites();
}

function loadFavorites() {
    terminal.loadFavorites();
}

function loadSystemStatus() {
    terminal.loadSystemStatus();
}

function viewLogs() {
    terminal.viewLogs();
}

function downloadLogs() {
    terminal.downloadLogs();
}

function closeModal(modalId) {
    terminal.closeModal(modalId);
}

// Initialize terminal when page loads
document.addEventListener('DOMContentLoaded', () => {
    terminal = new REBELTerminal();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && terminal && terminal.authToken) {
        // Refresh status when page becomes visible
        terminal.loadSystemStatus();
    }
});

console.log('⚡ REBEL AI Terminal Script Loaded');
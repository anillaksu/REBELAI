// ==========================================
// 🧠 AI Command Intelligence System
// ==========================================
// Advanced AI-powered command suggestions and natural language processing

class AICommandIntelligence {
    constructor() {
        this.commandPatterns = new Map();
        this.userHistory = [];
        this.commonCommands = this.initializeCommonCommands();
        this.nlpPatterns = this.initializeNLPPatterns();
        this.errorSuggestions = this.initializeErrorSuggestions();
        this.contextAwareness = {
            currentDirectory: '/',
            recentFiles: [],
            systemInfo: {},
            installedPackages: []
        };
    }

    initializeCommonCommands() {
        return {
            // File operations
            'file_list': ['ls', 'ls -la', 'ls -lh', 'find . -name', 'tree'],
            'file_search': ['grep -r', 'find . -type f -name', 'locate', 'which'],
            'file_edit': ['nano', 'vim', 'code', 'gedit'],
            'file_copy': ['cp', 'cp -r', 'rsync -av'],
            'file_move': ['mv', 'rename'],
            'file_delete': ['rm', 'rm -rf', 'rmdir'],
            'file_permissions': ['chmod', 'chown', 'chgrp'],

            // System monitoring
            'system_info': ['uname -a', 'lscpu', 'lsb_release -a', 'hostnamectl'],
            'process_list': ['ps aux', 'htop', 'top', 'pgrep', 'killall'],
            'memory_info': ['free -h', 'df -h', 'du -sh', 'lsblk'],
            'network_info': ['ifconfig', 'ip addr', 'netstat -tuln', 'ss -tuln'],

            // Development tools
            'git_commands': ['git status', 'git add .', 'git commit -m', 'git push', 'git pull'],
            'package_management': ['npm install', 'pip install', 'apt install', 'yum install'],
            'docker_commands': ['docker ps', 'docker build', 'docker run', 'docker-compose up'],

            // Turkish common commands
            'turkish_commands': {
                'dosyalar': 'ls -la',
                'dizin': 'pwd',
                'git': 'cd',
                'listele': 'ls',
                'göster': 'cat',
                'ara': 'find',
                'sil': 'rm',
                'kopyala': 'cp',
                'taşı': 'mv',
                'izinler': 'chmod',
                'işlemler': 'ps aux',
                'bellek': 'free -h',
                'disk': 'df -h',
                'ağ': 'ifconfig'
            }
        };
    }

    initializeNLPPatterns() {
        return [
            // File operations
            {
                pattern: /list (all )?files?( in (.+))?/i,
                command: (match) => match[3] ? `ls -la "${match[3]}"` : 'ls -la'
            },
            {
                pattern: /show (me )?the contents? of (.+)/i,
                command: (match) => `cat "${match[2]}"`
            },
            {
                pattern: /find (file|files) (named|called) (.+)/i,
                command: (match) => `find . -name "*${match[3]}*"`
            },
            {
                pattern: /search for "(.+)" in (.+)/i,
                command: (match) => `grep -r "${match[1]}" "${match[2]}"`
            },
            {
                pattern: /delete (file|folder|directory) (.+)/i,
                command: (match) => match[1] === 'folder' || match[1] === 'directory' 
                    ? `rm -rf "${match[2]}"` : `rm "${match[2]}"`
            },
            {
                pattern: /copy (.+) to (.+)/i,
                command: (match) => `cp "${match[1]}" "${match[2]}"`
            },
            {
                pattern: /move (.+) to (.+)/i,
                command: (match) => `mv "${match[1]}" "${match[2]}"`
            },

            // System operations
            {
                pattern: /what processes are running/i,
                command: () => 'ps aux'
            },
            {
                pattern: /show (me )?system info(rmation)?/i,
                command: () => 'uname -a && lscpu'
            },
            {
                pattern: /check disk space/i,
                command: () => 'df -h'
            },
            {
                pattern: /show memory usage/i,
                command: () => 'free -h'
            },
            {
                pattern: /kill process (.+)/i,
                command: (match) => `pkill -f "${match[1]}"`
            },

            // Network operations
            {
                pattern: /check network (connection|status)/i,
                command: () => 'ping -c 4 8.8.8.8'
            },
            {
                pattern: /show (network|ip) (info|address)/i,
                command: () => 'ip addr show'
            },
            {
                pattern: /download (.+)/i,
                command: (match) => `wget "${match[1]}"`
            },

            // Development operations
            {
                pattern: /git status/i,
                command: () => 'git status'
            },
            {
                pattern: /git add everything/i,
                command: () => 'git add .'
            },
            {
                pattern: /git commit with message "(.+)"/i,
                command: (match) => `git commit -m "${match[1]}"`
            },
            {
                pattern: /install package (.+)/i,
                command: (match) => this.getInstallCommand(match[1])
            },

            // Turkish language patterns
            {
                pattern: /(dosyaları|dosyalar) (göster|listele)/i,
                command: () => 'ls -la'
            },
            {
                pattern: /(.+) dosyasını göster/i,
                command: (match) => `cat "${match[1]}"`
            },
            {
                pattern: /(.+) ara/i,
                command: (match) => `find . -name "*${match[1]}*"`
            },
            {
                pattern: /(sistem|bilgisayar) bilgilerini göster/i,
                command: () => 'uname -a && lscpu'
            },
            {
                pattern: /bellek kullanımını göster/i,
                command: () => 'free -h'
            },
            {
                pattern: /disk alanını kontrol et/i,
                command: () => 'df -h'
            }
        ];
    }

    initializeErrorSuggestions() {
        return {
            'command not found': (command) => {
                const suggestions = this.findSimilarCommands(command);
                return {
                    error: 'Command not found',
                    suggestions: suggestions.length > 0 ? suggestions : ['Check if the command is installed', 'Try using which or type to locate the command'],
                    installSuggestions: this.getInstallSuggestions(command)
                };
            },
            'permission denied': (path) => ({
                error: 'Permission denied',
                suggestions: [
                    `Try: sudo ${path}`,
                    `Check permissions: ls -la ${path}`,
                    `Change permissions: chmod +x ${path}`,
                    'Run as administrator if needed'
                ]
            }),
            'no such file or directory': (path) => ({
                error: 'File or directory not found',
                suggestions: [
                    `Check if path exists: ls -la ${path}`,
                    `Search for similar files: find . -name "*${path.split('/').pop()}*"`,
                    'Verify spelling and case sensitivity',
                    `Create directory if needed: mkdir -p ${path}`
                ]
            }),
            'syntax error': (command) => ({
                error: 'Syntax error',
                suggestions: [
                    'Check command syntax with --help',
                    'Verify quotes and special characters',
                    'Use proper escaping for spaces',
                    `Try: man ${command.split(' ')[0]}`
                ]
            })
        };
    }

    // Smart command suggestions based on context and history
    getSuggestions(partial, context = {}) {
        const suggestions = [];
        
        // Update context
        this.updateContext(context);
        
        // Direct command matches
        const directMatches = this.getDirectMatches(partial);
        suggestions.push(...directMatches);
        
        // History-based suggestions
        const historyMatches = this.getHistoryMatches(partial);
        suggestions.push(...historyMatches);
        
        // Context-aware suggestions
        const contextSuggestions = this.getContextSuggestions(partial);
        suggestions.push(...contextSuggestions);
        
        // NLP-based suggestions
        const nlpSuggestions = this.getNLPSuggestions(partial);
        suggestions.push(...nlpSuggestions);
        
        // Remove duplicates and sort by relevance
        return this.rankSuggestions(suggestions, partial);
    }

    getDirectMatches(partial) {
        const matches = [];
        const lowerPartial = partial.toLowerCase();
        
        // Check common commands
        Object.values(this.commonCommands).forEach(commandGroup => {
            if (Array.isArray(commandGroup)) {
                commandGroup.forEach(cmd => {
                    if (cmd.toLowerCase().startsWith(lowerPartial)) {
                        matches.push({
                            command: cmd,
                            type: 'direct',
                            score: this.calculateScore(cmd, partial)
                        });
                    }
                });
            }
        });
        
        // Check Turkish commands
        Object.entries(this.commonCommands.turkish_commands).forEach(([turkish, english]) => {
            if (turkish.toLowerCase().includes(lowerPartial)) {
                matches.push({
                    command: english,
                    type: 'turkish',
                    original: turkish,
                    score: this.calculateScore(turkish, partial)
                });
            }
        });
        
        return matches;
    }

    getHistoryMatches(partial) {
        return this.userHistory
            .filter(cmd => cmd.toLowerCase().includes(partial.toLowerCase()))
            .map(cmd => ({
                command: cmd,
                type: 'history',
                score: this.calculateScore(cmd, partial) + 0.1 // Boost for history
            }));
    }

    getContextSuggestions(partial) {
        const suggestions = [];
        const { currentDirectory, recentFiles } = this.contextAwareness;
        
        // File-based suggestions
        if (partial.includes('./') || partial.includes('../')) {
            recentFiles.forEach(file => {
                if (file.name.toLowerCase().includes(partial.toLowerCase())) {
                    suggestions.push({
                        command: partial + file.name,
                        type: 'context',
                        score: 0.8
                    });
                }
            });
        }
        
        // Directory-specific suggestions
        if (currentDirectory.includes('git')) {
            const gitCommands = this.commonCommands.git_commands;
            gitCommands.forEach(cmd => {
                if (cmd.toLowerCase().includes(partial.toLowerCase())) {
                    suggestions.push({
                        command: cmd,
                        type: 'context-git',
                        score: 0.9
                    });
                }
            });
        }
        
        return suggestions;
    }

    getNLPSuggestions(partial) {
        const suggestions = [];
        
        this.nlpPatterns.forEach(pattern => {
            if (pattern.pattern.test(partial)) {
                const match = partial.match(pattern.pattern);
                const command = typeof pattern.command === 'function' 
                    ? pattern.command(match) 
                    : pattern.command;
                
                suggestions.push({
                    command: command,
                    type: 'nlp',
                    confidence: 0.9,
                    original: partial
                });
            }
        });
        
        return suggestions;
    }

    // Natural language to command translation
    translateNaturalLanguage(input) {
        const lowerInput = input.toLowerCase().trim();
        
        // Check each NLP pattern
        for (const pattern of this.nlpPatterns) {
            const match = lowerInput.match(pattern.pattern);
            if (match) {
                const command = typeof pattern.command === 'function' 
                    ? pattern.command(match) 
                    : pattern.command;
                
                return {
                    success: true,
                    originalInput: input,
                    translatedCommand: command,
                    confidence: 0.95,
                    type: 'nlp'
                };
            }
        }
        
        // Check Turkish commands
        const turkishWords = lowerInput.split(' ');
        for (const [turkish, english] of Object.entries(this.commonCommands.turkish_commands)) {
            if (turkishWords.includes(turkish)) {
                return {
                    success: true,
                    originalInput: input,
                    translatedCommand: english,
                    confidence: 0.9,
                    type: 'turkish'
                };
            }
        }
        
        return {
            success: false,
            originalInput: input,
            translatedCommand: input,
            confidence: 0,
            type: 'unknown'
        };
    }

    // Error analysis and suggestions
    analyzeError(command, error, output) {
        const errorAnalysis = {
            command,
            error,
            output,
            suggestions: [],
            severity: 'medium',
            category: 'unknown'
        };
        
        const lowerError = error.toLowerCase();
        
        // Analyze common error patterns
        if (lowerError.includes('command not found')) {
            errorAnalysis.category = 'command_not_found';
            errorAnalysis.suggestions = this.errorSuggestions['command not found'](command);
        } else if (lowerError.includes('permission denied')) {
            errorAnalysis.category = 'permission_denied';
            errorAnalysis.severity = 'high';
            errorAnalysis.suggestions = this.errorSuggestions['permission denied'](command);
        } else if (lowerError.includes('no such file or directory')) {
            errorAnalysis.category = 'file_not_found';
            errorAnalysis.suggestions = this.errorSuggestions['no such file or directory'](command);
        } else if (lowerError.includes('syntax error')) {
            errorAnalysis.category = 'syntax_error';
            errorAnalysis.suggestions = this.errorSuggestions['syntax error'](command);
        }
        
        // Add learning from this error
        this.learnFromError(command, error, errorAnalysis);
        
        return errorAnalysis;
    }

    // Helper methods
    calculateScore(command, partial) {
        const commandLower = command.toLowerCase();
        const partialLower = partial.toLowerCase();
        
        if (commandLower === partialLower) return 1.0;
        if (commandLower.startsWith(partialLower)) return 0.9;
        if (commandLower.includes(partialLower)) return 0.7;
        
        // Levenshtein distance score
        const distance = this.levenshteinDistance(commandLower, partialLower);
        return Math.max(0, 1 - (distance / Math.max(commandLower.length, partialLower.length)));
    }

    levenshteinDistance(a, b) {
        const matrix = [];
        
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[b.length][a.length];
    }

    rankSuggestions(suggestions, partial) {
        return suggestions
            .sort((a, b) => (b.score || b.confidence || 0) - (a.score || a.confidence || 0))
            .slice(0, 10) // Top 10 suggestions
            .map(suggestion => ({
                ...suggestion,
                displayText: this.formatSuggestion(suggestion, partial)
            }));
    }

    formatSuggestion(suggestion, partial) {
        const { command, type, original, confidence } = suggestion;
        let display = command;
        
        if (type === 'turkish' && original) {
            display = `${command} (Turkish: ${original})`;
        } else if (type === 'nlp' && original) {
            display = `${command} (from: "${original}")`;
        } else if (type === 'history') {
            display = `${command} (from history)`;
        }
        
        return display;
    }

    updateContext(context) {
        if (context.currentDirectory) {
            this.contextAwareness.currentDirectory = context.currentDirectory;
        }
        if (context.recentFiles) {
            this.contextAwareness.recentFiles = context.recentFiles;
        }
        if (context.systemInfo) {
            this.contextAwareness.systemInfo = { ...this.contextAwareness.systemInfo, ...context.systemInfo };
        }
    }

    learnFromCommand(command, success = true) {
        // Add to history
        this.userHistory.push(command);
        if (this.userHistory.length > 100) {
            this.userHistory.shift(); // Keep last 100 commands
        }
        
        // Update command patterns
        const baseCommand = command.split(' ')[0];
        const count = this.commandPatterns.get(baseCommand) || 0;
        this.commandPatterns.set(baseCommand, count + 1);
    }

    learnFromError(command, error, analysis) {
        // Store error patterns for future suggestions
        const errorKey = `${command}_${error}`;
        // Could implement machine learning here for better error prediction
    }

    findSimilarCommands(command) {
        const allCommands = [];
        Object.values(this.commonCommands).forEach(group => {
            if (Array.isArray(group)) {
                allCommands.push(...group);
            }
        });
        
        return allCommands
            .map(cmd => ({
                command: cmd,
                score: this.calculateScore(cmd, command)
            }))
            .filter(item => item.score > 0.5)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(item => item.command);
    }

    getInstallCommand(packageName) {
        // Detect package manager and return appropriate install command
        if (this.contextAwareness.systemInfo.packageManager) {
            const pm = this.contextAwareness.systemInfo.packageManager;
            return `${pm} install ${packageName}`;
        }
        
        // Default to common package managers
        return `npm install ${packageName} # or pip install ${packageName} # or apt install ${packageName}`;
    }

    getInstallSuggestions(command) {
        const suggestions = [];
        
        // Common package managers
        const packageManagers = ['apt', 'yum', 'brew', 'npm', 'pip', 'cargo'];
        packageManagers.forEach(pm => {
            suggestions.push(`${pm} install ${command}`);
        });
        
        return suggestions;
    }

    // Export learning data for persistence
    exportLearningData() {
        return {
            commandPatterns: Object.fromEntries(this.commandPatterns),
            userHistory: this.userHistory.slice(-50), // Last 50 commands
            contextAwareness: this.contextAwareness
        };
    }

    // Import learning data for persistence
    importLearningData(data) {
        if (data.commandPatterns) {
            this.commandPatterns = new Map(Object.entries(data.commandPatterns));
        }
        if (data.userHistory) {
            this.userHistory = data.userHistory;
        }
        if (data.contextAwareness) {
            this.contextAwareness = { ...this.contextAwareness, ...data.contextAwareness };
        }
    }
}

module.exports = AICommandIntelligence;
// ==========================================
// 🛠️ REBEL AI - Command Executor
// ==========================================
// Cross-platform command execution engine

const { exec, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class CommandExecutor {
    constructor() {
        this.platform = os.platform();
        this.logFile = path.join(__dirname, '../data/logs/commands.log');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    async execute(command) {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        
        try {
            // Security check
            if (this.isCommandBlocked(command)) {
                const result = {
                    success: false,
                    command: command,
                    output: '',
                    error: '🚫 Command blocked for security reasons',
                    platform: this.platform,
                    execution_time: 0,
                    timestamp: timestamp
                };
                this.logCommand(result);
                return result;
            }

            // Execute command based on platform
            const result = await this.executeCommand(command);
            result.execution_time = Date.now() - startTime;
            result.timestamp = timestamp;
            result.platform = this.platform;

            // Log the command
            this.logCommand(result);
            
            return result;

        } catch (error) {
            const result = {
                success: false,
                command: command,
                output: '',
                error: error.message,
                platform: this.platform,
                execution_time: Date.now() - startTime,
                timestamp: timestamp
            };
            this.logCommand(result);
            return result;
        }
    }

    executeCommand(command) {
        return new Promise((resolve, reject) => {
            const options = {
                timeout: 30000, // 30 seconds timeout
                maxBuffer: 1024 * 1024, // 1MB buffer
                encoding: 'utf8'
            };

            // Handle different platforms
            let execCommand = command;
            let shell = true;

            if (this.platform === 'win32') {
                // Windows specific handling
                execCommand = command;
                options.shell = 'cmd.exe';
            } else {
                // Unix-like systems
                options.shell = '/bin/bash';
            }

            exec(execCommand, options, (error, stdout, stderr) => {
                const result = {
                    success: !error,
                    command: command,
                    output: stdout || '',
                    error: stderr || (error ? error.message : ''),
                    exit_code: error ? error.code : 0
                };

                resolve(result);
            });
        });
    }

    isCommandBlocked(command) {
        const blockedCommands = [
            // Dangerous commands
            'rm -rf', 'del /f', 'format', 'fdisk',
            'dd if=', 'mkfs', 'parted',
            // Network attacks
            'ping -f', 'wget', 'curl -X POST',
            // System modification
            'chmod 777', 'chown root', 'sudo su',
            // Package management (can be resource intensive)
            'apt-get install', 'yum install', 'npm install -g'
        ];

        const lowercaseCommand = command.toLowerCase();
        return blockedCommands.some(blocked => lowercaseCommand.includes(blocked));
    }

    logCommand(result) {
        try {
            const logEntry = {
                timestamp: result.timestamp,
                platform: result.platform,
                command: result.command,
                success: result.success,
                execution_time: result.execution_time,
                output_length: result.output ? result.output.length : 0,
                has_error: !!result.error,
                is_fallback: result.isFallback || false,
                original_command: result.originalCommand || null
            };

            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(this.logFile, logLine);
        } catch (error) {
            console.error('Failed to log command:', error);
        }
    }

    // Get platform-specific command alternatives
    getPlatformCommand(genericCommand) {
        const commandMap = {
            'list_files': {
                'win32': 'dir',
                'linux': 'ls -la',
                'darwin': 'ls -la'
            },
            'current_directory': {
                'win32': 'cd',
                'linux': 'pwd',
                'darwin': 'pwd'
            },
            'disk_space': {
                'win32': 'dir',
                'linux': 'df -h',
                'darwin': 'df -h'
            },
            'processes': {
                'win32': 'tasklist',
                'linux': 'ps aux',
                'darwin': 'ps aux'
            },
            'network_info': {
                'win32': 'ipconfig',
                'linux': 'ifconfig',
                'darwin': 'ifconfig'
            }
        };

        if (commandMap[genericCommand] && commandMap[genericCommand][this.platform]) {
            return commandMap[genericCommand][this.platform];
        }

        return genericCommand;
    }

    // Get command statistics
    async getCommandStats() {
        try {
            if (!fs.existsSync(this.logFile)) {
                return { total_commands: 0, success_rate: 0, platform_stats: {} };
            }

            const logContent = fs.readFileSync(this.logFile, 'utf8');
            const lines = logContent.trim().split('\n').filter(line => line);
            
            const stats = {
                total_commands: lines.length,
                successful_commands: 0,
                failed_commands: 0,
                platforms: {},
                most_used_commands: {}
            };

            lines.forEach(line => {
                try {
                    const entry = JSON.parse(line);
                    
                    if (entry.success) {
                        stats.successful_commands++;
                    } else {
                        stats.failed_commands++;
                    }

                    // Platform stats
                    if (!stats.platforms[entry.platform]) {
                        stats.platforms[entry.platform] = 0;
                    }
                    stats.platforms[entry.platform]++;

                    // Command frequency
                    const cmdBase = entry.command.split(' ')[0];
                    if (!stats.most_used_commands[cmdBase]) {
                        stats.most_used_commands[cmdBase] = 0;
                    }
                    stats.most_used_commands[cmdBase]++;
                } catch (e) {
                    // Skip invalid JSON lines
                }
            });

            stats.success_rate = stats.total_commands > 0 ? 
                Math.round((stats.successful_commands / stats.total_commands) * 100) : 0;

            return stats;
        } catch (error) {
            console.error('Failed to get command stats:', error);
            return { total_commands: 0, success_rate: 0, platform_stats: {} };
        }
    }
}

module.exports = CommandExecutor;
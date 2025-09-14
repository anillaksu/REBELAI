// ==========================================
// 🧠 REBEL AI - Knowledge Manager
// ==========================================
// Self-learning and knowledge database

const fs = require('fs');
const path = require('path');
const os = require('os');

class KnowledgeManager {
    constructor() {
        this.knowledgePath = path.join(__dirname, '../data/knowledge.json');
        this.knowledge = this.loadKnowledge();
        this.platform = os.platform();
        this.deviceId = this.generateDeviceId();
    }

    loadKnowledge() {
        try {
            if (fs.existsSync(this.knowledgePath)) {
                const data = fs.readFileSync(this.knowledgePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load knowledge:', error);
        }

        // Return default knowledge structure
        return {
            command_success_rates: {},
            platform_specific_commands: {},
            fallback_routes: {},
            learned_optimizations: {},
            device_profiles: {}
        };
    }

    saveKnowledge() {
        try {
            const knowledgeDir = path.dirname(this.knowledgePath);
            if (!fs.existsSync(knowledgeDir)) {
                fs.mkdirSync(knowledgeDir, { recursive: true });
            }
            
            fs.writeFileSync(this.knowledgePath, JSON.stringify(this.knowledge, null, 2));
        } catch (error) {
            console.error('Failed to save knowledge:', error);
        }
    }

    generateDeviceId() {
        const hostname = os.hostname();
        const platform = os.platform();
        const arch = os.arch();
        const cpus = os.cpus();
        
        const deviceString = `${hostname}-${platform}-${arch}-${cpus.length}`;
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < deviceString.length; i++) {
            const char = deviceString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(16);
    }

    async learnFromExecution(command, results) {
        try {
            const commandBase = command.split(' ')[0];
            const success = results.every(r => r.success);

            // Update command success rates
            if (!this.knowledge.command_success_rates[this.platform]) {
                this.knowledge.command_success_rates[this.platform] = {};
            }

            const platformSuccessRates = this.knowledge.command_success_rates[this.platform];
            
            if (!platformSuccessRates[commandBase]) {
                platformSuccessRates[commandBase] = {
                    total_executions: 0,
                    successful_executions: 0,
                    failure_patterns: [],
                    last_updated: new Date().toISOString()
                };
            }

            const commandStats = platformSuccessRates[commandBase];
            commandStats.total_executions++;
            
            if (success) {
                commandStats.successful_executions++;
            } else {
                // Learn from failures
                results.forEach(result => {
                    if (!result.success && result.error) {
                        this.learnFromFailure(commandBase, result.error);
                    }
                });
            }

            commandStats.success_rate = (commandStats.successful_executions / commandStats.total_executions) * 100;
            commandStats.last_updated = new Date().toISOString();

            // Learn platform-specific commands
            this.learnPlatformSpecificCommands(command, success);

            // Update device profile
            this.updateDeviceProfile(command, results);

            // Save knowledge
            this.saveKnowledge();

        } catch (error) {
            console.error('Failed to learn from execution:', error);
        }
    }

    learnFromFailure(command, error) {
        const platformSuccessRates = this.knowledge.command_success_rates[this.platform];
        const commandStats = platformSuccessRates[command];

        if (!commandStats.failure_patterns) {
            commandStats.failure_patterns = [];
        }

        // Categorize error patterns
        const errorPattern = this.categorizeError(error);
        
        const existingPattern = commandStats.failure_patterns.find(p => p.pattern === errorPattern.pattern);
        
        if (existingPattern) {
            existingPattern.count++;
            existingPattern.last_seen = new Date().toISOString();
        } else {
            commandStats.failure_patterns.push({
                ...errorPattern,
                count: 1,
                first_seen: new Date().toISOString(),
                last_seen: new Date().toISOString()
            });
        }

        // Learn fallback routes
        this.generateFallbackRoute(command, errorPattern);
    }

    categorizeError(error) {
        const errorLower = error.toLowerCase();

        if (errorLower.includes('command not found') || errorLower.includes('not recognized')) {
            return { 
                pattern: 'command_not_found',
                description: 'Command does not exist on this platform',
                suggested_action: 'find_alternative'
            };
        } else if (errorLower.includes('permission denied') || errorLower.includes('access denied')) {
            return {
                pattern: 'permission_denied',
                description: 'Insufficient permissions to execute command',
                suggested_action: 'elevate_privileges'
            };
        } else if (errorLower.includes('no such file') || errorLower.includes('cannot find')) {
            return {
                pattern: 'file_not_found',
                description: 'Target file or directory does not exist',
                suggested_action: 'check_path'
            };
        } else if (errorLower.includes('timeout') || errorLower.includes('killed')) {
            return {
                pattern: 'execution_timeout',
                description: 'Command execution timed out',
                suggested_action: 'optimize_command'
            };
        } else {
            return {
                pattern: 'unknown_error',
                description: 'Unrecognized error pattern',
                suggested_action: 'manual_review'
            };
        }
    }

    generateFallbackRoute(command, errorPattern) {
        if (!this.knowledge.fallback_routes[this.platform]) {
            this.knowledge.fallback_routes[this.platform] = {};
        }

        const platformFallbacks = this.knowledge.fallback_routes[this.platform];

        if (errorPattern.pattern === 'command_not_found') {
            const alternatives = this.getCommandAlternatives(command);
            if (alternatives.length > 0) {
                platformFallbacks[command] = {
                    alternatives: alternatives,
                    reason: errorPattern.pattern,
                    confidence: 0.8,
                    created: new Date().toISOString()
                };
            }
        }
    }

    getCommandAlternatives(command) {
        const alternativeMap = {
            'ls': this.platform === 'win32' ? ['dir'] : ['ls -la', 'ls -l'],
            'dir': this.platform === 'win32' ? ['dir /a'] : ['ls', 'ls -la'],
            'ps': this.platform === 'win32' ? ['tasklist'] : ['ps aux', 'ps -ef'],
            'tasklist': this.platform === 'win32' ? ['wmic process list'] : ['ps aux'],
            'grep': this.platform === 'win32' ? ['findstr'] : ['grep -i'],
            'findstr': this.platform === 'win32' ? ['select-string'] : ['grep'],
            'cat': this.platform === 'win32' ? ['type', 'more'] : ['cat', 'less'],
            'type': this.platform === 'win32' ? ['more'] : ['cat'],
            'ping': ['ping -c 4', 'ping -t'],
            'ifconfig': this.platform === 'win32' ? ['ipconfig'] : ['ip addr', 'ifconfig -a'],
            'ipconfig': this.platform === 'win32' ? ['ipconfig /all'] : ['ifconfig']
        };

        return alternativeMap[command] || [];
    }

    learnPlatformSpecificCommands(command, success) {
        if (!this.knowledge.platform_specific_commands[this.platform]) {
            this.knowledge.platform_specific_commands[this.platform] = {};
        }

        const platformCommands = this.knowledge.platform_specific_commands[this.platform];
        const commandBase = command.split(' ')[0];

        if (!platformCommands[commandBase]) {
            platformCommands[commandBase] = {
                works: success,
                variations: [],
                confidence: success ? 0.7 : 0.3,
                last_tested: new Date().toISOString()
            };
        }

        const commandInfo = platformCommands[commandBase];
        
        // Add command variation
        if (!commandInfo.variations.includes(command)) {
            commandInfo.variations.push(command);
        }

        // Update confidence based on success
        if (success) {
            commandInfo.confidence = Math.min(1.0, commandInfo.confidence + 0.1);
            commandInfo.works = true;
        } else {
            commandInfo.confidence = Math.max(0.0, commandInfo.confidence - 0.1);
        }

        commandInfo.last_tested = new Date().toISOString();
    }

    updateDeviceProfile(command, results) {
        if (!this.knowledge.device_profiles[this.deviceId]) {
            this.knowledge.device_profiles[this.deviceId] = {
                platform: this.platform,
                architecture: os.arch(),
                hostname: os.hostname(),
                first_seen: new Date().toISOString(),
                command_preferences: {},
                performance_metrics: {},
                capabilities: {}
            };
        }

        const deviceProfile = this.knowledge.device_profiles[this.deviceId];
        deviceProfile.last_seen = new Date().toISOString();

        // Update command preferences
        const commandBase = command.split(' ')[0];
        if (!deviceProfile.command_preferences[commandBase]) {
            deviceProfile.command_preferences[commandBase] = {
                usage_count: 0,
                success_rate: 0,
                avg_execution_time: 0
            };
        }

        const cmdPref = deviceProfile.command_preferences[commandBase];
        cmdPref.usage_count++;

        // Calculate average execution time
        const executionTimes = results.map(r => r.execution_time || 0);
        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
        
        cmdPref.avg_execution_time = (cmdPref.avg_execution_time + avgTime) / 2;

        // Update success rate
        const success = results.every(r => r.success);
        cmdPref.success_rate = ((cmdPref.success_rate * (cmdPref.usage_count - 1)) + (success ? 100 : 0)) / cmdPref.usage_count;
    }

    async getFallbackCommand(command) {
        const commandBase = command.split(' ')[0];
        const platformFallbacks = this.knowledge.fallback_routes[this.platform];

        if (platformFallbacks && platformFallbacks[commandBase]) {
            const fallback = platformFallbacks[commandBase];
            if (fallback.alternatives && fallback.alternatives.length > 0) {
                // Return the best alternative (highest confidence)
                return fallback.alternatives[0];
            }
        }

        // Check platform-specific commands for alternatives
        const platformCommands = this.knowledge.platform_specific_commands[this.platform];
        if (platformCommands) {
            for (const [cmd, info] of Object.entries(platformCommands)) {
                if (info.works && info.confidence > 0.5 && 
                    this.isCommandSimilar(commandBase, cmd)) {
                    return cmd;
                }
            }
        }

        // Return hardcoded alternatives as last resort
        const alternatives = this.getCommandAlternatives(commandBase);
        return alternatives.length > 0 ? alternatives[0] : null;
    }

    isCommandSimilar(cmd1, cmd2) {
        const similarCommands = [
            ['ls', 'dir'],
            ['ps', 'tasklist'],
            ['grep', 'findstr'],
            ['cat', 'type'],
            ['ifconfig', 'ipconfig']
        ];

        return similarCommands.some(group => 
            group.includes(cmd1) && group.includes(cmd2)
        );
    }

    getKnowledge() {
        return this.knowledge;
    }

    getDeviceProfile() {
        return this.knowledge.device_profiles[this.deviceId] || null;
    }

    getCommandRecommendations(context = {}) {
        const recommendations = [];
        const platformCommands = this.knowledge.platform_specific_commands[this.platform];

        if (platformCommands) {
            // Get top commands by success rate and usage
            const sortedCommands = Object.entries(platformCommands)
                .filter(([cmd, info]) => info.works && info.confidence > 0.6)
                .sort((a, b) => b[1].confidence - a[1].confidence)
                .slice(0, 10);

            recommendations.push(...sortedCommands.map(([cmd, info]) => ({
                command: cmd,
                confidence: info.confidence,
                success_rate: info.confidence * 100,
                last_tested: info.last_tested
            })));
        }

        return recommendations;
    }

    // Get learning statistics
    getLearningStats() {
        const stats = {
            total_devices: Object.keys(this.knowledge.device_profiles).length,
            current_device: this.deviceId,
            platforms_learned: Object.keys(this.knowledge.command_success_rates).length,
            total_commands_learned: 0,
            avg_success_rate: 0,
            fallback_routes: 0
        };

        // Calculate total commands and average success rate
        let totalCommands = 0;
        let totalSuccessRate = 0;

        for (const platform of Object.keys(this.knowledge.command_success_rates)) {
            const platformCommands = this.knowledge.command_success_rates[platform];
            const commandCount = Object.keys(platformCommands).length;
            totalCommands += commandCount;

            for (const [cmd, info] of Object.entries(platformCommands)) {
                totalSuccessRate += info.success_rate || 0;
            }
        }

        stats.total_commands_learned = totalCommands;
        stats.avg_success_rate = totalCommands > 0 ? Math.round(totalSuccessRate / totalCommands) : 0;

        // Count fallback routes
        for (const platform of Object.keys(this.knowledge.fallback_routes)) {
            stats.fallback_routes += Object.keys(this.knowledge.fallback_routes[platform]).length;
        }

        return stats;
    }
}

module.exports = KnowledgeManager;
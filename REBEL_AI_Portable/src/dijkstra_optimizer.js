// ==========================================
// 🧠 REBEL AI - Dijkstra Optimizer
// ==========================================
// Command optimization and routing engine

const os = require('os');

class DijkstraOptimizer {
    constructor() {
        this.platform = os.platform();
        this.commandGraph = this.buildCommandGraph();
        this.optimizationRules = this.loadOptimizationRules();
    }

    // Build command dependency graph
    buildCommandGraph() {
        return {
            // File operations
            'ls': { weight: 1, dependencies: [], alternatives: ['dir', 'ls -la'] },
            'dir': { weight: 1, dependencies: [], alternatives: ['ls', 'ls -la'] },
            'pwd': { weight: 1, dependencies: [], alternatives: ['cd'] },
            'cd': { weight: 1, dependencies: [], alternatives: ['pwd'] },
            
            // System info
            'whoami': { weight: 1, dependencies: [], alternatives: ['id', 'echo $USER'] },
            'date': { weight: 1, dependencies: [], alternatives: ['timedatectl'] },
            'ps': { weight: 2, dependencies: [], alternatives: ['tasklist', 'top'] },
            'tasklist': { weight: 2, dependencies: [], alternatives: ['ps aux'] },
            
            // Disk operations
            'df': { weight: 2, dependencies: [], alternatives: ['du', 'wmic logicaldisk'] },
            'du': { weight: 3, dependencies: [], alternatives: ['df -h'] },
            
            // Network
            'ping': { weight: 2, dependencies: [], alternatives: ['traceroute', 'nslookup'] },
            'ifconfig': { weight: 2, dependencies: [], alternatives: ['ipconfig', 'ip addr'] },
            'ipconfig': { weight: 2, dependencies: [], alternatives: ['ifconfig'] },
            
            // Text processing
            'cat': { weight: 1, dependencies: [], alternatives: ['type', 'more'] },
            'type': { weight: 1, dependencies: [], alternatives: ['cat', 'more'] },
            'grep': { weight: 2, dependencies: [], alternatives: ['findstr', 'select-string'] },
            'findstr': { weight: 2, dependencies: [], alternatives: ['grep'] }
        };
    }

    loadOptimizationRules() {
        return {
            // Combine similar commands
            combine_file_operations: {
                pattern: /^(ls|dir)\s*.*;\s*(pwd|cd)$/,
                optimized: this.platform === 'win32' ? 'dir && cd' : 'ls -la && pwd'
            },
            
            // Replace inefficient commands
            replace_inefficient: {
                'ls -la | grep': this.platform === 'win32' ? 'dir | findstr' : 'ls -la | grep',
                'cat file | grep': this.platform === 'win32' ? 'findstr /i "pattern" file' : 'grep -i "pattern" file'
            },

            // Platform-specific optimizations
            platform_optimize: {
                'win32': {
                    'ls': 'dir',
                    'ps aux': 'tasklist',
                    'grep': 'findstr',
                    'cat': 'type'
                },
                'linux': {
                    'dir': 'ls -la',
                    'tasklist': 'ps aux',
                    'findstr': 'grep',
                    'type': 'cat'
                },
                'darwin': {
                    'dir': 'ls -la',
                    'tasklist': 'ps aux',
                    'findstr': 'grep',
                    'type': 'cat'
                }
            }
        };
    }

    async optimize(commandString) {
        try {
            // Parse multiple commands
            const commands = this.parseCommands(commandString);
            
            // Apply platform-specific optimizations
            const platformOptimized = commands.map(cmd => this.applyPlatformOptimization(cmd));
            
            // Apply command combination rules
            const combinedCommands = this.applyCombinationRules(platformOptimized);
            
            // Sort by efficiency (Dijkstra-like shortest path)
            const sortedCommands = this.sortByEfficiency(combinedCommands);
            
            // Apply safety checks
            const safeCommands = this.applySafetyChecks(sortedCommands);
            
            return safeCommands;
            
        } catch (error) {
            console.error('Optimization error:', error);
            // Return original command as fallback
            return [commandString];
        }
    }

    parseCommands(commandString) {
        // Handle different command separators
        const separators = [';', '&&', '||', '|'];
        let commands = [commandString];

        for (const separator of separators) {
            const newCommands = [];
            for (const cmd of commands) {
                if (cmd.includes(separator)) {
                    newCommands.push(...cmd.split(separator).map(c => c.trim()));
                } else {
                    newCommands.push(cmd);
                }
            }
            commands = newCommands;
        }

        return commands.filter(cmd => cmd.length > 0);
    }

    applyPlatformOptimization(command) {
        const platformRules = this.optimizationRules.platform_optimize[this.platform];
        if (!platformRules) return command;

        const commandBase = command.split(' ')[0];
        const args = command.split(' ').slice(1).join(' ');
        
        if (platformRules[commandBase]) {
            return args ? `${platformRules[commandBase]} ${args}` : platformRules[commandBase];
        }

        return command;
    }

    applyCombinationRules(commands) {
        if (commands.length < 2) return commands;

        const combined = [];
        let i = 0;

        while (i < commands.length) {
            let currentCommand = commands[i];
            let isCombinable = false;

            // Check if current and next command can be combined
            if (i < commands.length - 1) {
                const nextCommand = commands[i + 1];
                const combinedCommand = this.tryCombinaCommands(currentCommand, nextCommand);
                
                if (combinedCommand) {
                    combined.push(combinedCommand);
                    i += 2; // Skip next command as it's combined
                    isCombinable = true;
                }
            }

            if (!isCombinable) {
                combined.push(currentCommand);
                i++;
            }
        }

        return combined;
    }

    tryCombinaCommands(cmd1, cmd2) {
        // File operations combination
        const fileOps = ['ls', 'dir', 'pwd', 'cd'];
        const base1 = cmd1.split(' ')[0];
        const base2 = cmd2.split(' ')[0];

        if (fileOps.includes(base1) && fileOps.includes(base2)) {
            return this.platform === 'win32' ? 
                `${cmd1} && ${cmd2}` : 
                `${cmd1}; ${cmd2}`;
        }

        // Information gathering combination
        const infoOps = ['whoami', 'date', 'hostname'];
        if (infoOps.includes(base1) && infoOps.includes(base2)) {
            return `${cmd1} && ${cmd2}`;
        }

        return null;
    }

    sortByEfficiency(commands) {
        // Sort commands by their efficiency weight (lower = more efficient)
        return commands.sort((a, b) => {
            const weightA = this.getCommandWeight(a);
            const weightB = this.getCommandWeight(b);
            return weightA - weightB;
        });
    }

    getCommandWeight(command) {
        const baseCommand = command.split(' ')[0];
        
        if (this.commandGraph[baseCommand]) {
            return this.commandGraph[baseCommand].weight;
        }

        // Default weight for unknown commands
        return 5;
    }

    applySafetyChecks(commands) {
        const safeCommands = [];
        
        for (const command of commands) {
            if (this.isCommandSafe(command)) {
                safeCommands.push(command);
            } else {
                // Try to find a safe alternative
                const safeAlternative = this.findSafeAlternative(command);
                if (safeAlternative) {
                    safeCommands.push(safeAlternative);
                } else {
                    console.warn(`Unsafe command blocked: ${command}`);
                }
            }
        }

        return safeCommands;
    }

    isCommandSafe(command) {
        const dangerousPatterns = [
            /rm\s+-rf/,
            /del\s+\/[sf]/,
            /format\s/,
            /fdisk/,
            /mkfs/,
            /dd\s+if=/,
            /shutdown/,
            /reboot/,
            /halt/,
            /systemctl\s+stop/,
            /service\s+.*\s+stop/
        ];

        const lowercaseCommand = command.toLowerCase();
        return !dangerousPatterns.some(pattern => pattern.test(lowercaseCommand));
    }

    findSafeAlternative(command) {
        const baseCommand = command.split(' ')[0];
        
        if (this.commandGraph[baseCommand] && this.commandGraph[baseCommand].alternatives) {
            for (const alternative of this.commandGraph[baseCommand].alternatives) {
                if (this.isCommandSafe(alternative)) {
                    const args = command.split(' ').slice(1).join(' ');
                    return args ? `${alternative} ${args}` : alternative;
                }
            }
        }

        return null;
    }

    // Get optimization statistics
    getOptimizationStats(originalCommands, optimizedCommands) {
        return {
            original_count: originalCommands.length,
            optimized_count: optimizedCommands.length,
            reduction_rate: originalCommands.length > 0 ? 
                Math.round(((originalCommands.length - optimizedCommands.length) / originalCommands.length) * 100) : 0,
            estimated_time_saved: this.estimateTimeSaved(originalCommands, optimizedCommands),
            optimization_applied: originalCommands.length !== optimizedCommands.length ||
                                JSON.stringify(originalCommands) !== JSON.stringify(optimizedCommands)
        };
    }

    estimateTimeSaved(originalCommands, optimizedCommands) {
        const originalWeight = originalCommands.reduce((sum, cmd) => sum + this.getCommandWeight(cmd), 0);
        const optimizedWeight = optimizedCommands.reduce((sum, cmd) => sum + this.getCommandWeight(cmd), 0);
        
        return Math.max(0, (originalWeight - optimizedWeight) * 0.5); // Each weight unit = ~0.5 seconds
    }

    // Find shortest path between commands (Dijkstra algorithm implementation)
    findShortestPath(startCommand, endCommand) {
        const distances = {};
        const previous = {};
        const unvisited = new Set();

        // Initialize distances
        for (const command in this.commandGraph) {
            distances[command] = Infinity;
            previous[command] = null;
            unvisited.add(command);
        }

        distances[startCommand] = 0;

        while (unvisited.size > 0) {
            // Find unvisited node with minimum distance
            let current = null;
            let minDistance = Infinity;
            
            for (const node of unvisited) {
                if (distances[node] < minDistance) {
                    minDistance = distances[node];
                    current = node;
                }
            }

            if (current === null || current === endCommand) break;

            unvisited.delete(current);

            // Check alternatives as neighbors
            const currentNode = this.commandGraph[current];
            if (currentNode && currentNode.alternatives) {
                for (const alternative of currentNode.alternatives) {
                    if (this.commandGraph[alternative] && unvisited.has(alternative)) {
                        const altDistance = distances[current] + this.commandGraph[alternative].weight;
                        
                        if (altDistance < distances[alternative]) {
                            distances[alternative] = altDistance;
                            previous[alternative] = current;
                        }
                    }
                }
            }
        }

        // Reconstruct path
        const path = [];
        let current = endCommand;
        
        while (current !== null) {
            path.unshift(current);
            current = previous[current];
        }

        return path.length > 1 ? path : [startCommand, endCommand];
    }
}

module.exports = DijkstraOptimizer;
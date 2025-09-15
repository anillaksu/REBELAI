// ==========================================
// 🧠 REBEL AI - Conversation Learning Engine
// ==========================================
// Self-learning system that focuses on intent analysis over error handling

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

class ConversationLearningEngine {
    constructor() {
        // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.conversationHistory = [];
        this.intentPatterns = new Map();
        this.learningDatabase = path.join(__dirname, '../data/conversation_learning.json');
        this.dijkstraKnowledge = new Map();
        
        this.loadPreviousLearning();
    }

    // Ana öğrenme sistemi - her soru-cevap çiftinden öğren
    async learnFromConversation(userInput, systemResponse, context = {}) {
        try {
            // Güvenli input handling
            const safeInput = (userInput || '').toString().trim();
            if (!safeInput) {
                console.log(`⚠️ Learning skipped: empty user input`);
                return { error: 'Empty input' };
            }
            
            console.log(`🧠 Learning from conversation: "${safeInput.substring(0, 50)}..."`);
            
            // Güvenlik: System response'u filtrele (sadece özet bilgiler gönder)
            const filteredResponse = this.filterSensitiveData(systemResponse, context);
            
            // 1. Niyet analizi
            const intentAnalysis = await this.analyzeUserIntent(safeInput, filteredResponse, context);
            
            // 2. Soru-cevap kalitesi değerlendirmesi
            const qualityAssessment = await this.assessResponseQuality(safeInput, filteredResponse);
            
            // 3. Öğrenilen kalıpları kaydet
            this.storeIntentPattern(intentAnalysis, qualityAssessment);
            
            // 4. Dijkstra algoritmasına göre bilgi optimizasyonu
            await this.optimizeKnowledgeWithDijkstra(intentAnalysis);
            
            // 5. Konuşma geçmişini güncelle  
            this.updateConversationHistory(safeInput, filteredResponse, intentAnalysis);
            
            return {
                intentLearned: intentAnalysis.primaryIntent,
                qualityScore: qualityAssessment.score,
                optimizationGain: intentAnalysis.optimizationPotential
            };
            
        } catch (error) {
            console.log(`🚨 Conversation Learning Error: ${error.message}`);
            return { error: error.message };
        }
    }

    // Kullanıcı niyetini derinlemesine analiz et
    async analyzeUserIntent(userInput, systemResponse, context) {
        const prompt = `
Derin niyet analizi:

Kullanıcı girdisi: "${userInput}"
Sistem cevabı: "${systemResponse}"
Bağlam: ${JSON.stringify(context)}

Bu etkileşimden niyet kalıplarını çıkar. JSON formatında:

{
    "primaryIntent": "main_user_intention",
    "secondaryIntents": ["secondary_intent1", "secondary_intent2"],
    "emotionalContext": "curious|frustrated|satisfied|confused",
    "skillLevel": "beginner|intermediate|advanced",
    "domainKnowledge": "system_admin|developer|general_user",
    "conversationStyle": "direct|exploratory|problem_solving",
    "learningOpportunity": "what_system_should_learn",
    "intentEvolution": "how_intent_might_change_next",
    "optimizationPotential": 0.8,
    "knowledgeGaps": ["gap1", "gap2"],
    "successfulPatterns": ["pattern1", "pattern2"]
}

Odak noktası: Hata analizi değil, kullanıcının gerçek niyetini anlamak.
`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: "Sen kullanıcı niyetlerini derinlemesine analiz eden bir uzmansın. Hataya değil, amaca odaklan. SADECE geçerli JSON döndür."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 600,
            temperature: 0
        });

        // Güvenli JSON parsing
        try {
            const content = response.choices[0]?.message?.content;
            if (!content || content.trim() === '') {
                throw new Error('Empty response from OpenAI');
            }
            return JSON.parse(content);
        } catch (jsonError) {
            console.log(`🚨 JSON Parse Error: ${jsonError.message}, content: ${response.choices[0]?.message?.content?.substring(0, 100)}...`);
            // Fallback intent analysis
            return {
                primaryIntent: "command_execution",
                secondaryIntents: ["system_interaction"],
                emotionalContext: "neutral",
                skillLevel: "intermediate", 
                domainKnowledge: "general_user",
                conversationStyle: "direct",
                learningOpportunity: "improve_command_understanding",
                intentEvolution: "continue_learning",
                optimizationPotential: 0.5,
                knowledgeGaps: ["context_missing"],
                successfulPatterns: ["command_pattern"]
            };
        }
    }

    // Cevap kalitesini değerlendir
    async assessResponseQuality(userInput, systemResponse) {
        const prompt = `
Cevap kalitesi analizi:

Soru: "${userInput}"
Cevap: "${systemResponse}"

Bu cevabın kalitesini analiz et. JSON formatında:

{
    "score": 0.85,
    "strengths": ["strength1", "strength2"],
    "improvements": ["improvement1", "improvement2"],
    "userSatisfactionLevel": "high|medium|low",
    "responseCompleteness": 0.9,
    "relevanceScore": 0.8,
    "clarityScore": 0.85,
    "actionableScore": 0.7,
    "learningValue": "what_user_learned",
    "missedOpportunities": ["missed1", "missed2"],
    "nextBestAction": "suggested_follow_up"
}

Değerlendirme kriterleri:
- Kullanıcının niyetine ne kadar uygun?
- Ne kadar eylem odaklı?
- Öğrenme değeri var mı?
`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: "Sen cevap kalitesini objektif değerlendiren bir uzmansın. SADECE geçerli JSON döndür."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 500,
            temperature: 0
        });

        // Güvenli JSON parsing
        try {
            const content = response.choices[0]?.message?.content;
            if (!content || content.trim() === '') {
                throw new Error('Empty quality response from OpenAI');
            }
            return JSON.parse(content);
        } catch (jsonError) {
            console.log(`🚨 Quality JSON Parse Error: ${jsonError.message}`);
            // Fallback quality assessment
            return {
                score: 0.5,
                strengths: ["response_provided"],
                improvements: ["improve_analysis"],
                userSatisfactionLevel: "medium",
                responseCompleteness: 0.5,
                relevanceScore: 0.5,
                clarityScore: 0.5,
                actionableScore: 0.5,
                learningValue: "system_interaction",
                missedOpportunities: ["better_analysis"],
                nextBestAction: "continue_learning"
            };
        }
    }

    // Niyet kalıplarını sakla
    storeIntentPattern(intentAnalysis, qualityAssessment) {
        const pattern = {
            intent: intentAnalysis.primaryIntent,
            context: intentAnalysis.emotionalContext,
            skill: intentAnalysis.skillLevel,
            quality: qualityAssessment.score,
            timestamp: new Date().toISOString(),
            learningValue: qualityAssessment.learningValue
        };

        // Intent pattern'ı haritaya ekle
        if (!this.intentPatterns.has(intentAnalysis.primaryIntent)) {
            this.intentPatterns.set(intentAnalysis.primaryIntent, []);
        }
        
        this.intentPatterns.get(intentAnalysis.primaryIntent).push(pattern);
        
        // Sadece son 10 pattern'ı tut
        const patterns = this.intentPatterns.get(intentAnalysis.primaryIntent);
        if (patterns.length > 10) {
            this.intentPatterns.set(intentAnalysis.primaryIntent, patterns.slice(-10));
        }
    }

    // Dijkstra algoritmasına göre bilgi optimizasyonu
    async optimizeKnowledgeWithDijkstra(intentAnalysis) {
        const primaryIntent = intentAnalysis.primaryIntent;
        const secondaryIntents = intentAnalysis.secondaryIntents || [];
        
        // Primary intent node oluştur
        const knowledgeNode = {
            intent: primaryIntent,
            weight: 1 / (intentAnalysis.optimizationPotential || 0.5),
            connections: secondaryIntents,
            learningOpportunity: intentAnalysis.learningOpportunity,
            timestamp: Date.now()
        };

        this.dijkstraKnowledge.set(primaryIntent, knowledgeNode);

        // Secondary intent'leri de node olarak ekle (bidirectional connections)
        for (const secondaryIntent of secondaryIntents) {
            if (!this.dijkstraKnowledge.has(secondaryIntent)) {
                this.dijkstraKnowledge.set(secondaryIntent, {
                    intent: secondaryIntent,
                    weight: 2 / (intentAnalysis.optimizationPotential || 0.5), // Biraz daha yüksek weight
                    connections: [primaryIntent],
                    learningOpportunity: `related_to_${primaryIntent}`,
                    timestamp: Date.now()
                });
            } else {
                // Mevcut node'a connection ekle
                const existingNode = this.dijkstraKnowledge.get(secondaryIntent);
                if (!existingNode.connections.includes(primaryIntent)) {
                    existingNode.connections.push(primaryIntent);
                }
            }
        }

        // 🚀 Advanced Dijkstra-based path optimization
        const optimizedPath = this.findOptimalLearningPath(intentAnalysis.primaryIntent);
        
        // Performance tracking and adaptive learning
        this.updatePathPerformance(intentAnalysis.primaryIntent, optimizedPath);
        
        // Dynamic weight adjustment based on success
        this.adaptiveWeightAdjustment(intentAnalysis);
        
        console.log(`🎯 Dijkstra Optimization: Found path for "${intentAnalysis.primaryIntent}" with ${optimizedPath.length} steps (adaptive weights applied)`);
        
        return optimizedPath;
    }

    // Optimal öğrenme yolunu bul (Dijkstra algoritması)
    findOptimalLearningPath(startIntent) {
        const distances = new Map();
        const previous = new Map();
        const unvisited = new Set();

        // Initialize
        for (const [intent, node] of this.dijkstraKnowledge) {
            distances.set(intent, intent === startIntent ? 0 : Infinity);
            unvisited.add(intent);
        }

        while (unvisited.size > 0) {
            // Find minimum distance node
            let current = null;
            let minDistance = Infinity;
            
            for (const node of unvisited) {
                if (distances.get(node) < minDistance) {
                    minDistance = distances.get(node);
                    current = node;
                }
            }

            if (current === null) break;
            unvisited.delete(current);

            // Update distances to neighbors
            const currentNode = this.dijkstraKnowledge.get(current);
            if (currentNode && currentNode.connections) {
                for (const neighbor of currentNode.connections) {
                    if (this.dijkstraKnowledge.has(neighbor)) {
                        const neighborNode = this.dijkstraKnowledge.get(neighbor);
                        const tentativeDistance = distances.get(current) + neighborNode.weight;
                        
                        if (tentativeDistance < distances.get(neighbor)) {
                            distances.set(neighbor, tentativeDistance);
                            previous.set(neighbor, current);
                        }
                    }
                }
            }
        }

        // Reconstruct optimal path
        const path = [];
        const sortedByDistance = [...distances.entries()]
            .sort((a, b) => a[1] - b[1])
            .slice(0, 5); // Top 5 optimal paths

        return sortedByDistance.map(([intent, distance]) => ({
            intent,
            distance,
            learningPriority: 1 / (distance + 1)
        }));
    }

    // Konuşma geçmişini güncelle
    updateConversationHistory(userInput, systemResponse, intentAnalysis) {
        const entry = {
            timestamp: new Date().toISOString(),
            userInput: userInput,
            systemResponse: systemResponse,
            intent: intentAnalysis.primaryIntent,
            emotionalContext: intentAnalysis.emotionalContext,
            learningValue: intentAnalysis.learningOpportunity
        };

        this.conversationHistory.push(entry);

        // Sadece son 50 konuşmayı tut
        if (this.conversationHistory.length > 50) {
            this.conversationHistory = this.conversationHistory.slice(-50);
        }

        // Veritabanına kaydet
        this.saveToDatabase();
    }

    // Önceki öğrenmeleri yükle
    loadPreviousLearning() {
        try {
            if (fs.existsSync(this.learningDatabase)) {
                const data = JSON.parse(fs.readFileSync(this.learningDatabase, 'utf8'));
                this.conversationHistory = data.conversationHistory || [];
                
                // Intent patterns'ı Map'e dönüştür
                if (data.intentPatterns) {
                    this.intentPatterns = new Map(Object.entries(data.intentPatterns));
                }
                
                // Dijkstra knowledge'ı Map'e dönüştür
                if (data.dijkstraKnowledge) {
                    this.dijkstraKnowledge = new Map(Object.entries(data.dijkstraKnowledge));
                }
                
                console.log(`📚 Loaded ${this.conversationHistory.length} previous conversations`);
            }
        } catch (error) {
            console.log(`⚠️ Could not load previous learning: ${error.message}`);
        }
    }

    // Veritabanına kaydet
    saveToDatabase() {
        try {
            const dir = path.dirname(this.learningDatabase);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const data = {
                conversationHistory: this.conversationHistory,
                intentPatterns: Object.fromEntries(this.intentPatterns),
                dijkstraKnowledge: Object.fromEntries(this.dijkstraKnowledge),
                lastUpdated: new Date().toISOString()
            };

            fs.writeFileSync(this.learningDatabase, JSON.stringify(data, null, 2));
        } catch (error) {
            console.log(`⚠️ Could not save learning data: ${error.message}`);
        }
    }

    // Öğrenme istatistikleri
    getLearningStats() {
        const totalConversations = this.conversationHistory.length;
        const uniqueIntents = this.intentPatterns.size;
        const dijkstraNodes = this.dijkstraKnowledge.size;
        
        // En popüler intent'leri bul
        const intentFrequency = {};
        for (const conversation of this.conversationHistory) {
            intentFrequency[conversation.intent] = (intentFrequency[conversation.intent] || 0) + 1;
        }
        
        const topIntents = Object.entries(intentFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([intent, count]) => ({ intent, count }));

        return {
            totalConversations,
            uniqueIntents,
            dijkstraNodes,
            topIntents,
            learningEfficiency: totalConversations > 0 ? uniqueIntents / totalConversations : 0,
            dijkstraOptimizationMetrics: this.getDijkstraMetrics()
        };
    }

    // 🚀 Performance tracking for adaptive learning
    updatePathPerformance(intent, optimizedPath) {
        if (!this.pathPerformance) {
            this.pathPerformance = new Map();
        }
        
        const pathKey = intent;
        if (!this.pathPerformance.has(pathKey)) {
            this.pathPerformance.set(pathKey, {
                uses: 0,
                averageLength: 0,
                successRate: 0.5,
                lastUsed: Date.now()
            });
        }
        
        const perf = this.pathPerformance.get(pathKey);
        perf.uses++;
        perf.averageLength = (perf.averageLength + optimizedPath.length) / 2;
        perf.lastUsed = Date.now();
        
        // Pathın success rate'ini optimization potential'a göre ayarla
        const node = this.dijkstraKnowledge.get(intent);
        if (node) {
            const optimizationPotential = 1 / node.weight; // Reverse weight
            perf.successRate = (perf.successRate + optimizationPotential) / 2;
        }
    }

    // 🎯 Adaptive weight adjustment based on performance
    adaptiveWeightAdjustment(intentAnalysis) {
        const intent = intentAnalysis.primaryIntent;
        const node = this.dijkstraKnowledge.get(intent);
        
        if (node && this.pathPerformance && this.pathPerformance.has(intent)) {
            const perf = this.pathPerformance.get(intent);
            
            // High success rate = lower weight (easier path)
            // Low success rate = higher weight (harder path)
            const adaptiveWeight = Math.max(0.1, 2 - perf.successRate);
            
            // Smooth weight adjustment (gradual change)
            node.weight = (node.weight * 0.7) + (adaptiveWeight * 0.3);
            
            console.log(`🔄 Adaptive Weight: "${intent}" adjusted to ${node.weight.toFixed(2)} (success rate: ${perf.successRate.toFixed(2)})`);
        }
    }

    // 📊 Dijkstra optimization metrics
    getDijkstraMetrics() {
        const totalNodes = this.dijkstraKnowledge.size;
        const totalConnections = Array.from(this.dijkstraKnowledge.values())
            .reduce((total, node) => total + node.connections.length, 0);
        
        const averageWeight = Array.from(this.dijkstraKnowledge.values())
            .reduce((total, node) => total + node.weight, 0) / totalNodes || 0;
        
        const pathPerformanceStats = this.pathPerformance ? 
            Array.from(this.pathPerformance.values()).reduce((stats, perf) => {
                stats.totalUses += perf.uses;
                stats.averageSuccessRate += perf.successRate;
                return stats;
            }, { totalUses: 0, averageSuccessRate: 0 }) : { totalUses: 0, averageSuccessRate: 0 };
        
        return {
            totalNodes,
            totalConnections,
            averageWeight: averageWeight.toFixed(3),
            pathUsage: pathPerformanceStats.totalUses,
            averageSuccessRate: this.pathPerformance ? 
                (pathPerformanceStats.averageSuccessRate / this.pathPerformance.size).toFixed(3) : '0.000',
            optimizationEfficiency: totalNodes > 0 ? 
                (totalConnections / totalNodes).toFixed(2) : '0.00'
        };
    }

    // 🔒 Hassas veriyi filtrele (CRITICAL privacy protection)
    filterSensitiveData(systemResponse, context) {
        try {
            // NEVER send raw command outputs to OpenAI!
            const response = JSON.parse(systemResponse);
            
            // Güvenli özet - sadece metadata
            const safeData = {
                commandExecuted: true,
                wasSuccessful: response.success || false,
                hasTranslation: !!context.translation,
                commandCount: Array.isArray(response) ? response.length : 1,
                timestamp: context.timestamp,
                // HİÇBİR hassas bilgi yok: paths, usernames, IPs, file contents, etc.
                processingType: "terminal_command"
            };
            
            return JSON.stringify(safeData);
        } catch (error) {
            // Fallback - minimal safe data
            return JSON.stringify({
                commandExecuted: true,
                wasSuccessful: false,
                timestamp: context.timestamp || new Date().toISOString(),
                processingType: "unknown"
            });
        }
    }
}

module.exports = ConversationLearningEngine;
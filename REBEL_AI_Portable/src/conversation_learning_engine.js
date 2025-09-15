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
                    content: "Sen kullanıcı niyetlerini derinlemesine analiz eden bir uzmansın. Hataya değil, amaca odaklan."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 600
        });

        return JSON.parse(response.choices[0].message.content);
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
                    content: "Sen cevap kalitesini objektif değerlendiren bir uzmansın."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 500
        });

        return JSON.parse(response.choices[0].message.content);
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

        // Dijkstra-based path optimization
        const optimizedPath = this.findOptimalLearningPath(intentAnalysis.primaryIntent);
        
        console.log(`🎯 Dijkstra Optimization: Found path for "${intentAnalysis.primaryIntent}" with ${optimizedPath.length} steps`);
        
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
            learningEfficiency: totalConversations > 0 ? uniqueIntents / totalConversations : 0
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
// ==========================================
// 🧠 REBEL AI - Continuous Learning Engine
// ==========================================
// AI-powered learning system that continuously improves command translation and optimization

const OpenAI = require('openai');

class AILearningEngine {
    constructor() {
        // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.learningHistory = [];
        this.commandPatternsLearned = 0;
        this.aiAssistanceRequests = 0;
    }

    // Learn from failed Turkish commands using AI
    async analyzeFailedTurkishCommand(command) {
        try {
            this.aiAssistanceRequests++;
            
            const prompt = `
Türkçe komut çevirisi analizi:

Başarısız komut: "${command}"

Bu Türkçe komutun hangi sistem komutuna çevrilmesi gerektiğini analiz et. Sonucu JSON formatında ver:

{
    "translatedCommand": "uygun sistem komutu",
    "confidence": 0.95,
    "explanation": "açıklama",
    "commandType": "system|file|network|process|help",
    "similarCommands": ["benzer komut1", "benzer komut2"],
    "isValidTranslation": true
}

Örnek çeviriler:
- "saat kaç" → "date"
- "dosyalar" → "ls -la" 
- "ben kimim" → "whoami"
- "yardım et" → "echo 'Yardım mesajı'"

Güvenlik: Sadece güvenli sistem komutları öner (rm, sudo, chmod gibi tehlikeli komutları kullanma).
`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system",
                        content: "Sen Türkçe komutları İngilizce sistem komutlarına çeviren bir uzmansın. Güvenli ve doğru çeviriler yap."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_completion_tokens: 500
            });

            const result = JSON.parse(response.choices[0].message.content);
            
            // Learning'i kaydet
            this.learningHistory.push({
                timestamp: new Date().toISOString(),
                originalCommand: command,
                aiSuggestion: result,
                type: 'turkish_translation'
            });

            return result;

        } catch (error) {
            console.log(`🚨 AI Learning Error: ${error.message}`);
            return {
                translatedCommand: `echo "❌ '${command}' komutu tanınamadı. 'yardım' yazarak mevcut komutları görebilirsiniz."`,
                confidence: 0.3,
                explanation: "AI analizi başarısız oldu, varsayılan yardım mesajı",
                commandType: "help",
                isValidTranslation: false
            };
        }
    }

    // Dijkstra optimizasyonu için AI önerileri
    async optimizeCommandSequence(commands) {
        try {
            const prompt = `
Komut optimizasyonu analizi:

Komut dizisi: ${JSON.stringify(commands)}

Bu komut dizisini Dijkstra algoritması ile optimize et. Sonucu JSON formatında ver:

{
    "optimizedSequence": ["optimized_command1", "optimized_command2"],
    "optimizationGain": 0.25,
    "reasoning": "optimizasyon açıklaması",
    "parallelizable": ["command1", "command2"],
    "dependencies": {
        "command3": ["command1", "command2"]
    },
    "estimatedSpeedup": "30%"
}

Optimizasyon kuralları:
1. Paralel çalışabilecek komutları grupla
2. Bağımlılıkları belirle
3. Gereksiz komutları kaldır
4. Komut sırasını optimize et
`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system", 
                        content: "Sen sistem komutlarını Dijkstra algoritması ile optimize eden bir uzmansın."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_completion_tokens: 600
            });

            const result = JSON.parse(response.choices[0].message.content);
            
            this.learningHistory.push({
                timestamp: new Date().toISOString(),
                originalCommands: commands,
                aiOptimization: result,
                type: 'dijkstra_optimization'
            });

            return result;

        } catch (error) {
            console.log(`🚨 AI Optimization Error: ${error.message}`);
            return {
                optimizedSequence: commands,
                optimizationGain: 0,
                reasoning: "AI optimizasyonu başarısız oldu",
                parallelizable: [],
                dependencies: {}
            };
        }
    }

    // Sistem hatalarını AI ile analiz et
    async analyzeSystemError(command, error) {
        try {
            const prompt = `
Sistem hatası analizi:

Komut: "${command}"
Hata: "${error}"

Bu hatayı analiz et ve çözüm öner. JSON formatında:

{
    "errorType": "command_not_found|permission_denied|syntax_error|other",
    "solution": "çözüm önerisi",
    "alternativeCommands": ["alternatif1", "alternatif2"],
    "explanation": "hata açıklaması",
    "preventionTips": "gelecekte önleme ipuçları"
}
`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-5",
                messages: [
                    {
                        role: "system",
                        content: "Sen sistem hatalarını analiz eden ve çözüm üreten bir uzmansın."
                    },
                    {
                        role: "user", 
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                max_completion_tokens: 400
            });

            return JSON.parse(response.choices[0].message.content);

        } catch (error) {
            return {
                errorType: "other",
                solution: "Sistem yöneticisi ile iletişime geçin",
                alternativeCommands: ["help"],
                explanation: "AI analizi başarısız oldu"
            };
        }
    }

    // Öğrenilen yeni komutları dinamik olarak ekle
    async learnNewCommand(turkishCommand, aiSuggestion) {
        if (aiSuggestion.isValidTranslation && aiSuggestion.confidence > 0.7) {
            this.commandPatternsLearned++;
            
            // Yeni öğrenilen komutu kaydet (gerçek uygulamada veritabanına)
            const newMapping = {
                turkish: turkishCommand,
                english: aiSuggestion.translatedCommand,
                confidence: aiSuggestion.confidence,
                learned: true,
                timestamp: new Date().toISOString()
            };

            console.log(`🧠 AI Learning: New command learned: "${turkishCommand}" → "${aiSuggestion.translatedCommand}"`);
            
            return newMapping;
        }
        return null;
    }

    // Learning istatistikleri
    getLearningStats() {
        return {
            totalRequests: this.aiAssistanceRequests,
            patternsLearned: this.commandPatternsLearned,
            historySize: this.learningHistory.length,
            lastLearning: this.learningHistory.length > 0 ? 
                this.learningHistory[this.learningHistory.length - 1].timestamp : null
        };
    }

    // Öğrenme geçmişini temizle
    clearLearningHistory() {
        this.learningHistory = [];
        console.log('🧹 AI Learning history cleared');
    }
}

module.exports = AILearningEngine;
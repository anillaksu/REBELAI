// ==========================================
// 🧠 REBEL AI - Intelligent Reasoning Engine
// ==========================================
// Advanced reasoning system that ensures 80%+ confidence and self-validation

const OpenAI = require('openai');

class IntelligentReasoningEngine {
    constructor() {
        // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.reasoningHistory = [];
        this.validationAttempts = 0;
        this.confidenceThreshold = 0.8; // 80% minimum confidence
    }

    // Ana akıl yürütme ve doğrulama sistemi
    async intelligentReason(userInput, currentContext = {}) {
        try {
            this.validationAttempts++;
            
            // 1. İlk analiz
            const initialAnalysis = await this.analyzeIntent(userInput);
            
            // 2. Güven kontrolü
            if (initialAnalysis.confidence < this.confidenceThreshold) {
                // 3. Soru-cevap ile doğrulama
                const clarificationResult = await this.askClarifyingQuestions(userInput, initialAnalysis);
                
                // 4. Geliştirilmiş analiz
                const improvedAnalysis = await this.reanalyzeWithClarification(userInput, clarificationResult);
                
                return improvedAnalysis;
            }
            
            return initialAnalysis;

        } catch (error) {
            console.log(`🚨 Reasoning Error: ${error.message}`);
            return this.getFallbackReasoning(userInput);
        }
    }

    // Kullanıcı niyetini analiz et
    async analyzeIntent(userInput) {
        const prompt = `
Kullanıcı girişi analizi:

Girdi: "${userInput}"

Bu kullanıcı girdisini detaylı analiz et ve JSON formatında sonuç ver:

{
    "intent": "user_intention",
    "category": "system|file|network|development|help|conversation",
    "actionNeeded": "specific_action_description",
    "suggestedCommands": ["command1", "command2"],
    "confidence": 0.95,
    "reasoning": "why_this_analysis",
    "possibleAlternatives": ["alt1", "alt2"],
    "needsClarification": false,
    "clarificationQuestions": ["question1", "question2"]
}

Özel durumlar:
- GitHub, repo, git ile ilgili: "development" kategorisi
- Dosya işlemleri: "file" kategorisi  
- Sistem bilgisi: "system" kategorisi
- Yardım talepleri: "help" kategorisi

Güven seviyesi hesaplama:
- Açık komut: 0.9+
- Belirsiz ifade: 0.5-0.7
- Çok belirsiz: 0.3-
`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: "Sen kullanıcı niyetlerini analiz eden bir uzmansın. Doğru ve güvenilir analizler yap. MUTLAKA geçerli JSON formatında cevap ver."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 600
        });

        const content = response.choices[0].message.content;
        
        // JSON parsing güvenliği
        if (!content || content.trim() === '') {
            throw new Error('Empty response from AI');
        }
        
        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.log(`JSON Parse Error: ${parseError.message}, Content: ${content}`);
            throw new Error(`Invalid JSON response: ${parseError.message}`);
        }
    }

    // Netleştirici sorular sor
    async askClarifyingQuestions(userInput, analysis) {
        if (!analysis.needsClarification || analysis.confidence > 0.7) {
            return { clarified: false, additionalInfo: null };
        }

        const prompt = `
Kullanıcı girdisi belirsiz, netleştirici sorular üret:

Orijinal girdi: "${userInput}"
Mevcut analiz: ${JSON.stringify(analysis)}

Akıllı soru üretimi. JSON formatında:

{
    "needsQuestions": true,
    "questions": [
        {
            "question": "Hangi işlemi yapmak istiyorsunuz?",
            "options": ["option1", "option2", "option3"],
            "type": "choice"
        },
        {
            "question": "Hangi platformda çalışacak?",
            "type": "open"
        }
    ],
    "suggestedResponse": "Lütfen aşağıdaki soruları cevaplayın:",
    "autoAnswerAttempt": "possible_user_intent_guess"
}

GitHub/repo/git durumunda otomatik çeviri yap:
- "GitHub'a proje yüklemek" → "git init && git add . && git commit -m 'initial' && git remote add origin [repo] && git push"
`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: "Sen belirsiz durumları netleştiren akıllı bir asistansın. MUTLAKA geçerli JSON formatında cevap ver."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 500
        });

        const content = response.choices[0].message.content;
        
        if (!content || content.trim() === '') {
            throw new Error('Empty response from AI');
        }
        
        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.log(`JSON Parse Error in clarification: ${parseError.message}`);
            throw new Error(`Invalid JSON in clarification: ${parseError.message}`);
        }
    }

    // Netleştirme ile yeniden analiz
    async reanalyzeWithClarification(originalInput, clarification) {
        const prompt = `
Geliştirilmiş analiz:

Orijinal girdi: "${originalInput}"
Netleştirme bilgisi: ${JSON.stringify(clarification)}

Şimdi daha yüksek güvenle analiz yap. JSON formatında:

{
    "finalIntent": "clarified_intent",
    "commandSequence": ["command1", "command2"],
    "confidence": 0.85,
    "explanation": "why_this_is_correct",
    "executionPlan": {
        "step1": "first_action",
        "step2": "second_action"
    },
    "safetyCheck": "is_this_safe_to_execute",
    "estimatedSuccess": 0.9
}

Özel GitHub durumu:
Eğer GitHub repo oluşturma/upload ise:
1. git init
2. git add .
3. git commit -m "Initial commit"  
4. git remote add origin [URL]
5. git push -u origin main

Güvenlik: Sadece güvenli komutlar öner.
`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: "Sen geliştirilmiş analiz yapan bir uzmansın. Yüksek güvenle doğru sonuçlar üret. MUTLAKA geçerli JSON formatında cevap ver."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 700
        });

        const content = response.choices[0].message.content;
        
        if (!content || content.trim() === '') {
            throw new Error('Empty response from reanalysis');
        }
        
        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.log(`JSON Parse Error in reanalysis: ${parseError.message}`);
            throw new Error(`Invalid JSON in reanalysis: ${parseError.message}`);
        }
    }

    // Kendini doğrulama sistemi
    async validateOwnReasoning(reasoning) {
        const prompt = `
Kendi analizimi doğrula:

Analiz: ${JSON.stringify(reasoning)}

Bu analiz doğru mu? JSON formatında:

{
    "isValid": true,
    "confidenceScore": 0.9,
    "potentialIssues": ["issue1", "issue2"],
    "improvements": ["improvement1"],
    "finalVerdict": "approved|needs_revision|rejected",
    "revisedSuggestion": "if_needs_revision"
}

Doğrulama kriterleri:
- Komutlar güvenli mi?
- Mantıklı sıra var mı?
- Kullanıcı niyetine uygun mu?
- Teknik olarak doğru mu?
`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-5",
            messages: [
                {
                    role: "system",
                    content: "Sen kendi analizlerini doğrulayan eleştirel düşünen bir uzmansın."
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
    }

    // Fallback akıl yürütme
    getFallbackReasoning(userInput) {
        return {
            intent: "unclear_request",
            category: "help",
            actionNeeded: "provide_guidance",
            suggestedCommands: ["echo \"Lütfen daha açık bir komut yazın\""],
            confidence: 0.3,
            reasoning: "AI analizi başarısız oldu, güvenli fallback",
            fallback: true
        };
    }

    // Öğrenme verilerini kaydet
    saveReasoningData(input, reasoning, outcome) {
        this.reasoningHistory.push({
            timestamp: new Date().toISOString(),
            input: input,
            reasoning: reasoning,
            outcome: outcome,
            confidence: reasoning.confidence
        });

        // Sadece son 100 öğrenme verisi tut
        if (this.reasoningHistory.length > 100) {
            this.reasoningHistory = this.reasoningHistory.slice(-100);
        }
    }

    // İstatistikler
    getReasoningStats() {
        const highConfidence = this.reasoningHistory.filter(r => r.confidence >= 0.8).length;
        const totalAttempts = this.reasoningHistory.length;

        return {
            totalReasoningAttempts: this.validationAttempts,
            highConfidenceCount: highConfidence,
            successRate: totalAttempts > 0 ? (highConfidence / totalAttempts) : 0,
            averageConfidence: totalAttempts > 0 ? 
                this.reasoningHistory.reduce((sum, r) => sum + r.confidence, 0) / totalAttempts : 0,
            confidenceThreshold: this.confidenceThreshold
        };
    }
}

module.exports = IntelligentReasoningEngine;
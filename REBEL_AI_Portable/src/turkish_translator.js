// ==========================================
// 🇹🇷 REBEL AI - Turkish Command Translator
// ==========================================
// Natural language Turkish to English command translator

class TurkishTranslator {
    constructor() {
        this.turkishCommands = this.buildTurkishCommandMap();
        this.turkishPatterns = this.buildTurkishPatterns();
        this.contextualMappings = this.buildContextualMappings();
        
        // AI Learning Engine'i dinamik olarak yükle
        this.aiLearning = null;
        this.intelligentReasoning = null;
        this.loadAILearning();
    }

    async loadAILearning() {
        try {
            if (process.env.OPENAI_API_KEY) {
                const AILearningEngine = require('./ai_learning_engine');
                const IntelligentReasoningEngine = require('./intelligent_reasoning_engine');
                
                this.aiLearning = new AILearningEngine();
                this.intelligentReasoning = new IntelligentReasoningEngine();
                
                console.log('🧠 AI Learning Engine loaded');
                console.log('🎯 Intelligent Reasoning Engine loaded');
            }
        } catch (error) {
            console.log('⚠️  AI Learning Engine not available:', error.message);
        }
    }

    buildTurkishCommandMap() {
        return {
            // Time/Date commands
            'saat': 'date',
            'saat kaç': 'date',
            'tarih': 'date',
            'şimdi saat kaç': 'date',
            'zaman': 'date',
            
            // User info commands
            'ben': 'whoami',
            'ben kimim': 'whoami',
            'kullanıcı': 'whoami',
            'kim': 'whoami',
            'benim adım': 'whoami',
            
            // File operations
            'dosyalar': 'ls -la',
            'dosya listesi': 'ls -la',
            'klasörler': 'ls -la',
            'liste': 'ls',
            'göster': 'ls',
            'neler var': 'ls',
            
            // Directory operations
            'konum': 'pwd',
            'neredeyim': 'pwd',
            'klasör': 'pwd',
            'bulunduğum yer': 'pwd',
            'dizin': 'pwd',
            
            // System info
            'sistem': 'uname -a',
            'sistem bilgisi': 'uname -a',
            'bilgisayar': 'uname -a',
            'makine': 'uname -a',
            
            // Process commands
            'işlemler': 'ps aux',
            'çalışan programlar': 'ps aux',
            'süreçler': 'ps aux',
            'aktif programlar': 'ps aux',
            
            // Disk operations
            'disk': 'df -h',
            'alan': 'df -h',
            'boş alan': 'df -h',
            'depolama': 'df -h',
            'hafıza': 'free -h',
            'ram': 'free -h',
            'bellek': 'free -h',
            
            // Network commands
            'ağ': 'ifconfig',
            'internet': 'ping google.com -c 4',
            'bağlantı': 'ping google.com -c 4',
            'ip': 'ifconfig',
            
            // Greetings (convert to helpful commands)
            'merhaba': 'echo "🚀 Merhaba! REBEL AI Terminal\'e hoş geldin. Komutlarını Türkçe yazabilirsin."',
            'selam': 'echo "👋 Selam! Yardım için \'yardım\' yazabilirsin."',
            'hello': 'echo "Hello! Welcome to REBEL AI Terminal"',
            
            // Help commands
            'yardım': 'echo "📋 Kullanılabilir Türkçe komutlar:\\n🕐 saat - tarih ve saat\\n👤 ben kimim - kullanıcı bilgisi\\n📁 dosyalar - dosya listesi\\n📍 konum - mevcut dizin\\n💻 sistem - sistem bilgisi\\n⚙️ işlemler - çalışan programlar\\n💾 disk - disk kullanımı\\n🌐 ağ - ağ bilgisi"',
            'help': 'echo "📋 Available commands: date, whoami, ls, pwd, ps aux, df -h, free -h"',
            'komutlar': 'echo "📋 Türkçe Komutlar: saat, ben kimim, dosyalar, konum, sistem, işlemler, disk, ağ"',
            'bana yardım et': 'echo "🆘 Size nasıl yardımcı olabilirim? Türkçe komutlar için \'yardım\' yazın."',
            'yardım et': 'echo "🤝 Size yardım etmek için buradayım! \'komutlar\' yazarak mevcut komutları görebilirsiniz."',
            
            // Camera/multimedia (placeholder for future implementation)
            'kamera': 'echo "📷 Kamera erişimi şu anda desteklenmiyor. Sistem komutları için \'yardım\' yazın."',
            'kamerayı': 'echo "📷 Kamera açma özelliği web tabanlı terminal\'de mevcut değil."',
            'kamerayı aç': 'echo "📷 Kamera sistemden erişilebilir değil. Sistem komutlarını deneyin."',
            'video': 'echo "🎥 Video komutları henüz desteklenmiyor."',
            
            // AI/Assistant queries
            'yapay': 'echo "🤖 Ben REBEL AI Terminal asistanıyım. Sistem komutlarında yardımcı oluyorum."',
            'yapay zeka': 'echo "🧠 REBEL AI: Türkçe komutları anlayıp İngilizce sistem komutlarına çeviriyorum."',
            'sen kimsin': 'echo "🚀 Ben REBEL AI - Dijkstra Edition! Taşınabilir AI terminal asistanınızım."',
            'ne iş yaparsın': 'echo "💼 Ben REBEL AI Terminal asistanıyım! Türkçe komutlarınızı sistem komutlarına çeviriyorum. Örnek: \'saat\', \'dosyalar\', \'sistem\' yazabilirsiniz."',
            'neler yapabilirsin': 'echo "⚡ Türkçe komutları anlayıp sistem komutlarına çevirebilirim: saat, dosyalar, sistem bilgisi, kullanıcı bilgisi ve daha fazlası!"',
            'hangi komutlar': 'echo "📋 Desteklediğim komutlar: saat, ben kimim, dosyalar, konum, sistem, işlemler, disk, ağ, yardım"',
            
            // Sistem sorguları
            'bu sistem pille mi çalışıyor': 'echo "🔋 Bu sistem taşınabilir modda çalışır. Pil durumu için sistem bilgisini kontrol edin: \'sistem\' veya \'uname -a\'"',
            'pille çalışıyor mu': 'echo "🔋 Taşınabilir sistem. Pil bilgisi için: \'cat /proc/acpi/battery/BAT0/info\' veya \'acpi -b\'"',
            'batarya durumu': 'echo "🔋 Batarya durumu kontrolü: \'acpi -b\' veya \'cat /sys/class/power_supply/BAT0/capacity\'"',
            'güç durumu': 'echo "⚡ Güç durumu: \'acpi -a\' (AC adapter) veya \'systemctl status\'"',
            
            // Clear/reset
            'temizle': 'clear',
            'ekranı temizle': 'clear',
            'sil': 'clear'
        };
    }

    buildTurkishPatterns() {
        return [
            // Pattern: "X nedir" -> "man X" or "X --help"
            {
                pattern: /(.+?)\s+(nedir|ne)\s*\??$/i,
                replacement: (match, command) => `man ${command} 2>/dev/null || ${command} --help 2>/dev/null || echo "${command} hakkında bilgi bulunamadı"`
            },
            
            // Pattern: "X çalıştır" -> "X"
            {
                pattern: /(.+?)\s+(çalıştır|başlat|aç)\s*$/i,
                replacement: (match, command) => command
            },
            
            // Pattern: "X dosyasını aç" -> "cat X"
            {
                pattern: /(.+?)\s+(dosyasını|dosyayı)\s+(aç|göster|oku)\s*$/i,
                replacement: (match, filename) => `cat ${filename}`
            },
            
            // Pattern: "X klasörüne git" -> "cd X"
            {
                pattern: /(.+?)\s+(klasörüne|dizinine)\s+git\s*$/i,
                replacement: (match, dirname) => `cd ${dirname}`
            },
            
            // Pattern: "X ara" -> "find . -name '*X*'"
            {
                pattern: /(.+?)\s+ara\s*$/i,
                replacement: (match, term) => `find . -name '*${term}*' -type f 2>/dev/null`
            },
            
            // Pattern: "X indir" -> inform about download
            {
                pattern: /(.+?)\s+(indir|download)\s*$/i,
                replacement: (match, item) => `echo "⬇️ İndirme işlemi güvenlik nedeniyle desteklenmiyor. Manuel olarak indirin: ${item}"`
            }
        ];
    }

    buildContextualMappings() {
        return {
            // Context-aware command suggestions
            'system_info': ['sistem', 'bilgisayar', 'makine', 'donanım'],
            'file_operations': ['dosya', 'klasör', 'dizin', 'aç', 'oku'],
            'network': ['ağ', 'internet', 'bağlantı', 'ip'],
            'processes': ['işlem', 'program', 'süreç', 'çalışan'],
            'time': ['saat', 'tarih', 'zaman', 'şimdi'],
            'user': ['ben', 'kim', 'kullanıcı']
        };
    }

    async translate(turkishCommand) {
        if (!turkishCommand || typeof turkishCommand !== 'string') {
            return turkishCommand;
        }

        const cleaned = turkishCommand.trim().toLowerCase();
        
        // Check direct mappings first
        if (this.turkishCommands[cleaned]) {
            return {
                translatedCommand: this.turkishCommands[cleaned],
                originalCommand: turkishCommand,
                translationType: 'direct_mapping',
                confidence: 1.0
            };
        }

        // Check pattern-based translations
        for (const pattern of this.turkishPatterns) {
            const match = cleaned.match(pattern.pattern);
            if (match) {
                const translated = pattern.replacement(match[0], match[1], match[2]);
                return {
                    translatedCommand: translated,
                    originalCommand: turkishCommand,
                    translationType: 'pattern_matching',
                    confidence: 0.8
                };
            }
        }

        // Check for partial matches (fuzzy matching)
        const fuzzyMatch = this.findFuzzyMatch(cleaned);
        if (fuzzyMatch) {
            return {
                translatedCommand: fuzzyMatch.command,
                originalCommand: turkishCommand,
                translationType: 'fuzzy_matching',
                confidence: fuzzyMatch.confidence
            };
        }

        // If no translation found, check if it's already an English command
        if (this.isEnglishCommand(cleaned)) {
            return {
                translatedCommand: turkishCommand,
                originalCommand: turkishCommand,
                translationType: 'english_passthrough',
                confidence: 1.0
            };
        }

        // 🎯 Intelligent Reasoning: Akıllı analiz ve %80+ güven doğrulaması
        if (this.intelligentReasoning && this.containsTurkishCharacters(cleaned)) {
            try {
                console.log(`🎯 Intelligent Reasoning: Analyzing command: "${turkishCommand}"`);
                const reasoning = await this.intelligentReasoning.intelligentReason(turkishCommand);
                
                if (reasoning.confidence >= 0.8 && reasoning.suggestedCommands && reasoning.suggestedCommands.length > 0) {
                    // Yüksek güvenle çeviri bulundu
                    return {
                        translatedCommand: reasoning.suggestedCommands[0],
                        originalCommand: turkishCommand,
                        translationType: 'intelligent_reasoning',
                        confidence: reasoning.confidence,
                        suggestion: `🎯 AI Analizi: ${reasoning.reasoning}`,
                        aiGenerated: true,
                        fullReasoning: reasoning
                    };
                } else if (reasoning.confidence >= 0.5) {
                    // Orta güven, daha fazla analiz gerekiyor
                    console.log(`🧠 AI Learning: Secondary analysis needed for: "${turkishCommand}"`);
                    const aiSuggestion = await this.aiLearning.analyzeFailedTurkishCommand(turkishCommand);
                    
                    if (aiSuggestion.isValidTranslation && aiSuggestion.confidence > 0.5) {
                        return {
                            translatedCommand: aiSuggestion.translatedCommand,
                            originalCommand: turkishCommand,
                            translationType: 'ai_learning_secondary',
                            confidence: Math.max(reasoning.confidence, aiSuggestion.confidence),
                            suggestion: `🔄 Çifte AI Analizi: ${reasoning.reasoning} | ${aiSuggestion.explanation}`,
                            aiGenerated: true
                        };
                    }
                }
            } catch (error) {
                console.log(`🚨 Intelligent Reasoning Error: ${error.message}`);
                
                // Fallback to basic AI learning
                try {
                    console.log(`🧠 AI Learning Fallback: Analyzing: "${turkishCommand}"`);
                    const aiSuggestion = await this.aiLearning.analyzeFailedTurkishCommand(turkishCommand);
                    
                    if (aiSuggestion.isValidTranslation && aiSuggestion.confidence > 0.5) {
                        return {
                            translatedCommand: aiSuggestion.translatedCommand,
                            originalCommand: turkishCommand,
                            translationType: 'ai_learning_fallback',
                            confidence: aiSuggestion.confidence,
                            suggestion: `🔧 Fallback AI: ${aiSuggestion.explanation}`,
                            aiGenerated: true
                        };
                    }
                } catch (fallbackError) {
                    console.log(`🚨 AI Fallback Error: ${fallbackError.message}`);
                }
            }
        }

        // No translation found
        return {
            translatedCommand: turkishCommand,
            originalCommand: turkishCommand,
            translationType: 'no_translation',
            confidence: 0.0,
            suggestion: this.generateSuggestion(cleaned)
        };
    }

    // Türkçe karakter kontrolü
    containsTurkishCharacters(text) {
        const turkishChars = /[çğıöşüÇĞIİÖŞÜ]/;
        const turkishWords = ['ben', 'sen', 'bu', 'şu', 'ne', 'kim', 'neden', 'nasıl', 'nerede', 'ne zaman', 
                             'yardım', 'komut', 'sistem', 'dosya', 'klasör', 'saat', 'tarih', 'bana', 'yap', 'et'];
        
        return turkishChars.test(text) || turkishWords.some(word => text.includes(word));
    }

    findFuzzyMatch(input) {
        const words = input.split(' ');
        
        for (const [turkish, english] of Object.entries(this.turkishCommands)) {
            const turkishWords = turkish.split(' ');
            
            // Check if any Turkish command contains input words
            const matchingWords = words.filter(word => 
                turkishWords.some(tw => tw.includes(word) || word.includes(tw))
            );
            
            if (matchingWords.length > 0) {
                const confidence = matchingWords.length / Math.max(words.length, turkishWords.length);
                if (confidence > 0.5) {
                    return {
                        command: english,
                        confidence: confidence
                    };
                }
            }
        }
        
        return null;
    }

    isEnglishCommand(command) {
        const commonEnglishCommands = [
            'ls', 'pwd', 'whoami', 'date', 'ps', 'df', 'free', 'uname', 'cat', 'grep',
            'find', 'which', 'man', 'top', 'htop', 'kill', 'mkdir', 'rmdir', 'cp', 'mv',
            'chmod', 'chown', 'tar', 'zip', 'unzip', 'wget', 'curl', 'ping', 'netstat',
            'ifconfig', 'ssh', 'scp', 'rsync', 'git', 'npm', 'node', 'python', 'pip'
        ];
        
        const firstWord = command.split(' ')[0];
        return commonEnglishCommands.includes(firstWord);
    }

    generateSuggestion(input) {
        // Generate helpful suggestions based on context
        const suggestions = [];
        
        for (const [context, keywords] of Object.entries(this.contextualMappings)) {
            const matchingKeywords = keywords.filter(keyword => 
                input.includes(keyword) || keyword.includes(input)
            );
            
            if (matchingKeywords.length > 0) {
                switch (context) {
                    case 'system_info':
                        suggestions.push("💻 Sistem bilgisi için: 'sistem' veya 'uname -a'");
                        break;
                    case 'file_operations':
                        suggestions.push("📁 Dosya işlemleri için: 'dosyalar' veya 'ls -la'");
                        break;
                    case 'time':
                        suggestions.push("🕐 Tarih/saat için: 'saat' veya 'date'");
                        break;
                    case 'user':
                        suggestions.push("👤 Kullanıcı bilgisi için: 'ben kimim' veya 'whoami'");
                        break;
                    case 'network':
                        suggestions.push("🌐 Ağ bilgisi için: 'ağ' veya 'ifconfig'");
                        break;
                    case 'processes':
                        suggestions.push("⚙️ Çalışan programlar için: 'işlemler' veya 'ps aux'");
                        break;
                }
            }
        }
        
        if (suggestions.length === 0) {
            suggestions.push("❓ Yardım için: 'yardım' veya 'komutlar'");
        }
        
        return suggestions.join(' | ');
    }

    getTranslationStats() {
        return {
            totalCommands: Object.keys(this.turkishCommands).length,
            patterns: this.turkishPatterns.length,
            contexts: Object.keys(this.contextualMappings).length
        };
    }

    getAllTurkishCommands() {
        return Object.keys(this.turkishCommands).sort();
    }
}

module.exports = TurkishTranslator;
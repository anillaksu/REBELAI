// ==========================================
// 🧠 REBEL AI - Learning Status Endpoint
// ==========================================
// AI Learning system status and statistics

class AIStatusEndpoint {
    static addRoutes(app, turkishTranslator, dijkstraOptimizer) {
        // AI Learning status endpoint
        app.get('/api/ai-learning', async (req, res) => {
            try {
                const aiStatus = {
                    enabled: !!process.env.OPENAI_API_KEY,
                    version: "1.0.0",
                    model: "gpt-5",
                    features: {
                        turkishTranslation: true,
                        dijkstraOptimization: true,
                        continuousLearning: true,
                        errorAnalysis: true
                    }
                };

                // Turkish translator AI stats
                if (turkishTranslator && turkishTranslator.aiLearning) {
                    aiStatus.turkish = turkishTranslator.aiLearning.getLearningStats();
                }

                // Dijkstra optimizer AI stats  
                if (dijkstraOptimizer && dijkstraOptimizer.aiLearning) {
                    aiStatus.optimization = dijkstraOptimizer.aiLearning.getLearningStats();
                }

                res.json(aiStatus);

            } catch (error) {
                console.error('AI Status Error:', error);
                res.status(500).json({ 
                    error: 'AI status unavailable',
                    enabled: false
                });
            }
        });

        // Manual AI learning trigger (for testing)
        app.post('/api/ai-learning/test', async (req, res) => {
            try {
                const { command } = req.body;
                
                if (!command) {
                    return res.status(400).json({ error: 'Command required' });
                }

                let result = { testCommand: command };

                // Test Turkish translation AI
                if (turkishTranslator && turkishTranslator.aiLearning) {
                    const aiSuggestion = await turkishTranslator.aiLearning.analyzeFailedTurkishCommand(command);
                    result.aiTranslation = aiSuggestion;
                }

                res.json(result);

            } catch (error) {
                console.error('AI Test Error:', error);
                res.status(500).json({ 
                    error: 'AI test failed',
                    message: error.message 
                });
            }
        });
    }
}

module.exports = AIStatusEndpoint;
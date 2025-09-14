# ==========================================
# 🤖 REBEL AI Engine - YZ Entegrasyon Katmanı
# ==========================================
# OpenAI, Ollama, Oobabooga ve Yerel Model Desteği

import os
import json
import yaml
import subprocess
import requests
import platform
from typing import Optional, Tuple, Dict, Any
from openai import OpenAI


class REBELAIEngine:
    def __init__(self, config_path: str = "rebel_config.yaml"):
        """REBEL AI Engine başlatıcı"""
        self.config = self._load_config(config_path)
        self.ai_config = self.config.get('ai_engine', {})
        self.platform_name = platform.system().lower()
        
        # AI istemcilerini başlat
        self.openai_client = self._init_openai()
        self.ollama_enabled = self.ai_config.get('ollama', {}).get('enabled', False)
        self.oobabooga_enabled = self.ai_config.get('oobabooga', {}).get('enabled', False)
        self.local_model_enabled = self.ai_config.get('local_model', {}).get('enabled', False)
        
        print(f"🤖 REBEL AI Engine initialized for {self.platform_name}")
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """YAML yapılandırma dosyasını yükle"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"⚠️ Config yükleme hatası: {e}")
            return {}
    
    def _init_openai(self) -> Optional[OpenAI]:
        """OpenAI istemcisini başlat"""
        try:
            api_key = os.environ.get(
                self.ai_config.get('openai', {}).get('api_key_env', 'OPENAI_API_KEY')
            )
            if api_key:
                return OpenAI(api_key=api_key)
            else:
                print("⚠️ OpenAI API key bulunamadı")
                return None
        except Exception as e:
            print(f"⚠️ OpenAI başlatma hatası: {e}")
            return None
    
    def interpret_command(self, user_input: str) -> Tuple[str, str, bool]:
        """
        Kullanıcı girdisini yorumla ve platforma uygun komuta çevir
        
        Returns:
            Tuple[interpreted_command, explanation, is_confident]
        """
        try:
            # Önce OpenAI dene
            if self.openai_client:
                return self._interpret_with_openai(user_input)
            
            # Ollama dene
            elif self.ollama_enabled:
                return self._interpret_with_ollama(user_input)
            
            # Oobabooga dene
            elif self.oobabooga_enabled:
                return self._interpret_with_oobabooga(user_input)
            
            # Yerel model dene
            elif self.local_model_enabled:
                return self._interpret_with_local_model(user_input)
            
            # AI yok, temel çeviri dene
            else:
                return self._interpret_basic(user_input)
                
        except Exception as e:
            print(f"⚠️ Komut yorumlama hatası: {e}")
            return user_input, f"❌ Hata: {str(e)}", False
    
    def _interpret_with_openai(self, user_input: str) -> Tuple[str, str, bool]:
        """OpenAI ile komut yorumlama"""
        try:
            platform_shell = self._get_platform_shell()
            
            system_prompt = f"""Sen REBEL AI komut yorumlayıcısısın. Kullanıcının Türkçe/İngilizce komutunu {self.platform_name} ({platform_shell}) için uygun shell komutuna çevir.

KURALLAR:
1. Sadece güvenli, zararsız komutlar öner
2. Emin değilsen "⚠️ Bu komutu doğru anlamadım" diye başla
3. Yanıt formatı: JSON {{"command": "shell_komutu", "explanation": "açıklama", "confident": true/false}}
4. Tehlikeli komutları (rm, sudo, etc.) asla önerme
5. Platform: {self.platform_name}, Shell: {platform_shell}

ÖRNEKLER:
- "dosyaları listele" → "ls -la" (Linux/Mac) veya "dir" (Windows)
- "ben kimim" → "whoami"
- "sistem bilgisi" → "uname -a" (Linux/Mac) veya "systeminfo" (Windows)"""

            response = self.openai_client.chat.completions.create(
                model=self.ai_config.get('openai', {}).get('model', 'gpt-4o-mini'),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ],
                max_tokens=self.ai_config.get('openai', {}).get('max_tokens', 1000),
                temperature=self.ai_config.get('openai', {}).get('temperature', 0.3),
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return (
                result.get('command', user_input),
                result.get('explanation', 'AI yorumlaması'),
                result.get('confident', False)
            )
            
        except Exception as e:
            print(f"⚠️ OpenAI API hatası: {e}")
            return user_input, f"❌ OpenAI hatası: {str(e)}", False
    
    def _interpret_with_ollama(self, user_input: str) -> Tuple[str, str, bool]:
        """Ollama ile komut yorumlama"""
        try:
            endpoint = self.ai_config.get('ollama', {}).get('endpoint', 'http://localhost:11434')
            model = self.ai_config.get('ollama', {}).get('model', 'llama2')
            
            prompt = f"""Kullanıcı komutu: "{user_input}"
Platform: {self.platform_name}
Bu komutu {self.platform_name} shell komutuna çevir. Sadece güvenli komutlar öner.
JSON formatında yanıt ver: {{"command": "shell_komutu", "explanation": "açıklama", "confident": true/false}}"""

            response = requests.post(
                f"{endpoint}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result_text = response.json().get('response', '{}')
                try:
                    result = json.loads(result_text)
                    return (
                        result.get('command', user_input),
                        result.get('explanation', 'Ollama yorumlaması'),
                        result.get('confident', False)
                    )
                except json.JSONDecodeError:
                    return user_input, "❌ Ollama JSON parse hatası", False
            else:
                return user_input, f"❌ Ollama bağlantı hatası: {response.status_code}", False
                
        except Exception as e:
            print(f"⚠️ Ollama hatası: {e}")
            return user_input, f"❌ Ollama hatası: {str(e)}", False
    
    def _interpret_with_oobabooga(self, user_input: str) -> Tuple[str, str, bool]:
        """Oobabooga ile komut yorumlama"""
        try:
            endpoint = self.ai_config.get('oobabooga', {}).get('endpoint', 'http://localhost:5000')
            
            prompt = f"""Kullanıcı komutu: "{user_input}"
Platform: {self.platform_name}
Bu komutu güvenli shell komutuna çevir.
JSON: {{"command": "shell_komutu", "explanation": "açıklama", "confident": true/false}}"""

            response = requests.post(
                f"{endpoint}/api/v1/generate",
                json={
                    "prompt": prompt,
                    "max_new_tokens": 200,
                    "temperature": 0.3,
                    "stop": ["\n\n"]
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result_text = response.json().get('results', [{}])[0].get('text', '{}')
                try:
                    result = json.loads(result_text)
                    return (
                        result.get('command', user_input),
                        result.get('explanation', 'Oobabooga yorumlaması'),
                        result.get('confident', False)
                    )
                except json.JSONDecodeError:
                    return user_input, "❌ Oobabooga JSON parse hatası", False
            else:
                return user_input, f"❌ Oobabooga bağlantı hatası: {response.status_code}", False
                
        except Exception as e:
            print(f"⚠️ Oobabooga hatası: {e}")
            return user_input, f"❌ Oobabooga hatası: {str(e)}", False
    
    def _interpret_with_local_model(self, user_input: str) -> Tuple[str, str, bool]:
        """Yerel model ile komut yorumlama"""
        try:
            model_path = self.ai_config.get('local_model', {}).get('model_path')
            executable_path = self.ai_config.get('local_model', {}).get('executable_path')
            context_size = self.ai_config.get('local_model', {}).get('context_size', 2048)
            
            if not os.path.exists(model_path) or not os.path.exists(executable_path):
                return user_input, "❌ Yerel model dosyaları bulunamadı", False
            
            prompt = f"""Kullanıcı komutu: "{user_input}"
Platform: {self.platform_name}
Güvenli shell komutuna çevir.
JSON: {{"command": "shell_komutu", "explanation": "açıklama", "confident": true/false}}"""

            # llama.cpp çalıştır
            process = subprocess.run([
                executable_path,
                "-m", model_path,
                "-c", str(context_size),
                "-p", prompt,
                "--temp", "0.3",
                "-n", "200"
            ], capture_output=True, text=True, timeout=60)
            
            if process.returncode == 0:
                output = process.stdout.strip()
                try:
                    # JSON kısmını çıkar
                    json_start = output.find('{')
                    json_end = output.rfind('}') + 1
                    if json_start >= 0 and json_end > json_start:
                        result = json.loads(output[json_start:json_end])
                        return (
                            result.get('command', user_input),
                            result.get('explanation', 'Yerel model yorumlaması'),
                            result.get('confident', False)
                        )
                except json.JSONDecodeError:
                    pass
                
                return user_input, "❌ Yerel model JSON parse hatası", False
            else:
                return user_input, f"❌ Yerel model hatası: {process.stderr}", False
                
        except Exception as e:
            print(f"⚠️ Yerel model hatası: {e}")
            return user_input, f"❌ Yerel model hatası: {str(e)}", False
    
    def _interpret_basic(self, user_input: str) -> Tuple[str, str, bool]:
        """Temel yorumlama (AI olmadan)"""
        # Basit çeviriler
        translations = {
            # Türkçe çeviriler
            "dosyaları listele": "ls -la" if self.platform_name != "windows" else "dir",
            "dosya listesi": "ls -la" if self.platform_name != "windows" else "dir",
            "ben kimim": "whoami",
            "kim": "whoami",
            "nereyim": "pwd",
            "konum": "pwd",
            "tarih": "date",
            "saat": "date",
            "sistem bilgisi": "uname -a" if self.platform_name != "windows" else "systeminfo",
            "çalışma süresi": "uptime",
            "uptime": "uptime",
            "disk kullanımı": "df -h" if self.platform_name != "windows" else "wmic logicaldisk get size,freespace,caption",
            "bellek kullanımı": "free -h" if self.platform_name != "windows" else "wmic OS get TotalVisibleMemorySize,FreePhysicalMemory",
            "process listesi": "ps aux" if self.platform_name != "windows" else "tasklist",
            "süreç listesi": "ps aux" if self.platform_name != "windows" else "tasklist",
            
            # İngilizce çeviriler
            "list files": "ls -la" if self.platform_name != "windows" else "dir",
            "who am i": "whoami",
            "where am i": "pwd",
            "current directory": "pwd",
            "date and time": "date",
            "system info": "uname -a" if self.platform_name != "windows" else "systeminfo",
            "disk usage": "df -h" if self.platform_name != "windows" else "wmic logicaldisk get size,freespace,caption",
            "memory usage": "free -h" if self.platform_name != "windows" else "wmic OS get TotalVisibleMemorySize,FreePhysicalMemory",
            "process list": "ps aux" if self.platform_name != "windows" else "tasklist"
        }
        
        user_lower = user_input.lower().strip()
        
        for key, value in translations.items():
            if key in user_lower:
                return value, f"Temel çeviri: '{key}' → '{value}'", True
        
        # Bilinmeyen komut
        return user_input, "⚠️ Bu komutu doğru anlamadım, ne yapmak istiyorsun?", False
    
    def _get_platform_shell(self) -> str:
        """Platform için varsayılan shell'i al"""
        platform_config = self.config.get('platform', {})
        
        if self.platform_name == "windows":
            return platform_config.get('windows', {}).get('shell', 'powershell')
        elif self.platform_name == "linux":
            return platform_config.get('linux', {}).get('shell', 'bash')
        elif self.platform_name == "darwin":  # macOS
            return platform_config.get('macos', {}).get('shell', 'zsh')
        else:
            return "bash"
    
    def analyze_error(self, command: str, error_output: str) -> str:
        """Hata çıktısını analiz et ve çözüm önerisi sun"""
        try:
            if self.openai_client:
                system_prompt = f"""Sen REBEL AI hata analizcisisın. {self.platform_name} sisteminde çalışan komutların hatalarını analiz et ve çözüm öner.

Komut: {command}
Hata: {error_output}

Türkçe olarak:
1. Hatanın sebebini açıkla
2. Çözüm önerileri sun
3. Alternatif komutlar öner"""

                response = self.openai_client.chat.completions.create(
                    model=self.ai_config.get('openai', {}).get('model', 'gpt-4o-mini'),
                    messages=[
                        {"role": "system", "content": system_prompt}
                    ],
                    max_tokens=500,
                    temperature=0.3
                )
                
                return response.choices[0].message.content
            else:
                return f"❌ Hata bulundu: {error_output}\n💡 İpucu: Komut sözdizimini kontrol edin veya yetki gerekebilir."
                
        except Exception as e:
            return f"❌ Hata analizi yapılamadı: {str(e)}"
    
    def get_ai_status(self) -> Dict[str, Any]:
        """AI motorlarının durumunu döndür"""
        return {
            "openai_available": self.openai_client is not None,
            "ollama_enabled": self.ollama_enabled,
            "oobabooga_enabled": self.oobabooga_enabled,
            "local_model_enabled": self.local_model_enabled,
            "platform": self.platform_name,
            "shell": self._get_platform_shell()
        }


# Test fonksiyonu
if __name__ == "__main__":
    engine = REBELAIEngine()
    
    print("🤖 REBEL AI Engine Test")
    print("=" * 40)
    
    test_commands = [
        "dosyaları listele",
        "ben kimim",
        "sistem bilgisi",
        "list files",
        "bilinmeyen komut test"
    ]
    
    for cmd in test_commands:
        result, explanation, confident = engine.interpret_command(cmd)
        print(f"Girdi: {cmd}")
        print(f"Çıktı: {result}")
        print(f"Açıklama: {explanation}")
        print(f"Güvenilir: {confident}")
        print("-" * 30)
    
    print("\n📊 AI Durum:")
    status = engine.get_ai_status()
    for key, value in status.items():
        print(f"{key}: {value}")
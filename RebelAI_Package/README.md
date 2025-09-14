# ⚡ REBEL AI - Komut Yöneticisi

Cross-platform AI-powered command manager with natural language processing and Dijkstra optimization.

## 🚀 Özellikleri

- **Cross-Platform**: Windows (PowerShell/CMD), Linux (Bash), macOS (Zsh)
- **AI Entegrasyonu**: OpenAI API, Ollama, Oobabooga, yerel modeller
- **Dijkstra Optimizasyon**: Komut zinciri optimizasyonu
- **Neon Terminal UI**: Siyah/yeşil retro tema
- **JSON Loglama**: Detaylı kayıt sistemi
- **Token Authentication**: Güvenli erişim kontrolü

## 📦 Kurulum

### 1. Projeyi İndirin
```bash
# Git ile klonlayın veya ZIP olarak indirin
git clone <repository-url>
cd RebelAI_Cmd_Manager
```

### 2. Python Bağımlılıklarını Yükleyin
```bash
# Python 3.8+ gereklidir
pip install -r requirements.txt
```

### 3. Ortam Değişkenlerini Ayarlayın

**Windows (CMD):**
```batch
set REBEL_AUTH_TOKEN=your_secure_token_here
set REBEL_ADMIN_TOKEN=your_admin_token_here
set OPENAI_API_KEY=your_openai_key_here
```

**Windows (PowerShell):**
```powershell
$env:REBEL_AUTH_TOKEN = "your_secure_token_here"
$env:REBEL_ADMIN_TOKEN = "your_admin_token_here"
$env:OPENAI_API_KEY = "your_openai_key_here"
```

**Linux/macOS:**
```bash
export REBEL_AUTH_TOKEN="your_secure_token_here"
export REBEL_ADMIN_TOKEN="your_admin_token_here"
export OPENAI_API_KEY="your_openai_key_here"
```

### 4. Çalıştırın

**Windows:**
```batch
run.bat
```

**Linux/macOS:**
```bash
chmod +x run.sh
./run.sh
```

### 5. Tarayıcıda Açın
http://localhost:5000

## 🔧 Yapılandırma

`rebel_config.yaml` dosyasını düzenleyerek sistemi özelleştirebilirsiniz:
- AI motor ayarları
- Güvenlik kısıtlamaları
- Log ayarları
- Platform-specific yapılandırma

## 📋 Kullanım Örnekleri

- `"dosyaları listele"` → `ls -la` / `dir`
- `"ben kimim"` → `whoami`
- `"sistem bilgisi"` → `uname -a` / `systeminfo`
- `"find all .txt files and then zip them"` → Multi-command optimization

## 🛠️ Sorun Giderme

1. **Port 5000 kullanımda**: Başka bir port kullanın veya çakışan servisi durdurun
2. **Python modül hatası**: `pip install -r requirements.txt` çalıştırın
3. **Token hatası**: Ortam değişkenlerini kontrol edin
4. **AI çalışmıyor**: OpenAI API key'ini kontrol edin

## 📁 Proje Yapısı

```
RebelAI_Cmd_Manager/
├── rebel_ai_manager.py      # Ana Python backend
├── ai_engine.py            # AI entegrasyonu
├── dijkstra_scheduler.py   # Komut optimizasyon
├── rebel_config.yaml       # Yapılandırma
├── templates/index.html    # Web arayüzü
├── static/                 # CSS/JS dosyaları
├── run.bat                 # Windows başlatıcı
├── run.sh                  # Linux/Mac başlatıcı
└── logs/                   # Log dosyaları
```

## 🔒 Güvenlik

- Token-based authentication
- Komut allowlist/blocklist
- Güvenli subprocess çalıştırma
- Log-based audit trail

## 📄 Lisans

MIT License
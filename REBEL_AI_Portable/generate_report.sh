#!/bin/bash

# ==========================================
# 🚀 REBEL AI - Dijkstra Edition
# Tam Rapor Üretici ve Windows Explorer Açıcı
# ==========================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Progress indicator
print_step() {
    echo -e "${CYAN}🔄${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Header
echo ""
echo -e "${WHITE}=========================================="
echo -e "🚀 REBEL AI - Dijkstra Edition"
echo -e "📊 Tam Sistem Raporu Üretici"
echo -e "==========================================${NC}"
echo ""

# Get current timestamp
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
REPORT_DIR="REBEL_AI_Report_${TIMESTAMP}"

print_step "Rapor dizini oluşturuluyor: $REPORT_DIR"
mkdir -p "$REPORT_DIR"

# Create subdirectories
mkdir -p "$REPORT_DIR/logs"
mkdir -p "$REPORT_DIR/data"
mkdir -p "$REPORT_DIR/system"
mkdir -p "$REPORT_DIR/screenshots"
mkdir -p "$REPORT_DIR/source_info"

print_success "Rapor dizin yapısı oluşturuldu"

# System Information
print_step "Sistem bilgileri toplanıyor..."

cat > "$REPORT_DIR/system/system_info.txt" << EOF
🚀 REBEL AI - Dijkstra Edition System Report
Generated: $(date)
======================================================

SYSTEM INFORMATION:
- Hostname: $(hostname)
- OS: $(uname -a)
- Kernel: $(uname -r)
- Architecture: $(uname -m)
- Shell: $SHELL
- User: $(whoami)
- Home: $HOME
- PWD: $(pwd)

HARDWARE INFO:
- CPU: $(grep -m 1 'model name' /proc/cpuinfo | cut -d':' -f2 | xargs)
- CPU Cores: $(nproc)
- Memory: $(free -h | grep '^Mem:' | awk '{print $2}')
- Disk Space: $(df -h . | tail -1 | awk '{print $4 " available of " $2}')

NETWORK INFO:
- IP Address: $(hostname -I | awk '{print $1}')
- Network Interfaces: $(ip addr show | grep -E '^[0-9]+:' | cut -d':' -f2 | xargs)

WSL INFO (if applicable):
- WSL Version: $(wsl --version 2>/dev/null | head -1 || echo "Not in WSL or wsl command not found")
- WSL Status: $(wsl --status 2>/dev/null || echo "Not available")

NODE.JS INFO:
- Node Version: $(node --version 2>/dev/null || echo "Not installed")
- NPM Version: $(npm --version 2>/dev/null || echo "Not installed")
- NPM Global Path: $(npm root -g 2>/dev/null || echo "Not available")

PROCESS INFO:
- Running REBEL AI processes:
$(ps aux | grep -i rebel | grep -v grep || echo "No REBEL AI processes found")

- Node.js processes:
$(ps aux | grep node | grep -v grep || echo "No Node.js processes found")

- Port 3000/5000 usage:
$(netstat -tulpn 2>/dev/null | grep -E ':(3000|5000)' || echo "Ports 3000/5000 not in use")

======================================================
EOF

print_success "Sistem bilgileri kaydedildi"

# REBEL AI Project Information
print_step "REBEL AI proje bilgileri toplanıyor..."

cat > "$REPORT_DIR/source_info/project_structure.txt" << EOF
🚀 REBEL AI Project Structure
Generated: $(date)
======================================================

PROJECT DIRECTORY TREE:
$(tree -a . 2>/dev/null || find . -type f -name ".*" -prune -o -type f -print | sort)

======================================================

PACKAGE.JSON:
$(cat package.json 2>/dev/null || echo "package.json not found")

======================================================

NODE_MODULES:
$(ls -la node_modules 2>/dev/null | head -20 || echo "node_modules not found")
$(echo "... (showing first 20 entries)")

======================================================

FILE SIZES:
$(du -sh * 2>/dev/null | sort -hr)

======================================================

RECENT FILES:
$(find . -name "*.js" -o -name "*.json" -o -name "*.html" -o -name "*.css" | xargs ls -lt | head -20)

======================================================
EOF

print_success "Proje yapısı bilgisi kaydedildi"

# Copy source files information
print_step "Kaynak kod bilgileri kopyalanıyor..."

if [ -f "src/server.js" ]; then
    echo "=== SERVER.JS HEADER ===" > "$REPORT_DIR/source_info/server_info.txt"
    head -50 src/server.js >> "$REPORT_DIR/source_info/server_info.txt"
    echo "" >> "$REPORT_DIR/source_info/server_info.txt"
    echo "=== SERVER.JS STATS ===" >> "$REPORT_DIR/source_info/server_info.txt"
    wc -l src/server.js >> "$REPORT_DIR/source_info/server_info.txt"
fi

if [ -d "src" ]; then
    echo "=== SOURCE FILES ===" > "$REPORT_DIR/source_info/source_files.txt"
    find src -name "*.js" | while read file; do
        echo "File: $file ($(wc -l < "$file") lines)" >> "$REPORT_DIR/source_info/source_files.txt"
    done
fi

print_success "Kaynak kod bilgileri kaydedildi"

# Copy data and logs
print_step "Data ve log dosyaları kopyalanıyor..."

# Copy knowledge database
if [ -f "data/knowledge.json" ]; then
    cp "data/knowledge.json" "$REPORT_DIR/data/"
    print_success "Knowledge database kopyalandı"
else
    echo "Knowledge database bulunamadı" > "$REPORT_DIR/data/knowledge_not_found.txt"
    print_warning "Knowledge database bulunamadı"
fi

# Copy logs
if [ -d "data/logs" ]; then
    cp -r data/logs/* "$REPORT_DIR/logs/" 2>/dev/null
    LOG_COUNT=$(find data/logs -name "*.log" | wc -l)
    print_success "$LOG_COUNT log dosyası kopyalandı"
else
    echo "Log dizini bulunamadı" > "$REPORT_DIR/logs/logs_not_found.txt"
    print_warning "Log dizini bulunamadı"
fi

# Generate current status report
print_step "Güncel durum raporu oluşturuluyor..."

cat > "$REPORT_DIR/current_status.txt" << EOF
🚀 REBEL AI - Current Status Report
Generated: $(date)
======================================================

SERVER STATUS:
$(curl -s http://localhost:3000/api/status 2>/dev/null | jq . || echo "Server not responding on port 3000")

$(curl -s http://localhost:5000/api/status 2>/dev/null | jq . || echo "Server not responding on port 5000")

KNOWLEDGE DATABASE STATUS:
$(curl -s http://localhost:3000/api/knowledge 2>/dev/null | jq . | head -20 || echo "Knowledge API not responding on port 3000")

$(curl -s http://localhost:5000/api/knowledge 2>/dev/null | jq . | head -20 || echo "Knowledge API not responding on port 5000")

RECENT COMMAND HISTORY (from logs):
$(tail -50 data/logs/commands.log 2>/dev/null || echo "Command log not found")

PACKAGE AUDIT:
$(npm audit --audit-level=moderate 2>/dev/null | head -20 || echo "npm audit failed or no package.json")

SECURITY CHECK:
$(npm audit --audit-level=high 2>/dev/null || echo "npm audit failed")

======================================================
EOF

print_success "Güncel durum raporu oluşturuldu"

# Performance and resource usage
print_step "Performans ve kaynak kullanımı bilgisi toplanıyor..."

cat > "$REPORT_DIR/system/performance.txt" << EOF
🚀 REBEL AI - Performance Report
Generated: $(date)
======================================================

MEMORY USAGE:
$(free -h)

DISK USAGE:
$(df -h)

CPU USAGE:
$(top -bn1 | grep "Cpu(s)" || echo "CPU usage info not available")

LOAD AVERAGE:
$(uptime)

NETWORK CONNECTIONS:
$(netstat -tulpn 2>/dev/null | grep -E ':(3000|5000|80|443)' || echo "No relevant network connections")

OPEN FILES (REBEL related):
$(lsof -i :3000 2>/dev/null || echo "No files open on port 3000")
$(lsof -i :5000 2>/dev/null || echo "No files open on port 5000")

======================================================
EOF

print_success "Performans raporu oluşturuldu"

# Create summary report
print_step "Özet rapor oluşturuluyor..."

cat > "$REPORT_DIR/RAPOR_OZETI.txt" << EOF
🚀 REBEL AI - Dijkstra Edition 
📊 ÖZET RAPOR
Generated: $(date)
======================================================

📁 RAPOR İÇERİĞİ:
- system/          → Sistem bilgileri, performans
- data/           → Knowledge database, uygulama verisi  
- logs/           → Tüm log dosyaları
- source_info/    → Kaynak kod bilgileri
- current_status.txt → Güncel API durumları

🔍 ÖNEMLİ DOSYALAR:
- RAPOR_OZETI.txt (bu dosya)
- current_status.txt → API durumları
- system/system_info.txt → Sistem detayları
- system/performance.txt → Performans metrikleri
- data/knowledge.json → AI öğrenme veritabanı
- logs/ → Tüm çalıştırma logları

📊 İSTATİSTİKLER:
- Toplam dosya sayısı: $(find "$REPORT_DIR" -type f | wc -l)
- Toplam rapor boyutu: $(du -sh "$REPORT_DIR" | cut -f1)
- Log dosyası sayısı: $(find "$REPORT_DIR/logs" -name "*.log" 2>/dev/null | wc -l)
- Knowledge DB boyutu: $(stat -c%s "$REPORT_DIR/data/knowledge.json" 2>/dev/null | numfmt --to=iec || echo "N/A")

🎯 SONRAKİ ADIMLAR:
1. Bu rapor dizinini inceleyebilirsin
2. Logs klasöründeki logları analiz edebilirsin
3. current_status.txt dosyasından API durumunu görebilirsin
4. data/knowledge.json'dan AI'ın öğrendiklerini görebilirsin

🔧 SORUN GİDERME:
- Eğer server çalışmıyorsa current_status.txt kontrol et
- Log errors için logs/ klasörünü incele
- Performance sorunları için system/performance.txt bak

======================================================
Rapor tamamlandı: $(date)
🚀 REBEL AI - Dijkstra Edition
======================================================
EOF

print_success "Özet rapor oluşturuldu"

# Generate quick statistics
TOTAL_FILES=$(find "$REPORT_DIR" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$REPORT_DIR" | cut -f1)

print_info "Rapor istatistikleri:"
echo "  📁 Toplam dosya: $TOTAL_FILES"
echo "  💾 Toplam boyut: $TOTAL_SIZE"
echo "  📍 Konum: $(pwd)/$REPORT_DIR"

# Try to open with Windows Explorer (WSL)
print_step "Windows Explorer ile açılıyor..."

# First, try to get the Windows path
if command -v wslpath >/dev/null 2>&1; then
    # We're in WSL
    WINDOWS_PATH=$(wslpath -w "$(pwd)/$REPORT_DIR" 2>/dev/null)
    if [ ! -z "$WINDOWS_PATH" ]; then
        print_success "WSL ortamı tespit edildi"
        print_info "Windows yolu: $WINDOWS_PATH"
        
        # Open with Windows Explorer
        cmd.exe /c "explorer.exe \"$WINDOWS_PATH\"" 2>/dev/null &
        print_success "Windows Explorer açıldı"
    else
        print_warning "WSL path dönüşümü başarısız"
    fi
elif [ -d "/mnt/c" ]; then
    # Alternative WSL detection
    print_info "WSL mount tespit edildi (/mnt/c)"
    CURRENT_DIR=$(pwd | sed 's|/mnt/c|C:|' | sed 's|/|\\|g')
    cmd.exe /c "explorer.exe \"$CURRENT_DIR\\$REPORT_DIR\"" 2>/dev/null &
    print_success "Windows Explorer açıldı (alternative method)"
else
    print_warning "WSL ortamı bulunamadı, manuel açım gerekli"
    print_info "Manuel açım: $(pwd)/$REPORT_DIR"
fi

# Final summary
echo ""
echo -e "${GREEN}=========================================="
echo -e "✅ RAPOR BAŞARIYLA OLUŞTURULDU!"
echo -e "==========================================${NC}"
echo -e "${WHITE}📁 Rapor dizini: ${CYAN}$REPORT_DIR${NC}"
echo -e "${WHITE}📊 Toplam dosya: ${CYAN}$TOTAL_FILES${NC}"
echo -e "${WHITE}💾 Toplam boyut: ${CYAN}$TOTAL_SIZE${NC}"
echo ""
echo -e "${YELLOW}🔍 İnceleme önerileri:${NC}"
echo -e "   1️⃣  RAPOR_OZETI.txt → Genel bilgi"
echo -e "   2️⃣  current_status.txt → API durumları"  
echo -e "   3️⃣  logs/ → Çalıştırma logları"
echo -e "   4️⃣  data/knowledge.json → AI öğrenme veritabanı"
echo ""
echo -e "${CYAN}Windows Explorer'da rapor açıldı! 🚀${NC}"
echo ""
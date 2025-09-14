#!/bin/bash
# ==========================================
# ⚡ REBEL AI - Linux/macOS Startup Script
# ==========================================
# Cross-platform Unix runner (Linux/macOS)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${CYAN}"
    echo "=========================================="
    echo "⚡ REBEL AI - Komut Yöneticisi"
    echo "=========================================="
    echo -e "Linux/macOS başlatıcı (run.sh)${NC}"
    echo
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ HATA: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  UYARI: $1${NC}"
}

print_info() {
    echo -e "${BLUE}🔍 $1${NC}"
}

check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

install_python_package() {
    local package=$1
    echo -e "${YELLOW}📦 Installing $package...${NC}"
    
    if check_command pip3; then
        pip3 install "$package"
    elif check_command pip; then
        pip install "$package"
    else
        print_error "pip bulunamadı!"
        exit 1
    fi
}

# Main script
main() {
    print_header
    
    # Platform detection
    PLATFORM=$(uname -s)
    print_info "Platform: $PLATFORM"
    
    # Check environment variables
    print_info "Ortam değişkenleri kontrol ediliyor..."
    
    if [ -z "$REBEL_AUTH_TOKEN" ]; then
        print_error "REBEL_AUTH_TOKEN ortam değişkeni bulunamadı!"
        echo
        echo "📋 Lütfen şu komutu çalıştırın:"
        echo "export REBEL_AUTH_TOKEN='your_secure_token_here'"
        echo
        echo "Kalıcı olması için ~/.bashrc veya ~/.zshrc dosyanıza ekleyin:"
        echo "echo 'export REBEL_AUTH_TOKEN=\"your_secure_token_here\"' >> ~/.bashrc"
        echo
        exit 1
    fi
    
    if [ -z "$REBEL_ADMIN_TOKEN" ]; then
        print_error "REBEL_ADMIN_TOKEN ortam değişkeni bulunamadı!"
        echo
        echo "📋 Lütfen şu komutu çalıştırın:"
        echo "export REBEL_ADMIN_TOKEN='your_admin_token_here'"
        echo
        echo "Kalıcı olması için ~/.bashrc veya ~/.zshrc dosyanıza ekleyin:"
        echo "echo 'export REBEL_ADMIN_TOKEN=\"your_admin_token_here\"' >> ~/.bashrc"
        echo
        exit 1
    fi
    
    print_success "Auth token'lar bulundu"
    
    # Check Python
    print_info "Python kurulumu kontrol ediliyor..."
    
    PYTHON_CMD=""
    if check_command python3; then
        PYTHON_CMD="python3"
        PYTHON_VERSION=$(python3 --version)
    elif check_command python; then
        PYTHON_CMD="python"
        PYTHON_VERSION=$(python --version)
    else
        print_error "Python bulunamadı!"
        echo
        echo "📋 Python kurulum rehberi:"
        case "$PLATFORM" in
            "Linux")
                echo "Ubuntu/Debian: sudo apt update && sudo apt install python3 python3-pip"
                echo "CentOS/RHEL: sudo yum install python3 python3-pip"
                echo "Arch: sudo pacman -S python python-pip"
                ;;
            "Darwin")
                echo "Homebrew: brew install python"
                echo "MacPorts: sudo port install python310"
                echo "Official: https://www.python.org/downloads/macos/"
                ;;
        esac
        echo
        exit 1
    fi
    
    echo "$PYTHON_VERSION"
    print_success "Python bulundu: $PYTHON_CMD"
    
    # Check required Python modules
    print_info "Python modülleri kontrol ediliyor..."
    
    REQUIRED_MODULES=("flask" "PyYAML" "openai" "requests")
    
    for module in "${REQUIRED_MODULES[@]}"; do
        if ! $PYTHON_CMD -c "import ${module,,}" 2>/dev/null; then
            print_warning "$module bulunamadı, yükleniyor..."
            install_python_package "$module"
        fi
    done
    
    print_success "Gerekli modüller hazır"
    
    # Create log directories
    print_info "Log dizinleri oluşturuluyor..."
    
    mkdir -p logs
    
    # Try to create system log directories
    case "$PLATFORM" in
        "Linux"|"Darwin")
            if [ -w "/var/log" ]; then
                touch "/var/log/rebel_ai.log" 2>/dev/null || true
            fi
            ;;
    esac
    
    print_success "Log dizinleri hazır"
    
    # Check port availability
    print_info "Port 5000 kontrol ediliyor..."
    
    if command -v netstat >/dev/null 2>&1; then
        if netstat -an 2>/dev/null | grep -q ":5000.*LISTEN"; then
            print_warning "Port 5000 kullanımda olabilir"
            echo -n "Devam etmek istiyor musunuz? (y/N): "
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                echo "Çıkış yapılıyor..."
                exit 0
            fi
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -an 2>/dev/null | grep -q ":5000.*LISTEN"; then
            print_warning "Port 5000 kullanımda olabilir"
            echo -n "Devam etmek istiyor musunuz? (y/N): "
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                echo "Çıkış yapılıyor..."
                exit 0
            fi
        fi
    fi
    
    # Make script executable (if not already)
    chmod +x "$0"
    
    # Start REBEL AI
    echo
    print_info "REBEL AI başlatılıyor..."
    echo
    echo -e "${CYAN}📊 Sistem Bilgileri:${NC}"
    echo "   - Platform: $PLATFORM"
    echo "   - Python: $PYTHON_VERSION"
    echo "   - Shell: $SHELL"
    echo "   - Port: 5000"
    echo "   - Klasör: $(pwd)"
    echo
    echo -e "${GREEN}💡 Tarayıcınızda şu adrese gidin:${NC}"
    echo "   http://localhost:5000"
    echo
    echo -e "${YELLOW}🛑 Durdurmak için Ctrl+C tuşlarına basın${NC}"
    echo
    echo "=========================================="
    
    # Trap SIGINT and SIGTERM for clean shutdown
    trap 'echo -e "\n⚡ REBEL AI kapatılıyor..."; exit 0' INT TERM
    
    # Start the Python application
    $PYTHON_CMD rebel_ai_manager.py
    
    # If we get here, there was an error
    print_error "REBEL AI başlatılamadı!"
    echo "📋 Hata günlüğünü kontrol edin: logs/rebel_ai.log"
    exit 1
}

# Check if running as source or direct execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
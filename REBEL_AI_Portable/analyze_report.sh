#!/bin/bash

# ==========================================
# 🚀 REBEL AI - Tam Rapor Analiz Aracı
# ==========================================
# Tek komutla zip açma ve detaylı analiz

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Check if zip file provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Kullanım: $0 <report.zip>${NC}"
    echo -e "${YELLOW}Örnek: $0 REBEL_AI_Report_20250915_043442.zip${NC}"
    exit 1
fi

ZIP_FILE="$1"

# Check if zip file exists
if [ ! -f "$ZIP_FILE" ]; then
    echo -e "${RED}❌ Zip dosyası bulunamadı: $ZIP_FILE${NC}"
    exit 1
fi

# Extract zip file
TEMP_DIR=$(mktemp -d)
echo -e "${CYAN}📦 Zip dosyası açılıyor: $ZIP_FILE${NC}"
unzip -q "$ZIP_FILE" -d "$TEMP_DIR"

# Find the report directory
REPORT_DIR=$(find "$TEMP_DIR" -name "REBEL_AI_Report_*" -type d | head -1)

if [ -z "$REPORT_DIR" ]; then
    echo -e "${RED}❌ Rapor dizini bulunamadı!${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo -e "${GREEN}✅ Rapor dizini bulundu: $(basename "$REPORT_DIR")${NC}"
echo ""

# Header
echo -e "${WHITE}=========================================="
echo -e "🚀 REBEL AI - Dijkstra Edition"
echo -e "📊 DETAYLI RAPOR ANALİZİ"
echo -e "==========================================${NC}"
echo ""

# 1. ÖZET RAPOR
echo -e "${PURPLE}1️⃣  📋 ÖZET RAPOR${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"
if [ -f "$REPORT_DIR/RAPOR_OZETI.txt" ]; then
    cat "$REPORT_DIR/RAPOR_OZETI.txt"
else
    echo -e "${YELLOW}⚠️  Özet rapor bulunamadı${NC}"
fi
echo ""

# 2. GÜNCELSİSTEM DURUMU
echo -e "${PURPLE}2️⃣  ⚡ GÜNCEL SİSTEM DURUMU${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"
if [ -f "$REPORT_DIR/current_status.txt" ]; then
    cat "$REPORT_DIR/current_status.txt"
else
    echo -e "${YELLOW}⚠️  Güncel durum raporu bulunamadı${NC}"
fi
echo ""

# 3. SİSTEM BİLGİLERİ
echo -e "${PURPLE}3️⃣  💻 SİSTEM BİLGİLERİ${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"
if [ -f "$REPORT_DIR/system/system_info.txt" ]; then
    head -40 "$REPORT_DIR/system/system_info.txt"
    echo -e "${CYAN}... (tam içerik için system/system_info.txt dosyasını incele)${NC}"
else
    echo -e "${YELLOW}⚠️  Sistem bilgileri bulunamadı${NC}"
fi
echo ""

# 4. PERFORMANS METRİKLERİ
echo -e "${PURPLE}4️⃣  📊 PERFORMANS METRİKLERİ${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"
if [ -f "$REPORT_DIR/system/performance.txt" ]; then
    cat "$REPORT_DIR/system/performance.txt"
else
    echo -e "${YELLOW}⚠️  Performans raporu bulunamadı${NC}"
fi
echo ""

# 5. AI ÖĞRENME VERİTABANI ANALİZİ
echo -e "${PURPLE}5️⃣  🧠 AI ÖĞRENME VERİTABANI${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"
if [ -f "$REPORT_DIR/data/knowledge.json" ]; then
    echo -e "${GREEN}📊 Knowledge Database Analizi:${NC}"
    
    # JSON dosya boyutu
    KB_SIZE=$(stat -c%s "$REPORT_DIR/data/knowledge.json" | numfmt --to=iec)
    echo -e "   💾 Dosya boyutu: ${CYAN}$KB_SIZE${NC}"
    
    # JSON içeriği analizi
    if command -v jq >/dev/null 2>&1; then
        echo -e "   📈 Platform sayısı: ${CYAN}$(jq '.command_success_rates | keys | length' "$REPORT_DIR/data/knowledge.json" 2>/dev/null || echo "N/A")${NC}"
        echo -e "   🎯 Toplam komut başarı kayıtları:"
        jq -r '.command_success_rates | to_entries[] | "      \(.key): \(.value | keys | length) komut"' "$REPORT_DIR/data/knowledge.json" 2>/dev/null || echo "      JSON parse edilemedi"
        
        echo -e "   🔄 Fallback routes:"
        jq -r '.fallback_routes | to_entries[] | select(.value != {}) | "      \(.key): \(.value | keys | length) fallback"' "$REPORT_DIR/data/knowledge.json" 2>/dev/null || echo "      JSON parse edilemedi"
        
        echo -e "   🖥️  Device profiles: ${CYAN}$(jq '.device_profiles | keys | length' "$REPORT_DIR/data/knowledge.json" 2>/dev/null || echo "N/A")${NC}"
    else
        echo -e "${YELLOW}   ⚠️  jq bulunamadı, JSON parse edilemiyor${NC}"
        echo -e "   📄 İlk 20 satır:"
        head -20 "$REPORT_DIR/data/knowledge.json" | sed 's/^/      /'
    fi
else
    echo -e "${YELLOW}⚠️  Knowledge database bulunamadı${NC}"
fi
echo ""

# 6. KOMUT GEÇMİŞİ ANALİZİ
echo -e "${PURPLE}6️⃣  📜 KOMUT GEÇMİŞİ ANALİZİ${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"
if [ -f "$REPORT_DIR/logs/commands.log" ]; then
    echo -e "${GREEN}📊 Commands Log Analizi:${NC}"
    
    TOTAL_COMMANDS=$(wc -l < "$REPORT_DIR/logs/commands.log")
    echo -e "   📈 Toplam komut kaydı: ${CYAN}$TOTAL_COMMANDS${NC}"
    
    echo -e "   🕐 Son 10 komut:"
    tail -10 "$REPORT_DIR/logs/commands.log" | while read line; do
        echo -e "      ${CYAN}$line${NC}"
    done
    
    echo -e "   📊 En çok kullanılan komutlar:"
    if command -v jq >/dev/null 2>&1; then
        grep -o '"command":"[^"]*"' "$REPORT_DIR/logs/commands.log" | sort | uniq -c | sort -rn | head -5 | while read count cmd; do
            clean_cmd=$(echo "$cmd" | sed 's/"command":"//g' | sed 's/"//g')
            echo -e "      ${CYAN}$count${NC}x ${YELLOW}$clean_cmd${NC}"
        done
    else
        echo -e "      ${YELLOW}jq bulunamadı, detaylı analiz yapılamıyor${NC}"
    fi
    
    echo -e "   ❌ Hata içeren komutlar:"
    grep -i "error\|failed\|exception" "$REPORT_DIR/logs/commands.log" | tail -3 | while read line; do
        echo -e "      ${RED}$line${NC}"
    done || echo -e "      ${GREEN}✅ Hata bulunamadı!${NC}"
    
else
    echo -e "${YELLOW}⚠️  Komut geçmişi bulunamadı${NC}"
fi
echo ""

# 7. PROJE KAYNAK KOD BİLGİLERİ
echo -e "${PURPLE}7️⃣  📁 PROJE KAYNAK KOD BİLGİLERİ${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"
if [ -f "$REPORT_DIR/source_info/project_structure.txt" ]; then
    echo -e "${GREEN}📊 Proje Yapısı:${NC}"
    head -30 "$REPORT_DIR/source_info/project_structure.txt" | sed 's/^/   /'
    echo -e "${CYAN}   ... (tam içerik için source_info/project_structure.txt dosyasını incele)${NC}"
else
    echo -e "${YELLOW}⚠️  Proje yapısı bilgisi bulunamadı${NC}"
fi
echo ""

# 8. HATA VE SORUN ANALİZİ
echo -e "${PURPLE}8️⃣  🐛 HATA VE SORUN ANALİZİ${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"
echo -e "${GREEN}🔍 Tüm dosyalarda hata taraması:${NC}"

ERROR_COUNT=0
# Log dosyalarında hata arama
if [ -d "$REPORT_DIR/logs" ]; then
    for logfile in "$REPORT_DIR/logs"/*.log; do
        if [ -f "$logfile" ]; then
            errors=$(grep -c -i "error\|failed\|exception\|fatal" "$logfile" 2>/dev/null || echo 0)
            if [ "$errors" -gt 0 ]; then
                echo -e "   ❌ $(basename "$logfile"): ${RED}$errors hata${NC}"
                ERROR_COUNT=$((ERROR_COUNT + errors))
                echo -e "   📄 Son hatalar:"
                grep -i "error\|failed\|exception\|fatal" "$logfile" | tail -3 | sed 's/^/      /' || true
            fi
        fi
    done
fi

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "   ${GREEN}✅ Hiç hata bulunamadı!${NC}"
else
    echo -e "   ${RED}⚠️  Toplam $ERROR_COUNT hata tespit edildi${NC}"
fi
echo ""

# 9. ÖNERİLER VE SONUÇ
echo -e "${PURPLE}9️⃣  🎯 ÖNERİLER VE SONUÇ${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

# Dosya varlık kontrolü
HEALTH_SCORE=0
MAX_SCORE=7

echo -e "${GREEN}📊 Rapor Sağlık Skoru:${NC}"

[ -f "$REPORT_DIR/RAPOR_OZETI.txt" ] && HEALTH_SCORE=$((HEALTH_SCORE + 1)) && echo -e "   ✅ Özet rapor: Mevcut" || echo -e "   ❌ Özet rapor: Eksik"
[ -f "$REPORT_DIR/current_status.txt" ] && HEALTH_SCORE=$((HEALTH_SCORE + 1)) && echo -e "   ✅ Güncel durum: Mevcut" || echo -e "   ❌ Güncel durum: Eksik"
[ -f "$REPORT_DIR/system/system_info.txt" ] && HEALTH_SCORE=$((HEALTH_SCORE + 1)) && echo -e "   ✅ Sistem bilgisi: Mevcut" || echo -e "   ❌ Sistem bilgisi: Eksik"
[ -f "$REPORT_DIR/system/performance.txt" ] && HEALTH_SCORE=$((HEALTH_SCORE + 1)) && echo -e "   ✅ Performans: Mevcut" || echo -e "   ❌ Performans: Eksik"
[ -f "$REPORT_DIR/data/knowledge.json" ] && HEALTH_SCORE=$((HEALTH_SCORE + 1)) && echo -e "   ✅ AI Database: Mevcut" || echo -e "   ❌ AI Database: Eksik"
[ -f "$REPORT_DIR/logs/commands.log" ] && HEALTH_SCORE=$((HEALTH_SCORE + 1)) && echo -e "   ✅ Komut logları: Mevcut" || echo -e "   ❌ Komut logları: Eksik"
[ -f "$REPORT_DIR/source_info/project_structure.txt" ] && HEALTH_SCORE=$((HEALTH_SCORE + 1)) && echo -e "   ✅ Proje bilgisi: Mevcut" || echo -e "   ❌ Proje bilgisi: Eksik"

HEALTH_PERCENT=$((HEALTH_SCORE * 100 / MAX_SCORE))

if [ "$HEALTH_PERCENT" -ge 80 ]; then
    echo -e "   ${GREEN}🎉 Rapor Sağlığı: %$HEALTH_PERCENT (Mükemmel!)${NC}"
elif [ "$HEALTH_PERCENT" -ge 60 ]; then
    echo -e "   ${YELLOW}⚠️  Rapor Sağlığı: %$HEALTH_PERCENT (İyi)${NC}"
else
    echo -e "   ${RED}❌ Rapor Sağlığı: %$HEALTH_PERCENT (Sorunlu)${NC}"
fi

echo ""
echo -e "${GREEN}🎯 Öneriler:${NC}"

if [ -f "$REPORT_DIR/data/knowledge.json" ]; then
    echo -e "   ✅ AI öğrenme sistemi çalışmış"
else
    echo -e "   🔧 AI öğrenme sistemini test et"
fi

if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "   🔧 $ERROR_COUNT hatayı incele ve düzelt"
else
    echo -e "   ✅ Hata tespit edilmedi"
fi

if [ -f "$REPORT_DIR/logs/commands.log" ]; then
    echo -e "   ✅ Komut geçmişi başarıyla kaydedilmiş"
else
    echo -e "   🔧 Komut logging sistemini kontrol et"
fi

# Cleanup
echo ""
echo -e "${WHITE}=========================================="
echo -e "✅ RAPOR ANALİZİ TAMAMLANDI"
echo -e "==========================================${NC}"
echo -e "${CYAN}📁 Geçici dosyalar temizleniyor...${NC}"
rm -rf "$TEMP_DIR"
echo -e "${GREEN}🎉 Analiz tamamlandı!${NC}"
echo ""

# Quick stats summary
echo -e "${YELLOW}📊 HIZLI ÖZETl:${NC}"
echo -e "   🏥 Rapor sağlığı: ${HEALTH_PERCENT}%"
echo -e "   🐛 Tespit edilen hatalar: $ERROR_COUNT"
if [ -f "$REPORT_DIR/data/knowledge.json" ]; then
    echo -e "   🧠 AI database boyutu: $(stat -c%s "$REPORT_DIR/data/knowledge.json" | numfmt --to=iec || echo "N/A")"
fi
if [ -f "$REPORT_DIR/logs/commands.log" ]; then
    echo -e "   📜 Toplam komut sayısı: $(wc -l < "$REPORT_DIR/logs/commands.log")"
fi
echo ""
@echo off
REM ==========================================
REM ⚡ REBEL AI - Windows Startup Script
REM ==========================================
REM Windows (PowerShell/CMD) compatibility runner

echo.
echo ==========================================
echo ⚡ REBEL AI - Komut Yoeneticisi
echo ==========================================
echo Windows başlatıcı (run.bat)
echo.

REM Ortam değişkenlerini kontrol et
echo 🔍 Ortam değişkenleri kontrol ediliyor...

if "%REBEL_AUTH_TOKEN%"=="" (
    echo ❌ HATA: REBEL_AUTH_TOKEN ortam değişkeni bulunamadı!
    echo.
    echo 📋 Lütfen şu komutu çalıştırın:
    echo set REBEL_AUTH_TOKEN=your_secure_token_here
    echo.
    echo veya PowerShell'de:
    echo $env:REBEL_AUTH_TOKEN = "your_secure_token_here"
    echo.
    pause
    exit /b 1
)

if "%REBEL_ADMIN_TOKEN%"=="" (
    echo ❌ HATA: REBEL_ADMIN_TOKEN ortam değişkeni bulunamadı!
    echo.
    echo 📋 Lütfen şu komutu çalıştırın:
    echo set REBEL_ADMIN_TOKEN=your_admin_token_here
    echo.
    echo veya PowerShell'de:
    echo $env:REBEL_ADMIN_TOKEN = "your_admin_token_here"
    echo.
    pause
    exit /b 1
)

echo ✅ Auth token'lar bulundu

REM Python kontrolü
echo 🐍 Python kurulumu kontrol ediliyor...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ HATA: Python bulunamadı!
    echo.
    echo 📋 Lütfen Python'u yükleyin:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

python --version
echo ✅ Python bulundu

REM Gerekli Python modüllerini kontrol et
echo 📦 Python modülleri kontrol ediliyor...

python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo ❌ Flask bulunamadı, yükleniyor...
    pip install flask
)

python -c "import yaml" >nul 2>&1
if errorlevel 1 (
    echo ❌ PyYAML bulunamadı, yükleniyor...
    pip install PyYAML
)

python -c "import openai" >nul 2>&1
if errorlevel 1 (
    echo ❌ OpenAI bulunamadı, yükleniyor...
    pip install openai
)

python -c "import requests" >nul 2>&1
if errorlevel 1 (
    echo ❌ Requests bulunamadı, yükleniyor...
    pip install requests
)

echo ✅ Gerekli modüller hazır

REM Log dizinini oluştur
echo 📁 Log dizinleri oluşturuluyor...
if not exist "logs" mkdir logs
if not exist "D:\rebel_logs" mkdir "D:\rebel_logs" 2>nul
echo ✅ Log dizinleri hazır

REM Port kontrolü
echo 🌐 Port 5000 kontrol ediliyor...
netstat -an | find "LISTENING" | find ":5000" >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  UYARI: Port 5000 kullanımda olabilir
    echo Devam etmek için bir tuşa basın...
    pause >nul
)

REM REBEL AI başlat
echo.
echo 🚀 REBEL AI başlatılıyor...
echo.
echo 📊 Sistem Bilgileri:
echo    - Platform: Windows
echo    - Python: 
python --version
echo    - Port: 5000
echo    - Klasör: %CD%
echo.
echo 💡 Tarayıcınızda şu adrese gidin:
echo    http://localhost:5000
echo.
echo 🛑 Durdurmak için Ctrl+C tuşlarına basın
echo.
echo ==========================================

REM Python uygulamasını başlat
python rebel_ai_manager.py

REM Hata durumunda
if errorlevel 1 (
    echo.
    echo ❌ REBEL AI başlatılamadı!
    echo 📋 Hata günlüğünü kontrol edin: logs\rebel_ai.log
    echo.
    pause
)

echo.
echo ⚡ REBEL AI kapatıldı
pause
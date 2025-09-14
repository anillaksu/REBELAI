@echo off
REM ==========================================
REM 🚀 REBEL AI - Dijkstra Edition Launcher
REM ==========================================
REM Windows Portable Launcher Script

echo.
echo ==========================================
echo 🚀 REBEL AI - Dijkstra Edition
echo ==========================================
echo Portable AI Terminal Starting...
echo.

REM Check if Node.js exists in bin folder
if exist "bin\node.exe" (
    echo ✓ Using portable Node.js
    set NODE_PATH=bin\node.exe
    REM Validate portable Node.js
    "%NODE_PATH%" --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Portable Node.js binary is corrupted or incompatible
        echo ⚠️ Falling back to system Node.js...
        where node >nul 2>&1
        if errorlevel 1 (
            echo ❌ No working Node.js found!
            pause
            exit /b 1
        )
        set NODE_PATH=node
    )
) else (
    echo ⚠️ Portable Node.js not found, checking system...
    where node >nul 2>&1
    if errorlevel 1 (
        echo ❌ Node.js not found! Please install Node.js or add portable Node.js to bin folder
        echo.
        echo Download Node.js from: https://nodejs.org/
        echo For portable use, extract Node.js to bin\node.exe
        echo.
        pause
        exit /b 1
    ) else (
        echo ✓ Using system Node.js
        set NODE_PATH=node
    )
)

REM Display Node.js version
echo ℹ️ Node.js version:
"%NODE_PATH%" --version

REM Check if dependencies are installed
if not exist "node_modules" (
    echo.
    echo ⚠️ Node modules not found!
    echo.
    echo 📦 This is a portable offline application
    echo 💡 Dependencies should be pre-installed for offline operation
    echo.
    if exist "package.json" (
        echo ℹ️ Found package.json - for initial setup run: npm install
    ) else (
        echo ❌ package.json not found - this may not be a valid REBEL AI directory
        pause
        exit /b 1
    )
    echo.
    echo ❌ Cannot continue without dependencies
    echo 📋 To set up dependencies for offline use:
    echo    1. Ensure you have internet connection
    echo    2. Run: npm install
    echo    3. Copy the complete directory for offline use
    echo    4. Then run this script again
    echo.
    pause
    exit /b 1
)

REM Create logs directory if it doesn't exist
if not exist "data\logs" mkdir "data\logs"

REM Set environment variables
set REBEL_PORTABLE=true
set REBEL_LOG_LEVEL=info

echo.
echo 🚀 Starting REBEL AI Server...
echo 🌐 Access the terminal at: http://127.0.0.1:3000
echo 🔒 Security: Localhost access only - Authentication required
echo 🛑 Press Ctrl+C to stop the server
echo.

REM Start the server
%NODE_PATH% src/server.js --portable

REM If we get here, the server stopped
echo.
echo 🛑 REBEL AI Server stopped
pause
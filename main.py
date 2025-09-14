# ==========================================
# ⚡ REBEL AI – CMD/PowerShell Manager
# ==========================================
# Flask backend with security fixes and OpenAI error analysis
# Based on integration blueprint:python_openai
# ==========================================

from flask import Flask, render_template, request, jsonify
import subprocess
import os
import datetime
import shlex
import signal
import json
import fcntl
from openai import OpenAI

app = Flask(__name__)

# Initialize OpenAI client
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Security configuration - REQUIRED environment variable
AUTH_TOKEN = os.environ.get("REBEL_AUTH_TOKEN")
if not AUTH_TOKEN:
    print("CRITICAL ERROR: REBEL_AUTH_TOKEN environment variable is required for security.")
    print("Please set your auth token: export REBEL_AUTH_TOKEN='your_secure_token_here'")
    exit(1)

# Admin security configuration - REQUIRED for admin panel
ADMIN_TOKEN = os.environ.get("REBEL_ADMIN_TOKEN")
if not ADMIN_TOKEN:
    print("CRITICAL ERROR: REBEL_ADMIN_TOKEN environment variable is required for admin access.")
    print("Please set your admin token: export REBEL_ADMIN_TOKEN='your_secure_admin_token_here'")
    exit(1)

# Command allowlist for security (only safe, read-only commands)
ALLOWED_COMMANDS = {
    'ls', 'pwd', 'whoami', 'date', 'uname', 'cat', 'head', 'tail', 
    'wc', 'grep', 'find', 'echo', 'hostname', 'id', 'groups',
    'df', 'du', 'free', 'uptime', 'ps', 'which', 'whereis'
}

# Dangerous commands that are explicitly blocked
BLOCKED_COMMANDS = {
    'rm', 'rmdir', 'mv', 'cp', 'chmod', 'chown', 'sudo', 'su', 
    'passwd', 'useradd', 'userdel', 'groupadd', 'groupdel',
    'mount', 'umount', 'fdisk', 'mkfs', 'fsck', 'dd',
    'iptables', 'systemctl', 'service', 'kill', 'killall',
    'wget', 'curl', 'ssh', 'scp', 'rsync', 'nc', 'netcat'
}

LOG_FILE = "rebel_log.txt"
HISTORY_FILE = "command_history.json"
FAVORITES_FILE = "favorites.json"

def log_write(entry):
    """Write entry to rebel_log.txt with timestamp"""
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.datetime.now()}] {entry}\n")

def load_history():
    """Load command history from file with file locking"""
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)  # Shared lock for reading
                try:
                    return json.load(f)
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)  # Release lock
    except Exception as e:
        log_write(f"History load error: {e}")
    return []

def save_to_history(command, result_summary):
    """Save command to history with file locking"""
    try:
        # Load current history
        history = load_history()
        entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "command": command,
            "summary": result_summary
        }
        history.insert(0, entry)  # Add to beginning
        # Keep only last 50 commands
        history = history[:50]
        
        # Write with exclusive lock
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)  # Exclusive lock for writing
            try:
                json.dump(history, f, indent=2, ensure_ascii=False)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)  # Release lock
    except Exception as e:
        log_write(f"History save error: {e}")

def load_favorites():
    """Load favorite commands from file with file locking"""
    try:
        if os.path.exists(FAVORITES_FILE):
            with open(FAVORITES_FILE, "r", encoding="utf-8") as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)  # Shared lock for reading
                try:
                    return json.load(f)
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)  # Release lock
    except Exception as e:
        log_write(f"Favorites load error: {e}")
    return []

def save_favorite(name, command):
    """Save a favorite command with file locking"""
    try:
        # Load current favorites
        favorites = load_favorites()
        entry = {
            "name": name,
            "command": command,
            "timestamp": datetime.datetime.now().isoformat()
        }
        # Check if already exists
        favorites = [f for f in favorites if f["command"] != command]
        favorites.insert(0, entry)
        
        # Write with exclusive lock
        with open(FAVORITES_FILE, "w", encoding="utf-8") as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)  # Exclusive lock for writing
            try:
                json.dump(favorites, f, indent=2, ensure_ascii=False)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)  # Release lock
        return True
    except Exception as e:
        log_write(f"Favorite save error: {e}")
        return False

def validate_auth_token(token):
    """Validate authentication token"""
    return token == AUTH_TOKEN

def validate_admin_token(token):
    """Validate admin authentication token"""
    return token == ADMIN_TOKEN

def is_command_allowed(cmd_parts):
    """Check if command is in allowlist and not in blocklist"""
    if not cmd_parts:
        return False
        
    base_command = cmd_parts[0].lower()
    
    # Check if command is explicitly blocked
    if base_command in BLOCKED_COMMANDS:
        return False
        
    # Check if command is in allowlist
    return base_command in ALLOWED_COMMANDS

def detect_and_convert_command(user_input):
    """Intelligent command detection and conversion using AI"""
    if not openai_client:
        return user_input, "No AI available"
    
    # Check if user input contains semicolons (multiple commands)
    has_semicolons = ';' in user_input
    
    try:
        # Create comprehensive prompt for command intelligence
        prompt = f"""
Kullanıcı girdi: "{user_input}"

Bu girdiyi analiz et ve:
1. Hangi tip komut/istek olduğunu belirle (PowerShell, CMD, Linux, Doğal Dil)
2. Eğer PowerShell veya CMD komutu ise, Linux eşdeğerine çevir
3. Eğer doğal dil ise, uygun Linux komutlarına çevir
4. SADECE bu komutları kullan: ls, pwd, whoami, date, uname, cat, head, tail, wc, grep, find, echo, hostname, id, groups, df, du, free, uptime, ps, top, which, whereis
5. Tehlikeli komutları (rm, sudo, chmod, clear, ip vb.) ASLA önerme
6. Orijinal girdide noktalı virgül (;) yoksa, tek bir komut döndür - birden fazla komut oluşturma

JSON formatında yanıt ver:
{{
  "detected_type": "PowerShell/CMD/Linux/NaturalLanguage",
  "original": "orijinal girdi",
  "converted": "dönüştürülmüş Linux komut(ları)",
  "explanation": "ne yaptığının açıklaması"
}}

İzinli komutlarla örnekler:
- "Get-ChildItem" → "ls -la" 
- "dir" → "ls -la"
- "dosyaları listele" → "ls -la"
- "kim benim" → "whoami"
- "sistemin ne" → "uname -a"
- "Get-Location" → "pwd"
- "hostname nedir" → "hostname"
- "tasklist" → "ps aux"
- "sistem zamanı" → "date"
- "disk bilgisi" → "df -h"
"""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.1,  # Low temperature for consistent results
            response_format={"type": "json_object"}  # Ensure reliable JSON response
        )
        
        import json
        content = response.choices[0].message.content
        if not content:
            raise Exception("OpenAI returned empty response")
        result = json.loads(content)
        
        converted_cmd = result.get("converted", user_input)
        explanation = result.get("explanation", "Komut çevirisi yapıldı")
        detected_type = result.get("detected_type", "Unknown")
        
        log_write(f"COMMAND INTELLIGENCE: {detected_type} detected")
        log_write(f"Original: {user_input}")
        log_write(f"Converted: {converted_cmd}")
        log_write(f"Explanation: {explanation}")
        
        return converted_cmd, f"🤖 {detected_type} algılandı → {explanation}"
        
    except Exception as e:
        log_write(f"Command Intelligence Error: {e}")
        return user_input, f"Komut çevirisi hatası: {str(e)}"

def parse_command_safely(cmd_string):
    """Safely parse command string using shlex"""
    try:
        return shlex.split(cmd_string)
    except ValueError as e:
        log_write(f"Command parsing error: {e}")
        return None

def optimize_command_order(commands):
    """
    Optimize command execution order using Dijkstra-inspired algorithm.
    Prioritizes quick commands first, groups similar operations together.
    """
    if len(commands) <= 1:
        return commands
    
    # Define command execution cost (lower = faster)
    command_weights = {
        'pwd': 1, 'whoami': 1, 'hostname': 1, 'date': 1, 'id': 1,
        'echo': 2, 'uname': 2, 'which': 2, 'whereis': 2,
        'ls': 3, 'groups': 3, 'uptime': 3, 'free': 3,
        'head': 4, 'tail': 4, 'wc': 4, 'cat': 5,
        'grep': 6, 'find': 7, 'df': 7, 'du': 8, 'ps': 8, 'top': 9
    }
    
    # Create command objects with weights and original order
    cmd_objects = []
    for i, cmd in enumerate(commands):
        cmd_parts = parse_command_safely(cmd)
        base_cmd = cmd_parts[0].lower() if cmd_parts else 'unknown'
        weight = command_weights.get(base_cmd, 10)  # Default high weight
        
        cmd_objects.append({
            'command': cmd,
            'weight': weight,
            'original_index': i,
            'base_cmd': base_cmd
        })
    
    # Sort by weight (faster commands first), then by original order for stability
    optimized = sorted(cmd_objects, key=lambda x: (x['weight'], x['original_index']))
    
    # Extract optimized command list
    result = [obj['command'] for obj in optimized]
    
    # Log optimization decision
    optimization_info = [f"{obj['base_cmd']}(w:{obj['weight']})" for obj in optimized]
    log_write(f"Command optimization applied: {optimization_info}")
    
    return result

def run_command(cmd_string):
    """Execute command safely and get AI analysis for errors"""
    try:
        # Parse command safely
        cmd_parts = parse_command_safely(cmd_string)
        if not cmd_parts:
            return "Hatalı komut formatı", None
            
        # Validate command is allowed
        if not is_command_allowed(cmd_parts):
            blocked_msg = f"Güvenlik nedeniyle '{cmd_parts[0]}' komutu engellenmiştir"
            log_write(f"BLOCKED COMMAND: {cmd_string}")
            return blocked_msg, None
        
        # Execute command with timeout and proper process management
        result = subprocess.run(
            cmd_parts,  # Use parsed parts instead of shell=True
            shell=False,  # CRITICAL: Never use shell=True
            capture_output=True, 
            text=True, 
            timeout=15,  # Reduced timeout for security
            preexec_fn=os.setsid if os.name != 'nt' else None  # Process group for proper cleanup
        )
        
        output = result.stdout if result.stdout else result.stderr
        log_write(f"CMD: {cmd_string}\nOUTPUT:\n{output}\n")

        # If command failed, get AI suggestion
        if result.returncode != 0 and openai_client:
            try:
                ai_fix = openai_client.chat.completions.create(
                    model="gpt-4o-mini",  # Using valid OpenAI model
                    messages=[{
                        "role": "user", 
                        "content": f"Bu hata çıktı:\n{output}\nNasıl çözülür?"
                    }],
                    max_tokens=500  # Limit response length
                )
                fix_msg = ai_fix.choices[0].message.content
                log_write(f"AI Fix Suggestion: {fix_msg}\n")
                return output, fix_msg
            except Exception as ai_error:
                log_write(f"AI Analysis Error: {ai_error}\n")
                return output, "AI analizi sırasında hata oluştu."

        return output, None
        
    except subprocess.TimeoutExpired as e:
        error_msg = f"Komut zaman aşımına uğradı (15 saniye): {cmd_string}"
        log_write(f"TIMEOUT: {error_msg}\n")
        # Kill the process group if it exists
        try:
            if hasattr(e, 'args') and e.args and hasattr(e.args[0], 'pid'):
                pid = e.args[0].pid
                if pid and os.name != 'nt':
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
        except:
            pass
        return error_msg, None
    except Exception as e:
        error_msg = f"Komut çalıştırma hatası: {str(e)}"
        log_write(f"ERROR: {error_msg}\n")
        return error_msg, None

@app.route("/")
def home():
    """Main page with terminal interface"""
    return render_template("index.html")

@app.route("/admin")
def admin_panel():
    """Admin panel interface"""
    return render_template("admin.html")

@app.route("/admin/validate", methods=["POST"])
def validate_admin():
    """Validate admin token"""
    admin_token = request.headers.get("X-Admin-Token", "")
    if validate_admin_token(admin_token):
        log_write(f"ADMIN LOGIN: Successful admin authentication")
        return jsonify({"status": "authenticated", "role": "admin"}), 200
    else:
        log_write(f"ADMIN LOGIN FAILED: Invalid admin token attempt")
        return jsonify({"error": "Invalid admin token"}), 401

@app.route("/admin/dashboard", methods=["GET"])
def admin_dashboard():
    """Admin dashboard data"""
    admin_token = request.headers.get("X-Admin-Token", "")
    if not validate_admin_token(admin_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        # Get system stats
        import psutil
        uptime = datetime.datetime.now() - datetime.datetime.fromtimestamp(psutil.boot_time())
        
        dashboard_data = {
            "uptime": str(uptime).split('.')[0],  # Remove microseconds
            "ai_available": openai_client is not None,
            "history_count": len(load_history()),
            "favorites_count": len(load_favorites()),
            "allowed_commands": len(ALLOWED_COMMANDS),
            "blocked_commands": len(BLOCKED_COMMANDS),
            "system_load": psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0,
            "memory_usage": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent
        }
        return jsonify(dashboard_data)
    except Exception as e:
        log_write(f"Admin dashboard error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/admin/execute", methods=["POST"])
def admin_execute():
    """Execute admin commands with root privileges"""
    admin_token = request.headers.get("X-Admin-Token", "")
    if not validate_admin_token(admin_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        data = request.get_json()
        command = data.get("command", "").strip()
        
        if not command:
            return jsonify({"error": "Command required"}), 400
        
        log_write(f"ADMIN COMMAND: {command}")
        
        # Execute command with admin privileges (no restrictions)
        cmd_parts = shlex.split(command)
        result = subprocess.run(
            cmd_parts,
            capture_output=True,
            text=True,
            timeout=30,  # Longer timeout for admin commands
            shell=False
        )
        
        output = result.stdout
        if result.stderr:
            output += f"\nERROR: {result.stderr}"
        
        log_write(f"ADMIN COMMAND RESULT: {result.returncode}")
        
        return jsonify({
            "output": output,
            "returncode": result.returncode,
            "success": result.returncode == 0
        })
        
    except subprocess.TimeoutExpired:
        error_msg = "Admin komut timeout (30 saniye)"
        log_write(f"ADMIN TIMEOUT: {command}")
        return jsonify({"error": error_msg}), 408
    except Exception as e:
        error_msg = f"Admin komut hatası: {str(e)}"
        log_write(f"ADMIN ERROR: {error_msg}")
        return jsonify({"error": error_msg}), 500

@app.route("/admin/files", methods=["GET"])
def admin_list_files():
    """List files in directory with admin access"""
    admin_token = request.headers.get("X-Admin-Token", "")
    if not validate_admin_token(admin_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        path = request.args.get("path", "/")
        if not os.path.exists(path):
            return jsonify({"error": "Path not found"}), 404
        
        files = []
        for item in os.listdir(path):
            item_path = os.path.join(path, item)
            file_info = {
                "name": item,
                "path": item_path,
                "type": "dir" if os.path.isdir(item_path) else "file",
                "size": os.path.getsize(item_path) if os.path.isfile(item_path) else 0,
                "modified": datetime.datetime.fromtimestamp(os.path.getmtime(item_path)).isoformat()
            }
            files.append(file_info)
        
        # Sort: directories first, then by name
        files.sort(key=lambda x: (x["type"] != "dir", x["name"].lower()))
        
        return jsonify({"files": files, "current_path": path})
        
    except Exception as e:
        log_write(f"Admin file list error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/admin/logs/<log_type>", methods=["GET"])
def admin_get_logs(log_type):
    """Get system logs"""
    admin_token = request.headers.get("X-Admin-Token", "")
    if not validate_admin_token(admin_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        if log_type == "rebel":
            if os.path.exists(LOG_FILE):
                with open(LOG_FILE, "r", encoding="utf-8") as f:
                    # Get last 1000 lines
                    lines = f.readlines()
                    content = "".join(lines[-1000:])
                    return content, 200, {'Content-Type': 'text/plain'}
            else:
                return "REBEL log dosyası bulunamadı.", 200, {'Content-Type': 'text/plain'}
        
        elif log_type == "system":
            # Try to get system logs
            try:
                result = subprocess.run(
                    ["journalctl", "-n", "500", "--no-pager"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    return result.stdout, 200, {'Content-Type': 'text/plain'}
                else:
                    return "Sistem logları alınamadı.", 200, {'Content-Type': 'text/plain'}
            except:
                return "Sistem log erişimi mevcut değil.", 200, {'Content-Type': 'text/plain'}
        
        else:
            return jsonify({"error": "Invalid log type"}), 400
            
    except Exception as e:
        log_write(f"Admin log error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/admin/restart", methods=["POST"])
def admin_restart():
    """Restart REBEL AI system"""
    admin_token = request.headers.get("X-Admin-Token", "")
    if not validate_admin_token(admin_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    log_write("ADMIN RESTART: System restart initiated by admin")
    
    # Schedule restart after response
    def restart_system():
        import time
        time.sleep(2)  # Give time for response to be sent
        os.system("pkill -f gunicorn")  # This will cause workflow to restart
    
    import threading
    threading.Thread(target=restart_system).start()
    
    return jsonify({"message": "System restart initiated"})

@app.route("/admin/health", methods=["GET"])
def admin_health():
    """Comprehensive health check for admin"""
    admin_token = request.headers.get("X-Admin-Token", "")
    if not validate_admin_token(admin_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        import psutil
        
        health_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "system": {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory": {
                    "total": psutil.virtual_memory().total,
                    "available": psutil.virtual_memory().available,
                    "percent": psutil.virtual_memory().percent
                },
                "disk": {
                    "total": psutil.disk_usage('/').total,
                    "free": psutil.disk_usage('/').free,
                    "percent": psutil.disk_usage('/').percent
                },
                "processes": len(psutil.pids())
            },
            "rebel": {
                "auth_enabled": bool(AUTH_TOKEN),
                "admin_enabled": bool(ADMIN_TOKEN),
                "ai_available": openai_client is not None,
                "allowed_commands": len(ALLOWED_COMMANDS),
                "log_file_exists": os.path.exists(LOG_FILE),
                "history_file_exists": os.path.exists(HISTORY_FILE)
            }
        }
        
        return jsonify(health_data)
        
    except Exception as e:
        log_write(f"Admin health check error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/history", methods=["GET"])
def get_history():
    """Get command history"""
    auth_token = request.headers.get("X-Auth-Token", "")
    if not validate_auth_token(auth_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    return jsonify(load_history()[:20])  # Return last 20 commands

@app.route("/api/favorites", methods=["GET"])
def get_favorites():
    """Get favorite commands"""
    auth_token = request.headers.get("X-Auth-Token", "")
    if not validate_auth_token(auth_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    return jsonify(load_favorites())

@app.route("/api/favorites", methods=["POST"])
def add_favorite():
    """Add favorite command"""
    auth_token = request.headers.get("X-Auth-Token", "")
    if not validate_auth_token(auth_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json or {}
    name = data.get("name", "").strip()
    command = data.get("command", "").strip()
    
    if not name or not command:
        return jsonify({"error": "Name and command required"}), 400
    
    success = save_favorite(name, command)
    if success:
        return jsonify({"message": "Favorite saved"})
    else:
        return jsonify({"error": "Failed to save favorite"}), 500

@app.route("/api/system-info", methods=["GET"])
def get_system_info():
    """Get system information"""
    auth_token = request.headers.get("X-Auth-Token", "")
    if not validate_auth_token(auth_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        # Safe system information
        info = {
            "allowed_commands": len(ALLOWED_COMMANDS),
            "blocked_commands": len(BLOCKED_COMMANDS),
            "ai_enabled": openai_client is not None,
            "uptime": datetime.datetime.now().isoformat(),
            "history_count": len(load_history()),
            "favorites_count": len(load_favorites())
        }
        return jsonify(info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/healthz", methods=["GET"])
def health_check():
    """Health check endpoint for deployment verification"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "version": "1.0",
        "ai_available": openai_client is not None
    }), 200

@app.route("/api/export", methods=["GET"])
def export_data():
    """Export command history or system data"""
    auth_token = request.headers.get("X-Auth-Token", "")
    if not validate_auth_token(auth_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    export_type = request.args.get("type", "history")
    
    try:
        if export_type == "history":
            history = load_history()
            content = "REBEL AI CMD Manager - Komut Geçmişi\n"
            content += "=" * 50 + "\n"
            content += f"Dışa aktarma tarihi: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            content += f"Toplam komut sayısı: {len(history)}\n\n"
            
            for i, item in enumerate(history, 1):
                content += f"{i}. Komut: {item['command']}\n"
                content += f"   Özet: {item['summary']}\n"
                content += f"   Tarih: {datetime.datetime.fromisoformat(item['timestamp']).strftime('%Y-%m-%d %H:%M:%S')}\n"
                content += "-" * 40 + "\n"
            
            response = app.response_class(
                content,
                mimetype='text/plain',
                headers={"Content-Disposition": f"attachment; filename=rebel-ai-history-{datetime.datetime.now().strftime('%Y%m%d')}.txt"}
            )
            return response
            
        elif export_type == "favorites":
            favorites = load_favorites()
            content = "REBEL AI CMD Manager - Favori Komutlar\n"
            content += "=" * 50 + "\n"
            content += f"Dışa aktarma tarihi: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            content += f"Toplam favori sayısı: {len(favorites)}\n\n"
            
            for i, item in enumerate(favorites, 1):
                content += f"{i}. {item['name']}\n"
                content += f"   Komut: {item['command']}\n"
                content += f"   Eklenme tarihi: {datetime.datetime.fromisoformat(item['timestamp']).strftime('%Y-%m-%d %H:%M:%S')}\n"
                content += "-" * 40 + "\n"
            
            response = app.response_class(
                content,
                mimetype='text/plain',
                headers={"Content-Disposition": f"attachment; filename=rebel-ai-favorites-{datetime.datetime.now().strftime('%Y%m%d')}.txt"}
            )
            return response
            
        else:
            return jsonify({"error": "Invalid export type"}), 400
            
    except Exception as e:
        log_write(f"Export error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/run", methods=["POST"])
def run_cmd():
    """Process and execute commands with authentication and security"""
    # Check authentication token
    auth_token = request.headers.get("X-Auth-Token", "")
    
    if not validate_auth_token(auth_token):
        log_write("UNAUTHORIZED ACCESS ATTEMPT")
        return jsonify({"error": "Unauthorized: Invalid auth token"}), 401
    
    user_input = (request.json or {}).get("command", "")
    
    if not user_input.strip():
        return jsonify([{"cmd": "", "output": "Boş komut girdiniz.", "fix": None}])
    
    # Apply intelligent command conversion
    log_write(f"User input: {user_input}")
    converted_input, conversion_info = detect_and_convert_command(user_input)
    
    # Split commands by semicolon and apply Dijkstra optimization
    raw_commands = [c.strip() for c in converted_input.split(";") if c.strip()]
    commands = optimize_command_order(raw_commands)
    
    # Limit number of commands for security
    if len(commands) > 10:
        return jsonify([{"cmd": "", "output": "Güvenlik nedeniyle en fazla 10 komut çalıştırabilirsiniz.", "fix": None}])
    
    log_write(f"Original commands: {raw_commands}")
    log_write(f"Optimized order: {commands}")

    # Execute each command
    results = []
    for i, cmd in enumerate(commands):
        output, fix = run_command(cmd)
        result = {
            "cmd": cmd, 
            "output": output, 
            "fix": fix
        }
        
        # Add conversion info to the first command result
        if i == 0 and conversion_info != "No AI available":
            result["conversion_info"] = conversion_info
            
        results.append(result)

    # Save to command history
    try:
        result_summary = f"{len(commands)} komut çalıştırıldı"
        if results and results[0].get("conversion_info"):
            result_summary += " (AI çevirisi yapıldı)"
        save_to_history(user_input, result_summary)
    except Exception as e:
        log_write(f"History save failed: {e}")

    return jsonify(results)

if __name__ == "__main__":
    # Ensure log file exists
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            f.write(f"[{datetime.datetime.now()}] REBEL AI CMD Manager Started\n")
    
    # Log security configuration
    log_write(f"Security enabled: {len(ALLOWED_COMMANDS)} allowed commands")
    log_write("Authentication required: Header-based token validation enabled")
    
    # Only run Flask dev server if not using gunicorn (for development)
    if __name__ == "__main__":
        app.run(
            host="0.0.0.0", 
            port=5000, 
            debug=False,
            threaded=True,  # Handle multiple requests concurrently
            use_reloader=False  # Disable auto-reload for production
        )
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

# Command allowlist for security (only safe, read-only commands)
ALLOWED_COMMANDS = {
    'ls', 'pwd', 'whoami', 'date', 'uname', 'cat', 'head', 'tail', 
    'wc', 'grep', 'find', 'echo', 'hostname', 'id', 'groups',
    'df', 'du', 'free', 'uptime', 'ps', 'top', 'which', 'whereis'
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

def log_write(entry):
    """Write entry to rebel_log.txt with timestamp"""
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.datetime.now()}] {entry}\n")

def validate_auth_token(token):
    """Validate authentication token"""
    return token == AUTH_TOKEN

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

@app.route("/run", methods=["POST"])
def run_cmd():
    """Process and execute commands with authentication and security"""
    # Check authentication token
    auth_token = request.headers.get("X-Auth-Token") or (request.json.get("auth_token", "") if request.json else "")
    
    if not validate_auth_token(auth_token):
        log_write("UNAUTHORIZED ACCESS ATTEMPT")
        return jsonify({"error": "Unauthorized: Invalid auth token"}), 401
    
    user_input = (request.json or {}).get("command", "")
    
    if not user_input.strip():
        return jsonify([{"cmd": "", "output": "Boş komut girdiniz.", "fix": None}])
    
    # Split commands by semicolon and apply Dijkstra optimization
    raw_commands = [c.strip() for c in user_input.split(";") if c.strip()]
    commands = optimize_command_order(raw_commands)
    
    # Limit number of commands for security
    if len(commands) > 10:
        return jsonify([{"cmd": "", "output": "Güvenlik nedeniyle en fazla 10 komut çalıştırabilirsiniz.", "fix": None}])
    
    log_write(f"Original commands: {raw_commands}")
    log_write(f"Optimized order: {commands}")

    # Execute each command
    results = []
    for cmd in commands:
        output, fix = run_command(cmd)
        results.append({
            "cmd": cmd, 
            "output": output, 
            "fix": fix
        })

    return jsonify(results)

if __name__ == "__main__":
    # Ensure log file exists
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            f.write(f"[{datetime.datetime.now()}] REBEL AI CMD Manager Started\n")
    
    # Log security configuration
    log_write(f"Security enabled: {len(ALLOWED_COMMANDS)} allowed commands")
    log_write(f"Authentication required: {AUTH_TOKEN[:4]}***")
    
    # Production-ready Flask configuration
    app.run(
        host="0.0.0.0", 
        port=5000, 
        debug=False,
        threaded=True,  # Handle multiple requests concurrently
        use_reloader=False  # Disable auto-reload for production
    )
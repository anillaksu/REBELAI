# ==========================================
# ⚡ REBEL AI – Komut Yöneticisi
# ==========================================
# Cross-platform Command Manager with AI Integration
# Windows (PowerShell/CMD) | Linux (Bash) | MacOS (Zsh/Bash)

import os
import json
import yaml
import platform
import subprocess
import datetime
import shlex
import signal
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from flask import Flask, render_template, request, jsonify, send_file
try:
    import fcntl
except ImportError:
    # Windows doesn't have fcntl, we'll handle this gracefully
    fcntl = None

# REBEL AI modülleri
from ai_engine import REBELAIEngine
from dijkstra_scheduler import REBELDijkstraScheduler

app = Flask(__name__)


class REBELAIManager:
    """REBEL AI Ana Yönetici Sınıfı"""
    
    def __init__(self, config_path: str = "rebel_config.yaml"):
        """REBEL AI Manager başlatıcı"""
        self.config_path = config_path
        self.config = self._load_config()
        self.platform_name = platform.system().lower()
        
        # Güvenlik kontrolü
        self._validate_auth_tokens()
        
        # Modülleri başlat
        self.ai_engine = REBELAIEngine(config_path)
        self.scheduler = REBELDijkstraScheduler(config_path)
        
        # Log sistemi
        self._setup_logging()
        
        # Platform ayarları
        self.platform_config = self._setup_platform()
        
        # Güvenlik kısıtlamaları
        self.allowed_commands = set(self.config.get('security_restrictions', {}).get('allowed_commands', []))
        self.blocked_commands = set(self.config.get('security_restrictions', {}).get('blocked_commands', []))
        
        # Cache
        self.command_history = []
        self.favorites = self.config.get('ui', {}).get('favorite_commands', [])
        
        self._log_startup()
        print(f"⚡ REBEL AI Manager started on {self.platform_name}")
    
    def _load_config(self) -> Dict[str, Any]:
        """YAML yapılandırma dosyasını yükle"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"⚠️ Config yükleme hatası: {e}")
            return {}
    
    def _validate_auth_tokens(self) -> None:
        """Auth token'ları kontrol et"""
        security_config = self.config.get('security', {})
        
        # Normal user token
        self.auth_token = os.environ.get(
            security_config.get('auth_token_env', 'REBEL_AUTH_TOKEN')
        )
        if not self.auth_token:
            print("CRITICAL ERROR: REBEL_AUTH_TOKEN environment variable is required.")
            print("Please set: export REBEL_AUTH_TOKEN='your_secure_token'")
            exit(1)
        
        # Admin token
        self.admin_token = os.environ.get(
            security_config.get('admin_token_env', 'REBEL_ADMIN_TOKEN')
        )
        if not self.admin_token:
            print("CRITICAL ERROR: REBEL_ADMIN_TOKEN environment variable is required.")
            print("Please set: export REBEL_ADMIN_TOKEN='your_admin_token'")
            exit(1)
    
    def _setup_logging(self) -> None:
        """Loglama sistemini kur"""
        log_config = self.config.get('logging', {})
        
        if not log_config.get('enabled', True):
            return
        
        # Log dosya yolunu belirle
        if self.platform_name == "windows":
            log_path = log_config.get('windows_log_path', 'D:\\rebel_logs\\cmd_manager_log.txt')
        elif self.platform_name == "linux":
            log_path = log_config.get('linux_log_path', '/var/log/rebel_ai.log')
        elif self.platform_name == "darwin":  # macOS
            log_path = log_config.get('macos_log_path', '/var/log/rebel_ai.log')
        else:
            log_path = log_config.get('fallback_log_path', './logs/rebel_ai.log')
        
        # Log dizinini oluştur
        log_dir = Path(log_path).parent
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Log dosya yolunu ayarla
        self.log_file = log_path
        
        # Logger konfigürasyonu
        logging.basicConfig(
            filename=self.log_file,
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        self.logger = logging.getLogger('REBEL_AI')
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        self.logger.addHandler(console_handler)
    
    def _setup_platform(self) -> Dict[str, Any]:
        """Platform-specific ayarları yap"""
        platform_config = self.config.get('platform', {})
        
        if self.platform_name == "windows":
            config = platform_config.get('windows', {})
            shell = config.get('shell', 'powershell')
            return {
                'shell': shell,
                'shell_executable': 'powershell.exe' if shell == 'powershell' else 'cmd.exe',
                'encoding': config.get('encoding', 'utf-8'),
                'line_ending': '\\r\\n'
            }
        elif self.platform_name == "linux":
            config = platform_config.get('linux', {})
            return {
                'shell': config.get('shell', 'bash'),
                'shell_executable': '/bin/bash',
                'encoding': config.get('encoding', 'utf-8'),
                'line_ending': '\\n'
            }
        elif self.platform_name == "darwin":  # macOS
            config = platform_config.get('macos', {})
            shell = config.get('shell', 'zsh')
            return {
                'shell': shell,
                'shell_executable': f'/bin/{shell}',
                'encoding': config.get('encoding', 'utf-8'),
                'line_ending': '\\n'
            }
        else:
            return {
                'shell': 'bash',
                'shell_executable': '/bin/bash',
                'encoding': 'utf-8',
                'line_ending': '\\n'
            }
    
    def _log_startup(self) -> None:
        """Başlangıç logları"""
        startup_info = {
            'timestamp': datetime.datetime.now().isoformat(),
            'event': 'REBEL_AI_STARTUP',
            'platform': self.platform_name,
            'shell': self.platform_config['shell'],
            'ai_status': self.ai_engine.get_ai_status(),
            'scheduler_enabled': self.config.get('scheduler', {}).get('enabled', True)
        }
        
        self._write_json_log(startup_info)
        self.logger.info(f"REBEL AI started on {self.platform_name}")
    
    def _write_json_log(self, log_data: Dict[str, Any]) -> None:
        """JSON formatında log yaz"""
        if not hasattr(self, 'log_file'):
            return
        
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                # File locking (Unix/Linux only)
                if fcntl:
                    try:
                        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                    except (OSError, AttributeError):
                        pass  # Windows or unsupported platform
                
                try:
                    json.dump(log_data, f, ensure_ascii=False)
                    f.write('\\n')
                finally:
                    if fcntl:
                        try:
                            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                        except (OSError, AttributeError):
                            pass
        except Exception as e:
            print(f"⚠️ Log yazma hatası: {e}")
    
    def validate_token(self, token: str, is_admin: bool = False) -> bool:
        """Token doğrulama"""
        if is_admin:
            return token == self.admin_token
        else:
            return token == self.auth_token
    
    def is_command_safe(self, command: str) -> Tuple[bool, str]:
        """Komutun güvenli olup olmadığını kontrol et"""
        if not command.strip():
            return False, "Boş komut"
        
        # Komutun ilk kelimesini al
        try:
            cmd_parts = shlex.split(command)
            base_command = cmd_parts[0] if cmd_parts else ""
        except ValueError:
            return False, "Geçersiz komut sözdizimi"
        
        # Blocked komut kontrolü
        if base_command in self.blocked_commands:
            return False, f"Yasaklı komut: {base_command}"
        
        # Allowed komut kontrolü (eğer liste varsa)
        if self.allowed_commands and base_command not in self.allowed_commands:
            return False, f"İzinli komutlar listesinde değil: {base_command}"
        
        return True, "Güvenli komut"
    
    def execute_command(self, command: str, is_admin: bool = False) -> Dict[str, Any]:
        """Komut çalıştır"""
        start_time = datetime.datetime.now()
        
        try:
            # Güvenlik kontrolü (admin değilse)
            if not is_admin:
                is_safe, safety_message = self.is_command_safe(command)
                if not is_safe:
                    error_result = {
                        'success': False,
                        'output': '',
                        'error': f"🚫 Güvenlik: {safety_message}",
                        'command': command,
                        'platform': self.platform_name,
                        'execution_time': 0,
                        'timestamp': start_time.isoformat()
                    }
                    self._write_json_log(error_result)
                    return error_result
            
            # Platform-specific komut çalıştırma
            if self.platform_name == "windows":
                result = self._execute_windows_command(command)
            else:
                result = self._execute_unix_command(command)
            
            # Sonucu hazırla
            end_time = datetime.datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            command_result = {
                'success': result['returncode'] == 0,
                'output': result['stdout'],
                'error': result['stderr'],
                'command': command,
                'platform': self.platform_name,
                'shell': self.platform_config['shell'],
                'returncode': result['returncode'],
                'execution_time': execution_time,
                'timestamp': start_time.isoformat(),
                'is_admin': is_admin
            }
            
            # Başarılı komutları geçmişe ekle
            if command_result['success']:
                self.command_history.append({
                    'command': command,
                    'timestamp': start_time.isoformat(),
                    'platform': self.platform_name
                })
                
                # Geçmiş limitini kontrol et
                history_limit = self.config.get('ui', {}).get('command_history_limit', 100)
                if len(self.command_history) > history_limit:
                    self.command_history = self.command_history[-history_limit:]
            
            # JSON log yaz
            self._write_json_log(command_result)
            
            return command_result
            
        except Exception as e:
            error_result = {
                'success': False,
                'output': '',
                'error': f"❌ Execution error: {str(e)}",
                'command': command,
                'platform': self.platform_name,
                'execution_time': 0,
                'timestamp': start_time.isoformat(),
                'is_admin': is_admin
            }
            self._write_json_log(error_result)
            return error_result
    
    def _execute_windows_command(self, command: str) -> Dict[str, Any]:
        """Windows komut çalıştırma"""
        shell_executable = self.platform_config['shell_executable']
        encoding = self.platform_config['encoding']
        
        if self.platform_config['shell'] == 'powershell':
            # PowerShell komutu
            full_command = [shell_executable, '-Command', command]
        else:
            # CMD komutu
            full_command = [shell_executable, '/c', command]
        
        result = subprocess.run(
            full_command,
            capture_output=True,
            text=True,
            encoding=encoding,
            timeout=30,
            shell=False
        )
        
        return {
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
    
    def _execute_unix_command(self, command: str) -> Dict[str, Any]:
        """Unix/Linux/macOS komut çalıştırma"""
        shell_executable = self.platform_config['shell_executable']
        encoding = self.platform_config['encoding']
        
        # Bash/Zsh komutu
        full_command = [shell_executable, '-c', command]
        
        result = subprocess.run(
            full_command,
            capture_output=True,
            text=True,
            encoding=encoding,
            timeout=30,
            shell=False
        )
        
        return {
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
    
    def process_user_input(self, user_input: str, use_ai: bool = True, use_scheduler: bool = True) -> Dict[str, Any]:
        """Kullanıcı girdisini işle"""
        processing_start = datetime.datetime.now()
        
        # AI ile komut yorumlama
        interpreted_command = user_input
        ai_explanation = "AI kullanılmadı"
        ai_confident = False
        
        if use_ai:
            try:
                interpreted_command, ai_explanation, ai_confident = self.ai_engine.interpret_command(user_input)
            except Exception as e:
                ai_explanation = f"AI hatası: {str(e)}"
        
        # Scheduler ile optimizasyon
        optimized_commands = [interpreted_command]
        optimization_info = {}
        
        if use_scheduler and self.config.get('scheduler', {}).get('enabled', True):
            try:
                optimized_commands, optimization_info = self.scheduler.optimize_command_sequence(interpreted_command)
            except Exception as e:
                print(f"⚠️ Scheduler hatası: {e}")
        
        # Komutları çalıştır
        results = []
        for cmd in optimized_commands:
            result = self.execute_command(cmd)
            results.append(result)
            
            # Eğer bir komut başarısız olursa ve AI varsa, hata analizi yap
            if not result['success'] and use_ai and self.ai_engine.openai_client:
                try:
                    error_analysis = self.ai_engine.analyze_error(cmd, result['error'])
                    result['ai_error_analysis'] = error_analysis
                except Exception as e:
                    result['ai_error_analysis'] = f"Hata analizi yapılamadı: {str(e)}"
        
        # Sonuç paketi
        processing_end = datetime.datetime.now()
        processing_time = (processing_end - processing_start).total_seconds()
        
        return {
            'user_input': user_input,
            'interpreted_command': interpreted_command,
            'ai_explanation': ai_explanation,
            'ai_confident': ai_confident,
            'optimized_commands': optimized_commands,
            'optimization_info': optimization_info,
            'results': results,
            'success': all(r['success'] for r in results),
            'processing_time': processing_time,
            'timestamp': processing_start.isoformat()
        }


# Flask web uygulaması
rebel_manager = REBELAIManager()


@app.route("/")
def home():
    """Ana sayfa"""
    return render_template("index.html")


@app.route("/api/execute", methods=["POST"])
def api_execute():
    """Komut çalıştırma API"""
    # Token kontrolü
    auth_token = request.headers.get("X-Auth-Token", "")
    if not rebel_manager.validate_token(auth_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        data = request.get_json()
        user_input = data.get("command", "").strip()
        use_ai = data.get("use_ai", True)
        use_scheduler = data.get("use_scheduler", True)
        
        if not user_input:
            return jsonify({"error": "Command required"}), 400
        
        # Komutu işle
        result = rebel_manager.process_user_input(user_input, use_ai, use_scheduler)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/admin/execute", methods=["POST"])
def api_admin_execute():
    """Admin komut çalıştırma API"""
    # Admin token kontrolü
    admin_token = request.headers.get("X-Admin-Token", "")
    if not rebel_manager.validate_token(admin_token, is_admin=True):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        data = request.get_json()
        command = data.get("command", "").strip()
        
        if not command:
            return jsonify({"error": "Command required"}), 400
        
        # Admin komutu çalıştır (güvenlik kısıtlaması yok)
        result = rebel_manager.execute_command(command, is_admin=True)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/history", methods=["GET"])
def api_get_history():
    """Komut geçmişi"""
    auth_token = request.headers.get("X-Auth-Token", "")
    if not rebel_manager.validate_token(auth_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    return jsonify(rebel_manager.command_history[-50:])  # Son 50 komut


@app.route("/api/favorites", methods=["GET"])
def api_get_favorites():
    """Favori komutlar"""
    auth_token = request.headers.get("X-Auth-Token", "")
    if not rebel_manager.validate_token(auth_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    return jsonify(rebel_manager.favorites)


@app.route("/api/status", methods=["GET"])
def api_get_status():
    """Sistem durumu"""
    auth_token = request.headers.get("X-Auth-Token", "")
    if not rebel_manager.validate_token(auth_token):
        return jsonify({"error": "Unauthorized"}), 401
    
    return jsonify({
        'platform': rebel_manager.platform_name,
        'shell': rebel_manager.platform_config['shell'],
        'ai_status': rebel_manager.ai_engine.get_ai_status(),
        'scheduler_enabled': rebel_manager.config.get('scheduler', {}).get('enabled', True),
        'command_count': len(rebel_manager.command_history),
        'uptime': datetime.datetime.now().isoformat()
    })


@app.route("/api/logs", methods=["GET"])
def api_get_logs():
    """Log dosyasını döndür"""
    admin_token = request.headers.get("X-Admin-Token", "")
    if not rebel_manager.validate_token(admin_token, is_admin=True):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        if os.path.exists(rebel_manager.log_file):
            return send_file(rebel_manager.log_file, as_attachment=True, download_name="rebel_ai_logs.txt")
        else:
            return jsonify({"error": "Log file not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/healthz", methods=["GET"])
def health_check():
    """Sağlık kontrolü"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "platform": rebel_manager.platform_name,
        "version": "1.0"
    })


if __name__ == "__main__":
    # Server ayarları
    server_config = rebel_manager.config.get('server', {})
    host = server_config.get('host', '0.0.0.0')
    port = server_config.get('port', 5000)
    debug = server_config.get('debug', False)
    
    print(f"🚀 Starting REBEL AI Server on {host}:{port}")
    print(f"🌍 Platform: {rebel_manager.platform_name}")
    print(f"🐚 Shell: {rebel_manager.platform_config['shell']}")
    print(f"🤖 AI Engine: {'✅ Active' if rebel_manager.ai_engine.openai_client else '❌ Inactive'}")
    print(f"🧠 Scheduler: {'✅ Enabled' if rebel_manager.config.get('scheduler', {}).get('enabled') else '❌ Disabled'}")
    print("=" * 60)
    
    app.run(host=host, port=port, debug=debug)
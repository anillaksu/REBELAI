# ==========================================
# 🖥️ REBEL AI GUI Controller - Sistem Ayarları Kontrolcüsü
# ==========================================
# Doğal dil komutlarını GUI eylemlerine çevirir

import os
import subprocess
import platform
import json
from typing import Dict, List, Tuple, Optional, Any
import yaml


class REBELGUIController:
    def __init__(self, config_path: str = "rebel_config.yaml"):
        """GUI Controller başlatıcı"""
        self.config = self._load_config(config_path)
        self.platform_name = platform.system().lower()
        self.desktop_env = self._detect_desktop_environment()
        
        # GUI ayarları haritası
        self.gui_mappings = self._create_gui_mappings()
        
        print(f"🖥️ REBEL GUI Controller initialized for {self.platform_name} ({self.desktop_env})")
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """YAML yapılandırma dosyasını yükle"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"⚠️ Config yükleme hatası: {e}")
            return {}
    
    def _detect_desktop_environment(self) -> str:
        """Desktop environment'ı tespit et"""
        desktop_envs = [
            ('XDG_CURRENT_DESKTOP', {
                'GNOME': 'gnome',
                'KDE': 'kde',
                'XFCE': 'xfce',
                'LXDE': 'lxde',
                'LXQT': 'lxqt',
                'Unity': 'unity',
                'Cinnamon': 'cinnamon',
                'MATE': 'mate',
                'Budgie': 'budgie',
                'Pantheon': 'pantheon',
                'i3': 'i3',
                'Sway': 'sway'
            }),
            ('DESKTOP_SESSION', {
                'gnome': 'gnome',
                'kde': 'kde',
                'plasma': 'kde',
                'xfce': 'xfce',
                'lxde': 'lxde',
                'lxqt': 'lxqt',
                'unity': 'unity',
                'cinnamon': 'cinnamon',
                'mate': 'mate',
                'budgie': 'budgie',
                'pantheon': 'pantheon',
                'ubuntu': 'gnome',
                'xubuntu': 'xfce',
                'lubuntu': 'lxde',
                'i3': 'i3',
                'sway': 'sway'
            })
        ]
        
        for env_var, mappings in desktop_envs:
            value = os.environ.get(env_var, '').upper()
            for key, desktop in mappings.items():
                if key.upper() in value:
                    return desktop
        
        # Fallback detection via binary existence
        fallback_bins = [
            ('/usr/bin/gnome-control-center', 'gnome'),
            ('/usr/bin/systemsettings5', 'kde'),
            ('/usr/bin/systemsettings', 'kde'),
            ('/usr/bin/xfce4-settings-manager', 'xfce'),
            ('/usr/bin/mate-control-center', 'mate'),
            ('/usr/bin/cinnamon-settings', 'cinnamon'),
            ('/usr/bin/lxqt-config', 'lxqt'),
            ('/usr/bin/budgie-control-center', 'budgie'),
            ('/usr/bin/io.elementary.switchboard', 'pantheon')
        ]
        
        for bin_path, desktop in fallback_bins:
            if os.path.exists(bin_path):
                return desktop
        
        return 'unknown'
    
    def _create_gui_mappings(self) -> Dict[str, Dict[str, Any]]:
        """GUI ayarları için komut haritalaması oluştur"""
        return {
            # Ağ ve WiFi ayarları
            "kablosuz": {
                "gnome": "gnome-control-center wifi",
                "kde": "systemsettings5 kcm_networkmanagement",
                "xfce": "nm-connection-editor",
                "mate": "nm-connection-editor",
                "cinnamon": "nm-connection-editor",
                "lxqt": "nm-connection-editor",
                "budgie": "gnome-control-center wifi",
                "pantheon": "io.elementary.switchboard",
                "i3": "nm-connection-editor",
                "sway": "nm-connection-editor",
                "generic": "nm-connection-editor",
                "keywords": ["wifi", "wireless", "kablosuz", "ağ", "network", "internet"]
            },
            "ağ": {
                "gnome": "gnome-control-center network",
                "kde": "systemsettings5 kcm_networkmanagement",
                "xfce": "nm-connection-editor",
                "mate": "nm-connection-editor",
                "cinnamon": "nm-connection-editor",
                "lxqt": "nm-connection-editor",
                "budgie": "gnome-control-center network",
                "pantheon": "io.elementary.switchboard",
                "i3": "nm-connection-editor",
                "sway": "nm-connection-editor",
                "generic": "nm-connection-editor",
                "keywords": ["network", "ağ", "internet", "bağlantı", "connection"]
            },
            
            # Ekran ayarları
            "ekran": {
                "gnome": "gnome-control-center display",
                "kde": "systemsettings5 kcm_displayconfiguration",
                "xfce": "xfce4-display-settings",
                "mate": "mate-display-properties",
                "cinnamon": "cinnamon-settings display",
                "lxqt": "lxqt-config-monitor",
                "budgie": "gnome-control-center display",
                "pantheon": "io.elementary.switchboard",
                "i3": "arandr",
                "sway": "wdisplays",
                "generic": "xrandr --auto",
                "keywords": ["display", "ekran", "monitor", "monitör", "çözünürlük", "resolution"]
            },
            "ekran_ayarları": {
                "gnome": "gnome-control-center display",
                "kde": "systemsettings5 kcm_displayconfiguration",
                "xfce": "xfce4-display-settings",
                "mate": "mate-display-properties",
                "cinnamon": "cinnamon-settings display",
                "lxqt": "lxqt-config-monitor",
                "budgie": "gnome-control-center display",
                "pantheon": "io.elementary.switchboard",
                "i3": "arandr",
                "sway": "wdisplays",
                "generic": "arandr",
                "keywords": ["display settings", "ekran ayarları", "monitor settings"]
            },
            
            # Ses ayarları
            "ses": {
                "gnome": "gnome-control-center sound",
                "kde": "systemsettings5 kcm_pulseaudio",
                "xfce": "pavucontrol",
                "mate": "mate-volume-control",
                "cinnamon": "cinnamon-settings sound",
                "lxqt": "pavucontrol-qt",
                "budgie": "gnome-control-center sound",
                "pantheon": "io.elementary.switchboard",
                "i3": "pavucontrol",
                "sway": "pavucontrol",
                "generic": "pavucontrol",
                "keywords": ["sound", "ses", "audio", "hoparlör", "speaker", "mikrofon", "microphone"]
            },
            
            # Güç yönetimi
            "pil": {
                "gnome": "gnome-control-center power",
                "kde": "systemsettings5 kcm_powerdevilprofilesconfig",
                "xfce": "xfce4-power-manager-settings",
                "mate": "mate-power-preferences",
                "cinnamon": "cinnamon-settings power",
                "lxqt": "lxqt-config-powermanagement",
                "budgie": "gnome-control-center power",
                "pantheon": "io.elementary.switchboard",
                "i3": "xfce4-power-manager-settings",
                "sway": "xfce4-power-manager-settings",
                "generic": "xfce4-power-manager-settings",
                "keywords": ["battery", "pil", "power", "güç", "enerji", "energy"]
            },
            
            # Bluetooth
            "bluetooth": {
                "gnome": "gnome-control-center bluetooth",
                "kde": "systemsettings5 kcm_bluetooth",
                "xfce": "blueman-manager",
                "mate": "blueman-manager",
                "cinnamon": "blueberry",
                "lxqt": "blueman-manager",
                "budgie": "gnome-control-center bluetooth",
                "pantheon": "io.elementary.switchboard",
                "i3": "blueman-manager",
                "sway": "blueman-manager",
                "generic": "blueman-manager",
                "keywords": ["bluetooth", "kablosuz", "wireless"]
            },
            
            # Sistem ayarları
            "sistem": {
                "gnome": "gnome-control-center",
                "kde": "systemsettings5",
                "xfce": "xfce4-settings-manager",
                "mate": "mate-control-center",
                "cinnamon": "cinnamon-settings",
                "lxqt": "lxqt-config",
                "budgie": "budgie-control-center",
                "pantheon": "io.elementary.switchboard",
                "i3": "gnome-control-center",
                "sway": "gnome-control-center",
                "generic": "gnome-control-center",
                "keywords": ["system", "sistem", "settings", "ayarlar", "control", "kontrol"]
            },
            
            # Klavye ve fare
            "klavye": {
                "gnome": "gnome-control-center keyboard",
                "kde": "systemsettings5 kcm_keyboard",
                "xfce": "xfce4-keyboard-settings",
                "generic": "xfce4-keyboard-settings",
                "keywords": ["keyboard", "klavye", "keys", "tuşlar"]
            },
            "fare": {
                "gnome": "gnome-control-center mouse",
                "kde": "systemsettings5 kcm_mouse",
                "xfce": "xfce4-mouse-settings",
                "generic": "xfce4-mouse-settings",
                "keywords": ["mouse", "fare", "pointer", "işaretçi"]
            },
            
            # Tarih ve saat
            "tarih": {
                "gnome": "gnome-control-center datetime",
                "kde": "systemsettings5 kcm_clock",
                "xfce": "xfce4-datetime-settings",
                "generic": "timedatectl status",
                "keywords": ["date", "tarih", "time", "saat", "clock", "zaman"]
            },
            
            # Kullanıcılar
            "kullanıcı": {
                "gnome": "gnome-control-center user-accounts",
                "kde": "systemsettings5 kcm_users",
                "xfce": "users-admin",
                "generic": "users-admin",
                "keywords": ["user", "kullanıcı", "account", "hesap", "login", "giriş"]
            },
            
            # Gizlilik
            "gizlilik": {
                "gnome": "gnome-control-center privacy",
                "kde": "systemsettings5",
                "xfce": "xfce4-settings-manager",
                "generic": "gnome-control-center privacy",
                "keywords": ["privacy", "gizlilik", "güvenlik", "security"]
            }
        }
    
    def interpret_gui_command(self, user_input: str) -> Tuple[str, str, bool]:
        """
        Kullanıcı girdisini GUI eylemine çevir
        
        Returns:
            Tuple[command, explanation, is_confident]
        """
        user_lower = user_input.lower().strip()
        
        # Direkt anahtar kelime eşleşmesi
        for setting_key, config in self.gui_mappings.items():
            keywords = config.get('keywords', [])
            for keyword in keywords:
                if keyword in user_lower:
                    command = self._get_command_for_desktop(config)
                    explanation = f"GUI komutu: {setting_key} ayarları açılıyor"
                    return command, explanation, True
        
        # Ayarlar kombinasyonu (örn: "kablosuz ekran ayarları")
        setting_parts = []
        for setting_key, config in self.gui_mappings.items():
            keywords = config.get('keywords', [])
            for keyword in keywords:
                if keyword in user_lower:
                    setting_parts.append(setting_key)
                    break
        
        if setting_parts:
            # En uygun ayar seçimi
            primary_setting = setting_parts[0]
            config = self.gui_mappings[primary_setting]
            command = self._get_command_for_desktop(config)
            explanation = f"GUI komutu: {', '.join(setting_parts)} ayarları açılıyor"
            return command, explanation, True
        
        # "ayarları aç" gibi genel komutlar
        if any(word in user_lower for word in ["ayar", "setting", "aç", "open", "göster", "show"]):
            config = self.gui_mappings["sistem"]
            command = self._get_command_for_desktop(config)
            explanation = "Sistem ayarları açılıyor"
            return command, explanation, True
        
        return "", "❌ GUI komutu anlaşılamadı", False
    
    def _get_command_for_desktop(self, config: Dict[str, Any]) -> str:
        """Desktop environment'a göre uygun komutu al"""
        if self.desktop_env in config:
            return config[self.desktop_env]
        else:
            return config.get('generic', 'gnome-control-center')
    
    def execute_gui_command(self, command: str) -> Tuple[bool, str]:
        """GUI komutunu çalıştır"""
        try:
            if not command:
                return False, "Boş komut"
            
            # Komutu arka planda çalıştır
            process = subprocess.Popen(
                command.split(),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True
            )
            
            # Hemen döndür (GUI uygulaması arka planda açılsın)
            return True, f"✅ GUI komutu çalıştırıldı: {command}"
            
        except FileNotFoundError:
            return False, f"❌ Program bulunamadı: {command.split()[0]}"
        except Exception as e:
            return False, f"❌ GUI komut hatası: {str(e)}"
    
    def get_available_settings(self) -> List[Dict[str, Any]]:
        """Mevcut ayar kategorilerini listele"""
        settings_list = []
        for key, config in self.gui_mappings.items():
            settings_list.append({
                "category": key,
                "keywords": config.get('keywords', []),
                "command": self._get_command_for_desktop(config),
                "available": self._check_command_availability(self._get_command_for_desktop(config))
            })
        return settings_list
    
    def _check_command_availability(self, command: str) -> bool:
        """Komutun sistemde mevcut olup olmadığını kontrol et"""
        try:
            program = command.split()[0]
            subprocess.run(['which', program], 
                         stdout=subprocess.PIPE, 
                         stderr=subprocess.PIPE, 
                         check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def get_gui_status(self) -> Dict[str, Any]:
        """GUI kontrolcü durumunu döndür"""
        return {
            "platform": self.platform_name,
            "desktop_environment": self.desktop_env,
            "available_settings": len(self.gui_mappings),
            "gui_available": self.desktop_env != 'unknown'
        }


# Test fonksiyonu
if __name__ == "__main__":
    controller = REBELGUIController()
    
    print("🖥️ REBEL GUI Controller Test")
    print("=" * 40)
    
    test_commands = [
        "kablosuz ekran ayarlarını aç",
        "wifi ayarları",
        "ses ayarları aç",
        "sistem ayarları",
        "bluetooth aç",
        "ekran çözünürlüğü",
        "bilinmeyen gui komutu"
    ]
    
    for cmd in test_commands:
        command, explanation, confident = controller.interpret_gui_command(cmd)
        print(f"Girdi: {cmd}")
        print(f"Komut: {command}")
        print(f"Açıklama: {explanation}")
        print(f"Güvenilir: {confident}")
        print("-" * 30)
    
    print("\n📊 GUI Durum:")
    status = controller.get_gui_status()
    for key, value in status.items():
        print(f"{key}: {value}")
    
    print("\n📋 Mevcut Ayarlar:")
    settings = controller.get_available_settings()
    for setting in settings[:5]:  # İlk 5'ini göster
        print(f"- {setting['category']}: {setting['available']}")
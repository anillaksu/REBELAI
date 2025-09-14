# ==========================================
# 🧠 REBEL AI Dijkstra Scheduler
# ==========================================
# Komut zincirlerini optimum sırada çalıştıran graf tabanlı algoritma

import heapq
import re
import yaml
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass


@dataclass
class CommandNode:
    """Komut düğümü"""
    id: str
    command: str
    dependencies: List[str]
    cost: float
    risk_level: int
    estimated_time: float


class REBELDijkstraScheduler:
    """Dijkstra algoritması ile komut optimizasyonu"""
    
    def __init__(self, config_path: str = "rebel_config.yaml"):
        """Scheduler başlatıcı"""
        self.config = self._load_config(config_path)
        self.scheduler_config = self.config.get('scheduler', {})
        self.command_costs = self.scheduler_config.get('command_costs', {})
        self.cost_weights = self.scheduler_config.get('cost_weights', {'speed': 0.4, 'risk': 0.6})
        
        # Komut kalıpları
        self.command_patterns = {
            'list': r'(ls|dir|listele|list)',
            'find': r'(find|ara|bul)',
            'copy': r'(cp|copy|kopyala)',
            'move': r'(mv|move|taşı)',
            'delete': r'(rm|del|delete|sil)',
            'archive': r'(zip|tar|rar|arşiv|compress)',
            'network': r'(ping|wget|curl|network)',
            'system': r'(systemctl|service|sistem)',
            'process': r'(ps|kill|process|süreç)',
            'log': r'(log|journal|kayıt)'
        }
        
        print("🧠 REBEL Dijkstra Scheduler initialized")
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """YAML yapılandırma dosyasını yükle"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"⚠️ Config yükleme hatası: {e}")
            return {}
    
    def parse_command_chain(self, user_input: str) -> List[str]:
        """
        Kullanıcı girdisinden komut zincirini çıkar
        
        Örnekler:
        - "dosyaları listele ve sonra zip yap"
        - "find all .txt files and then delete old ones"
        - "sistem durumunu kontrol et, logları göster ve ardından yeniden başlat"
        """
        # Bağlaçları tanı
        connectors = [
            r'\s+(ve\s+sonra|and\s+then|then|sonra)\s+',
            r'\s+(ve|and)\s+',
            r'\s+(ardından|after\s+that|after)\s+',
            r'\s*[,;]\s*',
            r'\s+→\s+',
            r'\s+->\s+'
        ]
        
        # Kullanıcı girdisini komutlara böl
        commands = [user_input]
        
        for pattern in connectors:
            new_commands = []
            for cmd in commands:
                split_cmds = re.split(pattern, cmd, flags=re.IGNORECASE)
                new_commands.extend([c.strip() for c in split_cmds if c.strip() and not re.match(pattern, c, re.IGNORECASE)])
            commands = new_commands
        
        # Boş komutları filtrele
        return [cmd for cmd in commands if cmd and len(cmd) > 2]
    
    def calculate_command_cost(self, command: str) -> float:
        """Komutun maliyetini hesapla"""
        base_command = command.split()[0] if command.split() else command
        
        # Önceden tanımlı maliyetler
        if base_command in self.command_costs:
            return self.command_costs[base_command]
        
        # Kalıp bazlı maliyet hesaplama
        cost = 5.0  # Varsayılan maliyet
        
        for category, pattern in self.command_patterns.items():
            if re.search(pattern, command, re.IGNORECASE):
                category_costs = {
                    'list': 1.0,
                    'find': 3.0,
                    'copy': 4.0,
                    'move': 5.0,
                    'delete': 9.0,
                    'archive': 6.0,
                    'network': 4.0,
                    'system': 8.0,
                    'process': 7.0,
                    'log': 2.0
                }
                cost = category_costs.get(category, 5.0)
                break
        
        # Komut uzunluğu ve karmaşıklığına göre ek maliyet
        complexity_bonus = len(command.split()) * 0.5
        special_chars = len(re.findall(r'[|&;<>()]', command)) * 1.0
        
        return cost + complexity_bonus + special_chars
    
    def calculate_risk_level(self, command: str) -> int:
        """Komutun risk seviyesini hesapla (1-10)"""
        base_command = command.split()[0] if command.split() else command
        
        # Yüksek riskli komutlar
        high_risk = ['rm', 'del', 'delete', 'kill', 'killall', 'systemctl', 'service', 'sudo', 'chmod', 'chown']
        medium_risk = ['mv', 'move', 'cp', 'copy', 'tar', 'zip', 'find']
        low_risk = ['ls', 'dir', 'pwd', 'whoami', 'date', 'cat', 'head', 'tail', 'grep']
        
        if base_command in high_risk:
            return 9
        elif base_command in medium_risk:
            return 5
        elif base_command in low_risk:
            return 1
        else:
            return 3  # Orta seviye risk
    
    def estimate_execution_time(self, command: str) -> float:
        """Komutun tahmini çalışma süresini hesapla (saniye)"""
        base_command = command.split()[0] if command.split() else command
        
        # Komut türüne göre tahmini süreler
        time_estimates = {
            'ls': 0.1,
            'pwd': 0.05,
            'whoami': 0.05,
            'date': 0.05,
            'cat': 0.2,
            'head': 0.1,
            'tail': 0.1,
            'grep': 1.0,
            'find': 5.0,
            'cp': 2.0,
            'mv': 1.5,
            'tar': 10.0,
            'zip': 8.0,
            'systemctl': 3.0,
            'service': 3.0,
            'ps': 0.5,
            'kill': 0.2
        }
        
        base_time = time_estimates.get(base_command, 2.0)
        
        # Komut karmaşıklığına göre ek süre
        complexity_factor = len(command.split()) * 0.2
        pipe_factor = command.count('|') * 1.0
        
        return base_time + complexity_factor + pipe_factor
    
    def detect_dependencies(self, commands: List[str]) -> Dict[str, List[str]]:
        """Komutlar arası bağımlılıkları tespit et"""
        dependencies = {}
        
        for i, cmd in enumerate(commands):
            cmd_deps = []
            
            # Önceki komutlarla bağımlılık kontrolleri
            for j, prev_cmd in enumerate(commands[:i]):
                if self._has_dependency(prev_cmd, cmd):
                    cmd_deps.append(f"cmd_{j}")
            
            dependencies[f"cmd_{i}"] = cmd_deps
        
        return dependencies
    
    def _has_dependency(self, prev_cmd: str, current_cmd: str) -> bool:
        """İki komut arasında bağımlılık olup olmadığını kontrol et"""
        # Basit bağımlılık kuralları
        dependency_rules = [
            # Dosya listeleme -> İşlem
            (r'(ls|dir|list)', r'(cp|mv|rm|zip|tar)'),
            # Arama -> İşlem
            (r'(find|grep|ara)', r'(cp|mv|rm|edit)'),
            # Oluşturma -> Arşivleme
            (r'(mkdir|touch|create)', r'(zip|tar|archive)'),
            # Sistem kontrolü -> Yeniden başlatma
            (r'(ps|systemctl.*status|service.*status)', r'(systemctl.*restart|service.*restart|reboot)'),
            # Log kontrol -> Temizleme
            (r'(journalctl|log|tail.*log)', r'(logrotate|truncate|rm.*log)')
        ]
        
        for prev_pattern, curr_pattern in dependency_rules:
            if (re.search(prev_pattern, prev_cmd, re.IGNORECASE) and 
                re.search(curr_pattern, current_cmd, re.IGNORECASE)):
                return True
        
        return False
    
    def build_command_graph(self, commands: List[str]) -> List[CommandNode]:
        """Komut grafiğini oluştur"""
        dependencies = self.detect_dependencies(commands)
        nodes = []
        
        for i, cmd in enumerate(commands):
            node_id = f"cmd_{i}"
            cost = self.calculate_command_cost(cmd)
            risk = self.calculate_risk_level(cmd)
            time = self.estimate_execution_time(cmd)
            deps = dependencies.get(node_id, [])
            
            node = CommandNode(
                id=node_id,
                command=cmd,
                dependencies=deps,
                cost=cost,
                risk_level=risk,
                estimated_time=time
            )
            nodes.append(node)
        
        return nodes
    
    def calculate_total_cost(self, node: CommandNode) -> float:
        """Düğümün toplam maliyetini hesapla"""
        speed_weight = self.cost_weights.get('speed', 0.4)
        risk_weight = self.cost_weights.get('risk', 0.6)
        
        # Normalleştirilmiş maliyet
        speed_cost = node.cost + (node.estimated_time * 0.1)  # Süreyi maliyete ekle
        risk_cost = node.risk_level  # 1-10 arasında
        
        total_cost = (speed_cost * speed_weight) + (risk_cost * risk_weight)
        return total_cost
    
    def dijkstra_optimize(self, nodes: List[CommandNode]) -> List[CommandNode]:
        """Dijkstra algoritması ile optimum çalışma sırası"""
        if not nodes:
            return []
        
        # Graf yapısını oluştur
        graph = {}
        for node in nodes:
            graph[node.id] = {
                'node': node,
                'cost': self.calculate_total_cost(node),
                'dependencies': node.dependencies
            }
        
        # Bağımlılığı olmayan düğümlerden başla
        start_nodes = [node for node in nodes if not node.dependencies]
        if not start_nodes:
            # Döngüsel bağımlılık varsa, en düşük maliyetli düğümden başla
            start_nodes = [min(nodes, key=lambda n: self.calculate_total_cost(n))]
        
        # Optimum sırayı hesapla
        optimal_order = []
        remaining_nodes = {node.id: node for node in nodes}
        completed_nodes = set()
        
        # Priority queue (maliyet, node_id)
        pq = [(self.calculate_total_cost(node), node.id) for node in start_nodes]
        heapq.heapify(pq)
        
        while pq and remaining_nodes:
            current_cost, current_id = heapq.heappop(pq)
            
            if current_id in completed_nodes:
                continue
            
            current_node = remaining_nodes.get(current_id)
            if not current_node:
                continue
            
            # Bağımlılıkları kontrol et
            deps_satisfied = all(dep in completed_nodes for dep in current_node.dependencies)
            
            if deps_satisfied:
                optimal_order.append(current_node)
                completed_nodes.add(current_id)
                del remaining_nodes[current_id]
                
                # Yeni düğümleri kuyruğa ekle
                for node in remaining_nodes.values():
                    if node.id not in [item[1] for item in pq]:
                        heapq.heappush(pq, (self.calculate_total_cost(node), node.id))
            else:
                # Bağımlılıklar sağlanmamışsa tekrar kuyruğa ekle (daha yüksek maliyet ile)
                heapq.heappush(pq, (current_cost + 1.0, current_id))
        
        # Kalan düğümleri ekle (döngüsel bağımlılık durumu)
        for node in remaining_nodes.values():
            optimal_order.append(node)
        
        return optimal_order
    
    def optimize_command_sequence(self, user_input: str) -> Tuple[List[str], Dict[str, Any]]:
        """
        Komut dizisini optimize et
        
        Returns:
            Tuple[optimized_commands, optimization_info]
        """
        # Komut zincirini çıkar
        commands = self.parse_command_chain(user_input)
        
        if len(commands) <= 1:
            # Tek komut, optimizasyon gerekmiyor
            return commands, {
                'original_count': len(commands),
                'optimized_count': len(commands),
                'optimization_applied': False,
                'total_estimated_time': self.estimate_execution_time(commands[0]) if commands else 0,
                'total_risk_score': self.calculate_risk_level(commands[0]) if commands else 0
            }
        
        # Komut grafiğini oluştur
        nodes = self.build_command_graph(commands)
        
        # Dijkstra optimizasyonu uygula
        optimized_nodes = self.dijkstra_optimize(nodes)
        
        # Sonuçları hazırla
        optimized_commands = [node.command for node in optimized_nodes]
        
        optimization_info = {
            'original_count': len(commands),
            'optimized_count': len(optimized_commands),
            'optimization_applied': True,
            'original_sequence': commands,
            'optimized_sequence': optimized_commands,
            'total_estimated_time': sum(node.estimated_time for node in optimized_nodes),
            'total_cost': sum(self.calculate_total_cost(node) for node in optimized_nodes),
            'total_risk_score': sum(node.risk_level for node in optimized_nodes),
            'dependency_graph': {node.id: node.dependencies for node in nodes}
        }
        
        return optimized_commands, optimization_info
    
    def get_optimization_report(self, optimization_info: Dict[str, Any]) -> str:
        """Optimizasyon raporu oluştur"""
        if not optimization_info.get('optimization_applied', False):
            return "ℹ️ Tek komut tespit edildi, optimizasyon uygulanmadı."
        
        original_count = optimization_info['original_count']
        optimized_count = optimization_info['optimized_count']
        estimated_time = optimization_info['total_estimated_time']
        risk_score = optimization_info['total_risk_score']
        
        report = f"""🧠 REBEL Dijkstra Optimizasyon Raporu
{'=' * 50}
📊 Komut Sayısı: {original_count} → {optimized_count}
⏱️ Tahmini Süre: {estimated_time:.1f} saniye
⚠️ Risk Skoru: {risk_score}/10
🎯 Optimizasyon: {'✅ Uygulandı' if optimization_info.get('optimization_applied') else '❌ Uygulanmadı'}

📋 Optimum Sıra:"""
        
        for i, cmd in enumerate(optimization_info.get('optimized_sequence', []), 1):
            report += f"\n{i}. {cmd}"
        
        return report


# Test fonksiyonu
if __name__ == "__main__":
    scheduler = REBELDijkstraScheduler()
    
    print("🧠 REBEL Dijkstra Scheduler Test")
    print("=" * 50)
    
    test_inputs = [
        "dosyaları listele",
        "dosyaları listele ve sonra zip yap ve logla",
        "find all .txt files and then delete old ones and check system status",
        "sistem durumunu kontrol et, logları göster ve ardından servisi yeniden başlat"
    ]
    
    for user_input in test_inputs:
        print(f"\n🎯 Girdi: {user_input}")
        print("-" * 40)
        
        optimized_commands, optimization_info = scheduler.optimize_command_sequence(user_input)
        
        print(f"📋 Optimized Commands: {optimized_commands}")
        print(f"📊 Info: {optimization_info}")
        
        report = scheduler.get_optimization_report(optimization_info)
        print(f"\n{report}")
        print("=" * 50)
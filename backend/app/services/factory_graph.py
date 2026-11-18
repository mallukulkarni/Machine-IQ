import networkx as nx
from typing import Dict, List, Any

class FactoryDependencyEngine:
    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_demo_graph()
    
    def _build_demo_graph(self):
        nodes = [
            {"id": "MAT-001", "type": "material", "label": "Steel Roller A", "category": "roller"},
            {"id": "MAT-002", "type": "material", "label": "Steel Pipe B", "category": "pipe"},
            {"id": "MAT-003", "type": "material", "label": "Bearing Assembly C", "category": "bearing"},
            {"id": "MAT-004", "type": "material", "label": "Drive Shaft D", "category": "shaft"},
            {"id": "MAT-005", "type": "material", "label": "Steel Plate E", "category": "plate"},
            {"id": "MCH-001", "type": "machine", "label": "Rolling Mill", "category": "primary"},
            {"id": "MCH-002", "type": "machine", "label": "Heat Treatment Unit", "category": "processing"},
            {"id": "MCH-003", "type": "machine", "label": "Quality Control Station", "category": "qa"},
            {"id": "MCH-004", "type": "machine", "label": "Packaging Line", "category": "packaging"},
            {"id": "MCH-005", "type": "machine", "label": "Final Assembly", "category": "assembly"},
            {"id": "PROD-001", "type": "output", "label": "Final Production Output", "category": "output"},
        ]
        for n in nodes:
            self.graph.add_node(n["id"], **n)
        edges = [
            ("MAT-001", "MCH-001", {"weight": 0.9, "relationship": "primary_component"}),
            ("MAT-002", "MCH-001", {"weight": 0.7, "relationship": "structural"}),
            ("MAT-003", "MCH-001", {"weight": 0.95, "relationship": "critical_bearing"}),
            ("MAT-004", "MCH-001", {"weight": 0.85, "relationship": "drive"}),
            ("MAT-005", "MCH-002", {"weight": 0.6, "relationship": "feed_material"}),
            ("MCH-001", "MCH-002", {"weight": 0.8, "relationship": "feeds"}),
            ("MCH-002", "MCH-003", {"weight": 0.9, "relationship": "feeds"}),
            ("MCH-003", "MCH-004", {"weight": 0.85, "relationship": "feeds"}),
            ("MCH-004", "MCH-005", {"weight": 0.75, "relationship": "feeds"}),
            ("MCH-005", "PROD-001", {"weight": 1.0, "relationship": "produces"}),
        ]
        for src, dst, attrs in edges:
            self.graph.add_edge(src, dst, **attrs)
    
    def get_graph_data(self) -> Dict:
        nodes = [{"id": node_id, **attrs, "risk_score": 0.0, "affected": False} for node_id, attrs in self.graph.nodes(data=True)]
        edges = [{"source": src, "target": dst, **attrs} for src, dst, attrs in self.graph.edges(data=True)]
        return {"nodes": nodes, "edges": edges}
    
    def analyze_impact(self, material_id: str, risk_score: float, risk_level: str) -> Dict:
        if material_id not in self.graph:
            return {"error": f"Material {material_id} not in graph"}
        descendants = list(nx.descendants(self.graph, material_id))
        affected_machines = [n for n in descendants if self.graph.nodes[n].get("type") == "machine"]
        path_weights = []
        for machine in affected_machines:
            try:
                path = nx.shortest_path(self.graph, material_id, machine, weight=None)
                edge_weights = [self.graph.edges[path[i], path[i+1]].get("weight", 0.5) for i in range(len(path)-1)]
                if edge_weights:
                    path_weights.append(sum(edge_weights) / len(edge_weights))
            except nx.NetworkXNoPath:
                pass
        avg_impact = sum(path_weights) / len(path_weights) if path_weights else 0
        impact_multiplier = {"low": 0.05, "moderate": 0.20, "high": 0.50, "critical": 0.85}.get(risk_level, 0.1)
        estimated_production_impact = round(avg_impact * impact_multiplier * 100, 1)
        return {
            "material_id": material_id, "risk_level": risk_level, "risk_score": risk_score,
            "affected_machines": affected_machines, "total_affected_nodes": len(descendants),
            "estimated_production_impact_pct": estimated_production_impact,
            "downstream_nodes": descendants,
            "impact_note": "HYPOTHETICAL SCENARIO ESTIMATE — Not a real production measurement.",
            "recommendation": self._get_impact_recommendation(risk_level, len(affected_machines))
        }

    def simulate_failure(self, material_id: str) -> Dict:
        if material_id not in self.graph:
            return {"error": "Material not found"}
        descendants = list(nx.descendants(self.graph, material_id))
        disrupted = [self.graph.nodes[n]["label"] for n in descendants]
        return {"material_id": material_id, "simulated_failure": True, "disrupted_systems": disrupted, "total_disrupted": len(disrupted), "note": "SIMULATED SCENARIO — Hypothetical failure analysis for planning purposes only."}

    def _get_impact_recommendation(self, risk_level: str, affected_count: int) -> str:
        if risk_level == "critical": return f"Immediate action required. {affected_count} downstream system(s) potentially affected."
        elif risk_level == "high": return f"Schedule inspection within 24-48 hours. {affected_count} system(s) may be affected."
        elif risk_level == "moderate": return f"Monitor closely. Plan maintenance at next scheduled window. {affected_count} system(s) downstream."
        return f"Continue normal operations. {affected_count} system(s) tracked downstream."

factory_engine = FactoryDependencyEngine()

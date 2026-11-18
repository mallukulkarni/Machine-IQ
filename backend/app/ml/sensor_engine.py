import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class VirtualSensorEngine:
    SCENARIOS = {
        "normal": {"vibration_base": 2.5, "vibration_noise": 0.3, "temp_base": 65.0, "temp_noise": 2.0, "strain_base": 150.0, "strain_noise": 10.0},
        "excessive_vibration": {"vibration_base": 12.0, "vibration_noise": 2.5, "temp_base": 72.0, "temp_noise": 3.0, "strain_base": 165.0, "strain_noise": 15.0},
        "temperature_rise": {"vibration_base": 3.5, "vibration_noise": 0.5, "temp_base": 110.0, "temp_noise": 8.0, "strain_base": 158.0, "strain_noise": 12.0},
        "mechanical_overload": {"vibration_base": 8.0, "vibration_noise": 1.5, "temp_base": 85.0, "temp_noise": 5.0, "strain_base": 280.0, "strain_noise": 30.0},
        "combined_abnormal": {"vibration_base": 15.0, "vibration_noise": 3.0, "temp_base": 125.0, "temp_noise": 10.0, "strain_base": 320.0, "strain_noise": 40.0},
    }

    BASELINES = {
        "vibration": {"mean": 2.5, "std": 0.3, "unit": "mm/s", "max_normal": 5.0},
        "temperature": {"mean": 65.0, "std": 2.0, "unit": "°C", "max_normal": 85.0},
        "strain": {"mean": 150.0, "std": 10.0, "unit": "μstrain", "max_normal": 220.0},
    }

    REGIONS = ["Zone-A (Drive End)", "Zone-B (Mid-Section)", "Zone-C (Non-Drive End)"]

    def generate_reading(self, material_id: str, scenario: str = "normal", region: Optional[str] = None) -> Dict:
        cfg = self.SCENARIOS.get(scenario, self.SCENARIOS["normal"])
        if region is None:
            region = np.random.choice(self.REGIONS)
        vib_rms = max(0.1, np.random.normal(cfg["vibration_base"], cfg["vibration_noise"]))
        vib_peak = vib_rms * np.random.uniform(1.4, 1.8)
        vib_accel = vib_rms * np.random.uniform(0.8, 1.2)
        temp = max(10.0, np.random.normal(cfg["temp_base"], cfg["temp_noise"]))
        temp_variation = abs(np.random.normal(0, cfg["temp_noise"] * 0.5))
        strain = max(10.0, np.random.normal(cfg["strain_base"], cfg["strain_noise"]))
        strain_variation = abs(np.random.normal(0, cfg["strain_noise"] * 0.3))
        return {
            "material_id": material_id, "scenario": scenario, "region": region,
            "timestamp": datetime.utcnow().isoformat(),
            "vibration": {"rms": round(vib_rms, 4), "peak": round(vib_peak, 4), "acceleration": round(vib_accel, 4), "unit": "mm/s", "baseline": self.BASELINES["vibration"]["mean"], "max_normal": self.BASELINES["vibration"]["max_normal"]},
            "temperature": {"current": round(temp, 2), "variation": round(temp_variation, 2), "unit": "°C", "baseline": self.BASELINES["temperature"]["mean"], "max_normal": self.BASELINES["temperature"]["max_normal"]},
            "strain": {"value": round(strain, 2), "variation": round(strain_variation, 2), "unit": "μstrain", "baseline": self.BASELINES["strain"]["mean"], "max_normal": self.BASELINES["strain"]["max_normal"]},
        }

    def generate_time_series(self, material_id: str, scenario: str = "normal", points: int = 60) -> List[Dict]:
        readings = []
        base_time = datetime.utcnow() - timedelta(minutes=points)
        cfg = self.SCENARIOS.get(scenario, self.SCENARIOS["normal"])
        for i in range(points):
            ts = base_time + timedelta(minutes=i)
            readings.append({
                "timestamp": ts.isoformat(),
                "vibration_rms": round(max(0.1, np.random.normal(cfg["vibration_base"], cfg["vibration_noise"])), 3),
                "temperature": round(max(10.0, np.random.normal(cfg["temp_base"], cfg["temp_noise"])), 2),
                "strain": round(max(10.0, np.random.normal(cfg["strain_base"], cfg["strain_noise"])), 2),
                "scenario": scenario,
            })
        return readings

    def generate_training_data(self, n_normal: int = 1000, n_anomalous: int = 200) -> pd.DataFrame:
        normal_cfg = self.SCENARIOS["normal"]
        records = []
        for _ in range(n_normal):
            vib = max(0.1, np.random.normal(normal_cfg["vibration_base"], normal_cfg["vibration_noise"]))
            temp = max(10.0, np.random.normal(normal_cfg["temp_base"], normal_cfg["temp_noise"]))
            strain = max(10.0, np.random.normal(normal_cfg["strain_base"], normal_cfg["strain_noise"]))
            records.append({"vibration_rms": vib, "vibration_peak": vib*1.6, "vibration_accel": vib*1.0, "temperature": temp, "temp_variation": abs(np.random.normal(0, 1.0)), "strain": strain, "strain_variation": abs(np.random.normal(0, 5.0)), "label": 0})
        for _ in range(n_anomalous):
            scenario = np.random.choice(["excessive_vibration", "temperature_rise", "mechanical_overload", "combined_abnormal"])
            cfg = self.SCENARIOS[scenario]
            vib = max(0.1, np.random.normal(cfg["vibration_base"], cfg["vibration_noise"]))
            temp = max(10.0, np.random.normal(cfg["temp_base"], cfg["temp_noise"]))
            strain = max(10.0, np.random.normal(cfg["strain_base"], cfg["strain_noise"]))
            records.append({"vibration_rms": vib, "vibration_peak": vib*1.6, "vibration_accel": vib*1.0, "temperature": temp, "temp_variation": abs(np.random.normal(0, cfg["temp_noise"]*0.5)), "strain": strain, "strain_variation": abs(np.random.normal(0, cfg["strain_noise"]*0.3)), "label": 1})
        return pd.DataFrame(records)

sensor_engine = VirtualSensorEngine()

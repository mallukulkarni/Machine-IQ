import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Optional, Tuple
from app.ml.sensor_engine import sensor_engine, VirtualSensorEngine

FEATURE_COLS = ["vibration_rms", "vibration_peak", "vibration_accel", "temperature", "temp_variation", "strain", "strain_variation"]
BASELINES = VirtualSensorEngine.BASELINES
THRESHOLDS = {
    "vibration_rms": {"warning": 5.0, "high": 8.0, "critical": 12.0},
    "temperature": {"warning": 85.0, "high": 100.0, "critical": 120.0},
    "strain": {"warning": 220.0, "high": 260.0, "critical": 300.0},
}

class MaterialAnomalyDetector:
    def __init__(self):
        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.is_trained = False

    def train(self, contamination: float = 0.1) -> Dict:
        df = sensor_engine.generate_training_data(n_normal=2000, n_anomalous=400)
        X = df[FEATURE_COLS].values
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        self.model = IsolationForest(n_estimators=200, contamination=contamination, random_state=42, n_jobs=-1)
        self.model.fit(X_scaled[df["label"].values == 0])
        self.is_trained = True
        return {"status": "trained", "n_samples": len(X), "contamination": contamination}

    def _extract_features(self, reading: Dict) -> np.ndarray:
        vib = reading.get("vibration", {})
        temp = reading.get("temperature", {})
        strain = reading.get("strain", {})
        return np.array([[vib.get("rms", 2.5), vib.get("peak", 4.0), vib.get("acceleration", 2.5), temp.get("current", 65.0), temp.get("variation", 1.0), strain.get("value", 150.0), strain.get("variation", 5.0)]])

    def _compute_risk_score(self, reading: Dict) -> Tuple[float, List[str]]:
        contributors = []
        score = 0.0
        vib_rms = reading["vibration"]["rms"]
        temp = reading["temperature"]["current"]
        strain = reading["strain"]["value"]
        if vib_rms > THRESHOLDS["vibration_rms"]["critical"]:
            score += 40; contributors.append(f"Critical vibration ({vib_rms:.1f} mm/s)")
        elif vib_rms > THRESHOLDS["vibration_rms"]["high"]:
            score += 30; contributors.append(f"High vibration ({vib_rms:.1f} mm/s)")
        elif vib_rms > THRESHOLDS["vibration_rms"]["warning"]:
            score += 15; contributors.append(f"Elevated vibration ({vib_rms:.1f} mm/s)")
        if temp > THRESHOLDS["temperature"]["critical"]:
            score += 35; contributors.append(f"Critical temperature ({temp:.1f}°C)")
        elif temp > THRESHOLDS["temperature"]["high"]:
            score += 25; contributors.append(f"High temperature ({temp:.1f}°C)")
        elif temp > THRESHOLDS["temperature"]["warning"]:
            score += 12; contributors.append(f"Elevated temperature ({temp:.1f}°C)")
        if strain > THRESHOLDS["strain"]["critical"]:
            score += 25; contributors.append(f"Critical strain ({strain:.0f} μstrain)")
        elif strain > THRESHOLDS["strain"]["high"]:
            score += 18; contributors.append(f"High strain ({strain:.0f} μstrain)")
        elif strain > THRESHOLDS["strain"]["warning"]:
            score += 8; contributors.append(f"Elevated strain ({strain:.0f} μstrain)")
        return min(100.0, score), contributors

    def analyze(self, reading: Dict) -> Dict:
        if not self.is_trained:
            self.train()
        X = self._extract_features(reading)
        X_scaled = self.scaler.transform(X)
        pred = self.model.predict(X_scaled)[0]
        anomaly_score_raw = self.model.score_samples(X_scaled)[0]
        anomaly_score = max(0.0, min(1.0, (-anomaly_score_raw + 0.5) * 2))
        is_anomaly = bool(pred == -1)
        risk_score, contributors = self._compute_risk_score(reading)
        if is_anomaly:
            risk_score = min(100.0, risk_score + anomaly_score * 15)
        risk_level = "low"
        if risk_score >= 80: risk_level = "critical"
        elif risk_score >= 60: risk_level = "high"
        elif risk_score >= 30: risk_level = "moderate"
        health_score = round(100.0 - risk_score, 1)
        region = reading.get("region", "Zone-A (Drive End)")
        explanation = self._generate_explanation(reading, is_anomaly, contributors, region)
        recommendation = self._get_recommendation(risk_level, contributors)
        return {
            "is_anomaly": bool(is_anomaly), "anomaly_score": float(round(anomaly_score, 4)),
            "risk_score": float(round(risk_score, 1)), "risk_level": risk_level,
            "health_score": float(health_score), "risk_percentage": float(round(risk_score, 1)),
            "concerning_region": region, "contributing_factors": contributors,
            "explanation": explanation, "recommendation": recommendation,
            "sensor_readings": {"vibration_rms": reading["vibration"]["rms"], "temperature": reading["temperature"]["current"], "strain": reading["strain"]["value"]},
            "baselines": {"vibration_rms": BASELINES["vibration"]["mean"], "temperature": BASELINES["temperature"]["mean"], "strain": BASELINES["strain"]["mean"]},
        }

    def _generate_explanation(self, reading: Dict, is_anomaly: bool, contributors: List[str], region: str) -> str:
        vib = reading["vibration"]["rms"]; temp = reading["temperature"]["current"]; strain = reading["strain"]["value"]
        base_v = BASELINES["vibration"]["mean"]; base_t = BASELINES["temperature"]["mean"]; base_s = BASELINES["strain"]["mean"]
        parts = []
        if abs(vib - base_v) / base_v > 0.5:
            pct = abs(vib - base_v) / base_v * 100
            parts.append(f"Vibration RMS is {pct:.0f}% {'above' if vib > base_v else 'below'} baseline ({vib:.1f} vs {base_v} mm/s)")
        if abs(temp - base_t) / base_t > 0.15:
            diff = temp - base_t
            parts.append(f"Temperature is {abs(diff):.1f}°C {'higher' if diff > 0 else 'lower'} than baseline ({temp:.1f} vs {base_t}°C)")
        if abs(strain - base_s) / base_s > 0.2:
            pct = abs(strain - base_s) / base_s * 100
            direction = "above" if strain > base_s else "below"
            parts.append(f"Strain is {pct:.0f}% {direction} baseline ({strain:.0f} vs {base_s} μstrain)")
        if not parts:
            if is_anomaly:
                return (
                    f"At {region}: the Isolation Forest model flagged the combined sensor pattern as statistically "
                    "unusual, although the primary readings remain near their individual baselines. Review the "
                    "multisensor trend before taking action. This is a prototype model output."
                )
            return f"All sensor readings are within normal operating parameters at {region}. No anomalous patterns detected."
        anomaly_note = " The Isolation Forest model flagged this reading pattern as statistically anomalous." if is_anomaly else ""
        return (f"At {region}: " + "; ".join(parts) + "." + anomaly_note + " This is a prototype risk estimate based on sensor deviation analysis.")

    def _get_recommendation(self, risk_level: str, contributors: List[str]) -> str:
        recs = {
            "low": "Continue routine monitoring. No immediate action required.",
            "moderate": "Increase monitoring frequency. Schedule a visual inspection within the next maintenance window.",
            "high": "Prioritise qualified engineering inspection. Review operating conditions and consider reducing load.",
            "critical": "Escalate for immediate qualified engineering assessment. Follow facility safety procedures. Do not operate until cleared."
        }
        return recs.get(risk_level, "Monitor and assess.")

detector = MaterialAnomalyDetector()

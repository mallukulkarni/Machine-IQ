from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional
from app.ml.anomaly_detector import detector
from app.ml.sensor_engine import sensor_engine

router = APIRouter(prefix="/ai", tags=["ai"])

ScenarioName = Literal[
    "normal",
    "excessive_vibration",
    "temperature_rise",
    "mechanical_overload",
    "combined_abnormal",
]


class VibrationReading(BaseModel):
    model_config = ConfigDict(extra="ignore", allow_inf_nan=False)

    rms: float = Field(ge=0, le=500)
    peak: float = Field(ge=0, le=1000)
    acceleration: float = Field(ge=0, le=500)


class TemperatureReading(BaseModel):
    model_config = ConfigDict(extra="ignore", allow_inf_nan=False)

    current: float = Field(ge=-50, le=1000)
    variation: float = Field(default=0, ge=0, le=1000)


class StrainReading(BaseModel):
    model_config = ConfigDict(extra="ignore", allow_inf_nan=False)

    value: float = Field(ge=0, le=100000)
    variation: float = Field(default=0, ge=0, le=100000)


class CustomSensorReading(BaseModel):
    model_config = ConfigDict(extra="ignore")

    material_id: str = Field(min_length=1, max_length=100)
    scenario: str = Field(default="what_if", max_length=40)
    region: Optional[str] = Field(default=None, max_length=100)
    vibration: VibrationReading
    temperature: TemperatureReading
    strain: StrainReading


@router.get("/analyze")
async def analyze_reading(
    material_id: str = "MAT-001",
    scenario: ScenarioName = "normal",
    region: Optional[str] = None,
):
    reading = sensor_engine.generate_reading(material_id, scenario=scenario, region=region)
    analysis = detector.analyze(reading)
    return {"reading": reading, "analysis": analysis}

@router.post("/analyze")
async def analyze_custom_reading(payload: CustomSensorReading):
    """Analyze a custom sensor reading dict."""
    analysis = detector.analyze(payload.model_dump())
    return {"analysis": analysis}

@router.get("/model/status")
async def model_status():
    return {
        "is_trained": detector.is_trained,
        "model_type": "IsolationForest",
        "features": ["vibration_rms", "vibration_peak", "vibration_accel", "temperature", "temp_variation", "strain", "strain_variation"],
        "note": "Prototype model trained on simulated data."
    }

@router.post("/model/train")
async def retrain_model(contamination: float = Query(default=0.1, ge=0.01, le=0.5)):
    result = detector.train(contamination=contamination)
    return result

@router.get("/risk/batch")
async def batch_risk(scenario: ScenarioName = "normal", n: int = Query(default=5, ge=1, le=20)):
    """Return risk analyses for n simulated readings."""
    results = []
    for i in range(n):
        reading = sensor_engine.generate_reading(f"MAT-{i+1:03d}", scenario=scenario)
        analysis = detector.analyze(reading)
        results.append({"reading": reading, "analysis": analysis})
    return {"results": results, "count": n}

import asyncio
import json

from fastapi import APIRouter, Query
from fastapi import WebSocket, WebSocketDisconnect
from jose import JWTError
from typing import Literal, Optional
from app.core.auth import decode_supabase_token
from app.core.config import settings
from app.ml.anomaly_detector import detector
from app.ml.sensor_engine import sensor_engine

router = APIRouter(prefix="/sensors", tags=["sensors"])
websocket_router = APIRouter(prefix="/sensors", tags=["sensors"])

ScenarioName = Literal[
    "normal",
    "excessive_vibration",
    "temperature_rise",
    "mechanical_overload",
    "combined_abnormal",
]

@router.get("/reading")
async def get_live_reading(
    material_id: str = "MAT-001",
    scenario: ScenarioName = "normal",
    region: Optional[str] = None,
):
    reading = sensor_engine.generate_reading(material_id, scenario=scenario, region=region)
    return reading

@router.get("/timeseries")
async def get_time_series(
    material_id: str = "MAT-001",
    scenario: ScenarioName = "normal",
    points: int = Query(default=60, ge=1, le=500),
):
    series = sensor_engine.generate_time_series(material_id, scenario=scenario, points=points)
    return {"material_id": material_id, "scenario": scenario, "points": len(series), "data": series}

@router.get("/scenarios")
async def list_scenarios():
    return {
        "scenarios": list(sensor_engine.SCENARIOS.keys()),
        "descriptions": {
            "normal": "All readings within normal operating parameters",
            "excessive_vibration": "Vibration RMS significantly above threshold",
            "temperature_rise": "Elevated operating temperature detected",
            "mechanical_overload": "High strain — mechanical overload condition",
            "combined_abnormal": "Multiple simultaneous anomalies — highest risk"
        }
    }

@router.get("/regions")
async def list_regions():
    return {"regions": sensor_engine.REGIONS}

@router.get("/baselines")
async def get_baselines():
    return {"baselines": sensor_engine.BASELINES}


@websocket_router.websocket("/ws/{material_id}")
async def stream_sensor_readings(websocket: WebSocket, material_id: str):
    await websocket.accept()
    scenario = "normal"
    if settings.AUTH_REQUIRED:
        try:
            auth_message = await asyncio.wait_for(websocket.receive_text(), timeout=10)
            auth_payload = json.loads(auth_message)
        except asyncio.TimeoutError:
            await websocket.close(code=4401, reason="Bearer authentication is required")
            return
        except json.JSONDecodeError:
            await websocket.close(code=1008, reason="Expected a JSON authentication message")
            return
        if not isinstance(auth_payload, dict):
            await websocket.close(code=1008, reason="Expected a JSON authentication message")
            return
        token = auth_payload.get("token")
        if not isinstance(token, str):
            await websocket.close(code=4401, reason="Bearer authentication is required")
            return
        try:
            decode_supabase_token(token)
        except JWTError:
            await websocket.close(code=4401, reason="Invalid or expired access token")
            return
        requested_scenario = auth_payload.get("scenario", scenario)
        if not isinstance(requested_scenario, str) or requested_scenario not in sensor_engine.SCENARIOS:
            await websocket.close(code=1008, reason="Unsupported sensor scenario")
            return
        scenario = requested_scenario
    try:
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=2)
                try:
                    payload = json.loads(message)
                except json.JSONDecodeError:
                    await websocket.close(code=1008, reason="Expected a JSON scenario message")
                    return
                if not isinstance(payload, dict):
                    await websocket.close(code=1008, reason="Expected a JSON scenario message")
                    return
                requested_scenario = payload.get("scenario", scenario)
                if not isinstance(requested_scenario, str) or requested_scenario not in sensor_engine.SCENARIOS:
                    await websocket.close(code=1008, reason="Unsupported sensor scenario")
                    return
                scenario = requested_scenario
            except asyncio.TimeoutError:
                pass

            reading = sensor_engine.generate_reading(material_id, scenario=scenario)
            analysis = detector.analyze(reading)
            await websocket.send_json({"reading": reading, "analysis": analysis})
    except WebSocketDisconnect:
        pass

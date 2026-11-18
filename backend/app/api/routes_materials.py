import json
import uuid
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.material import Material, MaterialCondition, RiskLevel
from app.ml.anomaly_detector import detector
from app.ml.sensor_engine import sensor_engine
from app.services.serialization import material_dict

router = APIRouter(prefix="/materials", tags=["materials"])

ConditionName = Literal["healthy", "warning", "high_risk", "critical"]
RiskName = Literal["low", "moderate", "high", "critical"]
ScenarioName = Literal[
    "normal",
    "excessive_vibration",
    "temperature_rise",
    "mechanical_overload",
    "combined_abnormal",
]


def validate_sensor_config(value: Optional[str]) -> Optional[str]:
    if value is None:
        return value
    try:
        config = json.loads(value)
    except json.JSONDecodeError as error:
        raise ValueError("sensor_config must be valid JSON") from error
    if not isinstance(config, dict):
        raise ValueError("sensor_config must be a JSON object")
    scenario = config.get("scenario")
    if scenario is not None and scenario not in sensor_engine.SCENARIOS:
        raise ValueError("sensor_config contains an unsupported scenario")
    return value


class MaterialCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Optional[str] = Field(default=None, min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=100)
    location: str = Field(min_length=1, max_length=200)
    installation_date: Optional[str] = Field(default=None, max_length=40)
    notes: Optional[str] = None
    sensor_config: Optional[str] = None

    @field_validator("sensor_config")
    @classmethod
    def check_sensor_config(cls, value: Optional[str]) -> Optional[str]:
        return validate_sensor_config(value)


class MaterialUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    location: Optional[str] = Field(default=None, min_length=1, max_length=200)
    installation_date: Optional[str] = Field(default=None, max_length=40)
    notes: Optional[str] = None
    sensor_config: Optional[str] = None
    condition: Optional[ConditionName] = None
    risk_level: Optional[RiskName] = None
    risk_score: Optional[float] = Field(default=None, ge=0, le=100)

    @field_validator("sensor_config")
    @classmethod
    def check_sensor_config(cls, value: Optional[str]) -> Optional[str]:
        return validate_sensor_config(value)


@router.get("/")
async def list_materials(
    category: Optional[str] = None,
    risk_level: Optional[RiskName] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Material)
    if category:
        query = query.where(Material.category == category)
    if risk_level:
        query = query.where(Material.risk_level == RiskLevel(risk_level))
    materials = (await db.scalars(query.order_by(Material.id))).all()
    return {"materials": [material_dict(item) for item in materials], "total": len(materials)}


@router.get("/{material_id}")
async def get_material(material_id: str, db: AsyncSession = Depends(get_db)):
    material = await db.get(Material, material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return material_dict(material)


@router.post("/")
async def create_material(payload: MaterialCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    material = Material(
        **{key: value for key, value in data.items() if key != "id"},
        id=data["id"] or f"MAT-{str(uuid.uuid4())[:8].upper()}",
        condition=MaterialCondition.HEALTHY,
        risk_level=RiskLevel.LOW,
        risk_score=0.0,
    )
    db.add(material)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Material ID already exists")
    await db.refresh(material)
    return material_dict(material)


@router.put("/{material_id}")
async def update_material(
    material_id: str,
    updates: MaterialUpdate,
    db: AsyncSession = Depends(get_db),
):
    material = await db.get(Material, material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    for key, value in updates.model_dump(exclude_unset=True).items():
        if key == "condition" and value is not None:
            value = MaterialCondition(value)
        elif key == "risk_level" and value is not None:
            value = RiskLevel(value)
        setattr(material, key, value)
    await db.commit()
    await db.refresh(material)
    return material_dict(material)


@router.delete("/{material_id}")
async def delete_material(material_id: str, db: AsyncSession = Depends(get_db)):
    material = await db.get(Material, material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    await db.delete(material)
    await db.commit()
    return {"deleted": material_id}


@router.get("/{material_id}/analyze")
async def analyze_material(
    material_id: str,
    scenario: Optional[ScenarioName] = None,
    db: AsyncSession = Depends(get_db),
):
    material = await db.get(Material, material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    try:
        config = json.loads(material.sensor_config or "{}")
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=422, detail="Material sensor_config must be valid JSON") from error
    selected_scenario = scenario or config.get("scenario", "normal")
    if selected_scenario not in sensor_engine.SCENARIOS:
        raise HTTPException(status_code=422, detail="Unsupported sensor scenario")
    reading = sensor_engine.generate_reading(material_id, scenario=selected_scenario)
    analysis = detector.analyze(reading)
    material.risk_score = analysis["risk_score"]
    material.risk_level = RiskLevel(analysis["risk_level"])
    material.condition = MaterialCondition({
        "low": "healthy",
        "moderate": "warning",
        "high": "high_risk",
        "critical": "critical",
    }[analysis["risk_level"]])
    await db.commit()
    await db.refresh(material)
    return {"material": material_dict(material), "reading": reading, "analysis": analysis}

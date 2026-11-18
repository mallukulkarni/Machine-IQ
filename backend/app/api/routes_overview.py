import json
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.alert import Alert
from app.models.material import Material, MaterialCondition, RiskLevel
from app.models.maintenance_task import MaintenanceTask, TaskStatus
from app.ml.anomaly_detector import detector
from app.ml.sensor_engine import sensor_engine
from app.services.serialization import alert_dict, material_dict

router = APIRouter(prefix="/overview", tags=["overview"])

ScenarioName = Literal[
    "normal",
    "excessive_vibration",
    "temperature_rise",
    "mechanical_overload",
    "combined_abnormal",
]


@router.get("/stats")
async def get_dashboard_stats(
    material_id: Optional[str] = None,
    scenario: Optional[ScenarioName] = None,
    db: AsyncSession = Depends(get_db),
):
    """Return one fleet snapshot calculated from persisted materials and simulated readings."""
    material_rows = (await db.scalars(select(Material).order_by(Material.id))).all()
    alerts_rows = (await db.scalars(select(Alert).where(Alert.is_acknowledged.is_(False)))).all()
    materials = []
    anomalies = []

    for row in material_rows:
        try:
            config = json.loads(row.sensor_config or "{}")
        except json.JSONDecodeError:
            config = {}
        material_scenario = scenario if row.id == material_id and scenario else config.get("scenario", "normal")
        if material_scenario not in sensor_engine.SCENARIOS:
            material_scenario = "normal"
        reading = sensor_engine.generate_reading(row.id, scenario=material_scenario)
        analysis = detector.analyze(reading)
        row.risk_score = analysis["risk_score"]
        row.risk_level = RiskLevel(analysis["risk_level"])
        row.condition = MaterialCondition({
            "low": "healthy",
            "moderate": "warning",
            "high": "high_risk",
            "critical": "critical",
        }[analysis["risk_level"]])
        material = material_dict(row)
        material.update({
            "sensor_reading": reading,
            "ai_analysis": analysis,
        })
        materials.append(material)

        if analysis["is_anomaly"]:
            anomalies.append({
                "id": f"AI-{row.id}",
                "material_id": row.id,
                "material_name": row.name,
                "severity": {
                    "low": "info",
                    "moderate": "warning",
                    "high": "high",
                    "critical": "critical",
                }[analysis["risk_level"]],
                "title": f"Isolation Forest anomaly · {row.name}",
                "message": analysis["explanation"],
                "sensor_type": "multi-sensor",
                "is_acknowledged": False,
                "created_at": reading["timestamp"],
            })
    await db.commit()

    counts = {
        "healthy": sum(material["condition"] == "healthy" for material in materials),
        "warning": sum(material["condition"] == "warning" for material in materials),
        "high_risk": sum(material["condition"] == "high_risk" for material in materials),
        "critical": sum(material["condition"] == "critical" for material in materials),
    }
    active_alerts = [alert_dict(alert) for alert in alerts_rows]
    names = {material["id"]: material["name"] for material in materials}
    alerts = [
        {**alert, "material_name": names.get(alert["material_id"], alert["material_id"])}
        for alert in active_alerts
    ]
    material_count = len(materials)
    safe_index = round(
        sum(100 - material["risk_score"] for material in materials) / material_count,
        1,
    ) if material_count else 100.0
    operational_health = round(
        100 * (
            counts["healthy"]
            + counts["warning"] * 0.75
            + counts["high_risk"] * 0.45
            + counts["critical"] * 0.1
        ) / material_count,
        1,
    ) if material_count else 100.0

    return {
        "total_materials": material_count,
        **counts,
        "safe_index": safe_index,
        "factory_health": operational_health,
        "active_sensors": material_count * 3,
        "active_alerts": len(active_alerts),
        "active_ai_alerts": len(anomalies),
        "alerts": alerts,
        "anomalies": anomalies,
        "materials": materials,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "safe_index_method": "100 minus mean prototype AI risk score across the current simulated material readings.",
        "data_source": "Simulated virtual sensor readings analyzed by Isolation Forest and prototype risk thresholds.",
    }


@router.get("/")
async def get_overview(db: AsyncSession = Depends(get_db)):
    snapshot = await get_dashboard_stats(db=db)
    tasks = (await db.scalars(select(MaintenanceTask))).all()
    return {
        "fleet_health_score": snapshot["safe_index"],
        "total_materials": snapshot["total_materials"],
        "risk_distribution": {
            "critical": snapshot["critical"],
            "high": snapshot["high_risk"],
            "moderate": snapshot["warning"],
            "low": snapshot["healthy"],
        },
        "alerts": {
            "total_unacknowledged": snapshot["active_alerts"],
            "critical": sum(alert["severity"] == "critical" for alert in snapshot["alerts"]),
        },
        "maintenance": {
            "pending": sum(task.status == TaskStatus.PENDING for task in tasks),
            "in_progress": sum(task.status == TaskStatus.IN_PROGRESS for task in tasks),
        },
        "disclaimer": "Prototype dashboard — all sensor data is simulated.",
    }


@router.get("/kpis")
async def get_kpis(db: AsyncSession = Depends(get_db)):
    snapshot = await get_dashboard_stats(db=db)
    tasks = (await db.scalars(select(MaintenanceTask))).all()
    return {
        "total_materials_monitored": snapshot["total_materials"],
        "maintenance_tasks_total": len(tasks),
        "tasks_completed": sum(task.status == TaskStatus.COMPLETED for task in tasks),
        "tasks_overdue": sum(task.status == TaskStatus.OVERDUE for task in tasks),
        "total_estimated_maintenance_cost": sum(task.estimated_cost or 0 for task in tasks),
        "currency": "USD",
    }

import csv
from datetime import datetime, timezone
from io import StringIO
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.material import Material
from app.models.maintenance_task import MaintenanceTask
from app.api.routes_overview import get_dashboard_stats
from app.ml.anomaly_detector import detector
from app.ml.sensor_engine import sensor_engine

router = APIRouter(prefix="/reports", tags=["reports"])
ScenarioName = Literal[
    "normal",
    "excessive_vibration",
    "temperature_rise",
    "mechanical_overload",
    "combined_abnormal",
]


@router.get("/export/csv")
async def export_materials_csv(db: AsyncSession = Depends(get_db)):
    snapshot = await get_dashboard_stats(db=db)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["material_id", "name", "category", "location", "condition", "risk_level", "risk_score", "data_source"])
    for material in snapshot["materials"]:
        writer.writerow([
            material["id"],
            material["name"],
            material["category"],
            material["location"],
            material["condition"],
            material["risk_level"],
            material["risk_score"],
            "simulated virtual sensor + Isolation Forest prototype",
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=materialiq-report.csv"},
    )


@router.get("/summary")
async def get_summary_report(db: AsyncSession = Depends(get_db)):
    snapshot = await get_dashboard_stats(db=db)
    tasks = (await db.scalars(select(MaintenanceTask))).all()
    by_condition = {
        "healthy": snapshot["healthy"],
        "warning": snapshot["warning"],
        "high_risk": snapshot["high_risk"],
        "critical": snapshot["critical"],
    }
    by_risk = {
        "low": snapshot["healthy"],
        "moderate": snapshot["warning"],
        "high": snapshot["high_risk"],
        "critical": snapshot["critical"],
    }
    pending_tasks = [task for task in tasks if task.status.value in ("pending", "in_progress")]
    return {
        "report_type": "summary",
        "generated_at": snapshot["generated_at"],
        "materials": {
            "total": snapshot["total_materials"],
            "by_condition": by_condition,
            "by_risk_level": by_risk,
        },
        "alerts": {
            "total": snapshot["active_alerts"],
            "unacknowledged": snapshot["active_alerts"],
        },
        "maintenance": {"total": len(tasks), "pending_or_active": len(pending_tasks)},
        "disclaimer": "Prototype report — data is simulated for hackathon demonstration.",
    }


@router.get("/materials/{material_id}")
async def get_material_report(
    material_id: str,
    scenario: ScenarioName = "normal",
    db: AsyncSession = Depends(get_db),
):
    if await db.get(Material, material_id) is None:
        raise HTTPException(status_code=404, detail="Material not found")
    reading = sensor_engine.generate_reading(material_id, scenario=scenario)
    analysis = detector.analyze(reading)
    series = sensor_engine.generate_time_series(material_id, scenario=scenario, points=30)
    return {
        "report_type": "material_detail",
        "material_id": material_id,
        "scenario": scenario,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "latest_reading": reading,
        "analysis": analysis,
        "time_series_30min": series,
        "disclaimer": "All readings are simulated. Not for real industrial use.",
    }


@router.get("/health-overview")
async def health_overview(db: AsyncSession = Depends(get_db)):
    snapshot = await get_dashboard_stats(db=db)
    materials = [
        {
            "material_id": material["id"],
            "name": material["name"],
            "location": material["location"],
            "risk_score": material["risk_score"],
            "risk_level": material["risk_level"],
            "health_score": material["ai_analysis"]["health_score"],
        }
        for material in snapshot["materials"]
    ]
    return {
        "report_type": "health_overview",
        "generated_at": snapshot["generated_at"],
        "fleet_health_score": snapshot["safe_index"],
        "materials": materials,
    }

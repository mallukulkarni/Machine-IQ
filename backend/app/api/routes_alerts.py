from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.alert import Alert, AlertSeverity
from app.services.serialization import alert_dict

router = APIRouter(prefix="/alerts", tags=["alerts"])
SEVERITY_ORDER = {"critical": 0, "high": 1, "warning": 2, "info": 3}


@router.get("/")
async def list_alerts(
    severity: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    material_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Alert)
    if severity:
        if severity not in SEVERITY_ORDER:
            raise HTTPException(status_code=422, detail="Unsupported alert severity")
        query = query.where(Alert.severity == AlertSeverity(severity))
    if acknowledged is not None:
        query = query.where(Alert.is_acknowledged == acknowledged)
    if material_id:
        query = query.where(Alert.material_id == material_id)
    alerts = (await db.scalars(query)).all()
    result = sorted((alert_dict(alert) for alert in alerts), key=lambda alert: SEVERITY_ORDER[alert["severity"]])
    return {"alerts": result, "total": len(result)}


@router.get("/unacknowledged")
async def unacknowledged_alerts(db: AsyncSession = Depends(get_db)):
    alerts = (await db.scalars(select(Alert).where(Alert.is_acknowledged.is_(False)))).all()
    result = sorted((alert_dict(alert) for alert in alerts), key=lambda alert: SEVERITY_ORDER[alert["severity"]])
    return {"alerts": result, "total": len(result)}


@router.get("/{alert_id}")
async def get_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert_dict(alert)


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_acknowledged = True
    alert.acknowledged_at = datetime.utcnow()
    await db.commit()
    await db.refresh(alert)
    return alert_dict(alert)


@router.post("/acknowledge-all")
async def acknowledge_all(db: AsyncSession = Depends(get_db)):
    alerts = (await db.scalars(select(Alert).where(Alert.is_acknowledged.is_(False)))).all()
    now = datetime.utcnow()
    for alert in alerts:
        alert.is_acknowledged = True
        alert.acknowledged_at = now
    await db.commit()
    return {"acknowledged": len(alerts)}


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()
    return {"deleted": alert_id}

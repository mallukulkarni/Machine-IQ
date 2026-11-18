from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        from app.models import material, sensor_reading, alert, maintenance_task
        await conn.run_sync(Base.metadata.create_all)

    from sqlalchemy import func, select
    from app.models.material import Material, MaterialCondition, RiskLevel
    from app.models.alert import Alert, AlertSeverity
    from app.models.maintenance_task import MaintenanceTask, TaskPriority, TaskStatus
    from app.services.demo_data import DEMO_ALERTS, DEMO_MATERIALS, DEMO_MAINTENANCE_TASKS
    from datetime import datetime

    async with AsyncSessionLocal() as session:
        material_count = await session.scalar(select(func.count()).select_from(Material))
        if material_count == 0:
            for item in DEMO_MATERIALS:
                session.add(Material(
                    id=item["id"],
                    name=item["name"],
                    category=item["category"],
                    location=item["location"],
                    installation_date=item.get("installation_date"),
                    condition=MaterialCondition(item["condition"]),
                    risk_level=RiskLevel(item["risk_level"]),
                    risk_score=item["risk_score"],
                    notes=item.get("notes"),
                    sensor_config=item.get("sensor_config"),
                ))

        alert_count = await session.scalar(select(func.count()).select_from(Alert))
        if alert_count == 0:
            for item in DEMO_ALERTS:
                session.add(Alert(
                    id=item["id"],
                    material_id=item["material_id"],
                    material_name=item.get("material_name"),
                    severity=AlertSeverity(item["severity"]),
                    title=item["title"],
                    message=item.get("message"),
                    sensor_type=item.get("sensor_type"),
                    is_acknowledged=item.get("is_acknowledged", False),
                ))

        task_count = await session.scalar(select(func.count()).select_from(MaintenanceTask))
        if task_count == 0:
            for item in DEMO_MAINTENANCE_TASKS:
                session.add(MaintenanceTask(
                    id=item["id"],
                    material_id=item["material_id"],
                    title=item["title"],
                    description=item.get("description"),
                    priority=TaskPriority(item["priority"]),
                    status=TaskStatus(item["status"]),
                    assigned_to=item.get("assigned_to"),
                    due_date=datetime.fromisoformat(item["due_date"]) if item.get("due_date") else None,
                    estimated_cost=item.get("estimated_cost"),
                    notes=item.get("notes"),
                ))
        await session.commit()

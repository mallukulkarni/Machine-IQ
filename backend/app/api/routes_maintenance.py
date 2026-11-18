import uuid
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.material import Material
from app.models.maintenance_task import MaintenanceTask, TaskPriority, TaskStatus
from app.services.serialization import task_dict

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

PriorityName = Literal["low", "medium", "high", "critical"]
StatusName = Literal["pending", "in_progress", "completed", "overdue"]


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: Optional[str] = Field(default=None, min_length=1, max_length=100)
    material_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    priority: PriorityName = "medium"
    status: StatusName = "pending"
    assigned_to: Optional[str] = Field(default=None, max_length=200)
    due_date: Optional[datetime] = None
    estimated_cost: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None


class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Optional[PriorityName] = None
    status: Optional[StatusName] = None
    assigned_to: Optional[str] = Field(default=None, max_length=200)
    due_date: Optional[datetime] = None
    estimated_cost: Optional[float] = Field(default=None, ge=0)
    actual_cost: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None


@router.get("/")
async def list_tasks(
    status: Optional[StatusName] = None,
    priority: Optional[PriorityName] = None,
    material_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(MaintenanceTask)
    if status:
        query = query.where(MaintenanceTask.status == TaskStatus(status))
    if priority:
        query = query.where(MaintenanceTask.priority == TaskPriority(priority))
    if material_id:
        query = query.where(MaintenanceTask.material_id == material_id)
    tasks = (await db.scalars(query.order_by(MaintenanceTask.due_date))).all()
    return {"tasks": [task_dict(task) for task in tasks], "total": len(tasks)}


@router.get("/stats")
async def task_stats(db: AsyncSession = Depends(get_db)):
    tasks = (await db.scalars(select(MaintenanceTask))).all()
    stats = {"total": len(tasks), "by_status": {}, "by_priority": {}}
    for task in tasks:
        status = task.status.value
        priority = task.priority.value
        stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
        stats["by_priority"][priority] = stats["by_priority"].get(priority, 0) + 1
    return stats


@router.get("/{task_id}")
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_dict(task)


@router.post("/")
async def create_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)):
    if await db.get(Material, payload.material_id) is None:
        raise HTTPException(status_code=404, detail="Material not found")
    data = payload.model_dump()
    task = MaintenanceTask(
        **{key: value for key, value in data.items() if key not in {"id", "priority", "status"}},
        id=data["id"] or f"MNT-{str(uuid.uuid4())[:8].upper()}",
        priority=TaskPriority(data["priority"]),
        status=TaskStatus(data["status"]),
    )
    if task.status == TaskStatus.COMPLETED:
        task.completed_at = datetime.utcnow()
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task_dict(task)


@router.put("/{task_id}")
async def update_task(
    task_id: str,
    updates: TaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    task = await db.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in updates.model_dump(exclude_unset=True).items():
        if key == "priority" and value is not None:
            value = TaskPriority(value)
        elif key == "status" and value is not None:
            value = TaskStatus(value)
            if value == TaskStatus.COMPLETED and task.completed_at is None:
                task.completed_at = datetime.utcnow()
        setattr(task, key, value)
    await db.commit()
    await db.refresh(task)
    return task_dict(task)


@router.delete("/{task_id}")
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return {"deleted": task_id}

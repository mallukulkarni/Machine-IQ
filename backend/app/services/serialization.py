from datetime import datetime
from typing import Any, Dict


def _value(value: Any) -> Any:
    if hasattr(value, "value"):
        return value.value
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def material_dict(material: Any) -> Dict[str, Any]:
    return {
        "id": material.id,
        "name": material.name,
        "category": material.category,
        "location": material.location,
        "installation_date": material.installation_date,
        "condition": _value(material.condition),
        "risk_level": _value(material.risk_level),
        "risk_score": material.risk_score,
        "last_inspection": _value(material.last_inspection),
        "notes": material.notes,
        "sensor_config": material.sensor_config,
        "created_at": _value(material.created_at),
        "updated_at": _value(material.updated_at),
    }


def alert_dict(alert: Any) -> Dict[str, Any]:
    return {
        "id": alert.id,
        "material_id": alert.material_id,
        "material_name": alert.material_name,
        "severity": _value(alert.severity),
        "title": alert.title,
        "message": alert.message,
        "sensor_type": alert.sensor_type,
        "is_acknowledged": alert.is_acknowledged,
        "created_at": _value(alert.created_at),
        "acknowledged_at": _value(alert.acknowledged_at),
    }


def task_dict(task: Any) -> Dict[str, Any]:
    return {
        "id": task.id,
        "material_id": task.material_id,
        "title": task.title,
        "description": task.description,
        "priority": _value(task.priority),
        "status": _value(task.status),
        "assigned_to": task.assigned_to,
        "due_date": _value(task.due_date),
        "estimated_cost": task.estimated_cost,
        "actual_cost": task.actual_cost,
        "notes": task.notes,
        "created_at": _value(task.created_at),
        "completed_at": _value(task.completed_at),
    }

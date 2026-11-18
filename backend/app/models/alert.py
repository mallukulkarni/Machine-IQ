from sqlalchemy import Column, String, Float, DateTime, Boolean, Text, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    HIGH = "high"
    CRITICAL = "critical"

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True)
    material_id = Column(String, nullable=False)
    material_name = Column(String)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.INFO)
    title = Column(String, nullable=False)
    message = Column(Text)
    sensor_type = Column(String)
    is_acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    acknowledged_at = Column(DateTime)

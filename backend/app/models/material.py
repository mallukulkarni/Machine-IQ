from sqlalchemy import Column, String, Float, DateTime, Enum, Text, Integer, Boolean
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class MaterialCondition(str, enum.Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    HIGH_RISK = "high_risk"
    CRITICAL = "critical"

class RiskLevel(str, enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class Material(Base):
    __tablename__ = "materials"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    location = Column(String, nullable=False)
    installation_date = Column(String)
    condition = Column(Enum(MaterialCondition), default=MaterialCondition.HEALTHY)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    risk_score = Column(Float, default=0.0)
    last_inspection = Column(DateTime)
    notes = Column(Text)
    sensor_config = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

from sqlalchemy import Column, String, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.core.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(String, primary_key=True)
    material_id = Column(String, nullable=False)
    sensor_type = Column(String, nullable=False)
    region = Column(String)
    value = Column(Float)
    unit = Column(String)
    timestamp = Column(DateTime, server_default=func.now())
    is_anomalous = Column(Boolean, default=False)
    scenario = Column(String, default="normal")
    metadata_json = Column("metadata", Text)

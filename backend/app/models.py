"""
Database models - all patient data is anonymized at ingestion.
No PII is stored. patient_id is a one-way hash of the original ID.
PostGIS removed for compatibility - using simple lat/lng columns.
"""
import uuid
import hashlib
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Float, DateTime, Date,
    Integer, Boolean, Text, Index, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database import Base


class InfectionRecord(Base):
    __tablename__ = "infection_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_hash = Column(String(64), nullable=False, index=True)
    disease = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), default="unknown")
    status = Column(String(20), default="active")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    region = Column(String(200), index=True)
    infection_date = Column(Date, nullable=False, index=True)
    reported_at = Column(DateTime, default=datetime.utcnow, index=True)
    source = Column(String(50), default="api")
    metadata_json = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        Index("ix_infection_date_disease", "infection_date", "disease"),
        Index("ix_infection_region_date", "region", "infection_date"),
    )

    @staticmethod
    def hash_patient_id(patient_id: str) -> str:
        salt = "pulse-platform-salt-2024"
        return hashlib.sha256(f"{salt}{patient_id}".encode()).hexdigest()


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key_hash = Column(String(64), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)
    permissions = Column(JSONB, default={"read": True, "write": True})


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    action = Column(String(50))
    resource = Column(String(100))
    ip_address = Column(String(45))
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=True)
    details = Column(JSONB, default={})

"""
Database models - all patient data is anonymized at ingestion.
No PII is stored. patient_id is a one-way hash of the original ID.
"""
import uuid
import hashlib
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Float, DateTime, Date,
    Integer, Boolean, Text, Index, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry

from app.database import Base


class InfectionRecord(Base):
    """
    Core infection event. Coordinates are stored as PostGIS Point
    and optionally fuzzed at write-time for privacy.
    """
    __tablename__ = "infection_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Anonymized patient reference (SHA-256 of original ID, never reversible)
    patient_hash = Column(String(64), nullable=False, index=True)

    disease = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), default="unknown")   # mild / moderate / severe / critical
    status = Column(String(20), default="active")       # active / recovered / deceased

    # Geographic data
    latitude  = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    region    = Column(String(200), index=True)
    location  = Column(Geometry("POINT", srid=4326), nullable=True)

    # Time
    infection_date = Column(Date, nullable=False, index=True)
    reported_at    = Column(DateTime, default=datetime.utcnow, index=True)

    # Source tracking
    source = Column(String(50), default="api")   # api / csv / webhook / manual
    metadata_json = Column(JSONB, default={})

    # Soft delete
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        Index("ix_infection_date_disease", "infection_date", "disease"),
        Index("ix_infection_region_date",  "region", "infection_date"),
    )

    @staticmethod
    def hash_patient_id(patient_id: str) -> str:
        """One-way anonymization of patient identifier"""
        salt = "res-platform-salt-2024"
        return hashlib.sha256(f"{salt}{patient_id}".encode()).hexdigest()


class ApiKey(Base):
    """API keys for mobile app / external system authentication"""
    __tablename__ = "api_keys"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key_hash    = Column(String(64), unique=True, nullable=False)
    name        = Column(String(100), nullable=False)
    description = Column(Text)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    last_used   = Column(DateTime, nullable=True)
    permissions = Column(JSONB, default={"read": True, "write": True})


class AuditLog(Base):
    """Immutable audit trail for all data access"""
    __tablename__ = "audit_logs"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    timestamp  = Column(DateTime, default=datetime.utcnow, index=True)
    action     = Column(String(50))   # READ / WRITE / DELETE / LOGIN
    resource   = Column(String(100))
    ip_address = Column(String(45))
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=True)
    details    = Column(JSONB, default={})

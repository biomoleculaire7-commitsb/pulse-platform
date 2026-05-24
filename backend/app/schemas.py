from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
import re


# ─── Infection ────────────────────────────────────────────────────────────────

class InfectionCreate(BaseModel):
    patient_id: str = Field(..., description="Will be hashed immediately, never stored raw")
    disease:    str = Field(..., min_length=2, max_length=100)
    lat:        float = Field(..., ge=-90, le=90)
    lng:        float = Field(..., ge=-180, le=180)
    date:       date
    severity:   Optional[str] = Field("unknown", pattern="^(mild|moderate|severe|critical|unknown)$")
    region:     Optional[str] = None
    source:     Optional[str] = "api"
    metadata:   Optional[dict] = {}

    @field_validator("disease")
    @classmethod
    def sanitize_disease(cls, v):
        return re.sub(r"[^\w\s\-\(\)]", "", v).strip()


class InfectionResponse(BaseModel):
    id:             UUID
    disease:        str
    severity:       str
    status:         str
    latitude:       float
    longitude:      float
    region:         Optional[str]
    infection_date: date
    reported_at:    datetime
    source:         str

    model_config = {"from_attributes": True}


class InfectionListResponse(BaseModel):
    total:  int
    page:   int
    size:   int
    items:  List[InfectionResponse]


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DailyCount(BaseModel):
    date:  str
    count: int


class DiseaseBreakdown(BaseModel):
    disease: str
    count:   int
    active:  int


class DashboardStats(BaseModel):
    today_cases:      int
    active_cases:     int
    recovered_cases:  int
    total_cases:      int
    trend_7d:         List[DailyCount]
    by_disease:       List[DiseaseBreakdown]
    last_updated:     datetime


# ─── Auth ─────────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    expires_in:   int


class ApiKeyCreate(BaseModel):
    name:        str
    description: Optional[str] = None
    permissions: Optional[dict] = {"read": True, "write": True}


class ApiKeyResponse(BaseModel):
    id:         UUID
    name:       str
    key:        str   # shown only once at creation
    created_at: datetime


# ─── Import ───────────────────────────────────────────────────────────────────

class ImportResult(BaseModel):
    imported:  int
    skipped:   int
    errors:    List[str]
    duration_ms: int

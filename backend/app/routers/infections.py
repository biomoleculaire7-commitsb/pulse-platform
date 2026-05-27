"""
POST /api/infections  - Submit new infection record
GET  /api/infections  - Query with filters
GET  /api/infections/{id} - Single record
"""
import random
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_write, require_read, audit
from app.config import settings
from app.database import get_db
from app.models import InfectionRecord
from app.schemas import InfectionCreate, InfectionResponse, InfectionListResponse

router = APIRouter()


def _fuzz_coordinate(value: float, radius_m: int = 500) -> float:
    delta = random.uniform(-radius_m, radius_m) / 111_320
    return round(value + delta, 6)


@router.post("", response_model=InfectionResponse, status_code=status.HTTP_201_CREATED)
async def create_infection(
    payload: InfectionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    principal: dict = Depends(require_write),
):
    lat_fuzz = _fuzz_coordinate(payload.lat)
    lng_fuzz = _fuzz_coordinate(payload.lng)

    record = InfectionRecord(
        patient_hash   = InfectionRecord.hash_patient_id(payload.patient_id),
        disease        = payload.disease,
        severity       = payload.severity,
        latitude       = lat_fuzz,
        longitude      = lng_fuzz,
        region         = payload.region,
        infection_date = payload.date,
        source         = payload.source or "api",
        metadata_json  = payload.metadata or {},
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    await audit(
        db, "WRITE", "infections",
        ip=request.client.host if request.client else "unknown",
        details={"disease": payload.disease, "id": str(record.id)},
        key_id=principal.get("id"),
    )
    return record


@router.get("", response_model=InfectionListResponse)
async def list_infections(
    request: Request,
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    region:    Optional[str]  = Query(None),
    disease:   Optional[str]  = Query(None),
    status:    Optional[str]  = Query(None),
    page:      int = Query(1, ge=1),
    size:      int = Query(500, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
    principal: dict = Depends(require_read),
):
    filters = [InfectionRecord.is_active == True]
    if date_from:
        filters.append(InfectionRecord.infection_date >= date_from)
    if date_to:
        filters.append(InfectionRecord.infection_date <= date_to)
    if region:
        filters.append(InfectionRecord.region.ilike(f"%{region}%"))
    if disease:
        filters.append(InfectionRecord.disease.ilike(f"%{disease}%"))
    if status:
        filters.append(InfectionRecord.status == status)

    count_q = await db.execute(
        select(func.count()).select_from(InfectionRecord).where(and_(*filters))
    )
    total = count_q.scalar()

    result = await db.execute(
        select(InfectionRecord)
        .where(and_(*filters))
        .order_by(InfectionRecord.reported_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    records = result.scalars().all()

    await audit(
        db, "READ", "infections",
        ip=request.client.host if request.client else "unknown",
        details={"total": total},
        key_id=principal.get("id"),
    )

    return InfectionListResponse(total=total, page=page, size=size, items=records)


@router.get("/{record_id}", response_model=InfectionResponse)
async def get_infection(
    record_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    principal: dict = Depends(require_read),
):
    result = await db.execute(
        select(InfectionRecord).where(
            InfectionRecord.id == record_id,
            InfectionRecord.is_active == True
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

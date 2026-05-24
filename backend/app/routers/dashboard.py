"""
GET /api/dashboard/stats    - KPIs for the top cards
GET /api/dashboard/timeseries - Daily counts for chart
GET /api/dashboard/heatmap  - lat/lng/weight for Leaflet heatmap
"""
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_read
from app.database import get_db
from app.models import InfectionRecord
from app.schemas import DashboardStats, DailyCount, DiseaseBreakdown

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_read),
):
    today = date.today()
    week_ago = today - timedelta(days=6)

    # Today's new cases
    today_q = await db.execute(
        select(func.count()).select_from(InfectionRecord).where(
            InfectionRecord.infection_date == today,
            InfectionRecord.is_active == True,
        )
    )
    today_cases = today_q.scalar()

    # Active cases
    active_q = await db.execute(
        select(func.count()).select_from(InfectionRecord).where(
            InfectionRecord.status == "active",
            InfectionRecord.is_active == True,
        )
    )
    active_cases = active_q.scalar()

    # Recovered
    recovered_q = await db.execute(
        select(func.count()).select_from(InfectionRecord).where(
            InfectionRecord.status == "recovered",
            InfectionRecord.is_active == True,
        )
    )
    recovered_cases = recovered_q.scalar()

    # Total
    total_q = await db.execute(
        select(func.count()).select_from(InfectionRecord).where(
            InfectionRecord.is_active == True
        )
    )
    total_cases = total_q.scalar()

    # 7-day trend
    trend_q = await db.execute(
        select(
            InfectionRecord.infection_date.label("d"),
            func.count().label("cnt")
        )
        .where(
            InfectionRecord.infection_date >= week_ago,
            InfectionRecord.is_active == True,
        )
        .group_by(InfectionRecord.infection_date)
        .order_by(InfectionRecord.infection_date)
    )
    trend_rows = trend_q.all()
    # Fill gaps
    trend_map = {str(r.d): r.cnt for r in trend_rows}
    trend_7d = [
        DailyCount(date=str(week_ago + timedelta(days=i)), count=trend_map.get(str(week_ago + timedelta(days=i)), 0))
        for i in range(7)
    ]

    # By disease
    disease_q = await db.execute(
        select(
            InfectionRecord.disease,
            func.count().label("total"),
            func.sum(func.cast(InfectionRecord.status == "active", type_=None)).label("active_cnt"),
        )
        .where(InfectionRecord.is_active == True)
        .group_by(InfectionRecord.disease)
        .order_by(func.count().desc())
        .limit(10)
    )
    by_disease = [
        DiseaseBreakdown(disease=r.disease, count=r.total, active=r.active_cnt or 0)
        for r in disease_q.all()
    ]

    return DashboardStats(
        today_cases=today_cases,
        active_cases=active_cases,
        recovered_cases=recovered_cases,
        total_cases=total_cases,
        trend_7d=trend_7d,
        by_disease=by_disease,
        last_updated=datetime.utcnow(),
    )


@router.get("/timeseries")
async def get_timeseries(
    days: int = Query(30, ge=7, le=365),
    disease: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_read),
):
    start_date = date.today() - timedelta(days=days - 1)
    filters = [
        InfectionRecord.infection_date >= start_date,
        InfectionRecord.is_active == True,
    ]
    if disease:
        filters.append(InfectionRecord.disease.ilike(f"%{disease}%"))

    q = await db.execute(
        select(
            InfectionRecord.infection_date.label("d"),
            func.count().label("cnt"),
        )
        .where(and_(*filters))
        .group_by(InfectionRecord.infection_date)
        .order_by(InfectionRecord.infection_date)
    )
    rows = q.all()
    return [{"date": str(r.d), "count": r.cnt} for r in rows]


@router.get("/heatmap")
async def get_heatmap(
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    disease:   Optional[str]  = Query(None),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_read),
):
    """Returns [lat, lng, intensity] tuples for Leaflet.heat"""
    filters = [InfectionRecord.is_active == True]
    if date_from:
        filters.append(InfectionRecord.infection_date >= date_from)
    if date_to:
        filters.append(InfectionRecord.infection_date <= date_to)
    if disease:
        filters.append(InfectionRecord.disease.ilike(f"%{disease}%"))

    q = await db.execute(
        select(InfectionRecord.latitude, InfectionRecord.longitude)
        .where(and_(*filters))
        .limit(10000)
    )
    rows = q.all()
    return [[r.latitude, r.longitude, 1.0] for r in rows]

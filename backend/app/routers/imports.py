"""
POST /api/import/csv      - Upload a CSV file with infection records
POST /api/import/webhook  - Browse AI / external webhook endpoint
"""
import csv
import io
import time
from datetime import date, datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_write, audit
from app.database import get_db
from app.models import InfectionRecord
from app.schemas import ImportResult

router = APIRouter()

REQUIRED_CSV_COLUMNS = {"patient_id", "disease", "lat", "lng", "date"}


def _parse_csv_row(row: dict, row_num: int) -> tuple[InfectionRecord | None, str | None]:
    """Parse and validate a single CSV row. Returns (record, error_msg)."""
    try:
        lat = float(row.get("lat", "").strip())
        lng = float(row.get("lng", "").strip())
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return None, f"Row {row_num}: invalid coordinates"

        infection_date = date.fromisoformat(row.get("date", "").strip())
        patient_id = row.get("patient_id", "").strip()
        disease = row.get("disease", "").strip()

        if not patient_id or not disease:
            return None, f"Row {row_num}: missing patient_id or disease"

        record = InfectionRecord(
            patient_hash   = InfectionRecord.hash_patient_id(patient_id),
            disease        = disease[:100],
            severity       = row.get("severity", "unknown").strip() or "unknown",
            latitude       = lat,
            longitude      = lng,
            region         = row.get("region", "").strip() or None,
            infection_date = infection_date,
            source         = "csv",
        )
        return record, None
    except Exception as e:
        return None, f"Row {row_num}: {str(e)}"


@router.post("/csv", response_model=ImportResult)
async def import_csv(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    principal: dict = Depends(require_write),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files accepted")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    start = time.time()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))

    # Validate columns
    if not REQUIRED_CSV_COLUMNS.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain columns: {REQUIRED_CSV_COLUMNS}. Got: {reader.fieldnames}",
        )

    imported, skipped = 0, 0
    errors: List[str] = []

    for i, row in enumerate(reader, start=2):
        record, err = _parse_csv_row(row, i)
        if err:
            errors.append(err)
            skipped += 1
        else:
            db.add(record)
            imported += 1

        # Batch commit every 500 rows
        if imported % 500 == 0:
            await db.commit()

    await db.commit()
    duration_ms = int((time.time() - start) * 1000)

    await audit(
        db, "WRITE", "import/csv",
        ip=request.client.host if request.client else "unknown",
        details={"file": file.filename, "imported": imported, "skipped": skipped},
        key_id=principal.get("id"),
    )

    return ImportResult(
        imported=imported, skipped=skipped,
        errors=errors[:50],  # cap error list
        duration_ms=duration_ms,
    )


@router.post("/webhook", response_model=ImportResult, summary="Browse AI / external webhook")
async def webhook_import(
    request: Request,
    db: AsyncSession = Depends(get_db),
    principal: dict = Depends(require_write),
):
    """
    Accepts a JSON body: either a single object or an array of objects.
    Each object should have: patient_id, disease, lat, lng, date.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    items = body if isinstance(body, list) else [body]
    imported, skipped = 0, 0
    errors: List[str] = []
    start = time.time()

    for i, item in enumerate(items):
        try:
            record = InfectionRecord(
                patient_hash   = InfectionRecord.hash_patient_id(str(item["patient_id"])),
                disease        = str(item["disease"])[:100],
                severity       = item.get("severity", "unknown"),
                latitude       = float(item["lat"]),
                longitude      = float(item["lng"]),
                region         = item.get("region"),
                infection_date = date.fromisoformat(str(item["date"])),
                source         = "webhook",
                metadata_json  = {k: v for k, v in item.items() if k not in {"patient_id","disease","lat","lng","date"}},
            )
            db.add(record)
            imported += 1
        except Exception as e:
            errors.append(f"Item {i}: {e}")
            skipped += 1

    await db.commit()
    return ImportResult(
        imported=imported, skipped=skipped,
        errors=errors[:50],
        duration_ms=int((time.time() - start) * 1000),
    )

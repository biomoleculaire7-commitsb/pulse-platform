from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    create_access_token, generate_api_key, require_admin, _hash_key
)
from app.config import settings
from app.database import get_db
from app.models import ApiKey
from app.schemas import ApiKeyCreate, ApiKeyResponse, TokenResponse

router = APIRouter()


@router.post("/token", response_model=TokenResponse, summary="Get JWT token (dashboard login)")
async def login(master_key: str):
    """
    Exchange master API key for a short-lived JWT.
    Used by the dashboard UI.
    """
    if master_key != settings.MASTER_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid master key")
    token = create_access_token({"sub": "dashboard", "role": "viewer"})
    return TokenResponse(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/keys", response_model=ApiKeyResponse, summary="Create API key (admin only)")
async def create_api_key(
    payload: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    principal: dict = Depends(require_admin),
):
    raw_key, key_hash = generate_api_key()
    db_key = ApiKey(
        key_hash    = key_hash,
        name        = payload.name,
        description = payload.description,
        permissions = payload.permissions,
    )
    db.add(db_key)
    await db.commit()
    await db.refresh(db_key)

    return ApiKeyResponse(
        id=db_key.id,
        name=db_key.name,
        key=raw_key,   # shown ONCE only
        created_at=db_key.created_at,
    )


@router.get("/keys", summary="List API keys (admin only)")
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    result = await db.execute(select(ApiKey).where(ApiKey.is_active == True))
    keys = result.scalars().all()
    return [{"id": k.id, "name": k.name, "last_used": k.last_used, "permissions": k.permissions} for k in keys]

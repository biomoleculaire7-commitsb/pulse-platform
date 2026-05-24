"""
Dual authentication: JWT (for dashboard users) + API Keys (for mobile/external).
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import ApiKey, AuditLog

bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


# ─── JWT ──────────────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ─── API Key helpers ──────────────────────────────────────────────────────────

def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def generate_api_key() -> tuple[str, str]:
    """Returns (raw_key_for_user, hash_for_db)"""
    raw = f"res_{secrets.token_urlsafe(32)}"
    return raw, _hash_key(raw)


# ─── Dependency ───────────────────────────────────────────────────────────────

async def get_current_principal(
    bearer: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Accepts either:
      - Bearer JWT token
      - X-API-Key header
    Returns a dict with {type, id, permissions}.
    """
    # --- Master key (admin only, for initial setup) ---
    if api_key and api_key == settings.MASTER_API_KEY:
        return {"type": "master", "id": "master", "permissions": {"read": True, "write": True, "admin": True}}

    # --- Database API key ---
    if api_key:
        key_hash = _hash_key(api_key)
        result = await db.execute(
            select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
        )
        db_key = result.scalar_one_or_none()
        if db_key:
            await db.execute(
                update(ApiKey).where(ApiKey.id == db_key.id)
                .values(last_used=datetime.utcnow())
            )
            await db.commit()
            return {"type": "api_key", "id": str(db_key.id), "permissions": db_key.permissions}

    # --- JWT Bearer ---
    if bearer:
        try:
            payload = jwt.decode(bearer.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return {"type": "jwt", "id": payload.get("sub"), "permissions": {"read": True, "write": False}}
        except JWTError:
            pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_write(principal: dict = Depends(get_current_principal)):
    if not principal.get("permissions", {}).get("write"):
        raise HTTPException(status_code=403, detail="Write permission required")
    return principal


async def require_read(principal: dict = Depends(get_current_principal)):
    if not principal.get("permissions", {}).get("read"):
        raise HTTPException(status_code=403, detail="Read permission required")
    return principal


async def require_admin(principal: dict = Depends(get_current_principal)):
    if not principal.get("permissions", {}).get("admin"):
        raise HTTPException(status_code=403, detail="Admin permission required")
    return principal


# ─── Audit ────────────────────────────────────────────────────────────────────

async def audit(db: AsyncSession, action: str, resource: str, ip: str, details: dict = {}, key_id=None):
    log = AuditLog(
        action=action,
        resource=resource,
        ip_address=ip,
        details=details,
        api_key_id=key_id if key_id and key_id != "master" else None,
    )
    db.add(log)
    await db.commit()

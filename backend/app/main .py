"""
PULSE — Real-time Health Monitoring
FastAPI Backend
"""
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import engine, Base
from app.routers import infections, dashboard, auth, imports
from app.config import settings

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("pulse.access")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized")
    yield
    await engine.dispose()


app = FastAPI(
    title="PULSE — Real-time Health Monitoring",
    description="المراقبة الصحية الحينية",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    """Log every request for audit trail"""
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info(
        f"method={request.method} path={request.url.path} "
        f"status={response.status_code} duration={duration}ms "
        f"ip={request.client.host if request.client else 'unknown'}"
    )
    return response


# Routers
app.include_router(auth.router,       prefix="/api/auth",       tags=["Authentication"])
app.include_router(infections.router, prefix="/api/infections", tags=["Infections"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])
app.include_router(imports.router,    prefix="/api/import",     tags=["Data Import"])


@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "1.0.0"}

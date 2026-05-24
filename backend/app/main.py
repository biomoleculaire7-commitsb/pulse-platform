"""
PULSE — Real-time Health Monitoring
FastAPI Backend
"""
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("pulse.access")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized")
    yield
    await engine.dispose()


app = FastAPI(
    title="PULSE",
    description="Real-time Health Monitoring",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} {response.status_code} {duration}ms")
    return response


# Import routers
try:
    from app.routers import infections, dashboard, auth, imports
    app.include_router(auth.router,       prefix="/api/auth",       tags=["Authentication"])
    app.include_router(infections.router, prefix="/api/infections", tags=["Infections"])
    app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])
    app.include_router(imports.router,    prefix="/api/import",     tags=["Data Import"])
    logger.info("All routers loaded successfully")
except Exception as e:
    logger.error(f"Router import error: {e}")


@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/", tags=["Root"])
async def root():
    return {"message": "PULSE API is running", "docs": "/api/docs"}

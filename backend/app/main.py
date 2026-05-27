"""
PULSE — Real-time Health Monitoring
"""
import logging
import time
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pulse")

app = FastAPI(
    title="PULSE",
    description="Real-time Health Monitoring",
    version="1.0.0",
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
async def log_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} {response.status_code}")
    return response

# Import routers
try:
    from app.routers import infections, dashboard, auth, imports
    app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
    app.include_router(infections.router, prefix="/api/infections", tags=["Infections"])
    app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])
    app.include_router(imports.router,    prefix="/api/import",     tags=["Import"])
    logger.info("Routers loaded OK")
except Exception as e:
    logger.error(f"Router error: {e}")

@app.on_event("startup")
async def startup():
    try:
        from app.database import engine, Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("DB tables created")
    except Exception as e:
        logger.error(f"DB startup error: {e}")

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/")
async def root():
    return {"message": "PULSE API running", "docs": "/api/docs"}

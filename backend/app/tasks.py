"""
Celery beat tasks - optional scheduled data collection.
Run with: celery -A app.tasks worker --beat -l info
"""
from celery import Celery
from celery.schedules import crontab
import httpx
import asyncio
import logging

from app.config import settings

logger = logging.getLogger("pulse.tasks")

celery_app = Celery("res", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.beat_schedule = {
    "fetch-who-disease-outbreak-news": {
        "task": "app.tasks.fetch_who_don",
        "schedule": crontab(minute=0, hour="*/6"),  # every 6 hours
    },
}


@celery_app.task(name="app.tasks.fetch_who_don", bind=True, max_retries=3)
def fetch_who_don(self):
    """
    Fetch WHO Disease Outbreak News RSS feed and store new entries.
    WHO DON RSS: https://www.who.int/rss-feeds/news-releases.xml
    """
    try:
        url = "https://www.who.int/csr/don/en/rss.xml"
        with httpx.Client(timeout=30) as client:
            resp = client.get(url)
            resp.raise_for_status()

        # Parse RSS (simplified - use feedparser in production)
        logger.info(f"WHO DON feed fetched: {len(resp.content)} bytes")
        # In production: parse XML, extract disease events, call POST /api/infections
        return {"status": "ok", "bytes": len(resp.content)}

    except Exception as exc:
        logger.error(f"WHO fetch failed: {exc}")
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(name="app.tasks.cleanup_old_audit_logs")
def cleanup_audit_logs():
    """Retain audit logs for 2 years per compliance requirements"""
    from sqlalchemy import create_engine, text
    from app.config import settings
    # Sync engine for Celery task
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        result = conn.execute(
            text("DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '2 years'")
        )
        conn.commit()
        logger.info(f"Cleaned up {result.rowcount} old audit log entries")

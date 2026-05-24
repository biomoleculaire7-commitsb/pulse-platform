from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://pulse_user:pulse_pass@db:5432/pulse_db"
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # API Key auth (alternative to JWT)
    MASTER_API_KEY: str = "change-me-api-key"

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://frontend:80",
    ]

    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"

    # Coordinate fuzzing radius in meters (privacy)
    LOCATION_FUZZING_METERS: int = 500

    class Config:
        env_file = ".env"


settings = Settings()

import os
import json
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Backend directory
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    SECRET_KEY: str = Field(
        default="studysync-super-secret-key-change-in-production-min-32-chars-random",
        description="JWT Secret key"
    )
    DATABASE_URL: str = Field(
        default="sqlite:///./studysync.db",
        description="Database connection URL"
    )
    TOKEN_EXPIRE_MINUTES: int = Field(
        default=10080, # 7 days
        description="JWT token validity in minutes"
    )
    CORS_ORIGINS: list[str] = Field(
        default=[
            "http://127.0.0.1:8000",
            "http://localhost:8000",
            "http://127.0.0.1:5500",
            "http://localhost:5500",
        ],
        description="Allowed CORS origins"
    )

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL
        # On Vercel / AWS Lambda serverless runtimes, root filesystem is read-only.
        # SQLite must store the database in the writable /tmp directory.
        if (os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME")) and url.startswith("sqlite:///."):
            return "sqlite:////tmp/studysync.db"
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

settings = Settings()

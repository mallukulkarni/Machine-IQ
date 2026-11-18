from pydantic import Field, model_validator
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "MATERIAL IQ"
    APP_VERSION: str = "1.0.0"
    # Avoid colliding with a host-level DEBUG variable (for example, DEBUG=release).
    DEBUG: bool = Field(default=True, validation_alias="MATERIAL_IQ_DEBUG")
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ENVIRONMENT: str = "development"
    AUTH_REQUIRED: bool = Field(default=False, validation_alias="MATERIAL_IQ_AUTH_REQUIRED")
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    DATABASE_URL: str = "sqlite+aiosqlite:///./materialiq.db"
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

    @model_validator(mode="after")
    def require_production_secret(self):
        if self.ENVIRONMENT.lower() == "production":
            if len(self.SECRET_KEY) < 32 or self.SECRET_KEY in {
                "dev-secret-key-change-in-production",
                "your-super-secret-key-change-this",
            }:
                raise ValueError("Set a unique SECRET_KEY of at least 32 characters before running in production.")
            if not self.AUTH_REQUIRED:
                raise ValueError("Set MATERIAL_IQ_AUTH_REQUIRED=true before running in production.")
            if not self.SUPABASE_URL or not self.SUPABASE_JWT_SECRET:
                raise ValueError("Set SUPABASE_URL and SUPABASE_JWT_SECRET for production API authentication.")
        return self

settings = Settings()

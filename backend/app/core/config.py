from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "MoveIt API"
    app_version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+psycopg://moveit:moveit@localhost:5433/moveit"

    jwt_secret: str = "dev-only-secret-change-me-before-deploying-32chars"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    provider_email: str = "provider@moveit.local"
    provider_password: str = "provider123"

    cors_origins: str = "http://localhost:8080,http://localhost:5173"

    geoapify_api_key: str = ""
    resource_buffer_minutes: int = 60
    max_moving_helpers: int = 4
    service_area_radius_km: float = 30.0
    # Sopot pier: a central reference point for the Trójmiasto service area.
    service_area_center_latitude: float = 54.4416
    service_area_center_longitude: float = 18.5601

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

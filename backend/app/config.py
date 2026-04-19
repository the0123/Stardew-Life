from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]
    environment: str = "development"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_claims_email: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()

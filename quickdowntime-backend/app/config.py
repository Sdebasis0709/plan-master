# app/config.py
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from supabase import create_client, Client, ClientOptions   # <-- IMPORTANT
import google.generativeai as genai
import httpx


class Settings(BaseSettings):
    DATABASE_URL: str | None = None

    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str = ""

    SECRET_KEY: str

    GEMINI_API_KEY: str = ""

    UPLOAD_DIR: str = "./app/uploads"
    USE_LOCAL_STORAGE: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()


os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "images"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "audio"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "unsynced"), exist_ok=True)


def create_supabase_client() -> Client:
    http_client = httpx.Client(
        timeout=httpx.Timeout(
            timeout=30.0,
            connect=10.0,
            read=20.0,
            write=10.0,
        ),
        limits=httpx.Limits(
            max_keepalive_connections=10,
            max_connections=20,
            keepalive_expiry=30.0
        ),
        http2=False
    )

    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_KEY,
        options=ClientOptions(
            schema="public",
            headers={"x-client-info": "quickdowntime/1.0"},
            auto_refresh_token=True,
            persist_session=True,
        )
    )


supabase: Client = create_supabase_client()

genai.configure(api_key=settings.GEMINI_API_KEY)

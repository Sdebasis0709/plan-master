# app/config.py
from pydantic_settings import BaseSettings
from supabase import create_client
import google.generativeai as genai
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str = ""

    # JWT
    SECRET_KEY: str    # override in .env

    # Gemini
    GEMINI_API_KEY: str = ""

    # Other configs
    UPLOAD_DIR: str = "./app/uploads"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Local storage toggle
    USE_LOCAL_STORAGE: bool = True  # set False to use Supabase storage (existing behavior)

    class Config:
        env_file = ".env"

# Load settings from .env
settings = Settings()

# Ensure upload folder exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "images"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "audio"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "unsynced"), exist_ok=True)

# Initialize Supabase client (still available if online)
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

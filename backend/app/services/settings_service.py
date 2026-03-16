import logging
import os
from sqlalchemy.orm import Session
from ..models import models
from ..core import constants
from typing import Optional, Tuple

logger = logging.getLogger("uvicorn")

class SettingsService:
    @staticmethod
    def get_setting(db: Session, key: str) -> Optional[str]:
        setting = db.query(models.Setting).filter(models.Setting.key == key).first()
        return setting.value if setting else None

    @staticmethod
    def get_all_settings(db: Session):
        settings = db.query(models.Setting).all()
        return {s.key: s.value for s in settings}

    @staticmethod
    def update_setting(db: Session, key: str, value: str):
        logger.info(f">>> BACKEND: Updating setting: {key}")
        setting = db.query(models.Setting).filter(models.Setting.key == key).first()
        if setting:
            setting.value = value
        else:
            setting = models.Setting(key=key, value=value)
            db.add(setting)
        db.commit()
        return {"status": "success"}

    @classmethod
    def get_ai_credentials(cls, db: Session) -> Tuple[str, str, str]:
        """Resolves active model, API key, and Ollama context."""
        model = cls.get_setting(db, "AI_MODEL") or constants.DEFAULT_AI_MODEL
        gemini_key = cls.get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        openai_key = cls.get_setting(db, "OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
        ollama_url = cls.get_setting(db, "OLLAMA_URL") or constants.DEFAULT_OLLAMA_URL
        
        api_key = gemini_key
        if "openai/" in model.lower() or "gpt" in model.lower():
            api_key = openai_key
            
        return model, api_key, ollama_url

    @staticmethod
    def get_ai_provider_type(db: Session) -> str:
        # Logic to decide which provider to use
        model = SettingsService.get_setting(db, "AI_MODEL") or constants.DEFAULT_AI_MODEL
        if "ollama/" in model.lower():
            return "ollama"
        if "gemini" in model.lower():
            return "native"
        return "litellm"

import logging
from sqlalchemy.orm import Session
from ..models import models
from typing import Optional

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

    @staticmethod
    def get_ai_provider_type(db: Session) -> str:
        # Logic to decide which provider to use
        model = SettingsService.get_setting(db, "AI_MODEL") or "gemini/gemini-1.5-flash"
        if "gemini" in model.lower():
            return "native"
        return "litellm"


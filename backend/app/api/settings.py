from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.settings_service import SettingsService
from ..schemas.schemas import SettingUpdate
import google.generativeai as genai
import os
import logging

logger = logging.getLogger("uvicorn")
router = APIRouter(tags=["settings"])

@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    return SettingsService.get_all_settings(db)

@router.post("/settings")
def update_setting(update: SettingUpdate, db: Session = Depends(get_db)):
    return SettingsService.update_setting(db, update.key, update.value)

@router.get("/models/gemini")
def list_gemini_models(db: Session = Depends(get_db)):
    key = SettingsService.get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key:
        return []
    try:
        genai.configure(api_key=key)
        models_list = genai.list_models()
        results = []
        for m in models_list:
            if "generateContent" in m.supported_generation_methods:
                model_id = f"gemini/{m.name.replace('models/', '')}"
                results.append({"id": model_id, "name": m.display_name})
        return results
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        return []

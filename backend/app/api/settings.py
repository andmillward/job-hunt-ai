from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.settings_service import SettingsService
from ..schemas.schemas import SettingUpdate
import google.generativeai as genai
import os
import logging
import httpx

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
        logger.error(f"Error listing gemini models: {e}")
        return []

@router.get("/models/ollama")
async def list_ollama_models(db: Session = Depends(get_db)):
    url = SettingsService.get_setting(db, "OLLAMA_URL") or "http://localhost:11434"
    url = url.rstrip("/")
    logger.info(f">>> SETTINGS: Fetching Ollama models from {url}")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{url}/api/tags")
            if response.status_code == 200:
                models_data = response.json().get("models", [])
                logger.info(f">>> SETTINGS: Found {len(models_data)} Ollama models")
                results = []
                for m in models_data:
                    model_name = m.get("name")
                    results.append({
                        "id": f"ollama/{model_name}",
                        "name": f"Ollama: {model_name}"
                    })
                return results
            else:
                logger.error(f">>> SETTINGS: Ollama returned status {response.status_code}")
                return []
    except Exception as e:
        logger.error(f">>> SETTINGS: Error listing ollama models at {url}: {e}")
        return []

@router.get("/models/openai")
async def list_openai_models(db: Session = Depends(get_db)):
    key = SettingsService.get_setting(db, "OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not key:
        return []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {key}"}
            )
            if response.status_code == 200:
                models_data = response.json().get("data", [])
                # Filter for common chat models to avoid clutter
                results = []
                for m in models_data:
                    model_id = m.get("id")
                    if "gpt" in model_id:
                        results.append({
                            "id": f"openai/{model_id}",
                            "name": f"OpenAI: {model_id}"
                        })
                return results
            return []
    except Exception as e:
        logger.error(f"Error listing openai models: {e}")
        return []

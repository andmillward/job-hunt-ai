from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.settings_service import SettingsService
from ..schemas.schemas import SettingUpdate
from ..providers.factory import ProviderFactory
from ..core import constants
import logging
import os

logger = logging.getLogger("uvicorn")
router = APIRouter(tags=["settings"])

@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    return SettingsService.get_all_settings(db)

@router.post("/settings")
def update_setting(update: SettingUpdate, db: Session = Depends(get_db)):
    return SettingsService.update_setting(db, update.key, update.value)

@router.post("/settings/validate")
async def validate_setting(update: SettingUpdate, db: Session = Depends(get_db)):
    """Test connectivity for a specific setting."""
    key = update.key
    value = update.value
    
    if not value:
        return {"status": "error", "message": "Value is required"}

    try:
        if key == "GEMINI_API_KEY":
            from ..providers.ai.gemini_provider import GeminiNativeProvider
            models = GeminiNativeProvider().list_models(api_key=value)
            return {"status": "success", "message": f"Connected! Found {len(models)} models."}
            
        elif key == "OPENAI_API_KEY":
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {value}"}
                )
                if response.status_code == 200:
                    return {"status": "success", "message": "Connected! OpenAI API key is valid."}
                return {"status": "error", "message": f"OpenAI Error: {response.status_code}"}

        elif key == "JSEARCH_API_KEY":
            import httpx
            headers = {
                "x-rapidapi-key": value,
                "x-rapidapi-host": "jsearch.p.rapidapi.com"
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://jsearch.p.rapidapi.com/search",
                    headers=headers,
                    params={"query": "Python", "num_pages": "1"}
                )
                if response.status_code == 200:
                    return {"status": "success", "message": "Connected! JSearch API key is valid."}
                return {"status": "error", "message": f"JSearch Error: {response.status_code}"}

        elif key == "OLLAMA_URL":
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{value}/api/tags")
                if response.status_code == 200:
                    models = response.json().get("models", [])
                    return {"status": "success", "message": f"Connected! Found {len(models)} local models."}
                return {"status": "error", "message": f"Ollama Error: {response.status_code}"}

        return {"status": "neutral", "message": "Setting stored."}
    except Exception as e:
        logger.error(f"Validation error for {key}: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/models/gemini")
def list_gemini_models(db: Session = Depends(get_db)):
    key = SettingsService.get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key: return []
    
    # We use the native provider for Gemini listing
    from ..providers.ai.gemini_provider import GeminiNativeProvider
    return GeminiNativeProvider().list_models(api_key=key)

@router.get("/models/ollama")
def list_ollama_models(db: Session = Depends(get_db)):
    url = SettingsService.get_setting(db, "OLLAMA_URL") or constants.DEFAULT_OLLAMA_URL
    
    from ..providers.ai.ollama_provider import OllamaProvider
    return OllamaProvider().list_models(ollama_url=url)

@router.get("/models/openai")
async def list_openai_models(db: Session = Depends(get_db)):
    key = SettingsService.get_setting(db, "OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not key: return []
    
    # OpenAI is handled via LiteLLM provider logic or direct API
    # For simplicity and scalability, let's keep the specialized listing here or move to a provider helper
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {key}"}
            )
            if response.status_code == 200:
                models_data = response.json().get("data", [])
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

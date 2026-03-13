import logging
import httpx
import json
from .base import BaseAIProvider
from typing import List, Dict, Any

logger = logging.getLogger("uvicorn")

class OllamaProvider(BaseAIProvider):
    def complete(self, prompt: str, model: str, api_key: str = None, **kwargs) -> str:
        # api_key is unused for local ollama
        model_name = model.replace("ollama/", "")
        ollama_url = kwargs.get("ollama_url") or "http://localhost:11434"
        ollama_url = ollama_url.rstrip("/")
        
        try:
            with httpx.Client(timeout=300.0, follow_redirects=True) as client:
                response = client.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json" if "json" in prompt.lower() else None
                    }
                )
                response.raise_for_status()
                return response.json().get("response", "")
        except Exception as e:
            logger.error(f">>> OLLAMA PROVIDER: Error: {str(e)}")
            raise e

    def parse_resume(self, text: str, model: str, api_key: str = None, **kwargs) -> Dict[str, Any]:
        prompt = f"""
        Extract the following information from this resume text and return it as a JSON object.
        
        Resume Text:
        {text}
        
        Required JSON format:
        {{
            "skills": ["skill1", "skill2"],
            "experience": "Brief summary of work history",
            "education": "Brief summary of education"
        }}
        """
        
        response_text = self.complete(prompt, model, api_key, **kwargs)
        try:
            return json.loads(response_text)
        except:
            # Fallback if AI didn't return valid JSON
            return {"skills": [], "experience": response_text, "education": ""}

    def list_models(self, api_key: str = None, **kwargs) -> List[Dict[str, Any]]:
        url = kwargs.get("ollama_url") or "http://localhost:11434"
        url = url.rstrip("/")
        try:
            with httpx.Client(timeout=5.0, follow_redirects=True) as client:
                response = client.get(f"{url}/api/tags")
                if response.status_code == 200:
                    models_data = response.json().get("models", [])
                    results = []
                    for m in models_data:
                        model_name = m.get("name")
                        results.append({
                            "id": f"ollama/{model_name}",
                            "name": f"Ollama: {model_name}"
                        })
                    return results
                return []
        except Exception as e:
            logger.error(f">>> OLLAMA PROVIDER: Error listing models: {e}")
            return []

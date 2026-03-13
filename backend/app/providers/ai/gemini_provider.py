import google.generativeai as genai
import json
import logging
from typing import List
from .base import BaseAIProvider

logger = logging.getLogger("uvicorn")

class GeminiNativeProvider(BaseAIProvider):
    def parse_resume(self, text: str, model: str, api_key: str) -> dict:
        logger.info(f">>> PROVIDER: GeminiNative parsing with {model}")
        try:
            genai.configure(api_key=api_key)
            native_name = model.split("/")[-1] if "/" in model else model
            native_name = native_name.replace("-latest", "")
            
            gemini_model = genai.GenerativeModel(native_name)
            
            prompt = f"""
            Extract the following information from the resume text below into a structured JSON format.
            Fields required:
            1. skills: A list of technical and soft skills.
            2. experience: A concise summary of professional experience.
            3. education: A concise summary of educational background.

            Resume Text:
            {text}

            Return ONLY the raw JSON object.
            """
            
            response = gemini_model.generate_content(prompt)
            content = response.text
            
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            return json.loads(content)
        except Exception as e:
            logger.error(f">>> PROVIDER: GeminiNative Error: {str(e)}")
            raise e

    def complete(self, prompt: str, model: str, api_key: str) -> str:
        logger.info(f">>> PROVIDER: GeminiNative completing with {model}")
        try:
            genai.configure(api_key=api_key)
            native_name = model.split("/")[-1] if "/" in model else model
            native_name = native_name.replace("-latest", "")
            gemini_model = genai.GenerativeModel(native_name)
            response = gemini_model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f">>> PROVIDER: GeminiNative Complete Error: {str(e)}")
            raise e

    def list_models(self, api_key: str) -> List[dict]:
        try:
            genai.configure(api_key=api_key)
            models_list = genai.list_models()
            return [
                {"id": f"gemini/{m.name.replace('models/', '')}", "name": m.display_name} 
                for m in models_list if "generateContent" in m.supported_generation_methods
            ]
        except Exception as e:
            logger.error(f">>> PROVIDER: GeminiNative ListModels Error: {str(e)}")
            return []

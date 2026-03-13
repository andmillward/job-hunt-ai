from google import genai
from google.genai import types
import json
import logging
import os
from typing import List
from .base import BaseAIProvider

logger = logging.getLogger("uvicorn")

class GeminiNativeProvider(BaseAIProvider):
    def _get_client(self, api_key: str):
        # Using the new google-genai SDK
        return genai.Client(api_key=api_key)

    def parse_resume(self, text: str, model: str, api_key: str, **kwargs) -> dict:
        logger.info(f">>> PROVIDER: GeminiNative parsing with {model}")
        try:
            client = self._get_client(api_key)
            native_name = model.split("/")[-1] if "/" in model else model
            
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
            
            response = client.models.generate_content(
                model=native_name,
                contents=prompt
            )
            content = response.text
            
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            return json.loads(content)
        except Exception as e:
            logger.error(f">>> PROVIDER: GeminiNative Error: {str(e)}")
            raise e

    def complete(self, prompt: str, model: str, api_key: str, **kwargs) -> str:
        logger.info(f">>> PROVIDER: GeminiNative completing with {model}")
        try:
            client = self._get_client(api_key)
            native_name = model.split("/")[-1] if "/" in model else model
            response = client.models.generate_content(
                model=native_name,
                contents=prompt
            )
            return response.text
        except Exception as e:
            logger.error(f">>> PROVIDER: GeminiNative Complete Error: {str(e)}")
            raise e

    def list_models(self, api_key: str, **kwargs) -> List[dict]:
        try:
            client = self._get_client(api_key)
            # Providing stable defaults for the new SDK to ensure reliability
            return [
                {"id": "gemini/gemini-1.5-flash", "name": "Gemini 1.5 Flash"},
                {"id": "gemini/gemini-1.5-pro", "name": "Gemini 1.5 Pro"},
                {"id": "gemini/gemini-2.0-flash-exp", "name": "Gemini 2.0 Flash Exp"}
            ]
        except Exception as e:
            logger.error(f">>> PROVIDER: GeminiNative ListModels Error: {str(e)}")
            return []

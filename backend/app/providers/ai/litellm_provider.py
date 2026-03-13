import litellm
from litellm import completion
import json
import logging
import os
from typing import List
from .base import BaseAIProvider

logger = logging.getLogger("uvicorn")

class LiteLLMProvider(BaseAIProvider):
    def parse_resume(self, text: str, model: str, api_key: str, **kwargs) -> dict:
        logger.info(f">>> PROVIDER: LiteLLM parsing with {model}")
        
        # Mapping key to env for LiteLLM
        if "gemini" in model.lower():
            os.environ["GEMINI_API_KEY"] = api_key
        elif "gpt" in model.lower():
            os.environ["OPENAI_API_KEY"] = api_key
            
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
        
        try:
            response = completion(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                api_key=api_key
            )
            content = response.choices[0].message.content
            
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            return json.loads(content)
        except Exception as e:
            logger.error(f">>> PROVIDER: LiteLLM Error: {str(e)}")
            raise e

    def complete(self, prompt: str, model: str, api_key: str, **kwargs) -> str:
        logger.info(f">>> PROVIDER: LiteLLM completing with {model}")
        
        if "gemini" in model.lower():
            os.environ["GEMINI_API_KEY"] = api_key
        elif "gpt" in model.lower():
            os.environ["OPENAI_API_KEY"] = api_key
            
        try:
            response = completion(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                api_key=api_key
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f">>> PROVIDER: LiteLLM Complete Error: {str(e)}")
            raise e

    def list_models(self, api_key: str, **kwargs) -> List[dict]:
        # LiteLLM doesn't have a universal list_models, usually depends on provider
        # For now, return a basic list or empty
        return []

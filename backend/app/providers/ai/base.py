from abc import ABC, abstractmethod
from typing import List, Optional

class BaseAIProvider(ABC):
    @abstractmethod
    def parse_resume(self, text: str, model: str, api_key: str) -> dict:
        """Parse resume text into a structured JSON dict."""
        pass

    @abstractmethod
    def list_models(self, api_key: str) -> List[dict]:
        """List available models for this provider."""
        pass

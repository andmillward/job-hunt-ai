from sqlalchemy.orm import Session
from ..services.settings_service import SettingsService
from .ai.gemini_provider import GeminiNativeProvider
from .ai.litellm_provider import LiteLLMProvider
from .ai.ollama_provider import OllamaProvider
from .search.jobspy_provider import JobSpyProvider
from .search.jsearch_provider import JSearchProvider
from .search.jobcatcher_provider import JobCatcherProvider
import os

class ProviderFactory:
    """
    Scalable factory for AI and Search providers.
    """

    @staticmethod
    def get_ai_provider(db: Session):
        model = SettingsService.get_setting(db, "AI_MODEL") or "gemini/gemini-1.5-flash"
        
        if "ollama/" in model.lower():
            return OllamaProvider()
        if "gemini" in model.lower():
            return GeminiNativeProvider()
        
        return LiteLLMProvider()

    @staticmethod
    def get_search_providers(db: Session):
        """
        Returns a list of active search providers based on configuration.
        """
        active_providers = []
        
        # JobSpy
        if SettingsService.get_setting(db, "ENABLE_JOBSPY") != "false":
            active_providers.append(("jobspy", JobSpyProvider()))
            
        # JobCatcher
        if SettingsService.get_setting(db, "ENABLE_JOBCATCHER") != "false":
            active_providers.append(("jobcatcher", JobCatcherProvider()))
        
        # JSearch requires an API key AND to be enabled
        jsearch_key = SettingsService.get_setting(db, "JSEARCH_API_KEY") or os.getenv("JSEARCH_API_KEY")
        if jsearch_key and SettingsService.get_setting(db, "ENABLE_JSEARCH") != "false":
            active_providers.append(("jsearch", JSearchProvider()))
            
        return active_providers

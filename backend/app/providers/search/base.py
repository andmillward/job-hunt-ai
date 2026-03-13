from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

class BaseSearchProvider(ABC):
    @abstractmethod
    def search_jobs(self, keywords: str, location: Optional[str] = None, results_wanted: int = 20, **kwargs) -> List[Dict[str, Any]]:
        """Search for jobs and return a list of standardized job dictionaries."""
        pass

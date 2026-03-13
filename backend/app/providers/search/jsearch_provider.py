import httpx
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from .base import BaseSearchProvider

logger = logging.getLogger("uvicorn")

class JSearchProvider(BaseSearchProvider):
    def search_jobs(self, keywords: str, location: Optional[str] = None, results_wanted: int = 50, **kwargs) -> List[Dict[str, Any]]:
        api_key = kwargs.get("api_key")
        if not api_key:
            logger.error(">>> PROVIDER: JSearch Error - API Key missing")
            return []

        logger.info(f">>> PROVIDER: JSearch searching for '{keywords}' in '{location}'")
        
        query = keywords
        if location:
            query += f" in {location}"
            
        url = "https://jsearch.p.rapidapi.com/search"
        headers = {
            "x-rapidapi-key": api_key,
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
        
        # Levers
        remote_only = kwargs.get("remote_only", False)
        job_type = kwargs.get("job_type")
        
        params = {
            "query": query,
            "num_pages": "1",
            "date_posted": "3days",
            "remote_jobs_only": "true" if remote_only else "false"
        }
        
        if job_type:
            jt_map = {
                "full_time": "FULLTIME",
                "contract": "CONTRACT",
                "part_time": "PARTTIME",
                "internship": "INTERN"
            }
            params["employment_types"] = jt_map.get(job_type, "FULLTIME")

        try:
            with httpx.Client() as client:
                response = client.get(url, headers=headers, params=params, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                results = data.get("data", [])
                standardized_jobs = []
                
                for job in results:
                    posted_at = None
                    posted_at_str = job.get("job_posted_at_datetime_utc")
                    if posted_at_str:
                        try:
                            posted_at = datetime.fromisoformat(posted_at_str.replace("Z", "+00:00"))
                        except:
                            posted_at = None

                    standardized_jobs.append({
                        "title": job.get("job_title", "Unknown Title"),
                        "company": job.get("employer_name", "Unknown Company"),
                        "location": f"{job.get('job_city', '')}, {job.get('job_state', '')} {job.get('job_country', '')}".strip(", "),
                        "description": job.get("job_description", ""),
                        "job_url": job.get("job_apply_link") or job.get("job_google_link"),
                        "site": "jsearch",
                        "posted_at": posted_at
                    })
                
                logger.info(f">>> PROVIDER: JSearch found {len(standardized_jobs)} jobs")
                return standardized_jobs
                
        except Exception as e:
            logger.error(f">>> PROVIDER: JSearch Error: {str(e)}")
            return []

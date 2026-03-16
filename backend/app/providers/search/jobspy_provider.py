from jobspy import scrape_jobs
import pandas as pd
import logging
from typing import List, Optional, Dict, Any
from .base import BaseSearchProvider

logger = logging.getLogger("uvicorn")

class JobSpyProvider(BaseSearchProvider):
    def search_jobs(self, keywords: str, location: Optional[str] = None, results_wanted: int = 50, **kwargs) -> List[Dict[str, Any]]:
        logger.info(f">>> PROVIDER: JobSpy searching for '{keywords}'")
        site_name = kwargs.get("site_name", ["linkedin", "indeed", "glassdoor", "zip_recruiter"])
        
        # Extract Levers
        min_salary = kwargs.get("min_salary")
        remote_only = kwargs.get("remote_only", False)
        job_type = kwargs.get("job_type")
        hours_old = kwargs.get("hours_old", 72)
        
        # Map internal job types to JobSpy expected values
        # JobSpy expects: fulltime, parttime, contract, internship, temporary
        jt_map = {
            "full_time": "fulltime",
            "part_time": "parttime",
            "contract": "contract",
            "internship": "internship"
        }
        mapped_job_type = jt_map.get(job_type) if job_type else None
        
        try:
            logger.info(f">>> PROVIDER: JobSpy Scrape Params - Search Term: {keywords}, Location: {location}, Is Remote: {remote_only}, Job Type: {mapped_job_type}, Hours Old: {hours_old}")
            
            # Note: JobSpy is sync, so we just call it. 
            # It's wrapped in asyncio.to_thread if called from search_and_store_jobs logic
            jobs_df = scrape_jobs(
                site_name=site_name,
                search_term=keywords,
                location=location,
                results_wanted=results_wanted,
                hours_old=hours_old,
                country=kwargs.get("country", "usa"), 
                is_remote=remote_only,
                job_type=mapped_job_type,
                min_salary=min_salary
            )
            
            standardized_jobs = []
            if jobs_df is None or jobs_df.empty:
                logger.warning(f">>> PROVIDER: JobSpy - No results returned for '{keywords}'")
                return []
                
            for _, job in jobs_df.iterrows():
                # Sanitize values
                job_url = str(job['job_url']) if pd.notnull(job['job_url']) else None
                if not job_url:
                    continue
                    
                posted_at = job['date_posted']
                if pd.isna(posted_at):
                    posted_at = None
                else:
                    try:
                        posted_at = pd.to_datetime(posted_at).to_pydatetime()
                    except:
                        posted_at = None

                standardized_jobs.append({
                    "title": str(job['title']) if pd.notnull(job['title']) else "Unknown",
                    "company": str(job['company']) if pd.notnull(job['company']) else "Unknown",
                    "location": str(job['location']) if pd.notnull(job['location']) else None,
                    "description": str(job['description']) if pd.notnull(job['description']) else None,
                    "job_url": job_url,
                    "site": str(job['site']) if pd.notnull(job['site']) else None,
                    "posted_at": posted_at
                })
                
            return standardized_jobs
        except Exception as e:
            logger.error(f">>> PROVIDER: JobSpy Error: {str(e)}")
            return []

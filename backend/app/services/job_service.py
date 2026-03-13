import logging
import os
from sqlalchemy.orm import Session
from ..models import models
from ..providers.search.jobspy_provider import JobSpyProvider
from ..providers.search.jsearch_provider import JSearchProvider
from .settings_service import SettingsService
from typing import List, Optional

logger = logging.getLogger("uvicorn")

class JobService:
    @staticmethod
    def get_providers(db: Session):
        providers = [("jobspy", JobSpyProvider())]
        
        # Check if JSearch is configured
        jsearch_key = SettingsService.get_setting(db, "JSEARCH_API_KEY") or os.getenv("JSEARCH_API_KEY")
        if jsearch_key:
            providers.append(("jsearch", JSearchProvider()))
            
        return providers

    @classmethod
    def search_and_store_jobs(
        cls,
        db: Session, 
        keywords: str, 
        location: Optional[str] = None, 
        results_wanted: int = 20,
        site_name: List[str] = ["linkedin", "indeed", "glassdoor", "zip_recruiter"]
    ):
        providers = cls.get_providers(db)
        total_found = 0
        total_new = 0
        
        jsearch_key = SettingsService.get_setting(db, "JSEARCH_API_KEY") or os.getenv("JSEARCH_API_KEY")

        for name, provider in providers:
            try:
                # Pass provider-specific kwargs
                kwargs = {}
                if name == "jobspy":
                    kwargs["site_name"] = site_name
                elif name == "jsearch":
                    kwargs["api_key"] = jsearch_key

                standardized_jobs = provider.search_jobs(
                    keywords=keywords,
                    location=location,
                    results_wanted=results_wanted,
                    **kwargs
                )
                
                total_found += len(standardized_jobs)
                
                for job in standardized_jobs:
                    if not job.get('job_url'):
                        continue
                        
                    existing = db.query(models.JobListing).filter(models.JobListing.job_url == job['job_url']).first()
                    if not existing:
                        db_job = models.JobListing(
                            title=job['title'],
                            company=job['company'],
                            location=job['location'],
                            description=job['description'],
                            job_url=job['job_url'],
                            site=job['site'] or name,
                            posted_at=job['posted_at']
                        )
                        db.add(db_job)
                        total_new += 1
                
                db.commit()
            except Exception as e:
                logger.error(f">>> SERVICE: Job Search Failure for {name}: {str(e)}")
                # Continue to next provider even if one fails
        
        return {"found": total_found, "new": total_new}

    @staticmethod
    def get_jobs(db: Session, status: Optional[str] = None):
        query = db.query(models.JobListing)
        if status:
            query = query.filter(models.JobListing.status == status)
        return query.order_by(models.JobListing.created_at.desc()).all()

    @staticmethod
    def update_job_status(db: Session, job_id: int, status: str):
        job = db.query(models.JobListing).filter(models.JobListing.id == job_id).first()
        if not job:
            return None
        job.status = status
        db.commit()
        return job

import logging
from sqlalchemy.orm import Session
from ..models import models
from ..providers.search.jobspy_provider import JobSpyProvider
from typing import List, Optional

logger = logging.getLogger("uvicorn")

class JobService:
    @staticmethod
    def get_provider(name: str = "jobspy"):
        # We only have jobspy for now, but this is where we'd add others
        if name == "jobspy":
            return JobSpyProvider()
        return JobSpyProvider()

    @classmethod
    def search_and_store_jobs(
        cls,
        db: Session, 
        keywords: str, 
        location: Optional[str] = None, 
        results_wanted: int = 20,
        site_name: List[str] = ["linkedin", "indeed", "glassdoor", "zip_recruiter"]
    ):
        provider = cls.get_provider("jobspy")
        try:
            standardized_jobs = provider.search_jobs(
                keywords=keywords,
                location=location,
                results_wanted=results_wanted,
                site_name=site_name
            )
            
            new_jobs_count = 0
            for job in standardized_jobs:
                existing = db.query(models.JobListing).filter(models.JobListing.job_url == job['job_url']).first()
                if not existing:
                    db_job = models.JobListing(
                        title=job['title'],
                        company=job['company'],
                        location=job['location'],
                        description=job['description'],
                        job_url=job['job_url'],
                        site=job['site'],
                        posted_at=job['posted_at']
                    )
                    db.add(db_job)
                    new_jobs_count += 1
            
            db.commit()
            return {"found": len(standardized_jobs), "new": new_jobs_count}
        except Exception as e:
            logger.error(f">>> SERVICE: Job Search Failure: {str(e)}")
            raise e

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

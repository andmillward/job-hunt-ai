import logging
import os
import asyncio
import json
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..models import models
from ..providers.search.jobspy_provider import JobSpyProvider
from ..providers.search.jsearch_provider import JSearchProvider
from ..providers.search.jobcatcher_provider import JobCatcherProvider
from .settings_service import SettingsService
from .resume_service import ResumeService
from typing import List, Optional

logger = logging.getLogger("uvicorn")

class JobService:
    @staticmethod
    def get_providers(db: Session):
        providers = [
            ("jobspy", JobSpyProvider()),
            ("jobcatcher", JobCatcherProvider())
        ]
        
        # Check if JSearch is configured
        jsearch_key = SettingsService.get_setting(db, "JSEARCH_API_KEY") or os.getenv("JSEARCH_API_KEY")
        if jsearch_key:
            providers.append(("jsearch", JSearchProvider()))
            
        return providers

    @classmethod
    async def search_and_store_jobs(
        cls,
        db: Session, 
        keywords: str, 
        location: Optional[str] = None, 
        results_wanted: int = 50,
        site_name: List[str] = ["linkedin", "indeed", "glassdoor", "zip_recruiter"],
        **kwargs
    ):
        providers = cls.get_providers(db)
        total_found = 0
        total_new = 0
        
        jsearch_key = SettingsService.get_setting(db, "JSEARCH_API_KEY") or os.getenv("JSEARCH_API_KEY")

        for name, provider in providers:
            try:
                # Pass provider-specific kwargs
                provider_kwargs = {**kwargs}
                if name == "jobspy":
                    provider_kwargs["site_name"] = site_name
                elif name == "jsearch":
                    provider_kwargs["api_key"] = jsearch_key

                # Handle both sync and async providers
                if asyncio.iscoroutinefunction(provider.search_jobs):
                    standardized_jobs = await provider.search_jobs(
                        keywords=keywords,
                        location=location,
                        results_wanted=results_wanted,
                        **provider_kwargs
                    )
                else:
                    standardized_jobs = provider.search_jobs(
                        keywords=keywords,
                        location=location,
                        results_wanted=results_wanted,
                        **provider_kwargs
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
                    else:
                        # Update last seen timestamp
                        existing.last_seen_at = datetime.utcnow()
                        if existing.status == "closed":
                            existing.status = "new"
                
                db.commit()
            except Exception as e:
                logger.error(f">>> SERVICE: Job Search Failure for {name}: {str(e)}")
        
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

    # --- MIL-43: Search Net & Saved Searches ---

    @classmethod
    async def generate_search_net(cls, db: Session, dream_role: str, resume_id: Optional[int] = None) -> List[models.SavedSearch]:
        logger.info(f">>> SERVICE: Generating resume-aware search net")
        
        # Persist the dream role on the resume for future ranking
        resume = None
        if resume_id:
            resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
            if resume:
                resume.dream_role = dream_role
                db.commit()

        model = SettingsService.get_setting(db, "AI_MODEL") or "gemini/gemini-1.5-flash"
        gemini_key = SettingsService.get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        openai_key = SettingsService.get_setting(db, "OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
        api_key = gemini_key if "gemini" in model.lower() else openai_key
        
        if not api_key:
            raise Exception("AI API Key missing. Configure in Settings.")

        provider = ResumeService.get_provider(db)
        
        # Build a resume-aware prompt
        resume_context = ""
        if resume:
            resume_context = f"""
            Candidate Profile:
            - Key Skills: {resume.parsed_skills}
            - Experience Summary: {resume.parsed_experience[:500]}...
            """

        prompt = f"""
        Given the following dream role description and the candidate's actual resume data, generate 5-10 specific search query configurations.
        
        {resume_context}
        
        User Preference: {dream_role}
        
        The goal is to find jobs that MATCH the candidate's skills while satisfying their requirements (salary, remote, etc.).
        
        Return ONLY a JSON array of objects. Each object MUST have:
        - keywords: string (e.g. "Senior Kotlin Developer Fintech")
        - location: string or null (e.g. "USA", "London", "Remote")
        - min_salary: integer or null
        - remote_only: boolean
        - job_type: string or null (one of: full_time, contract, part_time, internship)
        - hours_old: integer (default 72)
        """
        
        try:
            response_text = provider.complete(prompt, model, api_key)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            search_configs = json.loads(response_text)
            
            saved_results = []
            for cfg in search_configs:
                kw = cfg.get("keywords")
                if not kw: continue
                
                existing = db.query(models.SavedSearch).filter(
                    models.SavedSearch.keywords == kw, 
                    models.SavedSearch.resume_id == resume_id
                ).first()
                
                if not existing:
                    new_search = models.SavedSearch(
                        keywords=kw, 
                        location=cfg.get("location"), 
                        min_salary=cfg.get("min_salary"),
                        remote_only=cfg.get("remote_only", False),
                        job_type=cfg.get("job_type"),
                        hours_old=cfg.get("hours_old", 72),
                        is_verified=False, 
                        resume_id=resume_id
                    )
                    db.add(new_search)
                    db.commit()
                    db.refresh(new_search)
                    saved_results.append(new_search)
                else:
                    saved_results.append(existing)
            
            return saved_results
        except Exception as e:
            logger.error(f">>> SERVICE: Search Net Generation Failure: {str(e)}")
            raise e

    @staticmethod
    def get_saved_searches(db: Session, resume_id: Optional[int] = None):
        query = db.query(models.SavedSearch)
        if resume_id:
            query = query.filter(models.SavedSearch.resume_id == resume_id)
        return query.order_by(models.SavedSearch.is_verified.desc(), models.SavedSearch.created_at.desc()).all()

    @staticmethod
    def update_saved_search(db: Session, search_id: int, is_verified: bool):
        search = db.query(models.SavedSearch).filter(models.SavedSearch.id == search_id).first()
        if search:
            search.is_verified = is_verified
            db.commit()
            db.refresh(search)
        return search

    @staticmethod
    def delete_saved_search(db: Session, search_id: int):
        search = db.query(models.SavedSearch).filter(models.SavedSearch.id == search_id).first()
        if search:
            db.delete(search)
            db.commit()
            return True
        return False

    @staticmethod
    def clear_unverified_searches(db: Session, resume_id: int):
        db.query(models.SavedSearch).filter(
            models.SavedSearch.resume_id == resume_id,
            models.SavedSearch.is_verified == False
        ).delete()
        db.commit()
        return True

    @classmethod
    async def run_verified_searches(cls, db: Session, resume_id: Optional[int] = None):
        query = db.query(models.SavedSearch).filter(models.SavedSearch.is_verified == True)
        if resume_id:
            query = query.filter(models.SavedSearch.resume_id == resume_id)
        
        verified_searches = query.all()
        
        # Discourage running more than once a day logic
        now = datetime.utcnow()
        day_ago = now - timedelta(days=1)
        
        recent_run = db.query(models.SavedSearch).filter(
            models.SavedSearch.resume_id == resume_id,
            models.SavedSearch.last_run_at > day_ago
        ).first()
        
        logger.info(f">>> SERVICE: Running {len(verified_searches)} verified searches")
        
        total_found = 0
        total_new = 0
        
        for search in verified_searches:
            levers = {
                "min_salary": search.min_salary,
                "remote_only": search.remote_only,
                "job_type": search.job_type,
                "hours_old": search.hours_old
            }
            
            result = await cls.search_and_store_jobs(db, search.keywords, search.location, **levers)
            total_found += result["found"]
            total_new += result["new"]
            search.last_run_at = datetime.utcnow()
            db.commit()
            await asyncio.sleep(2) 
            
        return {
            "found": total_found, 
            "new": total_new, 
            "was_recent": recent_run is not None,
            "last_run": recent_run.last_run_at.isoformat() if recent_run else None
        }

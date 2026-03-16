import logging
import os
import asyncio
import json
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta
from ..models import models
from .settings_service import SettingsService
from .resume_service import ResumeService
from ..providers.factory import ProviderFactory
from ..core import constants, prompts
from ..schemas.schemas import SavedSearchCreateRequest, SavedSearchUpdateRequest
from typing import List, Optional, Tuple, Any

logger = logging.getLogger("uvicorn")

class JobService:
    """
    Orchestrates job discovery, alignment scoring, and intelligence synthesis.
    """

    # --- HELPER UTILITIES ---

    @staticmethod
    def _clean_json_response(text: str) -> str:
        """Surgically extracts JSON content from AI markdown or conversational preamble."""
        if not text:
            return "[]"
        cleaned = text.strip()
        
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
            
        start_idx = cleaned.find('[')
        dict_start = cleaned.find('{')
        
        if start_idx != -1 and (dict_start == -1 or start_idx < dict_start):
            end_idx = cleaned.rfind(']')
            if end_idx != -1:
                return cleaned[start_idx:end_idx+1]
        
        if dict_start != -1:
            end_idx = cleaned.rfind('}')
            if end_idx != -1:
                return cleaned[dict_start:end_idx+1]
                
        return cleaned

    # --- CORE SEARCH ENGINE ---

    @classmethod
    async def search_and_store_jobs(
        cls,
        db: Session, 
        keywords: str, 
        location: Optional[str] = None, 
        results_wanted: int = constants.DEFAULT_RESULTS_WANTED,
        site_name: List[str] = constants.DEFAULT_SITES,
        **kwargs
    ):
        """Executes parallel searches across providers and persists results."""
        providers = ProviderFactory.get_search_providers(db)
        logger.info(f">>> SERVICE: Orchestrating search with providers: {[p[0] for p in providers]}")
        jsearch_key = SettingsService.get_setting(db, "JSEARCH_API_KEY") or os.getenv("JSEARCH_API_KEY")

        # Step 1: Execute all searches in parallel
        search_tasks = []
        for name, provider in providers:
            provider_kwargs = {**kwargs}
            if name == "jobspy":
                provider_kwargs["site_name"] = site_name
            elif name == "jsearch":
                provider_kwargs["api_key"] = jsearch_key
            
            search_tasks.append(cls._safe_provider_search(provider, name, keywords, location, results_wanted, **provider_kwargs))

        provider_results = await asyncio.gather(*search_tasks)
        
        # Step 2: Consolidate and persist results
        total_found = 0
        total_new = 0
        new_job_ids = []
        
        for name, standardized_jobs in provider_results:
            total_found += len(standardized_jobs)
            for job in standardized_jobs:
                if not job.get('job_url'): continue
                
                db_job = cls._persist_single_job(db, job, name)
                if db_job:
                    total_new += 1
                    new_job_ids.append(db_job.id)
        
        db.commit()
        
        # Step 3: Cleanup (Incremental Deduplication)
        if total_new > 0:
            await cls.deduplicate_jobs(db, target_job_ids=new_job_ids)
        
        return {"found": total_found, "new": total_new}

    @staticmethod
    async def _safe_provider_search(provider: Any, name: str, keywords: str, location: str, results_wanted: int, **kwargs) -> Tuple[str, List[dict]]:
        """Isolated provider search with localized error handling."""
        try:
            if asyncio.iscoroutinefunction(provider.search_jobs):
                jobs = await provider.search_jobs(keywords=keywords, location=location, results_wanted=results_wanted, **kwargs)
            else:
                # Synchronous providers run in a thread to avoid blocking the event loop
                jobs = await asyncio.to_thread(provider.search_jobs, keywords=keywords, location=location, results_wanted=results_wanted, **kwargs)
            return name, jobs
        except Exception as e:
            logger.error(f">>> SERVICE: Provider {name} failed: {str(e)}")
            return name, []

    @staticmethod
    def _persist_single_job(db: Session, job: dict, source_name: str) -> Optional[models.JobListing]:
        """Logic for updating existing or creating new job records."""
        existing = db.query(models.JobListing).filter(models.JobListing.job_url == job['job_url']).first()
        if not existing:
            db_job = models.JobListing(
                title=job['title'],
                company=job['company'],
                location=job['location'],
                description=job['description'],
                job_url=job['job_url'],
                site=job['site'] or source_name,
                posted_at=job['posted_at']
            )
            db.add(db_job)
            return db_job
        else:
            existing.last_seen_at = datetime.utcnow()
            if existing.status == constants.JOB_STATUS_CLOSED:
                existing.status = constants.JOB_STATUS_NEW
            return None

    # --- INTELLIGENCE SYNTHESIS ---

    @classmethod
    async def synthesize_company_intel(cls, db: Session, company_names: List[str]):
        """Batches and parallelizes AI intelligence gathering for companies."""
        if not company_names: return

        logger.info(f">>> SERVICE: Orchestrating intel for {len(company_names)} companies")
        model, api_key, ollama_url = SettingsService.get_ai_credentials(db)
        provider = ProviderFactory.get_ai_provider(db)
        
        if not api_key and "ollama/" not in model.lower():
            logger.warning(">>> SERVICE: Skipping intel - Missing AI credentials")
            return

        # Parallelize batches with a semaphore to respect AI rate limits
        semaphore = asyncio.Semaphore(3) 
        batch_size = 5
        intel_tasks = []
        
        for i in range(0, len(company_names), batch_size):
            batch = company_names[i:i + batch_size]
            intel_tasks.append(cls._synthesize_batch(db, provider, batch, model, api_key, ollama_url, semaphore))

        await asyncio.gather(*intel_tasks)

    @classmethod
    async def _synthesize_batch(cls, db: Session, provider: Any, batch: List[str], model: str, api_key: str, ollama_url: str, semaphore: asyncio.Semaphore):
        """Processes a single batch of companies through the AI provider."""
        async with semaphore:
            prompt = prompts.COMPANY_INTEL_PROMPT.format(companies=", ".join(batch))
            
            try:
                resp_raw = provider.complete(prompt, model, api_key, ollama_url=ollama_url)
                cleaned_json = cls._clean_json_response(resp_raw)
                intel_list = json.loads(cleaned_json)
                
                if isinstance(intel_list, dict): intel_list = [intel_list]

                for intel in intel_list:
                    if not isinstance(intel, dict) or not intel.get("name"): continue
                    cls._upsert_company_intel(db, intel)
                
                db.commit()
            except Exception as e:
                logger.error(f">>> SERVICE: Intel batch failure: {str(e)}")

    @staticmethod
    def _upsert_company_intel(db: Session, intel: dict):
        """Updates or creates a company intelligence record."""
        name = intel.get("name")
        db_intel = db.query(models.CompanyIntel).filter(models.CompanyIntel.name == name).first()
        if not db_intel:
            db_intel = models.CompanyIntel(name=name)
            db.add(db_intel)
        
        db_intel.bio = intel.get("bio", "")
        db_intel.glassdoor_score = intel.get("glassdoor_score", "N/A")
        db_intel.reddit_sentiment = intel.get("reddit_sentiment", "")
        db_intel.twitter_sentiment = intel.get("twitter_sentiment", "")
        db_intel.overall_sentiment_score = intel.get("overall_sentiment_score", 5)
        db_intel.last_updated_at = datetime.utcnow()

    # --- SEARCH NET & RUNNERS ---

    @classmethod
    async def generate_search_net(cls, db: Session, dream_role: str, resume_id: Optional[int] = None) -> List[models.SavedSearch]:
        """Uses AI to generate a mesh of specific search queries based on profile."""
        logger.info(f">>> SERVICE: Weaving search net for role: {dream_role}")
        
        resume = None
        if resume_id:
            resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
            if resume:
                resume.dream_role = dream_role
                db.commit()

        model, api_key, ollama_url = SettingsService.get_ai_credentials(db)
        provider = ProviderFactory.get_ai_provider(db)
        
        if not api_key and "ollama/" not in model.lower():
            raise Exception("AI API Key missing.")

        resume_context = f"Skills: {resume.parsed_skills}\nExperience: {resume.parsed_experience[:500]}" if resume else ""
        prompt = prompts.SEARCH_NET_PROMPT.format(resume_context=resume_context, dream_role=dream_role)
        
        try:
            resp_raw = provider.complete(prompt, model, api_key, ollama_url=ollama_url)
            cleaned_json = cls._clean_json_response(resp_raw)
            configs = json.loads(cleaned_json)
            
            if isinstance(configs, dict): configs = [configs]

            saved_results = []
            for cfg in configs:
                if not isinstance(cfg, dict) or not cfg.get("keywords"): continue
                
                existing = db.query(models.SavedSearch).filter(
                    models.SavedSearch.keywords == cfg.get("keywords"), 
                    models.SavedSearch.resume_id == resume_id
                ).first()
                
                if not existing:
                    new_search = models.SavedSearch(
                        resume_id=resume_id,
                        keywords=cfg.get("keywords"), 
                        location=cfg.get("location"), 
                        min_salary=cfg.get("min_salary"),
                        remote_only=cfg.get("remote_only", False),
                        job_type=cfg.get("job_type"),
                        hours_old=cfg.get("hours_old", constants.DEFAULT_HOURS_OLD)
                    )
                    db.add(new_search)
                    db.commit()
                    db.refresh(new_search)
                    saved_results.append(new_search)
                else:
                    saved_results.append(existing)
            
            return saved_results
        except Exception as e:
            logger.error(f">>> SERVICE: Search net generation failure: {str(e)}")
            raise e

    @classmethod
    async def run_verified_searches(cls, db: Session, resume_id: Optional[int] = None):
        """Executes all verified queries in the net."""
        query = db.query(models.SavedSearch).filter(models.SavedSearch.is_verified == True)
        if resume_id: query = query.filter(models.SavedSearch.resume_id == resume_id)
        
        verified_searches = query.all()
        logger.info(f">>> SERVICE: Deploying net with {len(verified_searches)} queries")
        
        total_found = 0
        total_new = 0
        start_time = datetime.utcnow()
        
        # We run these in sequence to prevent IP-banning from search engines (Indeed/LinkedIn are sensitive)
        for search in verified_searches:
            result = await cls.search_and_store_jobs(
                db, search.keywords, search.location, 
                min_salary=search.min_salary,
                remote_only=search.remote_only,
                job_type=search.job_type,
                hours_old=search.hours_old
            )
            total_found += result["found"]
            total_new += result["new"]
            search.last_run_at = datetime.utcnow()
            db.commit()
            await asyncio.sleep(2) 
            
        # Cleanup stale jobs (Detect closed listings)
        stale_threshold = start_time - timedelta(minutes=5)
        stale_count = db.query(models.JobListing).filter(
            models.JobListing.status == constants.JOB_STATUS_NEW,
            models.JobListing.last_seen_at < stale_threshold
        ).update({models.JobListing.status: constants.JOB_STATUS_CLOSED})
        db.commit()
            
        return {"found": total_found, "new": total_new, "closed": stale_count}

    # --- RANKING ENGINE ---

    @classmethod
    async def rank_jobs(cls, db: Session, resume_id: int, job_ids: Optional[List[int]] = None, limit: Optional[int] = 20):
        """Analyzes and scores job alignment using profile and company intel."""
        resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
        if not resume: raise Exception("Resume not found")

        # Select target jobs
        query = db.query(models.JobListing).filter(models.JobListing.parent_id == None)
        if job_ids:
            query = query.filter(models.JobListing.id.in_(job_ids))
        else:
            already_ranked = db.query(models.JobAlignment.job_id).filter(models.JobAlignment.resume_id == resume_id).all()
            query = query.filter(~models.JobListing.id.in_([r[0] for r in already_ranked]))

        if limit and limit > 0: query = query.limit(limit)
            
        jobs_to_rank = query.all() 
        if not jobs_to_rank: return {"status": "complete", "ranked_count": 0}

        # Step 1: Prepare Intelligence
        companies = list(set([j.company for j in jobs_to_rank]))
        await cls.synthesize_company_intel(db, companies)

        # Step 2: Scoring
        logger.info(f">>> SERVICE: Scoring alignment for {len(jobs_to_rank)} listings")
        model, api_key, ollama_url = SettingsService.get_ai_credentials(db)
        provider = ProviderFactory.get_ai_provider(db)
        
        jobs_payload = []
        for j in jobs_to_rank:
            intel = db.query(models.CompanyIntel).filter(models.CompanyIntel.name == j.company).first()
            intel_ctx = f"Vibe: {intel.overall_sentiment_score}/10. Glassdoor: {intel.glassdoor_score}. Reddit: {intel.reddit_sentiment}" if intel else ""
            
            jobs_payload.append({
                "id": j.id,
                "title": j.title,
                "company": j.company,
                "description": j.description[:1500] if j.description else "",
                "company_context": intel_ctx
            })

        profile_context = f"Skills: {resume.parsed_skills}\nDream Role: {resume.dream_role}"
        prompt = prompts.JOB_RANKING_PROMPT.format(profile_context=profile_context, jobs_json=json.dumps(jobs_payload))
        
        try:
            resp_raw = provider.complete(prompt, model, api_key, ollama_url=ollama_url)
            results = json.loads(cls._clean_json_response(resp_raw))
            if isinstance(results, dict): results = [results]

            count = 0
            for res in results:
                alignment = models.JobAlignment(
                    job_id=res.get("id"),
                    resume_id=resume_id,
                    score_skills=res.get("score_skills", 0),
                    score_culture=res.get("score_culture", 0),
                    score_overall=res.get("score_overall", 0),
                    ai_insight=res.get("ai_insight", "")
                )
                db.add(alignment)
                count += 1
            
            db.commit()
            return {"status": "success", "ranked_count": count}
        except Exception as e:
            logger.error(f">>> SERVICE: Ranking failure: {str(e)}")
            raise e

    # --- DEDUPLICATION ---

    @classmethod
    async def deduplicate_jobs(cls, db: Session, target_job_ids: Optional[List[int]] = None):
        """
        Incremental AI deduplication.
        Focuses only on companies that have 'fresh' jobs to reduce processing time.
        """
        logger.info(">>> SERVICE: Orchestrating incremental deduplication")
        
        # Step 1: Identify companies needing inspection
        if target_job_ids:
            companies_to_check = db.query(models.JobListing.company).filter(models.JobListing.id.in_(target_job_ids)).distinct().all()
        else:
            # Fallback to full check if no targets provided (safety)
            companies_to_check = db.query(models.JobListing.company).filter(models.JobListing.parent_id == None, models.JobListing.status == constants.JOB_STATUS_NEW).distinct().all()
            
        company_names = [c[0] for c in companies_to_check]
        if not company_names: return {"status": "complete", "deduped_count": 0}

        # Step 2: Batch process by company
        deduped_count = 0
        model, api_key, ollama_url = SettingsService.get_ai_credentials(db)
        provider = ProviderFactory.get_ai_provider(db)

        for company in company_names:
            # For each company, fetch all primary candidates
            group = db.query(models.JobListing).filter(
                models.JobListing.company == company,
                models.JobListing.parent_id == None,
                models.JobListing.status != constants.JOB_STATUS_DUPLICATE
            ).all()
            
            if len(group) < 2: continue
            
            prompt = prompts.DEDUPLICATION_PROMPT.format(company=company, jobs_json=json.dumps([{'id': j.id, 'title': j.title} for j in group]))
            
            try:
                resp_raw = provider.complete(prompt, model, api_key, ollama_url=ollama_url)
                dup_groups = json.loads(cls._clean_json_response(resp_raw))
                
                for dg in dup_groups:
                    if not isinstance(dg, list) or len(dg) < 2: continue
                    primary_id = dg[0]
                    for dup_id in dg[1:]:
                        dup_job = db.query(models.JobListing).filter(models.JobListing.id == dup_id).first()
                        if dup_job:
                            dup_job.parent_id = primary_id
                            dup_job.status = constants.JOB_STATUS_DUPLICATE
                            deduped_count += 1
                db.commit()
            except: continue
                
        return {"status": "success", "deduped_count": deduped_count}

    # --- DATA ACCESS ---

    @staticmethod
    def get_jobs(db: Session, status: Optional[str] = None):
        query = db.query(models.JobListing).filter(models.JobListing.parent_id == None)
        if status: query = query.filter(models.JobListing.status == status)
        return query.order_by(models.JobListing.created_at.desc()).all()

    @staticmethod
    def get_saved_searches(db: Session, resume_id: Optional[int] = None):
        query = db.query(models.SavedSearch)
        if resume_id: query = query.filter(models.SavedSearch.resume_id == resume_id)
        return query.order_by(models.SavedSearch.is_verified.desc(), models.SavedSearch.created_at.desc()).all()

    @staticmethod
    def create_saved_search(db: Session, request: SavedSearchCreateRequest):
        new_search = models.SavedSearch(**request.model_dump())
        db.add(new_search)
        db.commit()
        db.refresh(new_search)
        return new_search

    @staticmethod
    def update_saved_search(db: Session, search_id: int, request: SavedSearchUpdateRequest):
        search = db.query(models.SavedSearch).filter(models.SavedSearch.id == search_id).first()
        if not search: return None
        for key, value in request.model_dump(exclude_unset=True).items():
            setattr(search, key, value)
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
        db.query(models.SavedSearch).filter(models.SavedSearch.resume_id == resume_id, models.SavedSearch.is_verified == False).delete()
        db.commit()
        return True

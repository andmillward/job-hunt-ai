import logging
import os
import asyncio
import json
from sqlalchemy.orm import Session
from sqlalchemy import or_
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
    def _clean_json_response(text: str) -> str:
        """Extracts JSON content from potentially markdown-wrapped AI responses."""
        if not text:
            return "[]"
        cleaned = text.strip()
        
        # Handle triple backticks
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
            
        # Remove any non-JSON prefix/suffix (common with conversational models)
        start_idx = cleaned.find('[')
        dict_start = cleaned.find('{')
        
        # If [ comes first or there is no {
        if start_idx != -1 and (dict_start == -1 or start_idx < dict_start):
            end_idx = cleaned.rfind(']')
            if end_idx != -1:
                return cleaned[start_idx:end_idx+1]
        
        # If { comes first or there is no [
        if dict_start != -1:
            end_idx = cleaned.rfind('}')
            if end_idx != -1:
                return cleaned[dict_start:end_idx+1]
                
        return cleaned

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
        
        # Automatically trigger deduplication for new items
        await cls.deduplicate_jobs(db)
        
        return {"found": total_found, "new": total_new}

    @classmethod
    async def synthesize_company_intel(cls, db: Session, company_names: List[str]):
        if not company_names:
            return

        logger.info(f">>> SERVICE: Synthesizing intel for {len(company_names)} companies (batched)")
        
        model = SettingsService.get_setting(db, "AI_MODEL") or "gemini/gemini-1.5-flash"
        gemini_key = SettingsService.get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        ollama_url = SettingsService.get_setting(db, "OLLAMA_URL") or "http://localhost:11434"
        api_key = gemini_key
        
        provider = ResumeService.get_provider(db)
        
        # Validation for non-ollama
        if not api_key and "ollama/" not in model.lower():
            logger.warning(">>> SERVICE: Skipping company intel synthesis - API Key missing")
            return

        # Process in batches of 5 for deep sentiment analysis to avoid overloading context/rate limits
        batch_size = 5
        for i in range(0, len(company_names), batch_size):
            batch = company_names[i:i + batch_size]
            
            prompt = f"""
            Provide company intelligence for the following companies. 
            For each, research (or use internal knowledge) to provide:
            1. A brief bio/synopsis.
            2. Estimated Glassdoor rating.
            3. Recent Reddit sentiment summary (what employees/users are saying).
            4. Twitter (X) vibe (is the company trending, controversial, or stable).
            5. An overall sentiment score from 1-10 (10 being best place to work).
            
            Companies: {", ".join(batch)}
            
            Return ONLY a JSON array of objects. Each object MUST have:
            - name: string (exactly as provided)
            - bio: string (max 250 chars)
            - glassdoor_score: string (e.g. "4.2/5")
            - reddit_sentiment: string (max 200 chars)
            - twitter_sentiment: string (max 200 chars)
            - overall_sentiment_score: integer (1-10)
            """
            
            try:
                resp_raw = provider.complete(prompt, model, api_key, ollama_url=ollama_url)
                cleaned_json = cls._clean_json_response(resp_raw)
                intel_list = json.loads(cleaned_json)
                
                # Ensure it's a list
                if isinstance(intel_list, dict):
                    intel_list = [intel_list]

                for intel in intel_list:
                    if not isinstance(intel, dict): continue
                    
                    name = intel.get("name")
                    if not name: continue
                    
                    # Update or Create
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
                    
                db.commit()
                # Brief pause between batches if many to respect AI rate limits
                if len(company_names) > batch_size:
                    await asyncio.sleep(2)
            except Exception as e:
                logger.error(f">>> SERVICE: Failed to synthesize batch {i}: {str(e)}")

    @staticmethod
    def get_jobs(db: Session, status: Optional[str] = None, resume_id: Optional[int] = None):
        # Only return parent jobs (primary listings)
        query = db.query(models.JobListing).filter(models.JobListing.parent_id == None)
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
        
        resume = None
        if resume_id:
            resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
            if resume:
                resume.dream_role = dream_role
                db.commit()

        model = SettingsService.get_setting(db, "AI_MODEL") or "gemini/gemini-1.5-flash"
        gemini_key = SettingsService.get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        openai_key = SettingsService.get_setting(db, "OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
        ollama_url = SettingsService.get_setting(db, "OLLAMA_URL") or "http://localhost:11434"
        api_key = gemini_key if "gemini" in model.lower() else openai_key
        
        provider = ResumeService.get_provider(db)
        
        if not api_key and "ollama/" not in model.lower():
            raise Exception("AI API Key missing. Configure in Settings.")

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
        
        Return ONLY a JSON array of objects. Each object MUST have:
        - keywords: string (e.g. "Senior Kotlin Developer Fintech")
        - location: string or null (e.g. "USA", "London", "Remote")
        - min_salary: integer or null
        - remote_only: boolean
        - job_type: string or null (one of: full_time, contract, part_time, internship)
        - hours_old: integer (default 72)
        """
        
        try:
            response_text_raw = provider.complete(prompt, model, api_key, ollama_url=ollama_url)
            cleaned_json = cls._clean_json_response(response_text_raw)
            search_configs = json.loads(cleaned_json)
            
            if isinstance(search_configs, dict):
                search_configs = [search_configs]

            saved_results = []
            for cfg in search_configs:
                if not isinstance(cfg, dict): continue
                
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
        start_time = datetime.utcnow()
        
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
            
        # MIL-45: Staleness Logic
        stale_threshold = start_time - timedelta(minutes=5)
        stale_count = db.query(models.JobListing).filter(
            models.JobListing.status == "new",
            models.JobListing.last_seen_at < stale_threshold
        ).update({models.JobListing.status: "closed"})
        db.commit()
            
        return {
            "found": total_found, 
            "new": total_new, 
            "closed": stale_count,
            "was_recent": recent_run is not None,
            "last_run": recent_run.last_run_at.isoformat() if recent_run else None
        }

    # --- MIL-44: Ranking Engine ---

    @classmethod
    async def rank_jobs(cls, db: Session, resume_id: int, job_ids: Optional[List[int]] = None, limit: Optional[int] = 20):
        resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
        if not resume:
            raise Exception("Resume profile not found")

        # Get jobs to rank
        query = db.query(models.JobListing).filter(models.JobListing.parent_id == None)
        if job_ids:
            query = query.filter(models.JobListing.id.in_(job_ids))
        else:
            already_ranked = db.query(models.JobAlignment.job_id).filter(models.JobAlignment.resume_id == resume_id).all()
            already_ranked_ids = [r[0] for r in already_ranked]
            query = query.filter(~models.JobListing.id.in_(already_ranked_ids))

        if limit and limit > 0:
            query = query.limit(limit)
            
        jobs_to_rank = query.all() 
        if not jobs_to_rank:
            return {"status": "complete", "ranked_count": 0}

        # --- STEP 1: Ensure Company Intel exists for this batch ---
        companies_needed = list(set([j.company for j in jobs_to_rank]))
        existing_intel = db.query(models.CompanyIntel.name).filter(models.CompanyIntel.name.in_(companies_needed)).all()
        existing_names = [r[0] for r in existing_intel]
        missing_names = [c for c in companies_needed if c not in existing_names]
        
        if missing_names:
            logger.info(f">>> SERVICE: Missing intel for {len(missing_names)} companies in ranking batch. Fetching...")
            await cls.synthesize_company_intel(db, missing_names)

        # --- STEP 2: Scored the batch with Company Context ---
        logger.info(f">>> SERVICE: Ranking batch of {len(jobs_to_rank)} jobs for resume {resume_id}")

        model = SettingsService.get_setting(db, "AI_MODEL") or "gemini/gemini-1.5-flash"
        gemini_key = SettingsService.get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        ollama_url = SettingsService.get_setting(db, "OLLAMA_URL") or "http://localhost:11434"
        api_key = gemini_key 
        
        provider = ResumeService.get_provider(db)
        
        if not api_key and "ollama/" not in model.lower():
            raise Exception("AI API Key missing.")

        # Build context from resume
        context = f"""
        User Dream Role Preferences: {resume.dream_role}
        User Technical Skills: {resume.parsed_skills}
        """
        
        jobs_data = []
        for j in jobs_to_rank:
            # Attach intel if available for prompt context
            intel = db.query(models.CompanyIntel).filter(models.CompanyIntel.name == j.company).first()
            intel_context = ""
            if intel:
                intel_context = f"Company Sentiment: {intel.overall_sentiment_score}/10. Glassdoor: {intel.glassdoor_score}. Reddit info: {intel.reddit_sentiment}"

            jobs_data.append({
                "id": j.id,
                "title": j.title,
                "company": j.company,
                "description": j.description[:1500] if j.description else "",
                "company_context": intel_context
            })

        prompt = f"""
        Score the following batch of job listings against the user profile.
        Use the 'company_context' provided to influence the 'score_culture' and 'score_overall'.
        
        {context}
        
        Job Listings to Score:
        {json.dumps(jobs_data, indent=2)}
        
        Return ONLY a JSON array of objects. Each object MUST include:
        - id: the integer ID of the job from the input list
        - score_skills: integer (1-10)
        - score_culture: integer (1-10, based on benefits/paternity/PTO/remote preferences AND the provided company context)
        - score_overall: integer (1-10)
        - ai_insight: string (max 150 chars, specific reason for alignment including company vibe if relevant)
        """
        
        try:
            resp_raw = provider.complete(prompt, model, api_key, ollama_url=ollama_url)
            cleaned_json = cls._clean_json_response(resp_raw)
            logger.info(f">>> SERVICE: AI returned {len(cleaned_json)} chars of JSON for ranking")
            results_list = json.loads(cleaned_json)
            
            if isinstance(results_list, dict):
                results_list = [results_list]

            saved_count = 0
            for res in results_list:
                if not isinstance(res, dict): continue
                
                job_id = res.get("id")
                if not job_id: continue
                
                alignment = models.JobAlignment(
                    job_id=job_id,
                    resume_id=resume_id,
                    score_skills=res.get("score_skills", 0),
                    score_culture=res.get("score_culture", 0),
                    score_overall=res.get("score_overall", 0),
                    ai_insight=res.get("ai_insight", "")
                )
                db.add(alignment)
                saved_count += 1
            
            db.commit()
            logger.info(f">>> SERVICE: Successfully persisted {saved_count} alignments for resume {resume_id}")
            return {"status": "success", "ranked_count": saved_count}
            
        except Exception as e:
            logger.error(f">>> SERVICE: Batch Ranking Failure: {str(e)}")
            raise e

    # --- MIL-45: Deduplication ---

    @classmethod
    async def deduplicate_jobs(cls, db: Session):
        logger.info(">>> SERVICE: Running AI Deduplication")
        jobs = db.query(models.JobListing).filter(models.JobListing.parent_id == None, models.JobListing.status != "duplicate").all()
        
        company_groups = {}
        for job in jobs:
            if job.company not in company_groups:
                company_groups[job.company] = []
            company_groups[job.company].append(job)
            
        deduped_count = 0
        
        for company, group in company_groups.items():
            if len(group) < 2: continue
            
            model = SettingsService.get_setting(db, "AI_MODEL") or "gemini/gemini-1.5-flash"
            gemini_key = SettingsService.get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
            ollama_url = SettingsService.get_setting(db, "OLLAMA_URL") or "http://localhost:11434"
            api_key = gemini_key
            
            provider = ResumeService.get_provider(db)
            
            if not api_key and "ollama/" not in model.lower(): continue
            
            group_data = [{"id": j.id, "title": j.title} for j in group]
            
            prompt = f"""
            Identify which of the following job titles from company '{company}' are effectively the same job listing.
            
            Jobs:
            {json.dumps(group_data, indent=2)}
            
            Return ONLY a JSON array of arrays. Each inner array is a group of IDs that are duplicates.
            The FIRST ID in each inner array will be considered the 'Primary' listing.
            """
            
            try:
                resp_raw = provider.complete(prompt, model, api_key, ollama_url=ollama_url)
                cleaned_json = cls._clean_json_response(resp_raw)
                duplicate_groups = json.loads(cleaned_json)
                
                if not isinstance(duplicate_groups, list): continue

                for dg in duplicate_groups:
                    if not isinstance(dg, list) or len(dg) < 2: continue
                    primary_id = dg[0]
                    for dup_id in dg[1:]:
                        dup_job = db.query(models.JobListing).filter(models.JobListing.id == dup_id).first()
                        if dup_job:
                            dup_job.parent_id = primary_id
                            dup_job.status = "duplicate"
                            deduped_count += 1
                db.commit()
            except Exception as e:
                logger.error(f">>> SERVICE: Deduplication batch failed: {str(e)}")
                
        return {"status": "success", "deduped_count": deduped_count}

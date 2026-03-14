from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.job_service import JobService
from ..schemas.schemas import JobSearchRequest, JobListingResponse, SearchNetRequest, SavedSearchResponse, RunVerifiedRequest, RankJobsRequest, SavedSearchCreateRequest, SavedSearchUpdateRequest
from typing import List, Optional

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/search-net", response_model=List[SavedSearchResponse])
async def generate_search_net(request: SearchNetRequest, db: Session = Depends(get_db)):
    try:
        searches = await JobService.generate_search_net(db, request.dream_role, request.resume_id)
        return searches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/saved-searches", response_model=List[SavedSearchResponse])
def get_saved_searches(resume_id: Optional[int] = None, db: Session = Depends(get_db)):
    return JobService.get_saved_searches(db, resume_id)

@router.post("/saved-searches", response_model=SavedSearchResponse)
def create_saved_search(request: SavedSearchCreateRequest, db: Session = Depends(get_db)):
    return JobService.create_saved_search(db, request)

@router.patch("/saved-searches/{search_id}", response_model=SavedSearchResponse)
def update_saved_search(search_id: int, request: SavedSearchUpdateRequest, db: Session = Depends(get_db)):
    search = JobService.update_saved_search(db, search_id, request)
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    return search

@router.delete("/saved-searches/{search_id}")
def delete_saved_search(search_id: int, db: Session = Depends(get_db)):
    success = JobService.delete_saved_search(db, search_id)
    if not success:
        raise HTTPException(status_code=404, detail="Search not found")
    return {"status": "success"}

@router.delete("/saved-searches/unverified/{resume_id}")
def clear_unverified_searches(resume_id: int, db: Session = Depends(get_db)):
    JobService.clear_unverified_searches(db, resume_id)
    return {"status": "success"}

@router.post("/run-verified")
async def run_verified_searches(request: RunVerifiedRequest, db: Session = Depends(get_db)):
    try:
        return await JobService.run_verified_searches(db, request.resume_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rank")
async def rank_jobs(request: RankJobsRequest, db: Session = Depends(get_db)):
    try:
        return await JobService.rank_jobs(db, request.resume_id, request.job_ids, request.limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_jobs(request: JobSearchRequest, db: Session = Depends(get_db)):
    try:
        result = await JobService.search_and_store_jobs(
            db, request.keywords, request.location, request.results_wanted, request.site_name
        )
        return {"status": "success", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[JobListingResponse])
def get_jobs(status: Optional[str] = None, db: Session = Depends(get_db)):
    jobs = JobService.get_jobs(db, status)
    return jobs

@router.patch("/{job_id}/status")
def update_job_status(job_id: int, status: str, db: Session = Depends(get_db)):
    from ..models import models
    job = db.query(models.JobListing).filter(models.JobListing.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = status
    db.commit()
    return {"status": "success"}

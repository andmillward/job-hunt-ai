from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.job_service import JobService
from ..schemas.schemas import JobSearchRequest, JobListingResponse
from typing import List, Optional

router = APIRouter(prefix="/jobs", tags=["jobs"])

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
    return [
        {
            "id": j.id,
            "title": j.title,
            "company": j.company,
            "location": j.location,
            "description": j.description,
            "job_url": j.job_url,
            "site": j.site,
            "status": j.status,
            "created_at": j.created_at.isoformat()
        }
        for j in jobs
    ]

@router.patch("/{job_id}/status")
def update_job_status(job_id: int, status: str, db: Session = Depends(get_db)):
    job = JobService.update_job_status(db, job_id, status)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"status": "success"}

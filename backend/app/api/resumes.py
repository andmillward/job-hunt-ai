from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.resume_service import ResumeService
from ..services.automation_service import AutomationService
from ..schemas.schemas import ResumeResponse, ResumeUpdateRequest
from typing import List, Optional

router = APIRouter(prefix="/resumes", tags=["resumes"])

@router.post("", response_model=ResumeResponse)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    resume = await ResumeService.process_resume_upload(file.filename, await file.read(), db)
    return resume

@router.get("", response_model=List[ResumeResponse])
def get_resumes(db: Session = Depends(get_db)):
    resumes = ResumeService.get_all_resumes(db)
    return resumes

@router.patch("/{resume_id}", response_model=ResumeResponse)
def update_resume(resume_id: int, request: ResumeUpdateRequest, db: Session = Depends(get_db)):
    resume = ResumeService.update_resume(db, resume_id, request)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

@router.delete("/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    success = ResumeService.delete_resume(db, resume_id)
    if not success:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"status": "success"}

@router.get("/{resume_id}/automation-script")
def get_automation_script(resume_id: int, platform: str = "general", db: Session = Depends(get_db)):
    try:
        script = AutomationService.generate_greasemonkey_script(db, resume_id, platform)
        return Response(content=script, media_type="text/javascript")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

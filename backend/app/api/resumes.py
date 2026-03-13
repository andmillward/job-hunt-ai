from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..services.resume_service import ResumeService
from ..schemas.schemas import ResumeResponse
from typing import List

router = APIRouter(prefix="/resumes", tags=["resumes"])

@router.post("", response_model=ResumeResponse)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    resume = await ResumeService.process_resume_upload(file.filename, await file.read(), db)
    return {
        "id": resume.id,
        "fileName": resume.file_name,
        "parsedSkills": resume.parsed_skills,
        "parsedExperience": resume.parsed_experience,
        "parsedEducation": resume.parsed_education,
        "createdAt": resume.created_at.isoformat()
    }

@router.get("", response_model=List[ResumeResponse])
def get_resumes(db: Session = Depends(get_db)):
    resumes = ResumeService.get_all_resumes(db)
    return [
        {
            "id": r.id,
            "fileName": r.file_name,
            "parsedSkills": r.parsed_skills,
            "parsedExperience": r.parsed_experience,
            "parsedEducation": r.parsed_education,
            "createdAt": r.created_at.isoformat()
        }
        for r in resumes
    ]

@router.delete("/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    success = ResumeService.delete_resume(db, resume_id)
    if not success:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"status": "success"}

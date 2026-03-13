from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any
from datetime import datetime

class JobSearchRequest(BaseModel):
    keywords: str
    location: Optional[str] = None
    results_wanted: int = 50
    site_name: List[str] = ["linkedin", "indeed", "glassdoor", "zip_recruiter"]
    min_salary: Optional[int] = None
    remote_only: bool = False
    job_type: Optional[str] = None
    hours_old: int = 72

class SettingUpdate(BaseModel):
    key: str
    value: str

class ResumeResponse(BaseModel):
    id: int
    fileName: str
    parsedSkills: Optional[str]
    parsedExperience: Optional[str]
    parsedEducation: Optional[str]
    dreamRole: Optional[str] = None
    createdAt: Any

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class JobListingResponse(BaseModel):
    id: int
    title: str
    company: str
    location: Optional[str]
    description: Optional[str]
    job_url: Optional[str]
    site: Optional[str]
    status: str
    created_at: Any

    model_config = ConfigDict(from_attributes=True)

class SavedSearchResponse(BaseModel):
    id: int
    keywords: str
    location: Optional[str]
    min_salary: Optional[int]
    remote_only: bool
    job_type: Optional[str]
    hours_old: int
    is_verified: bool
    last_run_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SearchNetRequest(BaseModel):
    dream_role: str
    resume_id: Optional[int] = None

class RunVerifiedRequest(BaseModel):
    resume_id: int

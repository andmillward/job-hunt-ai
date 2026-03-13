from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class JobSearchRequest(BaseModel):
    keywords: str
    location: Optional[str] = None
    results_wanted: int = 20
    site_name: List[str] = ["linkedin", "indeed", "glassdoor", "zip_recruiter"]

class SettingUpdate(BaseModel):
    key: str
    value: str

class ResumeResponse(BaseModel):
    id: int
    fileName: str
    parsedSkills: Optional[str]
    parsedExperience: Optional[str]
    parsedEducation: Optional[str]
    createdAt: str

    class Config:
        from_attributes = True

class JobListingResponse(BaseModel):
    id: int
    title: str
    company: str
    location: Optional[str]
    description: Optional[str]
    job_url: Optional[str]
    site: Optional[str]
    status: str
    created_at: str

    class Config:
        from_attributes = True

class SavedSearchResponse(BaseModel):
    id: int
    keywords: str
    location: Optional[str]
    is_verified: bool
    last_run_at: Optional[str]
    created_at: str

    class Config:
        from_attributes = True

class SearchNetRequest(BaseModel):
    dream_role: str
    location: Optional[str] = None

class SavedSearchResponse(BaseModel):
    id: int
    keywords: str
    location: Optional[str]
    is_verified: bool
    last_run_at: Optional[str]
    created_at: str

    class Config:
        from_attributes = True

class SearchNetRequest(BaseModel):
    dream_role: str
    location: Optional[str] = None

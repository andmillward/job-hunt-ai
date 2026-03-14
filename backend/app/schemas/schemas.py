from pydantic import BaseModel, ConfigDict, Field
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

class CompanyIntelResponse(BaseModel):
    name: str
    bio: Optional[str]
    glassdoor_score: Optional[str]
    reddit_sentiment: Optional[str] = None
    twitter_sentiment: Optional[str] = None
    overall_sentiment_score: Optional[int] = 5
    last_updated_at: Any

    model_config = ConfigDict(from_attributes=True)

class JobAlignmentResponse(BaseModel):
    id: int
    score_skills: int
    score_culture: int
    score_overall: int
    ai_insight: Optional[str]
    created_at: Any

    model_config = ConfigDict(from_attributes=True)

class ResumeResponse(BaseModel):
    id: int
    fileName: str = Field(validation_alias="file_name")
    parsedSkills: Optional[str] = Field(None, validation_alias="parsed_skills")
    parsedExperience: Optional[str] = Field(None, validation_alias="parsed_experience")
    parsedEducation: Optional[str] = Field(None, validation_alias="parsed_education")
    dreamRole: Optional[str] = Field(None, validation_alias="dream_role")
    createdAt: datetime = Field(validation_alias="created_at")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ResumeUpdateRequest(BaseModel):
    file_name: Optional[str] = None
    parsed_skills: Optional[str] = None
    parsed_experience: Optional[str] = None
    parsed_education: Optional[str] = None
    dream_role: Optional[str] = None

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
    
    # MIL-45: Grouping
    parent_id: Optional[int] = None
    
    # MIL-44: Alignments for the current resume
    alignments: List[JobAlignmentResponse] = []
    
    # NEW: Company Intel
    company_intel: Optional[CompanyIntelResponse] = None

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

class SavedSearchCreateRequest(BaseModel):
    resume_id: int
    keywords: str
    location: Optional[str] = None
    min_salary: Optional[int] = None
    remote_only: bool = False
    job_type: Optional[str] = None
    hours_old: int = 72
    is_verified: bool = False

class SavedSearchUpdateRequest(BaseModel):
    keywords: Optional[str] = None
    location: Optional[str] = None
    min_salary: Optional[int] = None
    remote_only: Optional[bool] = None
    job_type: Optional[str] = None
    hours_old: Optional[int] = None
    is_verified: Optional[bool] = None

class SearchNetRequest(BaseModel):
    dream_role: str
    resume_id: Optional[int] = None

class RunVerifiedRequest(BaseModel):
    resume_id: int

class RankJobsRequest(BaseModel):
    resume_id: int
    job_ids: Optional[List[int]] = None
    limit: Optional[int] = 20

from sqlalchemy import Column, Integer, String, Text, DateTime, LargeBinary, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    parsed_skills = Column(Text, nullable=True)
    parsed_experience = Column(Text, nullable=True)
    parsed_education = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    file_data = Column(LargeBinary, nullable=True)
    
    # MIL-43: Store preference for ranking & recurring search
    dream_role = Column(Text, nullable=True)
    
    # Relationship to searches
    searches = relationship("SavedSearch", back_populates="resume", cascade="all, delete-orphan")

    # Property alias for Pydantic
    @property
    def fileName(self):
        return self.file_name
    
    @property
    def parsedSkills(self):
        return self.parsed_skills
    
    @property
    def parsedExperience(self):
        return self.parsed_experience
    
    @property
    def parsedEducation(self):
        return self.parsed_education
    
    @property
    def dreamRole(self):
        return self.dream_role
    
    @property
    def createdAt(self):
        return self.created_at

class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=True)

class JobListing(Base):
    __tablename__ = "job_listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    job_url = Column(String, nullable=True, unique=True)
    site = Column(String, nullable=True) # e.g., linkedin, indeed
    posted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="new") # new, applied, rejected, interviewing, closed

class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=True)
    keywords = Column(String, nullable=False)
    location = Column(String, nullable=True)
    
    # Lever columns
    min_salary = Column(Integer, nullable=True)
    remote_only = Column(Boolean, default=False)
    job_type = Column(String, nullable=True) # full_time, contract, etc
    hours_old = Column(Integer, default=72)
    
    is_verified = Column(Boolean, default=False)
    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship back to resume
    resume = relationship("Resume", back_populates="searches")

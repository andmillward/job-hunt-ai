from sqlalchemy import Column, Integer, String, Text, DateTime, LargeBinary, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship, backref
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
    
    # Relationship to searches and alignments
    searches = relationship("SavedSearch", back_populates="resume", cascade="all, delete-orphan")
    alignments = relationship("JobAlignment", back_populates="resume", cascade="all, delete-orphan")

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
    company = Column(String, nullable=False, index=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    job_url = Column(String, nullable=True, unique=True)
    site = Column(String, nullable=True) # e.g., linkedin, indeed
    posted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="new", index=True) # new, applied, rejected, interviewing, closed, duplicate

    # MIL-45: Support grouping
    parent_id = Column(Integer, ForeignKey("job_listings.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Relationships
    alignments = relationship("JobAlignment", back_populates="job", cascade="all, delete-orphan")
    company_intel = relationship("CompanyIntel", primaryjoin="foreign(JobListing.company) == CompanyIntel.name", uselist=False, viewonly=True)
    duplicates = relationship("JobListing", backref=backref("parent", remote_side=[id]))

class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=True, index=True)
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

class JobAlignment(Base):
    __tablename__ = "job_alignments"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_listings.id", ondelete="CASCADE"))
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"))
    
    score_skills = Column(Integer, default=0)
    score_culture = Column(Integer, default=0)
    score_overall = Column(Integer, default=0)
    ai_insight = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    job = relationship("JobListing", back_populates="alignments")
    resume = relationship("Resume", back_populates="alignments")

    # Optimization Index
    __table_args__ = (
        Index('idx_resume_job_alignment', 'resume_id', 'job_id'),
    )

class CompanyIntel(Base):
    __tablename__ = "company_intel"

    name = Column(String, primary_key=True)
    bio = Column(Text, nullable=True)
    glassdoor_score = Column(String, nullable=True)
    
    # MIL-44 enhanced sentiment
    reddit_sentiment = Column(Text, nullable=True)
    twitter_sentiment = Column(Text, nullable=True)
    overall_sentiment_score = Column(Integer, default=5) # 1-10
    
    last_updated_at = Column(DateTime, default=datetime.utcnow)

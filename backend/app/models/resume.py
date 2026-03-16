from sqlalchemy import Column, Integer, String, Text, DateTime, LargeBinary
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

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

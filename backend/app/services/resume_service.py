import logging
import io
from pypdf import PdfReader
from docx import Document
from sqlalchemy.orm import Session
from ..models import models
from .settings_service import SettingsService
from ..providers.factory import ProviderFactory
from ..core import constants, prompts
from ..schemas.schemas import ResumeUpdateRequest
import os

logger = logging.getLogger("uvicorn")

class ResumeService:
    """
    Handles resume processing, profile management, and AI parsing orchestration.
    """

    # --- TEXT EXTRACTION ---

    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        """Parses raw text from PDF bytes."""
        pdf = PdfReader(io.BytesIO(file_bytes))
        return "\n".join([page.extract_text() for page in pdf.pages])

    @staticmethod
    def extract_text_from_docx(file_bytes: bytes) -> str:
        """Parses raw text from DOCX bytes."""
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([para.text for para in doc.paragraphs])

    # --- AI ORCHESTRATION ---

    @classmethod
    def parse_resume_with_llm(cls, text: str, db: Session) -> dict:
        """Sends extracted text to AI for structured parsing."""
        model, api_key, ollama_url = SettingsService.get_ai_credentials(db)
        provider = ProviderFactory.get_ai_provider(db)
        
        if not api_key and "ollama/" not in model.lower():
            return {"skills": ["Error: API Key missing"], "experience": "Please set your key in Settings.", "education": ""}

        prompt = prompts.RESUME_PARSE_PROMPT.format(text=text)

        try:
            return provider.parse_resume(text, model, api_key, ollama_url=ollama_url)
        except Exception as e:
            logger.error(f">>> SERVICE: AI Parsing Failure: {str(e)}")
            return {
                "skills": ["Error during parsing", str(e)],
                "experience": "The AI engine failed.",
                "education": ""
            }

    # --- PROFILE MANAGEMENT ---

    @classmethod
    async def process_resume_upload(cls, file_name: str, content: bytes, db: Session):
        """Pipeline for storage, text extraction, and AI analysis of a new resume."""
        logger.info(f">>> BACKEND: Processing upload: {file_name}")
        
        db_resume = models.Resume(file_name=file_name, file_data=content)
        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)

        try:
            text = cls._extract_text(file_name, content)
            if text.strip():
                logger.info(f">>> BACKEND: Extracted {len(text)} chars. Handing to AI...")
                parsed_data = cls.parse_resume_with_llm(text, db)
                
                db_resume.parsed_skills = ", ".join(parsed_data.get("skills", []))
                db_resume.parsed_experience = parsed_data.get("experience", "")
                db_resume.parsed_education = parsed_data.get("education", "")
                
                db.commit()
                db.refresh(db_resume)
                logger.info(">>> BACKEND: Parse complete.")
            else:
                logger.warning(">>> BACKEND: No text extracted from file.")
            
        except Exception as e:
            logger.error(f">>> BACKEND: Processing error: {str(e)}")

        return db_resume

    @classmethod
    def _extract_text(cls, file_name: str, content: bytes) -> str:
        """Helper to route extraction based on file extension."""
        ext = file_name.lower()
        if ext.endswith(".pdf"):
            return cls.extract_text_from_pdf(content)
        if ext.endswith(".docx"):
            return cls.extract_text_from_docx(content)
        return content.decode("utf-8", errors="ignore")

    @staticmethod
    def get_all_resumes(db: Session):
        return db.query(models.Resume).order_by(models.Resume.created_at.desc()).all()

    @staticmethod
    def update_resume(db: Session, resume_id: int, request: ResumeUpdateRequest):
        resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
        if not resume: return None
        
        for key, value in request.model_dump(exclude_unset=True).items():
            setattr(resume, key, value)
            
        db.commit()
        db.refresh(resume)
        return resume

    @staticmethod
    def delete_resume(db: Session, resume_id: int):
        resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
        if resume:
            db.delete(resume)
            db.commit()
            return True
        return False

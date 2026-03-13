import logging
import io
from pypdf import PdfReader
from docx import Document
from sqlalchemy.orm import Session
from ..models import models
from .settings_service import SettingsService
from ..providers.ai.gemini_provider import GeminiNativeProvider
from ..providers.ai.litellm_provider import LiteLLMProvider
import os

logger = logging.getLogger("uvicorn")

class ResumeService:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        pdf = PdfReader(io.BytesIO(file_bytes))
        return "\n".join([page.extract_text() for page in pdf.pages])

    @staticmethod
    def extract_text_from_docx(file_bytes: bytes) -> str:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([para.text for para in doc.paragraphs])

    @staticmethod
    def get_provider(db: Session):
        provider_type = SettingsService.get_ai_provider_type(db)
        if provider_type == "native":
            return GeminiNativeProvider()
        return LiteLLMProvider()

    @classmethod
    def parse_resume_with_llm(cls, text: str, db: Session) -> dict:
        model = SettingsService.get_setting(db, "AI_MODEL") or "gemini/gemini-1.5-flash"
        gemini_key = SettingsService.get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
        openai_key = SettingsService.get_setting(db, "OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
        
        api_key = gemini_key if "gemini" in model.lower() else openai_key
        
        if not api_key:
            return {"skills": ["Error: API Key missing"], "experience": "Please set your key in Settings.", "education": ""}

        provider = cls.get_provider(db)
        try:
            return provider.parse_resume(text, model, api_key)
        except Exception as e:
            logger.error(f">>> SERVICE: AI Parsing Failure: {str(e)}")
            return {
                "skills": ["Error during parsing", str(e)],
                "experience": "The AI engine failed.",
                "education": ""
            }

    @classmethod
    async def process_resume_upload(cls, file_name: str, content: bytes, db: Session):
        logger.info(f">>> BACKEND: Processing upload: {file_name}")
        
        db_resume = models.Resume(file_name=file_name, file_data=content)
        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)

        try:
            filename_lower = file_name.lower()
            text = ""
            if filename_lower.endswith(".pdf"):
                text = cls.extract_text_from_pdf(content)
            elif filename_lower.endswith(".docx"):
                text = cls.extract_text_from_docx(content)
            else:
                text = content.decode("utf-8", errors="ignore")

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

    @staticmethod
    def get_all_resumes(db: Session):
        return db.query(models.Resume).order_by(models.Resume.created_at.desc()).all()

    @staticmethod
    def delete_resume(db: Session, resume_id: int):
        resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
        if resume:
            db.delete(resume)
            db.commit()
            return True
        return False

    @staticmethod
    def update_dream_role(db: Session, resume_id: int, dream_role: str):
        resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
        if resume:
            resume.dream_role = dream_role
            db.commit()
            db.refresh(resume)
        return resume

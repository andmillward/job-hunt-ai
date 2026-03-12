import logging
import sys
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import uvicorn
import io
import os
import json
from pypdf import PdfReader
from docx import Document
from litellm import completion
import litellm
import google.generativeai as genai
from jobspy import scrape_jobs
import pandas as pd
from datetime import datetime

from database import engine, Base, get_db
import models

# Version for health check verification
APP_VERSION = "1.0.3-job-search"

# Setup logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger("uvicorn")

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="JobHunt AI Backend")

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Schemas ---
class JobSearchRequest(BaseModel):
    keywords: str
    location: Optional[str] = None
    results_wanted: int = 20
    site_name: List[str] = ["linkedin", "indeed", "glassdoor", "zip_recruiter"]

class SettingUpdate(BaseModel):
    key: str
    value: str

# --- AI Parsing Helpers ---
def extract_text_from_pdf(file_bytes: bytes) -> str:
    pdf = PdfReader(io.BytesIO(file_bytes))
    return "\n".join([page.extract_text() for page in pdf.pages])

def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs])

def get_setting(db: Session, key: str) -> Optional[str]:
    setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    return setting.value if setting else None

def parse_resume_with_llm(text: str, db: Session) -> dict:
    gemini_key = get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    openai_key = get_setting(db, "OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    model = get_setting(db, "AI_MODEL") or "gemini/gemini-1.5-flash"
    
    logger.info(f">>> AI ENGINE (v{APP_VERSION}): Using model {model}")
    
    current_key = None
    if "gemini" in model.lower():
        current_key = gemini_key
        os.environ["GEMINI_API_KEY"] = gemini_key or ""
    else:
        current_key = openai_key
        os.environ["OPENAI_API_KEY"] = openai_key or ""

    if not current_key:
        return {"skills": ["Error: API Key missing"], "experience": "Please set your key in Settings.", "education": ""}

    prompt = f"""
    Extract the following information from the resume text below into a structured JSON format.
    Fields required:
    1. skills: A list of technical and soft skills.
    2. experience: A concise summary of professional experience.
    3. education: A concise summary of educational background.

    Resume Text:
    {text}

    Return ONLY the raw JSON object.
    """

    try:
        content = ""
        if "gemini" in model.lower():
            try:
                logger.info(f">>> AI ENGINE: Using NATIVE Gemini SDK for {model}...")
                genai.configure(api_key=current_key)
                native_name = model.split("/")[-1] if "/" in model else model
                native_name = native_name.replace("-latest", "")
                gemini_model = genai.GenerativeModel(native_name)
                response = gemini_model.generate_content(prompt)
                content = response.text
            except Exception as native_err:
                logger.error(f">>> AI ENGINE: Native SDK failed: {native_err}. Falling back to LiteLLM...")
                resp = completion(model=model, messages=[{"role": "user", "content": prompt}], api_key=current_key)
                content = resp.choices[0].message.content
        else:
            resp = completion(model=model, messages=[{"role": "user", "content": prompt}], api_key=current_key)
            content = resp.choices[0].message.content
        
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        return json.loads(content)
    except Exception as e:
        logger.error(f">>> AI ENGINE: CRITICAL FAILURE: {str(e)}")
        return {
            "skills": ["Error during parsing", str(e)],
            "experience": "The AI engine failed.",
            "education": ""
        }

# --- Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": APP_VERSION}

@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(models.Setting).all()
    return {s.key: s.value for s in settings}

@app.post("/api/settings")
def update_setting(update: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(models.Setting).filter(models.Setting.key == update.key).first()
    if setting:
        setting.value = update.value
    else:
        setting = models.Setting(key=update.key, value=update.value)
        db.add(setting)
    db.commit()
    return {"status": "success"}

@app.get("/api/models/gemini")
def list_gemini_models(db: Session = Depends(get_db)):
    key = get_setting(db, "GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key: return []
    try:
        genai.configure(api_key=key)
        models_list = genai.list_models()
        return [{"id": f"gemini/{m.name.replace('models/', '')}", "name": m.display_name} for m in models_list if "generateContent" in m.supported_generation_methods]
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        return []

@app.post("/api/resumes")
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    db_resume = models.Resume(file_name=file.filename, file_data=content)
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    try:
        filename = file.filename.lower()
        text = ""
        if filename.endswith(".pdf"): text = extract_text_from_pdf(content)
        elif filename.endswith(".docx"): text = extract_text_from_docx(content)
        else: text = content.decode("utf-8", errors="ignore")

        if text.strip():
            parsed_data = parse_resume_with_llm(text, db)
            db_resume.parsed_skills = ", ".join(parsed_data.get("skills", []))
            db_resume.parsed_experience = parsed_data.get("experience", "")
            db_resume.parsed_education = parsed_data.get("education", "")
            db.commit()
            db.refresh(db_resume)
    except Exception as e:
        logger.error(f">>> BACKEND: Processing error: {str(e)}")

    return {
        "id": db_resume.id,
        "fileName": db_resume.file_name,
        "parsedSkills": db_resume.parsed_skills,
        "parsedExperience": db_resume.parsed_experience,
        "parsedEducation": db_resume.parsed_education,
        "createdAt": db_resume.created_at.isoformat()
    }

@app.get("/api/resumes")
def get_resumes(db: Session = Depends(get_db)):
    resumes = db.query(models.Resume).order_by(models.Resume.created_at.desc()).all()
    return [{"id": r.id, "fileName": r.file_name, "parsedSkills": r.parsed_skills, "parsedExperience": r.parsed_experience, "parsedEducation": r.parsed_education, "createdAt": r.created_at.isoformat()} for r in resumes]

@app.post("/api/jobs/search")
async def search_jobs(request: JobSearchRequest, db: Session = Depends(get_db)):
    logger.info(f">>> BACKEND: Starting job search for '{request.keywords}'")
    try:
        jobs = scrape_jobs(
            site_name=request.site_name,
            search_term=request.keywords,
            location=request.location,
            results_wanted=request.results_wanted,
            hours_old=72,
            country_誠="usa",
        )
        
        new_jobs_count = 0
        for _, job in jobs.iterrows():
            job_url = str(job['job_url']) if pd.notnull(job['job_url']) else None
            if not job_url: continue
                
            existing = db.query(models.JobListing).filter(models.JobListing.job_url == job_url).first()
            if not existing:
                # Sanitize: convert NaT/NaN to None
                posted_at = job['date_posted']
                if pd.isna(posted_at):
                    posted_at = None
                else:
                    try:
                        posted_at = pd.to_datetime(posted_at).to_pydatetime()
                    except:
                        posted_at = None

                db_job = models.JobListing(
                    title=str(job['title']) if pd.notnull(job['title']) else "Unknown",
                    company=str(job['company']) if pd.notnull(job['company']) else "Unknown",
                    location=str(job['location']) if pd.notnull(job['location']) else None,
                    description=str(job['description']) if pd.notnull(job['description']) else None,
                    job_url=job_url,
                    site=str(job['site']) if pd.notnull(job['site']) else None,
                    posted_at=posted_at
                )
                db.add(db_job)
                new_jobs_count += 1
        
        db.commit()
        return {"status": "success", "found": len(jobs), "new": new_jobs_count}
    except Exception as e:
        logger.error(f">>> BACKEND: Job search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs")
def get_jobs(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.JobListing)
    if status: query = query.filter(models.JobListing.status == status)
    jobs = query.order_by(models.JobListing.created_at.desc()).all()
    return [{
        "id": j.id, "title": j.title, "company": j.company, "location": j.location,
        "description": j.description, "job_url": j.job_url, "site": j.site,
        "status": j.status, "created_at": j.created_at.isoformat()
    } for j in jobs]

@app.patch("/api/jobs/{job_id}/status")
def update_job_status(job_id: int, status: str, db: Session = Depends(get_db)):
    job = db.query(models.JobListing).filter(models.JobListing.id == job_id).first()
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    job.status = status
    db.commit()
    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True, log_level="info")

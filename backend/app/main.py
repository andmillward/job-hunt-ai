import logging
import sys
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .api import resumes, jobs, settings

# Version for health check verification
APP_VERSION = "1.1.5-provider-sync-fix"

# Setup logging
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger("uvicorn")

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="JobHunt AI Backend")

@app.on_event("startup")
async def startup_event():
    loop = asyncio.get_running_loop()
    logger.info(f">>> BACKEND: App starting up. Active loop: {type(loop).__name__}")
    # Note: We are using sync_playwright + to_thread for scrapers, 
    # so the loop type (Selector vs Proactor) no longer matters for Playwright compatibility.

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(resumes.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(settings.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": APP_VERSION}

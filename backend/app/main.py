import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .database import engine, Base
from .api import resumes, jobs, settings

# Version for health check verification
APP_VERSION = "1.1.0-modular"

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

# Include Routers
app.include_router(resumes.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(settings.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": APP_VERSION}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True, log_level="info")

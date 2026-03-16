import logging
import json
from sqlalchemy.orm import Session
from ..models import models
from ..core import templates

logger = logging.getLogger("uvicorn")

class AutomationService:
    """
    Handles generation of browser-based automation tools like GreaseMonkey scripts.
    """

    @staticmethod
    def generate_greasemonkey_script(db: Session, resume_id: int, platform: str = "general") -> str:
        """
        Generates a custom GreaseMonkey script pre-loaded with the user's profile data.
        """
        resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
        if not resume:
            raise Exception("Resume not found")

        # Select match patterns based on platform
        platform_matches = {
            "workday": ["*://*.workday.com/*"],
            "greenhouse": ["*://*.greenhouse.io/*"],
            "general": ["*://*.workday.com/*", "*://*.greenhouse.io/*", "*://*.lever.co/*", "*://*.ashbyhq.com/*"]
        }
        
        matches = platform_matches.get(platform, platform_matches["general"])
        match_str = "\n".join([f"// @match        {m}" for m in matches])

        user_data = {
            "skills": resume.parsed_skills or "",
            "experience": resume.parsed_experience or "",
            "education": resume.parsed_education or ""
        }

        return templates.GREASEMONKEY_SCRIPT_TEMPLATE.format(
            platform_cap=platform.capitalize(),
            match_str=match_str,
            user_data_json=json.dumps(user_data, indent=4)
        )

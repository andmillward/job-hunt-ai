import logging
from sqlalchemy.orm import Session
from ..models import models
from .settings_service import SettingsService
import json
import os

logger = logging.getLogger("uvicorn")

class AutomationService:
    @staticmethod
    def generate_greasemonkey_script(db: Session, resume_id: int, platform: str = "general") -> str:
        resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
        if not resume:
            raise Exception("Resume not found")

        # Prepare user data for the script
        user_data = {
            "full_name": "Applicant", # We might want to add name parsing to Resume model later
            "skills": resume.parsed_skills or "",
            "experience": resume.parsed_experience or "",
            "education": resume.parsed_education or ""
        }

        # Select match patterns based on platform
        matches = ["*://*.workday.com/*", "*://*.greenhouse.io/*", "*://*.lever.co/*", "*://*.ashbyhq.com/*"]
        if platform == "workday":
            matches = ["*://*.workday.com/*"]
        elif platform == "greenhouse":
            matches = ["*://*.greenhouse.io/*"]

        match_str = "\n".join([f"// @match        {m}" for m in matches])

        script = f"""// ==UserScript==
// @name         JobHunt AI - Auto-Fill ({platform.capitalize()})
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Intelligent auto-fill for job applications using your JobHunt AI persona.
// @author       JobHunt AI
{match_str}
// @grant        none
// ==UserScript==

(function() {{
    'use strict';

    const USER_DATA = {json.dumps(user_data, indent=4)};

    console.log(">>> JobHunt AI: Automation Script Active");

    // Helper to find and fill fields
    function fillField(keywords, value) {{
        if (!value) return;
        const inputs = document.querySelectorAll('input, textarea, select');
        for (const input of inputs) {{
            const label = input.getAttribute('aria-label') || '';
            const name = input.getAttribute('name') || '';
            const placeholder = input.getAttribute('placeholder') || '';
            const id = input.id || '';
            
            const combined = (label + " " + name + " " + placeholder + " " + id).toLowerCase();
            
            if (keywords.some(k => combined.includes(k.toLowerCase()))) {{
                if (input.tagName === 'SELECT') {{
                    // Selection logic could be complex, just log for now
                    console.log(">>> JobHunt AI: Found select for", keywords);
                }} else if (!input.value) {{
                    input.value = value;
                    input.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    input.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    console.log(">>> JobHunt AI: Filled", keywords);
                }}
            }}
        }}
    }}

    // UI Overlay for triggering fill
    const btn = document.createElement('button');
    btn.innerHTML = '⚡ Fill with JobHunt AI';
    btn.style.position = 'fixed';
    btn.style.top = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '99999';
    btn.style.padding = '12px 20px';
    btn.style.backgroundColor = '#4f46e5';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '12px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    
    btn.onclick = () => {{
        fillField(['skill', 'technical'], USER_DATA.skills);
        fillField(['experience', 'summary', 'describe'], USER_DATA.experience);
        fillField(['education'], USER_DATA.education);
        alert("JobHunt AI persona data injected.");
    }};

    document.body.appendChild(btn);

}})();
"""
        return script

import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from .base import BaseSearchProvider
from playwright.sync_api import sync_playwright
import urllib.parse

logger = logging.getLogger("uvicorn")

class JobCatcherProvider(BaseSearchProvider):
    """
    Specialized deep-scraper for platforms that require browser emulation.
    Uses sync_playwright run in a separate thread to bypass Windows asyncio loop compatibility issues.
    """
    
    async def search_jobs(self, keywords: str, location: Optional[str] = None, results_wanted: int = 50, **kwargs) -> List[Dict[str, Any]]:
        logger.info(f">>> PROVIDER: JobCatcher searching for '{keywords}'")
        return await asyncio.to_thread(self._scrape_yc_sync, keywords, location, results_wanted, **kwargs)

    def _scrape_yc_sync(self, keywords: str, location: Optional[str], limit: int, **kwargs) -> List[Dict[str, Any]]:
        standardized_jobs = []
        
        # Levers
        remote_only = kwargs.get("remote_only", False)
        job_type = kwargs.get("job_type")
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                )
                page = context.new_page()
                
                # Navigate to YC Work at a Startup with levers
                # https://www.workatastartup.com/jobs?query=kotlin&remote=true&job_type[]=full_time
                encoded_query = urllib.parse.quote(keywords)
                search_url = f"https://www.workatastartup.com/jobs?query={encoded_query}"
                
                if location and not remote_only:
                    search_url += f"&location={urllib.parse.quote(location)}"
                
                if remote_only or (location and "remote" in location.lower()):
                    search_url += "&remote=true"
                
                if job_type:
                    # YC uses job_type[] array
                    search_url += f"&job_type[]={job_type}"
                
                logger.info(f">>> PROVIDER: JobCatcher visiting {search_url}")
                page.goto(search_url, wait_until="domcontentloaded")
                
                title = page.title()
                logger.info(f">>> PROVIDER: JobCatcher title: '{title}'")

                # Wait for job cards or empty state
                try:
                    page.wait_for_selector("a[href*='/jobs/'], [class*='job-card'], [class*='JobCard'], .job-name", timeout=15000)
                except:
                    content = page.content()
                    if "No jobs found" in content or "no results" in content.lower():
                        logger.info(">>> PROVIDER: JobCatcher - confirmed 0 results found.")
                    else:
                        logger.error(f">>> PROVIDER: JobCatcher failed to find cards. Title: {title}")
                    browser.close()
                    return []
                
                job_elements = page.query_selector_all("div[class*='job-card'], div[class*='JobCard'], .job-name")
                if not job_elements:
                    job_elements = page.query_selector_all("a[href*='/jobs/']")
                
                logger.info(f">>> PROVIDER: JobCatcher found {len(job_elements)} candidate elements")
                
                for el in job_elements[:limit]:
                    try:
                        title_el = el.query_selector(".job-name a, .job-title a")
                        if not title_el:
                            title_el = el if el.name == "a" else None
                            
                        title = title_el.inner_text() if title_el else "Unknown Title"
                        url = title_el.get_attribute("href") if title_el else ""
                        if url and not url.startswith("http"):
                            url = f"https://www.workatastartup.com{url}"
                            
                        company_el = el.query_selector(".company-name, .employer-name")
                        company = company_el.inner_text() if company_el else "Unknown Company"
                        
                        details_el = el.query_selector(".job-details, .description")
                        details_text = details_el.inner_text() if details_el else ""
                        
                        standardized_jobs.append({
                            "title": title,
                            "company": company,
                            "location": "Remote / YC Network",
                            "description": f"YC Startup Role: {details_text}",
                            "job_url": url,
                            "site": "workatastartup",
                            "posted_at": datetime.now()
                        })
                    except Exception as inner_e:
                        continue
                
                browser.close()
                
        except Exception as e:
            logger.error(f">>> PROVIDER: JobCatcher (YC) Error: {str(e)}")
            
        return standardized_jobs

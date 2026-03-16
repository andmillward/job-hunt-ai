RESUME_PARSE_PROMPT = """
Extract the following information from the resume text below into a structured JSON format.
Fields required:
1. skills: A list of technical and soft skills.
2. experience: A concise summary of professional experience.
3. education: A concise summary of educational background.

Resume Text:
{text}

Return ONLY the raw JSON object.
"""

COMPANY_INTEL_PROMPT = """
Provide company intelligence for the following companies. 
For each, research (or use internal knowledge) to provide:
1. A brief bio/synopsis.
2. Estimated Glassdoor rating.
3. Recent Reddit sentiment summary (what employees/users are saying).
4. Twitter (X) vibe (is the company trending, controversial, or stable).
5. An overall sentiment score from 1-10 (10 being best place to work).

Companies: {companies}

Return ONLY a JSON array of objects. Each object MUST have:
- name: string (exactly as provided)
- bio: string (max 250 chars)
- glassdoor_score: string (e.g. "4.2/5")
- reddit_sentiment: string (max 200 chars)
- twitter_sentiment: string (max 200 chars)
- overall_sentiment_score: integer (1-10)
"""

SEARCH_NET_PROMPT = """
Given the following dream role description and the candidate's actual resume data, generate 5-10 specific search query configurations.

{resume_context}

User Preference: {dream_role}

A good "Net" includes a mix of:
1. Broad queries (e.g., "Senior Software Engineer") to maximize volume.
2. Skill-specific queries (e.g., "Kotlin Backend Engineer").
3. Industry-specific queries (e.g., "Fintech Software Engineer").

CRITICAL: Keep keywords extremely concise (2-4 words max). 
AVOID over-specification (e.g. DO NOT include "AWS DynamoDB Docker Micronaut" all in one query).
Instead, split skills across multiple queries (e.g. "Kotlin AWS Engineer", "Micronaut Backend", etc.).

Return ONLY a JSON array of objects. Each object MUST have:
- keywords: string (Concise query, e.g. "Senior Kotlin Engineer")
- location: string or null (e.g. "USA", "London", "Remote")
- min_salary: integer or null
- remote_only: boolean
- job_type: string or null (one of: full_time, contract, part_time, internship)
- hours_old: integer (default 72)
"""

JOB_RANKING_PROMPT = """
Score the following batch of job listings against the user profile.
Use the 'company_context' provided to influence the 'score_culture' and 'score_overall'.

{profile_context}

Job Listings to Score:
{jobs_json}

Return ONLY a JSON array of objects. Each object MUST include:
- id: the integer ID of the job from the input list
- score_skills: integer (1-10)
- score_culture: integer (1-10, based on benefits/paternity/PTO/remote preferences AND the provided company context)
- score_overall: integer (1-10)
- ai_insight: string (max 150 chars, specific reason for alignment including company vibe if relevant)
"""

DEDUPLICATION_PROMPT = """
Identify which of the following job titles from company '{company}' are effectively the same job listing.

Jobs:
{jobs_json}

Return ONLY a JSON array of arrays. Each inner array is a group of IDs that are duplicates.
The FIRST ID in each inner array will be considered the 'Primary' listing.
"""

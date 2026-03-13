export interface Resume {
  id: number
  fileName: string
  parsedSkills: string | null
  parsedExperience: string | null
  parsedEducation: string | null
  dreamRole: string | null
  createdAt: string
}

export interface AIModel {
  id: string
  name: string
  provider: 'gemini' | 'ollama' | 'openai'
}

export interface CompanyIntel {
  name: string
  bio: string | null
  glassdoor_score: string | null
  reddit_sentiment: string | null
  twitter_sentiment: string | null
  overall_sentiment_score: number | null
}

export interface JobAlignment {
  id: number
  score_skills: number
  score_culture: number
  score_overall: number
  ai_insight: string | null
  created_at: string
}

export interface Job {
  id: number
  title: string
  company: string
  location: string | null
  description: string | null
  job_url: string | null
  site: string | null
  status: string
  created_at: string
  parent_id: number | null
  alignments: JobAlignment[]
  company_intel: CompanyIntel | null
}

export interface SavedSearch {
  id: number
  keywords: string
  location: string | null
  min_salary: number | null
  remote_only: boolean
  job_type: string | null
  hours_old: number
  is_verified: boolean
  last_run_at: string | null
}

export interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
  action?: () => void
}

import apiClient from './apiClient'
import { Job, SavedSearch } from '../types'

export const jobService = {
  getJobs: (status?: string) => 
    apiClient.get<Job[]>(`/jobs${status ? `?status=${status}` : ''}`),
  
  updateJobStatus: (jobId: number, status: string) => 
    apiClient.patch(`/jobs/${jobId}/status?status=${status}`),
  
  searchJobs: (params: any) => 
    apiClient.post('/jobs/search', params),
  
  rankJobs: (resumeId: number, limit: number | null) => 
    apiClient.post('/jobs/rank', { resume_id: resumeId, limit }),
  
  getSavedSearches: (resumeId: number) => 
    apiClient.get<SavedSearch[]>(`/jobs/saved-searches?resume_id=${resumeId}`),
  
  generateSearchNet: (dreamRole: string, resumeId: number) => 
    apiClient.post('/jobs/search-net', { dream_role: dreamRole, resume_id: resumeId }),
  
  runVerifiedNet: (resumeId: number) => 
    apiClient.post('/jobs/run-verified', { resume_id: resumeId }),
  
  toggleVerifySearch: (id: number, isVerified: boolean) => 
    apiClient.patch(`/jobs/saved-searches/${id}?is_verified=${isVerified}`),
  
  deleteSavedSearch: (id: number) => 
    apiClient.delete(`/jobs/saved-searches/${id}`),
  
  clearUnverifiedSearches: (resumeId: number) => 
    apiClient.delete(`/jobs/saved-searches/unverified/${resumeId}`),
}

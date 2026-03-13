import apiClient from './apiClient'
import { Resume } from '../types'

export const resumeService = {
  getResumes: () => 
    apiClient.get<Resume[]>('/resumes'),
  
  uploadResume: (formData: FormData) => 
    apiClient.post<Resume>('/resumes', formData),
  
  deleteResume: (id: number) => 
    apiClient.delete(`/resumes/${id}`),
  
  getAutomationScript: (resumeId: number, platform: string) => 
    apiClient.get(`/resumes/${resumeId}/automation-script?platform=${platform}`),
}

import apiClient from './apiClient'

export const settingsService = {
  getSettings: () => 
    apiClient.get<Record<string, string>>('/settings'),
  
  updateSetting: (key: string, value: string) => 
    apiClient.post('/settings', { key, value }),

  validateSetting: (key: string, value: string) =>
    apiClient.post('/settings/validate', { key, value }),
  
  getGeminiModels: () => 
    apiClient.get('/models/gemini'),
  
  getOllamaModels: () => 
    apiClient.get('/models/ollama'),
  
  getOpenAIModels: () => 
    apiClient.get('/models/openai'),
}

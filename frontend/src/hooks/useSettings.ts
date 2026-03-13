import { useState, useCallback, useEffect } from 'react'
import { AIModel } from '../types'
import { settingsService } from '../services/settingsService'

export const useSettings = (showToast: any) => {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [geminiModels, setGeminiModels] = useState<AIModel[]>([])
  const [ollamaModels, setOllamaModels] = useState<AIModel[]>([])

  const fetchSettings = useCallback(async () => {
    try {
      const response = await settingsService.getSettings()
      setSettings(response.data)
    } catch (err) {
      console.error('Error fetching settings', err)
    }
  }, [])

  const handleAutoDetect = useCallback(async () => {
    console.log(">>> UI: Auto-detecting models...")
    
    settingsService.getGeminiModels()
      .then(resp => {
        setGeminiModels(resp.data.map((m: any) => ({ ...m, provider: 'gemini' })))
      })
      .catch(e => console.error(">>> UI: Could not fetch Gemini models", e))

    settingsService.getOllamaModels()
      .then(resp => {
        setOllamaModels(resp.data.map((m: any) => ({ ...m, provider: 'ollama' })))
      })
      .catch(e => console.error(">>> UI: Could not fetch Ollama models", e))
  }, [])

  const updateSetting = async (key: string, value: string) => {
    setSavingSettings(true)
    try {
      await settingsService.updateSetting(key, value)
      setSettings(prev => ({ ...prev, [key]: value }))
      showToast(`${key.replace(/_/g, ' ')} saved successfully`)
      if (key === 'GEMINI_API_KEY' || key === 'OLLAMA_URL') handleAutoDetect()
    } catch (err) {
      console.error('Error updating setting', err)
      showToast('Failed to save setting', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  // Trigger auto-detect when settings are first loaded
  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      handleAutoDetect()
    }
  }, [settings.GEMINI_API_KEY, settings.OLLAMA_URL, handleAutoDetect])

  return {
    settings,
    setSettings,
    savingSettings,
    geminiModels,
    ollamaModels,
    fetchSettings,
    handleAutoDetect,
    updateSetting
  }
}

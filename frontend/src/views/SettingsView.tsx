import React from 'react'
import { Settings as SettingsIcon, Loader2, Database, Radio, ChevronDown, Key, Globe, Cpu } from 'lucide-react'
import { AIModel } from '../types'

interface SettingsViewProps {
  settings: Record<string, string>
  setSettings: (settings: any) => void
  savingSettings: boolean
  geminiModels: AIModel[]
  ollamaModels: AIModel[]
  onUpdateSetting: (key: string, value: string) => void
  onRefreshModels: () => void
}

const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  setSettings,
  savingSettings,
  geminiModels,
  ollamaModels,
  onUpdateSetting,
  onRefreshModels
}) => {
  const currentModel = settings.AI_MODEL || 'gemini/gemini-1.5-flash'

  return (
    <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500 pb-20">
      <header className="mb-12 text-center">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Configuration</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px]">Neural Interface & API Control</p>
      </header>
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-12">
        <div className="space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">AI Credentials</h3>
          </div>
          <div className="grid grid-cols-1 gap-10">
            {['OLLAMA_URL', 'GEMINI_API_KEY', 'JSEARCH_API_KEY', 'OPENAI_API_KEY'].map(k => {
              const label = k.replace(/_/g, ' ')
              const isUrl = k.includes('URL')
              const Icon = isUrl ? Globe : (k.includes('OLLAMA') ? Cpu : Key)
              
              return (
                <div key={k} className="relative group">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
                    <Icon className="w-3 h-3" /> {label}
                  </label>
                  <div className="flex gap-3">
                    <input 
                      name={k}
                      type={k.includes('KEY') ? 'password' : 'text'} 
                      placeholder={k === 'OLLAMA_URL' ? 'http://localhost:11434' : `Enter ${label}...`} 
                      value={settings[k] || ''} 
                      onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
                      className="flex-1 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none font-bold placeholder:text-slate-400 focus:border-indigo-500 transition-colors" 
                    />
                    <button 
                      onClick={() => onUpdateSetting(k, settings[k])} 
                      disabled={savingSettings} 
                      className="px-8 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                      {savingSettings ? <Loader2 className="animate-spin w-4 h-4" /> : 'Store'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500"><Database className="w-5 h-5" /></div> Model Selection
            </h3>
            <button onClick={onRefreshModels} className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all flex items-center gap-2"><Radio className="w-3.5 h-3.5" /> Refresh Models</button>
          </div>
          
          <div className="relative group">
            <select 
              value={currentModel} 
              onChange={(e) => onUpdateSetting('AI_MODEL', e.target.value)} 
              className="w-full p-6 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-[2rem] font-black text-sm appearance-none shadow-xl text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              <optgroup label="✨ Cloud Intelligence (Gemini)">
                <option value="gemini/gemini-1.5-flash">Gemini 1.5 Flash (Optimized)</option>
                <option value="gemini/gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                {geminiModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </optgroup>
              {ollamaModels.length > 0 && (
                <optgroup label="🏠 Local Neural Engine (Ollama)">
                  {ollamaModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="🧠 Alternative (OpenAI)">
                <option value="gpt-4o">GPT-4o (Standard)</option>
              </optgroup>
            </select>
            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsView

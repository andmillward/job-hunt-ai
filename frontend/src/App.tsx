import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FileUp, Briefcase, FileText, Settings, Loader2, CheckCircle, AlertCircle, Code, Eye, ExternalLink, X, Moon, Sun, Trash2, Globe, Send, DollarSign, Clock, Search, ListFilter, ArrowLeft, LayoutDashboard, Target, Sparkles, Radar, Radio, TrendingUp, Info, Bug, Building2, Star, ChevronDown, ChevronUp, Copy, Zap, Download, MessageSquare, Twitter } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api'

interface Resume {
  id: number
  fileName: string
  parsedSkills: string | null
  parsedExperience: string | null
  parsedEducation: string | null
  dreamRole: string | null
  createdAt: string
}

interface GeminiModel {
  id: string
  name: string
}

interface CompanyIntel {
  name: string
  bio: string | null
  glassdoor_score: string | null
  reddit_sentiment: string | null
  twitter_sentiment: string | null
  overall_sentiment_score: number | null
}

interface JobAlignment {
  id: number
  score_skills: number
  score_culture: number
  score_overall: number
  ai_insight: string | null
  created_at: string
}

interface Job {
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

interface SavedSearch {
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

interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
  action?: () => void
}

function App() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'hub')
  const [workspaceTab, setWorkspaceTab] = useState('breakdown')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResume, setSelectedResume] = useState<Resume | null>(() => {
    const saved = localStorage.getItem('selectedResume')
    return saved ? JSON.parse(saved) : null
  })
  const [showDebug, setShowDebug] = useState(false)
  
  // Settings state
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<GeminiModel[]>([])

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([])
  const [searchingJobs, setSearchingJobs] = useState(false)
  const [rankingJobs, setRankingJobs] = useState(false)
  
  // Search Net state
  const [dreamRole, setDreamRole] = useState('')
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [generatingNet, setGeneratingNet] = useState(false)
  const [runningNet, setRunningNet] = useState(false)
  
  // UI State
  const [toast, setToast] = useState<Toast | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [expandedJobs, setExpandedJobs] = useState<Record<number, boolean>>({})

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', action?: () => void) => {
    setToast({ message, type, action })
    setTimeout(() => setToast(null), 8000)
  }, [])

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])

  const selectedResumeIdRef = useRef<number | null>(selectedResume?.id || null)
  useEffect(() => {
    selectedResumeIdRef.current = selectedResume?.id || null
    if (selectedResume) {
      localStorage.setItem('selectedResume', JSON.stringify(selectedResume))
      setDreamRole(selectedResume.dreamRole || '')
    } else {
      localStorage.removeItem('selectedResume')
      setDreamRole('')
    }
  }, [selectedResume])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const fetchResumes = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/resumes`)
      setResumes(response.data)
      
      const currentId = selectedResumeIdRef.current
      if (currentId) {
        const updated = response.data.find((r: Resume) => r.id === currentId)
        if (updated) {
          setSelectedResume(prev => JSON.stringify(prev) !== JSON.stringify(updated) ? updated : prev)
        }
      }
    } catch (err) {
      console.error('Error fetching resumes', err)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings`)
      setSettings(response.data)
    } catch (err) {
      console.error('Error fetching settings', err)
    }
  }, [])

  const fetchJobs = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/jobs`)
      setJobs(response.data)
    } catch (err) {
      console.error('Error fetching jobs', err)
    }
  }, [])

  const fetchSavedSearches = useCallback(async () => {
    const currentId = selectedResumeIdRef.current
    if (!currentId) {
      setSavedSearches([])
      return
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/jobs/saved-searches?resume_id=${currentId}`)
      setSavedSearches(response.data)
    } catch (err) {
      console.error('Error fetching saved searches', err)
    }
  }, [])

  const handleAutoDetect = useCallback(async (keyToUse?: string) => {
    const key = keyToUse || settings.GEMINI_API_KEY
    if (!key) return

    try {
      const resp = await axios.get(`${API_BASE_URL}/models/gemini`)
      if (resp.data.length > 0) {
        setFetchedModels(resp.data)
      }
    } catch (e) {
      console.error("Could not auto-detect models", e)
    }
  }, [settings.GEMINI_API_KEY])

  useEffect(() => {
    fetchResumes()
    fetchSettings()
    fetchJobs()
  }, [fetchResumes, fetchSettings, fetchJobs])

  useEffect(() => {
    fetchSavedSearches()
  }, [selectedResume?.id, fetchSavedSearches])

  const updateSetting = async (key: string, value: string) => {
    setSavingSettings(true)
    try {
      await axios.post(`${API_BASE_URL}/settings`, { key, value })
      setSettings(prev => ({ ...prev, [key]: value }))
      showToast(`${key.replace(/_/g, ' ')} saved successfully`)
      if (key === 'GEMINI_API_KEY') handleAutoDetect(value)
    } catch (err) {
      console.error('Error updating setting', err)
      showToast('Failed to save setting', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await axios.post(`${API_BASE_URL}/resumes`, formData)
      setFile(null)
      await fetchResumes()
      setSelectedResume(response.data)
      setActiveTab('workspace')
      setWorkspaceTab('breakdown')
      showToast('Resume processed and analyzed')
    } catch (err) {
      console.error(err)
      showToast('Failed to upload resume.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteResume = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm("Are you sure? All search data for this profile will be lost.")) return
    try {
      await axios.delete(`${API_BASE_URL}/resumes/${id}`)
      await fetchResumes()
      if (selectedResumeIdRef.current === id) {
        setSelectedResume(null)
        setActiveTab('hub')
      }
      showToast("Profile deleted")
    } catch (err) {
      console.error(err)
      showToast("Failed to delete", "error")
    }
  }

  const goToRadar = useCallback(() => {
    setWorkspaceTab('radar')
  }, [])

  const handleSingleSearch = async (search: SavedSearch) => {
    setSearchingJobs(true)
    setWorkspaceTab('radar') 
    try {
      const response = await axios.post(`${API_BASE_URL}/jobs/search`, {
        keywords: search.keywords,
        location: search.location,
        min_salary: search.min_salary,
        remote_only: search.remote_only,
        job_type: search.job_type,
        hours_old: search.hours_old
      })
      await fetchJobs()
      showToast(`Search complete: ${response.data.found} jobs found. Click to view radar.`, 'success', goToRadar)
    } catch (err) {
      console.error(err)
      showToast("Search failed", "error")
    } finally {
      setSearchingJobs(false)
    }
  }

  const handleDeleteSearch = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/jobs/saved-searches/${id}`)
      setSavedSearches(savedSearches.filter(s => s.id !== id))
    } catch (err) { console.error(err) }
  }

  const handleClearUnverified = async () => {
    const currentId = selectedResumeIdRef.current
    if (!currentId) return
    try {
      await axios.delete(`${API_BASE_URL}/jobs/saved-searches/unverified/${currentId}`)
      await fetchSavedSearches()
      showToast("Unverified queries cleared")
    } catch (err) { console.error(err) }
  }

  const handleGenerateNet = async () => {
    const currentId = selectedResumeIdRef.current
    if (!dreamRole || !currentId) return
    setGeneratingNet(true)
    try {
      await axios.post(`${API_BASE_URL}/jobs/search-net`, {
        dream_role: dreamRole,
        resume_id: currentId
      })
      await fetchSavedSearches()
      await fetchResumes()
      showToast("AI Search Net generated")
    } catch (err) {
      console.error(err)
      showToast("Generation failed", "error")
    } finally { setGeneratingNet(false) }
  }

  const handleRunVerifiedNet = async () => {
    const currentId = selectedResumeIdRef.current
    if (!currentId) return
    const lastRun = savedSearches.find(s => s.last_run_at)?.last_run_at
    if (lastRun && (Date.now() - new Date(lastRun).getTime() < 24 * 60 * 60 * 1000)) {
      if (!confirm("Updated recently. Proceed anyway?")) return
    }
    setRunningNet(true)
    setWorkspaceTab('radar')
    try {
      const response = await axios.post(`${API_BASE_URL}/jobs/run-verified`, { resume_id: currentId })
      await fetchJobs()
      await fetchSavedSearches()
      showToast(`Deployment complete: ${response.data.found} opportunities discovered.`, 'success', goToRadar)
    } catch (err) {
      console.error(err)
      showToast("Deployment failed", "error")
    } finally { setRunningNet(false) }
  }

  const handleRankJobs = async (limit: number = 20) => {
    const currentId = selectedResumeIdRef.current
    if (!currentId) return
    setRankingJobs(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/jobs/rank`, { 
        resume_id: currentId,
        limit: limit
      })
      await fetchJobs()
      showToast(`Ranking complete: Scored ${response.data.ranked_count} opportunities.`)
    } catch (err) {
      console.error(err)
      showToast("Ranking failed", "error")
    } finally {
      setRankingJobs(false)
    }
  }

  const handleDownloadScript = async (platform: string = 'general') => {
    const currentId = selectedResumeIdRef.current
    if (!currentId) return
    try {
      const response = await axios.get(`${API_BASE_URL}/resumes/${currentId}/automation-script?platform=${platform}`)
      const blob = new Blob([response.data], { type: 'text/javascript' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `jobhunt-ai-${platform}.user.js`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      showToast(`${platform.charAt(0).toUpperCase() + platform.slice(1)} automation script downloaded. Install in Tampermonkey!`)
    } catch (err) {
      console.error(err)
      showToast("Failed to download script", "error")
    }
  }

  const toggleVerifySearch = async (id: number, currentStatus: boolean) => {
    try {
      await axios.patch(`${API_BASE_URL}/jobs/saved-searches/${id}?is_verified=${!currentStatus}`)
      setSavedSearches(savedSearches.map(s => s.id === id ? { ...s, is_verified: !currentStatus } : s))
    } catch (err) { console.error(err) }
  }

  const updateJobStatus = async (jobId: number, status: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/jobs/${jobId}/status?status=${status}`)
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status } : j))
    } catch (err) { console.error(err) }
  }

  const primaryJobs = useMemo(() => {
    return jobs.filter(j => j.parent_id === null)
  }, [jobs])

  const rankedJobs = useMemo(() => {
    return [...primaryJobs].sort((a, b) => {
      const scoreA = a.alignments?.[0]?.score_overall || 0
      const scoreB = b.alignments?.[0]?.score_overall || 0
      if (scoreA !== scoreB) return scoreB - scoreA
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [primaryJobs])

  const getDuplicatesFor = (parentId: number) => {
    return jobs.filter(j => j.parent_id === parentId)
  }

  const toggleExpandJob = (id: number) => {
    setExpandedJobs(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-all duration-300">
      {/* Toast */}
      {toast && (
        <div 
          onClick={() => { if (toast.action) { toast.action(); setToast(null); } }}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom border border-slate-700 bg-slate-800 text-white ${toast.action ? 'cursor-pointer hover:bg-slate-700 active:scale-95 transition-all' : ''}`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> : 
           toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> : 
           <Sparkles className="w-5 h-5 text-indigo-400" />}
          <div className="flex flex-col">
             <p className="font-bold text-sm">{toast.message}</p>
             {toast.action && <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Click to view radar</p>}
          </div>
          {!toast.action && <button onClick={(e) => { e.stopPropagation(); setToast(null); }} className="ml-4 hover:opacity-70 transition text-slate-400"><X className="w-4 h-4" /></button>}
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col fixed h-full z-20">
        <h1 className="text-xl font-black mb-10 flex items-center gap-3 tracking-tight text-slate-900 dark:text-white">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/40 text-white">
            <Target className="w-5 h-5" />
          </div>
          JobHunt AI
        </h1>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('hub')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-bold text-sm ${activeTab === 'hub' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Resume Hub
          </button>
          
          {selectedResume && (
            <button 
              onClick={() => setActiveTab('workspace')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-bold text-sm ${activeTab === 'workspace' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Briefcase className="w-4 h-4" /> Hunt Workspace
            </button>
          )}

          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-bold text-sm ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Settings className="w-4 h-4" /> Configuration
          </button>
        </nav>

        {selectedResume && (
           <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Active Context</p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                 <p className="text-xs font-bold truncate dark:text-white mb-1">{selectedResume.fileName}</p>
                 <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase">
                    <span className={`w-1.5 h-1.5 rounded-full ${searchingJobs || runningNet || rankingJobs ? 'bg-amber-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></span> 
                    {searchingJobs || runningNet || rankingJobs ? 'Radar Active' : 'Target Locked'}
                 </div>
              </div>
           </div>
        )}

        <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-400 hover:text-indigo-500 transition">
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
           </button>
           <button onClick={() => setShowDebug(!showDebug)} className={`p-2 transition ${showDebug ? 'text-amber-500' : 'text-slate-400'}`}>
              <Code className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="flex-1 pl-64 overflow-y-auto">
        <div className="p-10 max-w-6xl mx-auto">
          
          {/* HUB VIEW */}
          {activeTab === 'hub' && (
            <div className="space-y-10 animate-in fade-in duration-500">
               <header>
                  <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Resume Hub</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Manage your career profiles and launch specialized hunts.</p>
               </header>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                     <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">New Hunt Profile</h3>
                     <div className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all ${file ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500'}`}>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.docx" />
                        <FileUp className={`w-12 h-12 mb-4 ${file ? 'text-indigo-500' : 'text-slate-300'}`} />
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{file ? file.name : 'Select Resume'}</p>
                     </div>
                     <button onClick={handleUpload} disabled={!file || uploading} className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all flex items-center justify-center gap-3">
                        {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />} {uploading ? 'Parsing...' : 'Analyze & Store'}
                     </button>
                  </div>

                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                     <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Saved Profiles</h3>
                        <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{resumes.length}</span>
                     </div>
                     <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {resumes.length === 0 ? (
                           <div className="p-20 text-center text-slate-400 italic text-sm">No profiles found. Upload one to start!</div>
                        ) : (
                           resumes.map(r => (
                              <div key={r.id} onClick={() => { setSelectedResume(r); setActiveTab('workspace'); setWorkspaceTab('breakdown'); }} className={`p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all group ${selectedResume?.id === r.id ? 'border-l-4 border-indigo-600 bg-indigo-50/30' : ''}`}>
                                 <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{r.fileName}</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Generated {new Date(r.createdAt).toLocaleDateString()}</p>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <button className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 font-black text-[10px] uppercase">
                                       <Target className="w-3.5 h-3.5" /> Start Hunt
                                    </button>
                                    <button onClick={(e) => handleDeleteResume(e, r.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'workspace' && selectedResume && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
               <header className="flex justify-between items-start">
                  <div>
                     <button onClick={() => setActiveTab('hub')} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-4 transition-colors">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Hub
                     </button>
                     <div className="flex items-center gap-4">
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{selectedResume.fileName}</h2>
                        {(searchingJobs || runningNet || rankingJobs) && <Loader2 className="w-8 h-8 text-indigo-500 animate-spin opacity-50" />}
                     </div>
                     <p className="text-slate-500 font-medium mt-1">Workspace for persona deployment and discovery.</p>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-1 shadow-sm">
                     {[ {id: 'breakdown', label: 'Breakdown', icon: <FileText className="w-3.5 h-3.5" />}, {id: 'search-net', label: 'Search Net', icon: <Radio className="w-3.5 h-3.5" />}, {id: 'radar', label: 'Job Radar', icon: <Radar className="w-3.5 h-3.5" />} ].map(t => (
                        <button key={t.id} onClick={() => setWorkspaceTab(t.id)} className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all relative flex items-center gap-2 ${workspaceTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                           {t.icon} {t.label}
                           {(t.id === 'radar' && (searchingJobs || runningNet || rankingJobs)) && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping border-2 border-white dark:border-slate-900"></span>
                           )}
                        </button>
                     ))}
                  </div>
               </header>

               <div className="min-h-[600px]">
                  {workspaceTab === 'breakdown' && (
                     <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                           <div className="lg:col-span-2 space-y-8">
                              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
                                 <section>
                                    <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] mb-6 flex items-center gap-3">
                                       <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div> Technical Arsenal
                                    </h4>
                                    <div className="flex flex-wrap gap-2.5">
                                       {selectedResume.parsedSkills?.split(',').map((s, i) => (
                                          <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-xs font-black text-slate-700 dark:text-slate-300">{s.trim()}</span>
                                       ))}
                                    </div>
                                 </section>
                                 <section>
                                    <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] mb-6 flex items-center gap-3">
                                       <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div> Professional Journey
                                    </h4>
                                    <div className="p-8 bg-slate-50 dark:bg-slate-950/50 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap font-medium text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                       {selectedResume.parsedExperience}
                                    </div>
                                 </section>
                              </div>
                           </div>
                           
                           <div className="space-y-8">
                              <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/40 relative overflow-hidden">
                                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                                 <Zap className="w-8 h-8 mb-6" />
                                 <h3 className="text-xl font-black leading-tight mb-4">Persona Automation</h3>
                                 <p className="text-indigo-100 text-xs font-medium mb-8 leading-relaxed">Download specialized GreaseMonkey scripts to auto-fill job applications with this persona's data.</p>
                                 
                                 <div className="space-y-3">
                                    <button onClick={() => handleDownloadScript('general')} className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                       <Download className="w-3.5 h-3.5" /> General Script
                                    </button>
                                    <button onClick={() => handleDownloadScript('workday')} className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                       <Download className="w-3.5 h-3.5" /> Workday Special
                                    </button>
                                    <button onClick={() => handleDownloadScript('greenhouse')} className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                       <Download className="w-3.5 h-3.5" /> Greenhouse Special
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {workspaceTab === 'search-net' && (
                     <div className="space-y-10 animate-in fade-in duration-500">
                        <div className="bg-indigo-600 dark:bg-indigo-900/20 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-500/20 border border-indigo-500/20 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                           <div className="relative z-10 space-y-8">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">AI Search Net Generator</h3>
                                    <p className="text-indigo-100 dark:text-indigo-300 font-medium max-w-lg mt-2 flex items-center gap-2">
                                       <Sparkles className="w-4 h-4" /> This generator uses your profile skills + preferences.
                                    </p>
                                 </div>
                                 <button onClick={handleRunVerifiedNet} disabled={runningNet || savedSearches.filter(s => s.is_verified).length === 0} className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 shadow-xl active:scale-95 transition-all flex items-center gap-3">
                                    {runningNet ? <Loader2 className="animate-spin w-4 h-4" /> : <Briefcase className="w-4 h-4" />} {runningNet ? 'Deploying...' : 'Deploy Net'}
                                 </button>
                              </div>
                              <div className="flex gap-3">
                                 <input type="text" placeholder="e.g. Staff Kotlin Dev, remote preferred, above $150k..." value={dreamRole} onChange={(e) => setDreamRole(e.target.value)} className="flex-1 p-5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-indigo-200/50 focus:ring-4 focus:ring-white/10 outline-none font-bold" />
                                 <button onClick={handleGenerateNet} disabled={generatingNet || !dreamRole} className="bg-white text-indigo-600 px-8 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-3 shadow-lg active:scale-95">
                                    {generatingNet ? <Loader2 className="animate-spin w-5 h-5" /> : <Code className="w-5 h-5" />} {generatingNet ? 'Processing' : 'Generate'}
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                           <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Search Net</span>
                              <button onClick={handleClearUnverified} className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                                 <Trash2 className="w-3.5 h-3.5" /> Clear Unverified
                              </button>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800">
                              {savedSearches.length === 0 ? (
                                 <div className="p-20 text-center text-slate-400 italic bg-white dark:bg-slate-900 col-span-2">No queries in the net. Describe your role above to begin.</div>
                              ) : (
                                 savedSearches.map(s => (
                                    <div key={s.id} className="p-6 bg-white dark:bg-slate-900 group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                       <div className="flex justify-between items-start gap-4">
                                          <div className="min-w-0 flex-1">
                                             <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{s.keywords}</h4>
                                             <div className="flex flex-wrap gap-2 mt-3">
                                                {s.location && <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> {s.location}</span>}
                                                {s.min_salary && <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-green-500/10 text-green-600 rounded flex items-center gap-1"><DollarSign className="w-2.5 h-2.5" /> {Math.round(s.min_salary/1000)}k+</span>}
                                                {s.remote_only && <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-indigo-500/10 text-indigo-600 rounded">Remote Only</span>}
                                             </div>
                                          </div>
                                          <div className="flex gap-1.5 shrink-0">
                                             <button onClick={() => handleSingleSearch(s)} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-slate-100 dark:border-slate-700" title="Run this search immediately"><Send className="w-3.5 h-3.5" /></button>
                                             <button onClick={() => toggleVerifySearch(s.id, s.is_verified)} className={`p-2 rounded-lg transition-all border ${s.is_verified ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 border-green-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 border-slate-100 dark:border-slate-700'}`} title={s.is_verified ? "Verified (Included in deployment)" : "Click to verify"}><CheckCircle className="w-3.5 h-3.5" /></button>
                                             <button onClick={() => handleDeleteSearch(s.id)} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                          </div>
                                       </div>
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>
                     </div>
                  )}

                  {workspaceTab === 'radar' && (
                     <div className="animate-in fade-in duration-500 space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center">
                           <div className="flex items-center gap-6">
                              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                 <Radar className="w-7 h-7" />
                              </div>
                              <div>
                                 <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Alignment Scoring</h3>
                                 <p className="text-slate-500 text-sm font-medium">Analyze discovered listings against your resume and salary/remote preferences.</p>
                              </div>
                           </div>
                           <div className="flex gap-3">
                              <button 
                                onClick={() => handleRankJobs(10)} 
                                disabled={rankingJobs || rankedJobs.length === 0}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                              >
                                 <Bug className="w-4 h-4" />
                                 Scan Top 10 (Debug)
                              </button>
                              <button 
                                onClick={() => handleRankJobs(20)} 
                                disabled={rankingJobs || rankedJobs.length === 0}
                                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                              >
                                 {rankingJobs ? <Loader2 className="animate-spin w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                 {rankingJobs ? 'Scoring Batch...' : 'Scan Alignment'}
                              </button>
                           </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                           <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                              <div className="flex items-center gap-3">
                                 <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Priority Feed</h3>
                                 {(searchingJobs || runningNet || rankingJobs) && <span className="flex items-center gap-2 text-[9px] font-black text-amber-500 animate-pulse uppercase"><Loader2 className="w-3 h-3 animate-spin" /> System Processing...</span>}
                              </div>
                              <span className="text-[10px] font-black text-indigo-600 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">{rankedJobs.length} Primary Listings</span>
                           </div>
                           <div className="max-h-[700px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                              {rankedJobs.length === 0 ? (
                                 <div className="p-40 text-center text-slate-400 text-sm font-medium italic">
                                    {searchingJobs || runningNet ? 'Deploying search agents. Results will appear shortly...' : 'Your Radar is empty. Deploy an agent to begin.'}
                                 </div>
                              ) : (
                                 rankedJobs.map(j => {
                                    const alignment = j.alignments?.[0]
                                    const intel = j.company_intel
                                    const dups = getDuplicatesFor(j.id)
                                    const isExpanded = expandedJobs[j.id]
                                    
                                    return (
                                       <div key={j.id} className="transition-all">
                                          <div className={`p-8 flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/20' : ''}`}>
                                             <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                   <h4 className="font-black text-lg text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 transition-colors">{j.title}</h4>
                                                   <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border ${j.status === 'applied' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{j.status}</span>
                                                   {alignment && (
                                                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${alignment.score_overall >= 8 ? 'bg-green-500 text-white' : alignment.score_overall >= 5 ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'}`}>
                                                         FIT: {alignment.score_overall}/10
                                                      </span>
                                                   )}
                                                   {dups.length > 0 && (
                                                      <button onClick={() => toggleExpandJob(j.id)} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-500/20 transition-colors">
                                                         <Copy className="w-2.5 h-2.5" /> {dups.length} Duplicates {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                                                      </button>
                                                   )}
                                                </div>
                                                
                                                <div className="flex items-center gap-4 mb-4">
                                                   <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.1em] flex items-center gap-3">
                                                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                      {j.company} 
                                                      <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span> 
                                                      {j.location || 'Remote'} 
                                                      <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span> 
                                                      {j.site || 'Direct'}
                                                   </p>
                                                   {intel?.glassdoor_score && (
                                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/5 text-green-600 rounded-md border border-green-500/10 text-[9px] font-black uppercase">
                                                         <Star className="w-2.5 h-2.5 fill-current" /> Glassdoor: {intel.glassdoor_score}
                                                      </div>
                                                   )}
                                                   {intel?.overall_sentiment_score && (
                                                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase ${intel.overall_sentiment_score >= 7 ? 'bg-indigo-500/5 text-indigo-600 border-indigo-500/10' : 'bg-slate-500/5 text-slate-600 border-slate-500/10'}`}>
                                                         Vibe: {intel.overall_sentiment_score}/10
                                                      </div>
                                                   )}
                                                </div>

                                                {intel?.bio && (
                                                   <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-relaxed mb-4 max-w-2xl bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 italic">
                                                      &ldquo;{intel.bio}&rdquo;
                                                   </p>
                                                )}

                                                {intel && (intel.reddit_sentiment || intel.twitter_sentiment) && (
                                                   <div className="flex flex-wrap gap-3 mb-4">
                                                      {intel.reddit_sentiment && (
                                                         <div className="flex items-start gap-2 max-w-xs">
                                                            <MessageSquare className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                                               <span className="font-black uppercase text-[8px] text-orange-500/70 block mb-0.5">Reddit</span>
                                                               {intel.reddit_sentiment}
                                                            </p>
                                                         </div>
                                                      )}
                                                      {intel.twitter_sentiment && (
                                                         <div className="flex items-start gap-2 max-w-xs">
                                                            <Twitter className="w-3 h-3 text-sky-500 mt-0.5 shrink-0" />
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                                               <span className="font-black uppercase text-[8px] text-sky-500/70 block mb-0.5">X / Twitter</span>
                                                               {intel.twitter_sentiment}
                                                            </p>
                                                         </div>
                                                      )}
                                                   </div>
                                                )}

                                                {alignment && (
                                                   <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                      <div className="flex-1 min-w-0">
                                                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Info className="w-3 h-3" /> AI Insight</p>
                                                         <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">{alignment.ai_insight}</p>
                                                      </div>
                                                      <div className="flex flex-col gap-2 border-l border-slate-200 dark:border-slate-700 pl-4 min-w-[100px]">
                                                         <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                                            <span className="text-slate-400">Skills</span>
                                                            <span className="text-indigo-500">{alignment.score_skills}/10</span>
                                                         </div>
                                                         <div className="flex justify-between items-center text-[9px] font-black uppercase">
                                                            <span className="text-slate-400">Culture</span>
                                                            <span className="text-indigo-500">{alignment.score_culture}/10</span>
                                                         </div>
                                                      </div>
                                                   </div>
                                                )}
                                             </div>
                                             <div className="flex gap-2 ml-6">
                                                {j.job_url && <a href={j.job_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><ExternalLink className="w-4 h-4" /></a>}
                                                <button onClick={() => updateJobStatus(j.id, j.status === 'applied' ? 'new' : 'applied')} className={`p-3 rounded-2xl border transition-all ${j.status === 'applied' ? 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-600'}`}><CheckCircle className="w-4 h-4" /></button>
                                             </div>
                                          </div>
                                          
                                          {/* DUPLICATES NESTED VIEW */}
                                          {isExpanded && dups.length > 0 && (
                                             <div className="bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                                                {dups.map(d => (
                                                   <div key={d.id} className="pl-16 pr-8 py-4 flex items-center justify-between group/dup hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                                                      <div className="flex items-center gap-4">
                                                         <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                                         <div>
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{d.title}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{d.site} <span className="mx-1">•</span> {new Date(d.created_at).toLocaleDateString()}</p>
                                                         </div>
                                                      </div>
                                                      <div className="flex gap-2">
                                                         {d.job_url && <a href={d.job_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></a>}
                                                         <button onClick={() => updateJobStatus(d.id, d.status === 'applied' ? 'new' : 'applied')} className={`p-1.5 transition-colors ${d.status === 'applied' ? 'text-green-500' : 'text-slate-300 hover:text-green-500'}`}><CheckCircle className="w-3.5 h-3.5" /></button>
                                                      </div>
                                                   </div>
                                                ))}
                                             </div>
                                          )}
                                       </div>
                                    )
                                 })
                              )}
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
             <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
                <header className="mb-12 text-center">
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Configuration</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px]">Neural Interface & API Control</p>
                </header>
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-12">
                   <div className="space-y-8">
                      <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                           <Settings className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">AI Credentials</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-10">
                        {['GEMINI_API_KEY', 'JSEARCH_API_KEY', 'OPENAI_API_KEY'].map(k => (
                           <div key={k}>
                              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">{k.replace(/_/g, ' ')}</label>
                              <div className="flex gap-3">
                                 <input type="password" placeholder={`Enter ${k.split('_')[0]} Key...`} value={settings[k] || ''} onChange={(e) => setSettings({...settings, [k]: e.target.value})} className="flex-1 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none font-bold placeholder:text-slate-400" />
                                 <button onClick={() => updateSetting(k, settings[k])} disabled={savingSettings} className="px-8 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all active:scale-95">
                                    {savingSettings ? <Loader2 className="animate-spin w-4 h-4" /> : 'Store'}
                                 </button>
                              </div>
                           </div>
                        ))}
                      </div>
                   </div>
                   <div className="space-y-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4">
                           <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500"><Code className="w-5 h-5" /></div> Active Neural Model
                        </h3>
                        <button onClick={() => handleAutoDetect()} className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all">Refresh List</button>
                      </div>
                      <select value={settings.AI_MODEL || 'gemini/gemini-1.5-flash'} onChange={(e) => updateSetting('AI_MODEL', e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-sm appearance-none shadow-inner text-slate-900 dark:text-slate-100">
                        <option value="gemini/gemini-1.5-flash">Gemini 1.5 Flash (Default)</option>
                        <option value="gemini/gemini-1.5-pro">Gemini 1.5 Pro</option>
                        {fetchedModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        <option value="gpt-4o">GPT-4o (OpenAI)</option>
                      </select>
                   </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App

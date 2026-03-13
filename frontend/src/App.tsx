import { useState, useEffect, useCallback } from 'react'
import { FileUp, Briefcase, FileText, Settings, Loader2, CheckCircle, AlertCircle, Code, Eye, ExternalLink, X, Moon, Sun } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api'

interface Resume {
  id: number
  fileName: string
  parsedSkills: string | null
  parsedExperience: string | null
  parsedEducation: string | null
  createdAt: string
}

interface GeminiModel {
  id: string
  name: string
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
}

interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
}

function App() {
  const [activeTab, setActiveTab] = useState('resume')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  
  // Settings state
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<GeminiModel[]>([])

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([])
  const [searchingJobs, setSearchingJobs] = useState(false)
  const [searchKeywords, setSearchKeywords] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  
  // UI State
  const [toast, setToast] = useState<Toast | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(true)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

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
      if (response.data.length > 0 && !selectedResume) {
        setSelectedResume(response.data[0])
      }
    } catch (err) {
      console.error('Error fetching resumes', err)
    }
  }, [selectedResume])

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

  // Auto-detect models when settings load if we have a key
  useEffect(() => {
    if (settings.GEMINI_API_KEY && fetchedModels.length === 0) {
      handleAutoDetect()
    }
  }, [settings.GEMINI_API_KEY, handleAutoDetect, fetchedModels.length])

  const updateSetting = async (key: string, value: string) => {
    setSavingSettings(true)
    try {
      await axios.post(`${API_BASE_URL}/settings`, { key, value })
      setSettings(prev => ({ ...prev, [key]: value }))
      showToast(`${key.replace(/_/g, ' ')} saved successfully`)
      
      // Trigger auto-detect if saving Gemini key
      if (key === 'GEMINI_API_KEY') {
        handleAutoDetect(value)
      }
    } catch (err) {
      console.error('Error updating setting', err)
      showToast('Failed to save setting', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
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
      showToast('Resume processed and analyzed')
    } catch (err) {
      console.error(err)
      showToast('Failed to upload resume. Ensure backend is running.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleJobSearch = async () => {
    if (!searchKeywords) {
      showToast("Please enter keywords to search.", "info")
      return
    }
    setSearchingJobs(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/jobs/search`, {
        keywords: searchKeywords,
        location: searchLocation,
        results_wanted: 20
      })
      await fetchJobs()
      showToast(`Search complete: found ${response.data.found} jobs (${response.data.new} new)`)
    } catch (err) {
      console.error('Error searching jobs', err)
      showToast("Job search failed. Check console for details.", "error")
    } finally {
      setSearchingJobs(false)
    }
  }

  const updateJobStatus = async (jobId: number, status: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/jobs/${jobId}/status?status=${status}`)
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status } : j))
    } catch (err) {
      console.error('Error updating job status', err)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom transition-all border border-slate-700 bg-slate-800 text-white`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> : 
           toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> : 
           <AlertCircle className="w-5 h-5 text-indigo-400" />}
          <p className="font-bold text-sm">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-4 hover:opacity-70 transition text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col fixed h-full z-20">
        <h1 className="text-2xl font-black mb-10 flex items-center gap-3 tracking-tight">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/40">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          JobHunt AI
        </h1>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('resume')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-semibold text-sm ${activeTab === 'resume' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <FileText className="w-5 h-5" />
            Resume Hub
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-semibold text-sm ${activeTab === 'jobs' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Briefcase className="w-5 h-5" />
            Job Search
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-semibold text-sm ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Settings className="w-5 h-5" />
            Configuration
          </button>
        </nav>
        
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
           <button 
             onClick={() => setShowDebug(!showDebug)}
             className={`w-full flex items-center gap-2 p-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition ${showDebug ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
           >
             <Code className="w-4 h-4" />
             {showDebug ? 'Hide Debug' : 'Show Debug'}
           </button>
           <button 
             onClick={() => setIsDarkMode(!isDarkMode)}
             className="w-full flex items-center gap-2 p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
           >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="text-[10px] font-bold uppercase tracking-widest">{isDarkMode ? 'Dark Mode Active' : 'Light Mode Active'}</span>
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pl-64 overflow-y-auto">
        <div className="p-10 max-w-6xl mx-auto">
          {activeTab === 'resume' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Resume Hub</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Upload and inspect your parsed profile data.</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Upload & History */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">New Upload</h3>
                    <div className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all ${file ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleFileChange}
                        accept=".pdf,.docx"
                      />
                      <FileUp className={`w-10 h-10 mb-4 ${file ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-700'}`} />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{file ? file.name : 'Select Resume'}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">PDF or DOCX</p>
                    </div>

                    <button 
                      onClick={handleUpload}
                      disabled={!file || uploading}
                      className={`w-full mt-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${file && !uploading ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 active:scale-[0.98]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      {uploading ? 'Parsing...' : 'Process Resume'}
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">History</h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {resumes.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-sm font-medium italic">No resumes found.</div>
                      ) : (
                        resumes.map(resume => (
                          <div 
                            key={resume.id} 
                            onClick={() => setSelectedResume(resume)}
                            className={`p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group ${selectedResume?.id === resume.id ? 'bg-indigo-500/5 border-l-4 border-indigo-600' : ''}`}
                          >
                            <div className="min-w-0">
                              <h4 className={`font-bold text-sm truncate ${selectedResume?.id === resume.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{resume.fileName}</h4>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">{new Date(resume.createdAt).toLocaleString()}</p>
                            </div>
                            <Eye className={`w-4 h-4 transition ${selectedResume?.id === resume.id ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-700 group-hover:text-slate-400'}`} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Parsed Data or Debug */}
                <div className="lg:col-span-8 animate-in slide-in-from-bottom-4 duration-500">
                  {selectedResume ? (
                    <div className="space-y-6">
                      {showDebug ? (
                        <div className="bg-slate-900 dark:bg-black rounded-3xl p-8 shadow-2xl border border-slate-800 dark:border-indigo-500/20 font-mono text-sm overflow-hidden">
                          <div className="flex justify-between items-center mb-6">
                            <span className="text-amber-500 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                              <Code className="w-4 h-4" /> JSON OUTPUT (DEBUG)
                            </span>
                            <span className="text-slate-600 text-[10px] font-bold">INTERNAL_ID: {selectedResume.id}</span>
                          </div>
                          <pre className="text-indigo-400 overflow-x-auto p-6 bg-slate-950 rounded-2xl border border-slate-800 leading-relaxed">
                            {JSON.stringify(selectedResume, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 min-h-[600px]">
                          <div className="flex items-center gap-6 mb-10 border-b border-slate-100 dark:border-slate-800 pb-8">
                             <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                               <FileText className="w-8 h-8" />
                             </div>
                             <div>
                               <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedResume.fileName}</h3>
                               <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Parsed by JobHunt AI Engine</p>
                             </div>
                          </div>

                          <div className="space-y-10">
                            <section>
                              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-lg shadow-indigo-500/50"></span>
                                Technical Arsenal
                              </h4>
                              <div className="flex flex-wrap gap-2.5">
                                {selectedResume.parsedSkills?.split(',').map((skill, i) => (
                                  <span key={i} className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-full font-black border border-slate-200 dark:border-slate-700">
                                    {skill.trim()}
                                  </span>
                                )) || <span className="text-slate-400 italic text-sm">No skills extracted.</span>}
                              </div>
                            </section>

                            <section>
                              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-lg shadow-indigo-500/50"></span>
                                Professional Journey
                              </h4>
                              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                                {selectedResume.parsedExperience || "No experience summary available."}
                              </div>
                            </section>

                            <section>
                              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                                <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-lg shadow-indigo-500/50"></span>
                                Academic Foundation
                              </h4>
                              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-700 dark:text-slate-300 text-sm font-bold border border-slate-100 dark:border-slate-800 italic">
                                {selectedResume.parsedEducation || "No education history found."}
                              </div>
                            </section>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-20 shadow-sm border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center min-h-[600px] border-dashed border-4 dark:border-slate-800">
                      <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-8 shadow-inner">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">No Active Profile</h3>
                      <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium leading-relaxed">Upload your resume to see the AI decomposition, skill mapping, and JSON debug output.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Job Discovery</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Find and track opportunities from multiple sources.</p>
                </div>
                <div className="flex gap-3">
                   <div className="relative group">
                     <input 
                       type="text" 
                       placeholder="Keywords (e.g. Kotlin Developer)" 
                       value={searchKeywords}
                       onChange={(e) => setSearchKeywords(e.target.value)}
                       className="p-3 pl-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm w-72 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 outline-none transition-all shadow-sm font-bold placeholder:text-slate-400"
                     />
                   </div>
                   <input 
                     type="text" 
                     placeholder="Location" 
                     value={searchLocation}
                     onChange={(e) => setSearchLocation(e.target.value)}
                     className="p-3 pl-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm w-48 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 outline-none transition-all shadow-sm font-bold placeholder:text-slate-400"
                   />
                   <button 
                     onClick={handleJobSearch}
                     disabled={searchingJobs}
                     className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 transition-all flex items-center gap-3 shadow-xl shadow-indigo-500/30 active:scale-95"
                   >
                     {searchingJobs ? <Loader2 className="w-5 h-5 animate-spin" /> : <Briefcase className="w-5 h-5" />}
                     {searchingJobs ? 'Searching' : 'Find Jobs'}
                   </button>
                </div>
              </header>

              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Job Title / Company</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Location</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Source</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-32 text-center text-slate-400 dark:text-slate-600 font-medium italic">
                          {searchingJobs ? (
                            <div className="flex flex-col items-center gap-4">
                               <Loader2 className="w-10 h-10 animate-spin text-indigo-500 opacity-20" />
                               <span>Deploying search agents...</span>
                            </div>
                          ) : 'No opportunities found. Try launching a new search.'}
                        </td>
                      </tr>
                    ) : (
                      jobs.map(job => (
                        <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition group">
                          <td className="px-8 py-6">
                            <h4 className="font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{job.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase tracking-widest">{job.company}</p>
                          </td>
                          <td className="px-8 py-6 text-xs font-bold text-slate-600 dark:text-slate-400 tracking-tight">{job.location || 'Remote'}</td>
                          <td className="px-8 py-6 text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.1em]">
                             <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">{job.site || 'Direct'}</span>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border ${
                              job.status === 'applied' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
                              job.status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 
                              'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex gap-2">
                              {job.job_url && (
                                <a 
                                  href={job.job_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-3 text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-2xl transition shadow-sm border border-transparent hover:border-indigo-500/20"
                                  title="View Original Listing"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button 
                                onClick={() => updateJobStatus(job.id, job.status === 'applied' ? 'new' : 'applied')}
                                className={`p-3 rounded-2xl transition border border-transparent ${job.status === 'applied' ? 'text-green-500 bg-green-500/5 hover:bg-green-500/10 border-green-500/20' : 'text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                                title={job.status === 'applied' ? 'Mark as Unapplied' : 'Mark as Applied'}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
             <div className="max-w-2xl mx-auto animate-in zoom-in duration-500">
                <header className="mb-12 text-center">
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Configuration</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px]">Neural Interface & API Control</p>
                </header>
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-10">
                   <div className="space-y-8">
                      <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                           <Settings className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">AI Provider Credentials</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-8">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Gemini API Key</label>
                          <div className="flex gap-3">
                            <input 
                              type="password" 
                              placeholder="Enter Gemini Key..." 
                              value={settings.GEMINI_API_KEY || ''}
                              onChange={(e) => setSettings({...settings, GEMINI_API_KEY: e.target.value})}
                              className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 outline-none transition-all font-bold placeholder:text-slate-400" 
                            />
                            <button 
                              onClick={() => updateSetting('GEMINI_API_KEY', settings.GEMINI_API_KEY)}
                              disabled={savingSettings}
                              className="px-6 py-4 bg-indigo-600 text-white rounded-[1.25rem] font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 transition shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Store'}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">JSearch API Key (RapidAPI)</label>
                          <div className="flex gap-3">
                            <input 
                              type="password" 
                              placeholder="Enter JSearch Key..." 
                              value={settings.JSEARCH_API_KEY || ''}
                              onChange={(e) => setSettings({...settings, JSEARCH_API_KEY: e.target.value})}
                              className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 outline-none transition-all font-bold placeholder:text-slate-400" 
                            />
                            <button 
                              onClick={() => updateSetting('JSEARCH_API_KEY', settings.JSEARCH_API_KEY)}
                              disabled={savingSettings}
                              className="px-6 py-4 bg-indigo-600 text-white rounded-[1.25rem] font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 transition shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Store'}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">OpenAI API Key (Optional)</label>
                          <div className="flex gap-3">
                            <input 
                              type="password" 
                              placeholder="sk-..." 
                              value={settings.OPENAI_API_KEY || ''}
                              onChange={(e) => setSettings({...settings, OPENAI_API_KEY: e.target.value})}
                              className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 outline-none transition-all font-bold placeholder:text-slate-400" 
                            />
                            <button 
                              onClick={() => updateSetting('OPENAI_API_KEY', settings.OPENAI_API_KEY)}
                              disabled={savingSettings}
                              className="px-6 py-4 bg-indigo-600 text-white rounded-[1.25rem] font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 transition shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Store'}
                            </button>
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                             <Briefcase className="w-5 h-5" />
                          </div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Active Neural Model</h3>
                        </div>
                        <button 
                          onClick={() => handleAutoDetect()}
                          className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-3 py-2 rounded-xl uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                        >
                          <Loader2 className="w-3 h-3" />
                          Refresh List
                        </button>
                      </div>
                      <div>
                        <select 
                          value={settings.AI_MODEL || 'gemini/gemini-1.5-flash'}
                          onChange={(e) => updateSetting('AI_MODEL', e.target.value)}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 outline-none transition-all font-black text-sm appearance-none shadow-inner"
                        >
                          <option value="gemini/gemini-1.5-flash">Gemini 1.5 Flash (Base)</option>
                          <option value="gemini/gemini-1.5-pro">Gemini 1.5 Pro (Max)</option>
                          {fetchedModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                          <option value="gpt-4o">GPT-4o (OpenAI)</option>
                          <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                          <option value="ollama/llama3">Ollama Llama 3 (Local)</option>
                        </select>
                      </div>
                   </div>

                   <div className="p-6 bg-indigo-600/5 dark:bg-indigo-500/5 rounded-[1.5rem] flex gap-4 items-start border border-indigo-500/10">
                      <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg">
                        <AlertCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight">Database Isolation</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">All keys and history are stored within your local PostgreSQL instance. No credentials leave your machine except during encrypted API requests to providers.</p>
                      </div>
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

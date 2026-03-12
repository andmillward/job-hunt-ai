import { useState, useEffect } from 'react'
import { FileUp, Briefcase, FileText, Settings, Loader2, CheckCircle, AlertCircle, Code, Eye, ExternalLink } from 'lucide-react'
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

function App() {
  const [activeTab, setActiveTab] = useState('resume')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [, setError] = useState<string | null>(null)
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

  useEffect(() => {
    fetchResumes()
    fetchSettings()
    fetchJobs()
  }, [])

  const fetchResumes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/resumes`)
      setResumes(response.data)
      if (response.data.length > 0 && !selectedResume) {
        setSelectedResume(response.data[0])
      }
    } catch (err) {
      console.error('Error fetching resumes', err)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings`)
      setSettings(response.data)
    } catch (err) {
      console.error('Error fetching settings', err)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/jobs`)
      setJobs(response.data)
    } catch (err) {
      console.error('Error fetching jobs', err)
    }
  }

  const updateSetting = async (key: string, value: string) => {
    setSavingSettings(true)
    try {
      await axios.post(`${API_BASE_URL}/settings`, { key, value })
      setSettings(prev => ({ ...prev, [key]: value }))
    } catch (err) {
      console.error('Error updating setting', err)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post(`${API_BASE_URL}/resumes`, formData)
      setFile(null)
      fetchResumes()
      setSelectedResume(response.data)
      alert('Resume uploaded successfully!')
    } catch (err) {
      setError('Failed to upload resume. Ensure backend is running.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleAutoDetect = async () => {
    try {
      const resp = await axios.get(`${API_BASE_URL}/models/gemini`)
      if (resp.data.length > 0) {
        setFetchedModels(resp.data)
        alert(`Found ${resp.data.length} Gemini models. Select one from the updated list.`)
      } else {
        alert("No models found. Check your Gemini API Key.")
      }
    } catch (e) {
      alert("Error fetching models. Make sure the backend is running and the API key is correct.")
    }
  }

  const handleJobSearch = async () => {
    if (!searchKeywords) {
      alert("Please enter keywords to search.")
      return
    }
    setSearchingJobs(true)
    try {
      await axios.post(`${API_BASE_URL}/jobs/search`, {
        keywords: searchKeywords,
        location: searchLocation,
        results_wanted: 20
      })
      fetchJobs()
      alert("Search completed! New jobs added to your list.")
    } catch (err) {
      console.error('Error searching jobs', err)
      alert("Job search failed. Check console for details.")
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
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-6 flex flex-col fixed h-full shadow-2xl z-20">
        <h1 className="text-2xl font-bold mb-10 flex items-center gap-2">
          <Briefcase className="w-8 h-8 text-indigo-400" />
          JobHunt AI
        </h1>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('resume')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'resume' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <FileText className="w-5 h-5" />
            Resume Hub
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'jobs' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Briefcase className="w-5 h-5" />
            Job Search
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings className="w-5 h-5" />
            Configuration
          </button>
        </nav>
        
        <div className="pt-6 border-t border-slate-800">
           <button 
             onClick={() => setShowDebug(!showDebug)}
             className={`w-full flex items-center gap-2 p-2 text-xs rounded-lg transition ${showDebug ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:bg-slate-800'}`}
           >
             <Code className="w-4 h-4" />
             {showDebug ? 'Hide Debug View' : 'Show Debug View'}
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pl-64 overflow-y-auto">
        <div className="p-10 max-w-6xl mx-auto">
          {activeTab === 'resume' && (
            <div className="space-y-8">
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Resume Hub</h2>
                  <p className="text-slate-500">Upload and inspect your parsed profile data.</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Upload & History */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">New Upload</h3>
                    <div className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition ${file ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleFileChange}
                        accept=".pdf,.docx"
                      />
                      <FileUp className={`w-8 h-8 mb-3 ${file ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <p className="text-xs font-semibold text-slate-700">{file ? file.name : 'Select Resume'}</p>
                    </div>

                    <button 
                      onClick={handleUpload}
                      disabled={!file || uploading}
                      className={`w-full mt-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${file && !uploading ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {uploading ? 'Parsing...' : 'Process Resume'}
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">History</h3>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                      {resumes.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm italic">No history found.</div>
                      ) : (
                        resumes.map(resume => (
                          <div 
                            key={resume.id} 
                            onClick={() => setSelectedResume(resume)}
                            className={`p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${selectedResume?.id === resume.id ? 'bg-indigo-50/50 border-l-4 border-indigo-600' : ''}`}
                          >
                            <div className="min-w-0">
                              <h4 className="font-medium text-slate-800 text-sm truncate">{resume.fileName}</h4>
                              <p className="text-[10px] text-slate-400">{new Date(resume.createdAt).toLocaleString()}</p>
                            </div>
                            <Eye className="w-4 h-4 text-slate-300" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Parsed Data or Debug */}
                <div className="lg:col-span-8">
                  {selectedResume ? (
                    <div className="space-y-6">
                      {showDebug ? (
                        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800 font-mono text-sm overflow-hidden">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-amber-400 font-bold flex items-center gap-2">
                              <Code className="w-4 h-4" /> JSON OUTPUT (DEBUG)
                            </span>
                            <span className="text-slate-500 text-[10px]">ID: {selectedResume.id}</span>
                          </div>
                          <pre className="text-indigo-300 overflow-x-auto p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                            {JSON.stringify(selectedResume, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 min-h-[600px]">
                          <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                             <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                               <FileText className="w-6 h-6" />
                             </div>
                             <div>
                               <h3 className="text-xl font-bold text-slate-800">{selectedResume.fileName}</h3>
                               <p className="text-sm text-slate-500 italic">Parsed by JobHunt AI Engine</p>
                             </div>
                          </div>

                          <div className="space-y-8">
                            <section>
                              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                                Technical Skills
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedResume.parsedSkills?.split(',').map((skill, i) => (
                                  <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full font-medium">
                                    {skill.trim()}
                                  </span>
                                )) || <span className="text-slate-400 italic text-sm">No skills extracted.</span>}
                              </div>
                            </section>

                            <section>
                              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                                Experience Summary
                              </h4>
                              <div className="p-4 bg-slate-50 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                {selectedResume.parsedExperience || "No experience summary available."}
                              </div>
                            </section>

                            <section>
                              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                                Education
                              </h4>
                              <div className="p-4 bg-slate-50 rounded-xl text-slate-700 text-sm italic">
                                {selectedResume.parsedEducation || "No education history found."}
                              </div>
                            </section>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-20 shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center min-h-[600px]">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <FileText className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">No Resume Selected</h3>
                      <p className="text-slate-500 max-w-sm">Upload a resume to see the AI decomposition and JSON debug output.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-8">
               <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Job Discovery</h2>
                  <p className="text-slate-500">Find and track opportunities from multiple sources.</p>
                </div>
                <div className="flex gap-2">
                   <input 
                     type="text" 
                     placeholder="Keywords (e.g. Kotlin Developer)" 
                     value={searchKeywords}
                     onChange={(e) => setSearchKeywords(e.target.value)}
                     className="p-2 bg-white border border-slate-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                   />
                   <input 
                     type="text" 
                     placeholder="Location" 
                     value={searchLocation}
                     onChange={(e) => setSearchLocation(e.target.value)}
                     className="p-2 bg-white border border-slate-200 rounded-lg text-sm w-40 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                   />
                   <button 
                     onClick={handleJobSearch}
                     disabled={searchingJobs}
                     className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:bg-slate-300 transition flex items-center gap-2"
                   >
                     {searchingJobs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
                     {searchingJobs ? 'Searching...' : 'Find Jobs'}
                   </button>
                </div>
              </header>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Job Title / Company</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Location</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Source</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">No jobs found. Try running a search.</td>
                      </tr>
                    ) : (
                      jobs.map(job => (
                        <tr key={job.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <h4 className="font-bold text-slate-800">{job.title}</h4>
                            <p className="text-sm text-slate-500">{job.company}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{job.location || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 capitalize">{job.site || 'Direct'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                              job.status === 'applied' ? 'bg-green-100 text-green-600' : 
                              job.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {job.job_url && (
                                <a 
                                  href={job.job_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="View Original Listing"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button 
                                onClick={() => updateJobStatus(job.id, job.status === 'applied' ? 'new' : 'applied')}
                                className={`p-2 rounded-lg transition ${job.status === 'applied' ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
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
             <div className="max-w-2xl mx-auto">
                <header className="mb-10 text-center">
                  <h2 className="text-3xl font-bold text-slate-800">Configuration</h2>
                  <p className="text-slate-500 mt-2">Manage your AI credentials and preferences.</p>
                </header>
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-8">
                   <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">AI Provider Credentials</h3>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gemini API Key</label>
                        <div className="flex gap-2">
                          <input 
                            type="password" 
                            placeholder="Enter Gemini Key..." 
                            value={settings.GEMINI_API_KEY || ''}
                            onChange={(e) => setSettings({...settings, GEMINI_API_KEY: e.target.value})}
                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" 
                          />
                          <button 
                            onClick={() => updateSetting('GEMINI_API_KEY', settings.GEMINI_API_KEY)}
                            disabled={savingSettings}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 transition"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">OpenAI API Key (Optional)</label>
                        <div className="flex gap-2">
                          <input 
                            type="password" 
                            placeholder="sk-..." 
                            value={settings.OPENAI_API_KEY || ''}
                            onChange={(e) => setSettings({...settings, OPENAI_API_KEY: e.target.value})}
                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition" 
                          />
                          <button 
                            onClick={() => updateSetting('OPENAI_API_KEY', settings.OPENAI_API_KEY)}
                            disabled={savingSettings}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 transition"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-lg font-semibold text-slate-800">Model Selection</h3>
                        <button 
                          onClick={handleAutoDetect}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold transition"
                        >
                          Auto-Detect Gemini Models
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Active Model</label>
                        <select 
                          value={settings.AI_MODEL || 'gemini/gemini-1.5-flash'}
                          onChange={(e) => updateSetting('AI_MODEL', e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                        >
                          <option value="gemini/gemini-1.5-flash">Gemini 1.5 Flash (Fast/Cheap)</option>
                          <option value="gemini/gemini-1.5-pro">Gemini 1.5 Pro (Powerful)</option>
                          {fetchedModels.map(m => (
                            <option key={m.id} value={m.id}>{m.name} (Auto-detected)</option>
                          ))}
                          <option value="gpt-4o">GPT-4o (OpenAI)</option>
                          <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                          <option value="ollama/llama3">Ollama Llama 3 (Local)</option>
                        </select>
                      </div>
                   </div>

                   <div className="p-4 bg-amber-50 rounded-xl flex gap-3 items-start border border-amber-100">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-amber-800">Persistence</p>
                        <p className="text-xs text-amber-700 mt-1">These keys are stored in your local PostgreSQL database. They will persist between sessions but stay on your machine.</p>
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

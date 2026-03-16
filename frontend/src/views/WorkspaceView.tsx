import React, { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, FileText, Radio, Radar, Save, Edit2, X, Target, Zap } from 'lucide-react'
import { Resume, Job, SavedSearch } from '../types'
import SearchNetGenerator from '../components/workspace/SearchNetGenerator'
import JobRadar from '../components/workspace/JobRadar'
import ResumeUpload from '../components/hub/ResumeUpload'
import ResumeList from '../components/hub/ResumeList'

interface WorkspaceViewProps {
  // Resume Data & Actions
  resumes: Resume[]
  selectedResume: Resume | null
  uploading: boolean
  onUploadResume: (file: File) => Promise<any>
  onSelectResume: (resume: Resume) => void
  onDeleteResume: (id: number) => void
  onUpdateResume: (id: number, data: any) => void
  
  // App State
  workspaceTab: string
  setWorkspaceTab: (tab: string) => void
  
  // Search Net Props
  searchingJobs: boolean
  rankingJobs: boolean
  runningNet: boolean
  dreamRole: string
  setDreamRole: (role: string) => void
  savedSearches: SavedSearch[]
  generatingNet: boolean
  onGenerateNet: () => void
  onRunVerifiedNet: () => void
  onSingleSearch: (search: SavedSearch) => void
  onAddSearch: (search: any) => void
  onUpdateSearch: (id: number, data: any) => void
  onDeleteSearch: (id: number) => void
  onClearUnverified: () => void
  
  // Job Data
  jobs: Job[]
  rankedJobs: Job[]
  unrankedCount: number
  scanLimit: number
  setScanLimit: (limit: number) => void
  onRankJobs: (limit: number) => void
  onUpdateJobStatus: (id: number, status: string) => void
  expandedJobs: Record<number, boolean>
  onToggleExpandJob: (id: number) => void
}

const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  resumes,
  selectedResume,
  uploading,
  onUploadResume,
  onSelectResume,
  onDeleteResume,
  onUpdateResume,
  workspaceTab,
  setWorkspaceTab,
  searchingJobs,
  rankingJobs,
  runningNet,
  dreamRole,
  setDreamRole,
  savedSearches,
  generatingNet,
  onGenerateNet,
  onRunVerifiedNet,
  onSingleSearch,
  onAddSearch,
  onUpdateSearch,
  onDeleteSearch,
  onClearUnverified,
  jobs,
  rankedJobs,
  unrankedCount,
  scanLimit,
  setScanLimit,
  onRankJobs,
  onUpdateJobStatus,
  expandedJobs,
  onToggleExpandJob
}) => {
  const [isEditingResume, setIsEditingResume] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedSkills, setEditedSkills] = useState('')
  const [editedExperience, setEditedExperience] = useState('')

  useEffect(() => {
    if (selectedResume) {
      setEditedName(selectedResume.fileName || '')
      setEditedSkills(selectedResume.parsedSkills || '')
      setEditedExperience(selectedResume.parsedExperience || '')
    }
  }, [selectedResume, isEditingResume])

  const handleSaveResume = () => {
    if (selectedResume) {
      onUpdateResume(selectedResume.id, {
        file_name: editedName,
        parsed_skills: editedSkills,
        parsed_experience: editedExperience
      })
      setIsEditingResume(false)
    }
  }

  const handleStartHunt = () => {
    setWorkspaceTab('search-net')
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">The Hunt</h2>
            {(searchingJobs || runningNet || rankingJobs) && <Loader2 className="w-8 h-8 text-indigo-500 animate-spin opacity-50" />}
          </div>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mt-1">Multi-Step Intelligence Deployment</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-1 shadow-sm">
          {[ 
            {id: 'breakdown', label: '1. Profile', icon: <FileText className="w-3.5 h-3.5" />}, 
            {id: 'search-net', label: '2. Search Net', icon: <Radio className="w-3.5 h-3.5" />}, 
            {id: 'radar', label: '3. Job Radar', icon: <Radar className="w-3.5 h-3.5" />} 
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setWorkspaceTab(t.id)} 
              disabled={!selectedResume && t.id !== 'breakdown'}
              className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all relative flex items-center gap-2 ${workspaceTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed'}`}
            >
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-500">
            {/* 2/3 AREA: PROFILE ANALYSIS */}
            <div className="lg:col-span-2 space-y-8">
              {selectedResume ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div className="flex-1 mr-4">
                      {isEditingResume ? (
                        <input 
                          type="text" 
                          value={editedName} 
                          onChange={e => setEditedName(e.target.value)}
                          className="text-2xl font-black tracking-tight bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 w-full text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                        />
                      ) : (
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedResume.fileName}</h3>
                      )}
                    </div>
                    <div className="flex gap-3 shrink-0">
                      {!isEditingResume ? (
                        <button onClick={() => setIsEditingResume(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      ) : (
                        <>
                          <button onClick={() => setIsEditingResume(false)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <button onClick={handleSaveResume} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all">
                            <Save className="w-3.5 h-3.5" /> Save
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <section>
                    <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] mb-6 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div> Technical Arsenal
                    </h4>
                    {isEditingResume ? (
                      <textarea 
                        value={editedSkills} 
                        onChange={e => setEditedSkills(e.target.value)}
                        className="w-full p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl font-bold text-sm min-h-[100px] outline-none focus:border-indigo-500 transition-all"
                        placeholder="Enter skills separated by commas..."
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        {selectedResume.parsedSkills?.split(',').map((s, i) => (
                          <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-xs font-black text-slate-700 dark:text-slate-300">{s.trim()}</span>
                        ))}
                      </div>
                    )}
                  </section>
                  
                  <section>
                    <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] mb-6 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div> Professional Journey
                    </h4>
                    {isEditingResume ? (
                      <textarea 
                        value={editedExperience} 
                        onChange={e => setEditedExperience(e.target.value)}
                        className="w-full p-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl font-medium text-sm min-h-[300px] outline-none focus:border-indigo-500 transition-all leading-relaxed"
                        placeholder="Summarize professional experience..."
                      />
                    ) : (
                      <div className="p-8 bg-slate-50 dark:bg-slate-950/50 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap font-medium text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                        {selectedResume.parsedExperience}
                      </div>
                    )}
                  </section>

                  <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button 
                      onClick={handleStartHunt}
                      className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-sm tracking-widest hover:bg-indigo-700 shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all flex items-center gap-4"
                    >
                      Start the Hunt <Target className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[500px] bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-20">
                  <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600 mb-6">
                    <Target className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Initialize Persona</h3>
                  <p className="text-slate-500 max-w-md font-medium">Select an existing profile from the list or upload a new resume to begin your mission.</p>
                </div>
              )}
            </div>

            {/* 1/3 AREA: HUB CONTROLS */}
            <div className="space-y-8">
              <ResumeUpload onUpload={onUploadResume} uploading={uploading} />
              <ResumeList 
                resumes={resumes} 
                selectedResume={selectedResume} 
                onSelect={onSelectResume} 
                onDelete={onDeleteResume} 
              />
            </div>
          </div>
        )}

        {workspaceTab === 'search-net' && (
          <SearchNetGenerator 
            dreamRole={dreamRole}
            setDreamRole={setDreamRole}
            savedSearches={savedSearches}
            generatingNet={generatingNet}
            runningNet={runningNet}
            onGenerate={onGenerateNet}
            onRunVerified={onRunVerifiedNet}
            onSingleSearch={onSingleSearch}
            onAddSearch={onAddSearch}
            onUpdateSearch={onUpdateSearch}
            onDelete={onDeleteSearch}
            onClearUnverified={onClearUnverified}
          />
        )}

        {workspaceTab === 'radar' && (
          <JobRadar 
            jobs={jobs}
            rankedJobs={rankedJobs}
            unrankedCount={unrankedCount}
            rankingJobs={rankingJobs}
            searchingJobs={searchingJobs}
            runningNet={runningNet}
            scanLimit={scanLimit}
            setScanLimit={setScanLimit}
            onRankJobs={onRankJobs}
            onUpdateStatus={onUpdateJobStatus}
            expandedJobs={expandedJobs}
            onToggleExpand={onToggleExpandJob}
          />
        )}
      </div>
    </div>
  )
}

export default WorkspaceView

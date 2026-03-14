import React, { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, FileText, Radio, Radar, Save, Edit2, X } from 'lucide-react'
import { Resume, Job, SavedSearch } from '../types'
import SearchNetGenerator from '../components/workspace/SearchNetGenerator'
import JobRadar from '../components/workspace/JobRadar'

interface WorkspaceViewProps {
  selectedResume: Resume
  workspaceTab: string
  setWorkspaceTab: (tab: string) => void
  onBackToHub: () => void
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
  onUpdateResume: (id: number, data: any) => void
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
  selectedResume,
  workspaceTab,
  setWorkspaceTab,
  onBackToHub,
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
  onUpdateResume,
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
    setEditedName(selectedResume.fileName || '')
    setEditedSkills(selectedResume.parsedSkills || '')
    setEditedExperience(selectedResume.parsedExperience || '')
  }, [selectedResume, isEditingResume])

  const handleSaveResume = () => {
    onUpdateResume(selectedResume.id, {
      file_name: editedName,
      parsed_skills: editedSkills,
      parsed_experience: editedExperience
    })
    setIsEditingResume(false)
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <header className="flex justify-between items-start">
        <div>
          <button onClick={onBackToHub} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Hub
          </button>
          <div className="flex items-center gap-4">
            {isEditingResume ? (
              <input 
                type="text" 
                value={editedName} 
                onChange={e => setEditedName(e.target.value)}
                className="text-4xl font-black tracking-tight bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-1 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            ) : (
              <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{selectedResume.fileName}</h2>
            )}
            {(searchingJobs || runningNet || rankingJobs) && <Loader2 className="w-8 h-8 text-indigo-500 animate-spin opacity-50" />}
          </div>
          <p className="text-slate-500 font-medium mt-1">Workspace for persona deployment and discovery.</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-1 shadow-sm">
          {[ 
            {id: 'breakdown', label: 'Breakdown', icon: <FileText className="w-3.5 h-3.5" />}, 
            {id: 'search-net', label: 'Search Net', icon: <Radio className="w-3.5 h-3.5" />}, 
            {id: 'radar', label: 'Job Radar', icon: <Radar className="w-3.5 h-3.5" />} 
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setWorkspaceTab(t.id)} 
              className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all relative flex items-center gap-2 ${workspaceTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
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
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Profile Analysis</h3>
                <div className="flex gap-3">
                  {!isEditingResume ? (
                    <button onClick={() => setIsEditingResume(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                      <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setIsEditingResume(false)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button onClick={handleSaveResume} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all">
                        <Save className="w-3.5 h-3.5" /> Save Changes
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

import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/common/Sidebar'
import Toast from './components/common/Toast'
import HubView from './views/HubView'
import WorkspaceView from './views/WorkspaceView'
import SettingsView from './views/SettingsView'
import { useResumes } from './hooks/useResumes'
import { useJobs } from './hooks/useJobs'
import { useSettings } from './hooks/useSettings'
import { Toast as ToastType } from './types'

function App() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'hub')
  const [workspaceTab, setWorkspaceTab] = useState('breakdown')
  const [showDebug, setShowDebug] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [toast, setToast] = useState<ToastType | null>(null)
  const [expandedJobs, setExpandedJobs] = useState<Record<number, boolean>>({})
  const [scanLimit, setScanLimit] = useState(20)
  const [dreamRole, setDreamRole] = useState('')

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', action?: () => void) => {
    setToast({ message, type, action })
    setTimeout(() => setToast(null), 8000)
  }, [])

  const goToRadar = useCallback(() => {
    setWorkspaceTab('radar')
  }, [])

  const {
    resumes,
    selectedResume,
    setSelectedResume,
    uploading,
    fetchResumes,
    uploadResume,
    deleteResume
  } = useResumes(showToast)

  const {
    jobs,
    searchingJobs,
    rankingJobs,
    savedSearches,
    generatingNet,
    runningNet,
    fetchJobs,
    fetchSavedSearches,
    updateJobStatus,
    handleRankJobs,
    handleGenerateNet,
    handleRunVerifiedNet,
    handleSingleSearch,
    toggleVerifySearch,
    deleteSavedSearch,
    clearUnverifiedSearches,
    rankedJobs,
    unrankedCount
  } = useJobs(selectedResume, showToast, goToRadar)

  const {
    settings,
    setSettings,
    savingSettings,
    geminiModels,
    ollamaModels,
    fetchSettings,
    handleAutoDetect,
    updateSetting
  } = useSettings(showToast)

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    if (selectedResume) {
      setDreamRole(selectedResume.dreamRole || '')
    } else {
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

  useEffect(() => {
    fetchResumes()
    fetchSettings()
    fetchJobs()
  }, [fetchResumes, fetchSettings, fetchJobs])

  useEffect(() => {
    fetchSavedSearches()
  }, [selectedResume?.id, fetchSavedSearches])

  const handleSelectResume = (resume: any) => {
    setSelectedResume(resume)
    setActiveTab('workspace')
    setWorkspaceTab('breakdown')
  }

  const handleBackToHub = () => {
    setActiveTab('hub')
  }

  const toggleExpandJob = (id: number) => {
    setExpandedJobs(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-all duration-300">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedResume={selectedResume}
        isRadarActive={searchingJobs || runningNet || rankingJobs}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        showDebug={showDebug}
        setShowDebug={setShowDebug}
      />

      <div className="flex-1 pl-64 overflow-y-auto">
        <div className={`p-10 mx-auto ${activeTab === 'workspace' ? 'max-w-none' : 'max-w-6xl'}`}>
          {activeTab === 'hub' && (
            <HubView 
              resumes={resumes}
              selectedResume={selectedResume}
              uploading={uploading}
              onUpload={uploadResume}
              onSelect={handleSelectResume}
              onDelete={deleteResume}
            />
          )}

          {activeTab === 'workspace' && selectedResume && (
            <WorkspaceView 
              selectedResume={selectedResume}
              workspaceTab={workspaceTab}
              setWorkspaceTab={setWorkspaceTab}
              onBackToHub={handleBackToHub}
              searchingJobs={searchingJobs}
              rankingJobs={rankingJobs}
              runningNet={runningNet}
              dreamRole={dreamRole}
              setDreamRole={setDreamRole}
              savedSearches={savedSearches}
              generatingNet={generatingNet}
              onGenerateNet={() => handleGenerateNet(dreamRole)}
              onRunVerifiedNet={handleRunVerifiedNet}
              onSingleSearch={handleSingleSearch}
              onToggleVerifySearch={toggleVerifySearch}
              onDeleteSearch={deleteSavedSearch}
              onClearUnverified={clearUnverifiedSearches}
              jobs={jobs}
              rankedJobs={rankedJobs}
              unrankedCount={unrankedCount}
              scanLimit={scanLimit}
              setScanLimit={setScanLimit}
              onRankJobs={handleRankJobs}
              onUpdateJobStatus={updateJobStatus}
              expandedJobs={expandedJobs}
              onToggleExpandJob={toggleExpandJob}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView 
              settings={settings}
              setSettings={setSettings}
              savingSettings={savingSettings}
              geminiModels={geminiModels}
              ollamaModels={ollamaModels}
              onUpdateSetting={updateSetting}
              onRefreshModels={handleAutoDetect}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default App

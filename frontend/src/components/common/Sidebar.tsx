import React from 'react'
import { Target, Briefcase, Settings, Moon, Sun, Code } from 'lucide-react'
import { Resume } from '../../types'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  selectedResume: Resume | null
  isRadarActive: boolean
  isDarkMode: boolean
  setIsDarkMode: (dark: boolean) => void
  showDebug: boolean
  setShowDebug: (debug: boolean) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedResume,
  isRadarActive,
  isDarkMode,
  setIsDarkMode,
  showDebug,
  setShowDebug
}) => {
  return (
    <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col fixed h-full z-20">
      <h1 className="text-xl font-black mb-10 flex items-center gap-3 tracking-tight text-slate-900 dark:text-white">
        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/40 text-white">
          <Target className="w-5 h-5" />
        </div>
        JobHunt AI
      </h1>
      
      <nav className="flex-1 space-y-2">
        <button 
          onClick={() => setActiveTab('workspace')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-bold text-sm ${activeTab === 'workspace' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Briefcase className="w-4 h-4" /> The Hunt
        </button>

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
                  <span className={`w-1.5 h-1.5 rounded-full ${isRadarActive ? 'bg-amber-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></span> 
                  {isRadarActive ? 'Radar Active' : 'Target Locked'}
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
  )
}

export default Sidebar

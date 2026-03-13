import React from 'react'
import { Trash2, Target } from 'lucide-react'
import { Resume } from '../../types'

interface ResumeListProps {
  resumes: Resume[]
  selectedResume: Resume | null
  onSelect: (resume: Resume) => void
  onDelete: (id: number) => void
}

const ResumeList: React.FC<ResumeListProps> = ({ resumes, selectedResume, onSelect, onDelete }) => {
  return (
    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Saved Profiles</h3>
        <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{resumes.length}</span>
      </div>
      <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {resumes.length === 0 ? (
          <div className="p-20 text-center text-slate-400 italic text-sm">No profiles found. Upload one to start!</div>
        ) : (
          resumes.map(r => (
            <div 
              key={r.id} 
              onClick={() => onSelect(r)} 
              className={`p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all group ${selectedResume?.id === r.id ? 'border-l-4 border-indigo-600 bg-indigo-50/30' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 dark:text-white truncate">{r.fileName}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Generated {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 font-black text-[10px] uppercase">
                  <Target className="w-3.5 h-3.5" /> Start Hunt
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(r.id); }} 
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ResumeList

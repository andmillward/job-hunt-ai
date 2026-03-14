import React, { useState } from 'react'
import { Sparkles, Loader2, Briefcase, Code, Trash2, Send, CheckCircle, Globe, DollarSign, Plus, Edit2, X, Save } from 'lucide-react'
import { SavedSearch } from '../../types'

interface SearchNetGeneratorProps {
  dreamRole: string
  setDreamRole: (role: string) => void
  savedSearches: SavedSearch[]
  generatingNet: boolean
  runningNet: boolean
  onGenerate: () => void
  onRunVerified: () => void
  onSingleSearch: (search: SavedSearch) => void
  onAddSearch: (search: any) => void
  onUpdateSearch: (id: number, data: any) => void
  onDelete: (id: number) => void
  onClearUnverified: () => void
}

const SearchNetGenerator: React.FC<SearchNetGeneratorProps> = ({
  dreamRole,
  setDreamRole,
  savedSearches,
  generatingNet,
  runningNet,
  onGenerate,
  onRunVerified,
  onSingleSearch,
  onAddSearch,
  onUpdateSearch,
  onDelete,
  onClearUnverified
}) => {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    keywords: '',
    location: '',
    min_salary: '',
    remote_only: false,
    job_type: 'full_time',
    hours_old: 72
  })

  const handleAdd = () => {
    onAddSearch({
      ...formData,
      min_salary: formData.min_salary ? parseInt(formData.min_salary) : null
    })
    setIsAdding(false)
    setFormData({ keywords: '', location: '', min_salary: '', remote_only: false, job_type: 'full_time', hours_old: 72 })
  }

  const startEdit = (s: SavedSearch) => {
    setEditingId(s.id)
    setFormData({
      keywords: s.keywords,
      location: s.location || '',
      min_salary: s.min_salary?.toString() || '',
      remote_only: s.remote_only,
      job_type: s.job_type || 'full_time',
      hours_old: s.hours_old
    })
  }

  const handleUpdate = (id: number) => {
    onUpdateSearch(id, {
      ...formData,
      min_salary: formData.min_salary ? parseInt(formData.min_salary) : null
    })
    setEditingId(null)
  }

  return (
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
            <div className="flex gap-3">
              <button 
                onClick={() => setIsAdding(!isAdding)} 
                className="bg-white/10 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-3"
              >
                {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {isAdding ? 'Cancel' : 'Manual Add'}
              </button>
              <button 
                onClick={onRunVerified} 
                disabled={runningNet || savedSearches.filter(s => s.is_verified).length === 0} 
                className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 shadow-xl active:scale-95 transition-all flex items-center gap-3"
              >
                {runningNet ? <Loader2 className="animate-spin w-4 h-4" /> : <Briefcase className="w-4 h-4" />} {runningNet ? 'Deploying...' : 'Deploy Net'}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <input 
              type="text" 
              placeholder="e.g. Staff Kotlin Dev, remote preferred, above $150k..." 
              value={dreamRole} 
              onChange={(e) => setDreamRole(e.target.value)} 
              className="flex-1 p-5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-indigo-200/50 focus:ring-4 focus:ring-white/10 outline-none font-bold" 
            />
            <button 
              onClick={onGenerate} 
              disabled={generatingNet || !dreamRole} 
              className="bg-white text-indigo-600 px-8 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-3 shadow-lg active:scale-95"
            >
              {generatingNet ? <Loader2 className="animate-spin w-5 h-5" /> : <Code className="w-5 h-5" />} {generatingNet ? 'Processing' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-indigo-500/30 shadow-xl animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingId ? 'Edit Query' : 'Manual Search Query'}</h4>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Keywords</label>
              <input type="text" value={formData.keywords} onChange={e => setFormData({...formData, keywords: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold" placeholder="e.g. Senior Software Engineer" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</label>
              <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold" placeholder="e.g. Remote, USA" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Min Salary</label>
              <input type="number" value={formData.min_salary} onChange={e => setFormData({...formData, min_salary: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold" placeholder="e.g. 150000" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Type</label>
              <select value={formData.job_type} onChange={e => setFormData({...formData, job_type: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold">
                <option value="full_time">Full Time</option>
                <option value="contract">Contract</option>
                <option value="part_time">Part Time</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div onClick={() => setFormData({...formData, remote_only: !formData.remote_only})} className={`w-12 h-6 rounded-full transition-colors relative ${formData.remote_only ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.remote_only ? 'translate-x-6' : ''}`}></div>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remote Only</span>
              </label>
            </div>
          </div>
          <button onClick={() => editingId ? handleUpdate(editingId) : handleAdd()} className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg">
            {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {editingId ? 'Save Changes' : 'Add to Net'}
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Search Net</span>
          <button onClick={onClearUnverified} className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-1.5 transition-colors">
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
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded">{s.job_type?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => onSingleSearch(s)} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-slate-100 dark:border-slate-700" title="Run this search immediately"><Send className="w-3.5 h-3.5" /></button>
                    <button onClick={() => startEdit(s)} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-slate-100 dark:border-slate-700" title="Edit this search"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onUpdateSearch(s.id, { is_verified: !s.is_verified })} className={`p-2 rounded-lg transition-all border ${s.is_verified ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 border-green-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 border-slate-100 dark:border-slate-700'}`} title={s.is_verified ? "Verified (Included in deployment)" : "Click to verify"}><CheckCircle className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(s.id)} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchNetGenerator

import React from 'react'
import { Radar, Loader2, TrendingUp } from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'
import { Job } from '../../types'
import JobCard from './JobCard'

interface JobRadarProps {
  jobs: Job[]
  rankedJobs: Job[]
  unrankedCount: number
  rankingJobs: boolean
  searchingJobs: boolean
  runningNet: boolean
  scanLimit: number
  setScanLimit: (limit: number) => void
  onRankJobs: (limit: number) => void
  onUpdateStatus: (id: number, status: string) => void
  expandedJobs: Record<number, boolean>
  onToggleExpand: (id: number) => void
}

const JobRadar: React.FC<JobRadarProps> = ({
  jobs,
  rankedJobs,
  unrankedCount,
  rankingJobs,
  searchingJobs,
  runningNet,
  scanLimit,
  setScanLimit,
  onRankJobs,
  onUpdateStatus,
  expandedJobs,
  onToggleExpand
}) => {
  
  const getDuplicatesFor = (parentId: number) => {
    return jobs.filter(j => j.parent_id === parentId)
  }

  // --- RENDER HELPERS ---

  const renderJobItem = (index: number, job: Job) => (
    <JobCard 
      key={job.id}
      job={job}
      duplicates={getDuplicatesFor(job.id)}
      isExpanded={!!expandedJobs[job.id]}
      onToggleExpand={() => onToggleExpand(job.id)}
      onUpdateStatus={onUpdateStatus}
    />
  )

  const EmptyRadarState = () => (
    <div className="p-40 text-center text-slate-400 text-sm font-medium italic bg-white dark:bg-slate-900 rounded-[2.5rem]">
      {searchingJobs || runningNet 
        ? 'Deploying search agents. Results will appear shortly...' 
        : 'Your Radar is empty. Deploy an agent to begin.'
      }
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 space-y-8 pb-20">
      
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Radar className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Alignment Scoring</h3>
            <p className="text-slate-500 text-sm font-medium">Analyze discovered listings against your resume and preferences.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Scan Amount</label>
            <select 
              value={scanLimit} 
              onChange={(e) => setScanLimit(parseInt(e.target.value))}
              className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-black text-indigo-600 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <option value={10}>10 Items</option>
              <option value={20}>20 Items</option>
              <option value={50}>50 Items</option>
              <option value={0}>No Limit</option>
            </select>
          </div>
          <button 
            onClick={() => onRankJobs(scanLimit)} 
            disabled={rankingJobs || unrankedCount === 0}
            className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
          >
            {rankingJobs ? <Loader2 className="animate-spin w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            {rankingJobs ? 'Scoring Batch...' : 'Scan Alignment'}
          </button>
        </div>
      </div>

      {/* VIRTUALIZED PRIORITY FEED */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col min-h-[600px]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Priority Feed</h3>
            {(searchingJobs || runningNet || rankingJobs) && (
              <span className="flex items-center gap-2 text-[9px] font-black text-amber-500 animate-pulse uppercase">
                <Loader2 className="w-3 h-3 animate-spin" /> System Processing...
              </span>
            )}
          </div>
          <span className="text-[10px] font-black text-indigo-600 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
            {rankedJobs.length} Primary Listings
          </span>
        </div>

        {rankedJobs.length === 0 ? (
          <EmptyRadarState />
        ) : (
          <Virtuoso
            style={{ height: 'calc(100vh - 350px)', minHeight: '600px' }}
            data={rankedJobs}
            itemContent={renderJobItem}
            className="divide-y divide-slate-100 dark:divide-slate-800"
          />
        )}
      </div>
    </div>
  )
}

export default JobRadar

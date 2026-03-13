import React from 'react'
import { Building2, Star, Info, MessageSquare, Twitter, ExternalLink, CheckCircle, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { Job } from '../../types'

interface JobCardProps {
  job: Job
  duplicates: Job[]
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdateStatus: (id: number, status: string) => void
}

const JobCard: React.FC<JobCardProps> = ({ job, duplicates, isExpanded, onToggleExpand, onUpdateStatus }) => {
  const alignment = job.alignments?.[0]
  const intel = job.company_intel

  return (
    <div className="transition-all">
      <div className={`p-8 flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/20' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-black text-lg text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 transition-colors">{job.title}</h4>
            <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border ${job.status === 'applied' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{job.status}</span>
            {alignment && (
              <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${alignment.score_overall >= 8 ? 'bg-green-500 text-white' : alignment.score_overall >= 5 ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'}`}>
                FIT: {alignment.score_overall}/10
              </span>
            )}
            {duplicates.length > 0 && (
              <button onClick={onToggleExpand} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 text-indigo-600 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-500/20 transition-colors">
                <Copy className="w-2.5 h-2.5" /> {duplicates.length} Duplicates {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.1em] flex items-center gap-3">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {job.company} 
              <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span> 
              {job.location || 'Remote'} 
              <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span> 
              {job.site || 'Direct'}
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
          {job.job_url && <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><ExternalLink className="w-4 h-4" /></a>}
          <button onClick={() => onUpdateStatus(job.id, job.status === 'applied' ? 'new' : 'applied')} className={`p-3 rounded-2xl border transition-all ${job.status === 'applied' ? 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-600'}`}><CheckCircle className="w-4 h-4" /></button>
        </div>
      </div>
      
      {/* DUPLICATES NESTED VIEW */}
      {isExpanded && duplicates.length > 0 && (
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {duplicates.map(d => (
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
                <button onClick={() => onUpdateStatus(d.id, d.status === 'applied' ? 'new' : 'applied')} className={`p-1.5 transition-colors ${d.status === 'applied' ? 'text-green-500' : 'text-slate-300 hover:text-green-500'}`}><CheckCircle className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default JobCard

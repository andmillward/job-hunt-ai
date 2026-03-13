import React from 'react'
import ResumeUpload from '../components/hub/ResumeUpload'
import ResumeList from '../components/hub/ResumeList'
import { Resume } from '../types'

interface HubViewProps {
  resumes: Resume[]
  selectedResume: Resume | null
  uploading: boolean
  onUpload: (file: File) => Promise<any>
  onSelect: (resume: Resume) => void
  onDelete: (id: number) => void
}

const HubView: React.FC<HubViewProps> = ({
  resumes,
  selectedResume,
  uploading,
  onUpload,
  onSelect,
  onDelete
}) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Resume Hub</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Manage your career profiles and launch specialized hunts.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ResumeUpload onUpload={onUpload} uploading={uploading} />
        <ResumeList 
          resumes={resumes} 
          selectedResume={selectedResume} 
          onSelect={onSelect} 
          onDelete={onDelete} 
        />
      </div>
    </div>
  )
}

export default HubView

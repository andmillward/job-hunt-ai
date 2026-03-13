import React, { useState } from 'react'
import { FileUp, Loader2, CheckCircle } from 'lucide-react'

interface ResumeUploadProps {
  onUpload: (file: File) => Promise<any>
  uploading: boolean
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ onUpload, uploading }) => {
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    try {
      await onUpload(file)
      setFile(null)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800">
      <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">New Hunt Profile</h3>
      <div className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all ${file ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500'}`}>
        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.docx" />
        <FileUp className={`w-12 h-12 mb-4 ${file ? 'text-indigo-500' : 'text-slate-300'}`} />
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{file ? file.name : 'Select Resume'}</p>
      </div>
      <button onClick={handleUpload} disabled={!file || uploading} className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-all flex items-center justify-center gap-3">
        {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />} {uploading ? 'Parsing...' : 'Analyze & Store'}
      </button>
    </div>
  )
}

export default ResumeUpload

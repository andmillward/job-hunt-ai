import React from 'react'
import { CheckCircle, AlertCircle, Sparkles, X } from 'lucide-react'
import { Toast as ToastType } from '../../types'

interface ToastProps {
  toast: ToastType
  onClose: () => void
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  return (
    <div 
      onClick={() => { if (toast.action) { toast.action(); onClose(); } }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom border border-slate-700 bg-slate-800 text-white ${toast.action ? 'cursor-pointer hover:bg-slate-700 active:scale-95 transition-all' : ''}`}
    >
      {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> : 
       toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> : 
       <Sparkles className="w-5 h-5 text-indigo-400" />}
      <div className="flex flex-col">
         <p className="font-bold text-sm">{toast.message}</p>
         {toast.action && <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Click to view radar</p>}
      </div>
      {!toast.action && (
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          className="ml-4 hover:opacity-70 transition text-slate-400"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default Toast

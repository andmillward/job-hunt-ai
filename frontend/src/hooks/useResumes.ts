import { useState, useCallback, useRef, useEffect } from 'react'
import { Resume } from '../types'
import { resumeService } from '../services/resumeService'

export const useResumes = (showToast: any) => {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResume, setSelectedResume] = useState<Resume | null>(() => {
    const saved = localStorage.getItem('selectedResume')
    return saved ? JSON.parse(saved) : null
  })
  const [uploading, setUploading] = useState(false)

  const selectedResumeIdRef = useRef<number | null>(selectedResume?.id || null)

  const fetchResumes = useCallback(async () => {
    try {
      const response = await resumeService.getResumes()
      setResumes(response.data)
      
      const currentId = selectedResumeIdRef.current
      if (currentId) {
        const updated = response.data.find((r: Resume) => r.id === currentId)
        if (updated) {
          setSelectedResume(prev => JSON.stringify(prev) !== JSON.stringify(updated) ? updated : prev)
        }
      }
    } catch (err) {
      console.error('Error fetching resumes', err)
    }
  }, [])

  useEffect(() => {
    selectedResumeIdRef.current = selectedResume?.id || null
    if (selectedResume) {
      localStorage.setItem('selectedResume', JSON.stringify(selectedResume))
    } else {
      localStorage.removeItem('selectedResume')
    }
  }, [selectedResume])

  const uploadResume = async (file: File) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await resumeService.uploadResume(formData)
      await fetchResumes()
      setSelectedResume(response.data)
      showToast('Resume processed and analyzed')
      return response.data
    } catch (err) {
      console.error(err)
      showToast('Failed to upload resume.', 'error')
      throw err
    } finally {
      setUploading(false)
    }
  }

  const deleteResume = async (id: number) => {
    if (!confirm("Are you sure? All search data for this profile will be lost.")) return
    try {
      await resumeService.deleteResume(id)
      await fetchResumes()
      if (selectedResume?.id === id) {
        setSelectedResume(null)
      }
      showToast("Profile deleted")
    } catch (err) {
      console.error(err)
      showToast("Failed to delete", "error")
    }
  }

  return {
    resumes,
    selectedResume,
    setSelectedResume,
    uploading,
    fetchResumes,
    uploadResume,
    deleteResume
  }
}

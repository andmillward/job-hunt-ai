import { useState, useCallback, useMemo } from 'react'
import { Job, SavedSearch } from '../types'
import { jobService } from '../services/jobService'

export const useJobs = (selectedResume: any, showToast: any, goToRadar: any) => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [searchingJobs, setSearchingJobs] = useState(false)
  const [rankingJobs, setRankingJobs] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [generatingNet, setGeneratingNet] = useState(false)
  const [runningNet, setRunningNet] = useState(false)

  const fetchJobs = useCallback(async () => {
    try {
      const response = await jobService.getJobs()
      setJobs(response.data)
    } catch (err) {
      console.error('Error fetching jobs', err)
    }
  }, [])

  const fetchSavedSearches = useCallback(async () => {
    if (!selectedResume?.id) {
      setSavedSearches([])
      return
    }
    try {
      const response = await jobService.getSavedSearches(selectedResume.id)
      setSavedSearches(response.data)
    } catch (err) {
      console.error('Error fetching saved searches', err)
    }
  }, [selectedResume?.id])

  const updateJobStatus = async (jobId: number, status: string) => {
    try {
      await jobService.updateJobStatus(jobId, status)
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status } : j))
    } catch (err) { console.error(err) }
  }

  const handleRankJobs = async (limit: number = 20) => {
    if (!selectedResume?.id) return
    setRankingJobs(true)
    try {
      const response = await jobService.rankJobs(selectedResume.id, limit === 0 ? null : limit)
      await fetchJobs()
      showToast(`Ranking complete: Scored ${response.data.ranked_count} opportunities.`)
    } catch (err) {
      console.error(err)
      showToast("Ranking failed", "error")
    } finally {
      setRankingJobs(false)
    }
  }

  const handleGenerateNet = async (dreamRole: string) => {
    if (!dreamRole || !selectedResume?.id) return
    setGeneratingNet(true)
    try {
      await jobService.generateSearchNet(dreamRole, selectedResume.id)
      await fetchSavedSearches()
      showToast("AI Search Net generated")
    } catch (err) {
      console.error(err)
      showToast("Generation failed", "error")
    } finally { setGeneratingNet(false) }
  }

  const handleRunVerifiedNet = async () => {
    if (!selectedResume?.id) return
    const lastRun = savedSearches.find(s => s.last_run_at)?.last_run_at
    if (lastRun && (Date.now() - new Date(lastRun).getTime() < 24 * 60 * 60 * 1000)) {
      if (!confirm("Updated recently. Proceed anyway?")) return
    }
    setRunningNet(true)
    goToRadar()
    try {
      const response = await jobService.runVerifiedNet(selectedResume.id)
      await fetchJobs()
      await fetchSavedSearches()
      showToast(`Deployment complete: ${response.data.found} opportunities discovered.`, 'success', goToRadar)
    } catch (err) {
      console.error(err)
      showToast("Deployment failed", "error")
    } finally { setRunningNet(false) }
  }

  const handleSingleSearch = async (search: SavedSearch) => {
    setSearchingJobs(true)
    goToRadar()
    try {
      const response = await jobService.searchJobs({
        keywords: search.keywords,
        location: search.location,
        min_salary: search.min_salary,
        remote_only: search.remote_only,
        job_type: search.job_type,
        hours_old: search.hours_old
      })
      await fetchJobs()
      showToast(`Search complete: ${response.data.found} jobs found.`, 'success', goToRadar)
    } catch (err) {
      console.error(err)
      showToast("Search failed", "error")
    } finally {
      setSearchingJobs(false)
    }
  }

  const addSavedSearch = async (search: any) => {
    if (!selectedResume?.id) return
    try {
      await jobService.createSavedSearch({ ...search, resume_id: selectedResume.id })
      await fetchSavedSearches()
      showToast("Search query added to net")
    } catch (err) {
      console.error(err)
      showToast("Failed to add search", "error")
    }
  }

  const updateSavedSearch = async (id: number, data: any) => {
    try {
      await jobService.updateSavedSearch(id, data)
      setSavedSearches(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
    } catch (err) {
      console.error(err)
      showToast("Failed to update search", "error")
    }
  }

  const deleteSavedSearch = async (id: number) => {
    try {
      await jobService.deleteSavedSearch(id)
      setSavedSearches(prev => prev.filter(s => s.id !== id))
    } catch (err) { console.error(err) }
  }

  const clearUnverifiedSearches = async () => {
    if (!selectedResume?.id) return
    try {
      await jobService.clearUnverifiedSearches(selectedResume.id)
      await fetchSavedSearches()
      showToast("Unverified queries cleared")
    } catch (err) { console.error(err) }
  }

  const primaryJobs = useMemo(() => {
    return jobs.filter(j => j.parent_id === null)
  }, [jobs])

  const rankedJobs = useMemo(() => {
    return [...primaryJobs].sort((a, b) => {
      const scoreA = a.alignments?.[0]?.score_overall || 0
      const scoreB = b.alignments?.[0]?.score_overall || 0
      if (scoreA !== scoreB) return scoreB - scoreA
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [primaryJobs])

  const unrankedCount = useMemo(() => {
    return primaryJobs.filter(j => (j.alignments?.length || 0) === 0).length
  }, [primaryJobs])

  return {
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
    addSavedSearch,
    updateSavedSearch,
    deleteSavedSearch,
    clearUnverifiedSearches,
    primaryJobs,
    rankedJobs,
    unrankedCount
  }
}

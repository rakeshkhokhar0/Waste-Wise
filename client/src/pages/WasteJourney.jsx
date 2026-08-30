import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  MapPin,
  Trash2,
  Trophy,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import WasteCategoryCard from '../components/WasteCategoryCard'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
).replace(/\/$/, '')

function getAccessToken() {
  return (
    window.localStorage.getItem('wastewise_access_token') ||
    window.sessionStorage.getItem('wastewise_access_token')
  )
}

function WasteJourney({ onNavigate }) {
  const [analysis, setAnalysis] = useState(() => {
    try {
      const stored = sessionStorage.getItem('wastewise_analysis')
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Unable to read AI analysis:', error)
      return null
    }
  })

  const [expandedCategoryId, setExpandedCategoryId] = useState(null)
  const [updatingStepId, setUpdatingStepId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (analysis?.categories?.length > 0 && !expandedCategoryId) {
      setExpandedCategoryId(analysis.categories[0].id)
    }
  }, [analysis])

  const categories = analysis?.categories || []

  const toggleStep = async (category, step) => {
    const accessToken = getAccessToken()

    if (!accessToken || !analysis?.id) return

    setUpdatingStepId(step.id)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/waste/${analysis.id}/categories/${category.id}/steps/${step.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            is_completed: !step.is_completed,
          }),
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to update that step.')
      }

      setAnalysis(data)
      sessionStorage.setItem('wastewise_analysis', JSON.stringify(data))
    } catch (err) {
      console.error('Step update error:', err)
      setError(err.message || 'Unable to update that step. Please try again.')
    } finally {
      setUpdatingStepId(null)
    }
  }

  if (!analysis || !categories.length) {
    return (
      <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
        <Navbar activePath="dashboard" onNavigate={onNavigate} />

        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <div className="rounded-3xl border border-green-100 bg-white p-10 shadow-sm">
            <Trash2 size={42} className="mx-auto text-green-700" />
            <h1 className="mt-5 text-2xl font-bold">No AI analysis found</h1>
            <p className="mt-3 text-slate-500">
              Please upload a waste image first so WasteWise can create your
              personalized disposal journey.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="mt-6 rounded-xl bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800"
            >
              Upload Waste Image
            </button>
          </div>
        </div>
      </main>
    )
  }

  const allSteps = categories.flatMap((c) => c.disposal_steps || [])
  const totalSteps = allSteps.length
  const completedSteps = allSteps.filter((s) => s.is_completed).length
  const overallProgress =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const isFullyComplete = totalSteps > 0 && completedSteps === totalSteps

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
      <Navbar activePath="dashboard" onNavigate={onNavigate} />

      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                PERSONALIZED BY WASTEWISE AI
              </p>

              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                {isFullyComplete
                  ? 'All Steps Complete — Great Job!'
                  : 'Your Disposal Plan'}
              </h1>
            </div>

            <span
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                isFullyComplete
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isFullyComplete ? 'Completed' : 'In Progress'}
            </span>
          </div>

          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
            {analysis.ai_summary ||
              'Follow the checklist below to dispose of each item properly. Points are credited once all steps are checked.'}
          </p>

          <div className="mt-6 max-w-xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Overall progress</span>
              <span>
                {completedSteps}/{totalSteps} steps &middot; {overallProgress}%
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        <section className="mt-8 space-y-4">
          {categories.map((category) => (
            <WasteCategoryCard
              key={category.id}
              category={category}
              expanded={expandedCategoryId === category.id}
              onToggleExpand={() =>
                setExpandedCategoryId((current) =>
                  current === category.id ? null : category.id
                )
              }
              onToggleStep={(step) => toggleStep(category, step)}
              updatingStepId={updatingStepId}
            />
          ))}
        </section>

        <div className="mt-6 rounded-2xl border border-green-100 bg-[#f8fbf6] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <MapPin size={21} />
            </div>
            <div>
              <h2 className="font-bold">Find a nearby disposal location</h2>
              <p className="text-sm text-slate-500">
                Find recycling and waste facilities near you.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const query = encodeURIComponent(
                `${categories
                  .map((item) => item.category)
                  .join(' ')} recycling center`
              )

              window.open(
                `https://www.google.com/maps/search/${query}`,
                '_blank',
                'noopener,noreferrer'
              )
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 bg-white px-5 py-3 font-semibold text-green-800 transition hover:bg-green-50"
          >
            <MapPin size={18} />
            Find Nearby Places
          </button>
        </div>

        {isFullyComplete ? (
          <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-8 text-center text-white shadow-xl shadow-green-950/10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <Trophy size={30} />
            </div>

            <h2 className="mt-4 text-2xl font-bold">
              Every disposal step is complete!
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-green-50">
              You've responsibly sorted and disposed of everything detected in
              this upload.
            </p>

            <button
              type="button"
              onClick={() => onNavigate('/my-activity')}
              className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-green-800 transition hover:bg-green-50"
            >
              View In My Activity
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-xs text-slate-400">
              Complete all checklist items above to mark this disposal done.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="rounded-xl border border-green-200 bg-white px-6 py-3 font-semibold text-green-800 transition hover:bg-green-50"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default WasteJourney
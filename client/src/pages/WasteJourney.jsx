import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Leaf,
  MapPin,
  Trash2,
  Trophy,
} from 'lucide-react'
import WasteCategoryCard from '../components/WasteCategoryCard'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:8000/api/v1'
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

      if (!stored) return null

      return JSON.parse(stored)
    } catch (error) {
      console.error('Unable to read AI analysis:', error)
      return null
    }
  })

  const [expandedCategoryId, setExpandedCategoryId] = useState(null)
  const [updatingStepId, setUpdatingStepId] = useState(null)
  const [error, setError] = useState('')

  const categories = analysis?.categories || []

  // ---------------------------------------------------------
  // TOGGLE A DISPOSAL STEP FOR ONE CATEGORY
  //
  // Each category is independent now — checking a step in
  // "Organic" only ever touches Organic's own progress.
  // ---------------------------------------------------------

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

      // Backend recalculates every category's progress and the
      // overall totals server-side — just swap in the fresh
      // response rather than patching state by hand.
      setAnalysis(data)
      sessionStorage.setItem('wastewise_analysis', JSON.stringify(data))
    } catch (err) {
      console.error('Step update error:', err)
      setError(err.message || 'Unable to update that step. Please try again.')
    } finally {
      setUpdatingStepId(null)
    }
  }

  // ---------------------------------------------------------
  // NO ANALYSIS
  // ---------------------------------------------------------

  if (!analysis || !categories.length) {
    return (
      <main className="min-h-screen bg-[#f5f8f3] text-slate-900">

        <header className="border-b border-green-100 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-4 lg:px-10">
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="flex items-center gap-2 text-xl font-bold text-green-800"
            >
              <Leaf size={23} />
              WasteWise
            </button>
          </div>
        </header>

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
              className="mt-6 rounded-xl bg-green-700 px-6 py-3 font-semibold text-white"
            >
              Upload Waste Image
            </button>
          </div>
        </div>

      </main>
    )
  }

  const totalSteps = analysis.total_steps || 0
  const completedSteps = analysis.completed_steps || 0
  const overallProgress = Math.round(analysis.progress_percentage || 0)

  const isFullyComplete = totalSteps > 0 && completedSteps === totalSteps

  // ---------------------------------------------------------
  // ACTIVE JOURNEY
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">

      <header className="border-b border-green-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">

          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
            className="flex items-center gap-2 text-xl font-bold text-green-800"
          >
            <Leaf size={23} />
            WasteWise
          </button>

          <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
            AI Waste Journey
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">

        {/* HEADER */}

        <section>
          <p className="text-xs font-bold tracking-[0.18em] text-green-700">
            PERSONALIZED BY WASTEWISE AI
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            {isFullyComplete
              ? 'All done — nice work!'
              : 'Your disposal plan'}
          </h1>

          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
            {analysis.ai_summary ||
              'These instructions were generated from the actual waste detected in your uploaded image. Tap a category below to see its steps.'}
          </p>

          {/* Overall progress across every category */}
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

        {/* CATEGORY CARDS — each one independent: expand, check
            off its own steps, collapse, move to the next one. */}

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

        {/* PLACES */}

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

        {/* COMPLETE — only appears once every category's steps
            are checked off. Points at Dashboard for now since
            there's no dedicated "My Activity" route yet. */}

        {isFullyComplete ? (
          <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-8 text-center text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <Trophy size={30} />
            </div>

            <h2 className="mt-4 text-2xl font-bold">
              Every disposal step is complete.
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-green-50">
              You've responsibly sorted and disposed of everything WasteWise
              detected in this upload.
            </p>

            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-green-800 transition hover:bg-green-50"
            >
              Complete &amp; View My Activity
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="rounded-xl border border-green-200 px-6 py-3 font-semibold text-green-800 transition hover:bg-green-50"
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
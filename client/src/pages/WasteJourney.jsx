import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  MapPin,
  Recycle,
  Sparkles,
  Trophy,
  Trash2,
} from 'lucide-react'

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

function getCategoryIcon(category) {
  const value = String(category).toLowerCase()

  if (
    value.includes('organic') ||
    value.includes('compost')
  ) {
    return Leaf
  }

  if (
    value.includes('recycl') ||
    value.includes('plastic') ||
    value.includes('paper') ||
    value.includes('metal')
  ) {
    return Recycle
  }

  return Trash2
}

function getCategoryColor(category) {
  const value = String(category).toLowerCase()

  if (
    value.includes('organic') ||
    value.includes('compost')
  ) {
    return 'bg-green-100 text-green-700'
  }

  if (
    value.includes('plastic') ||
    value.includes('recycl')
  ) {
    return 'bg-sky-100 text-sky-700'
  }

  if (value.includes('glass')) {
    return 'bg-violet-100 text-violet-700'
  }

  if (
    value.includes('hazard') ||
    value.includes('e_waste') ||
    value.includes('electronic')
  ) {
    return 'bg-red-100 text-red-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function getRecommendation(category) {
  const value = String(category).toLowerCase()

  if (
    value.includes('organic') ||
    value.includes('compost')
  ) {
    return 'Compost this waste if you have access to a suitable composting facility.'
  }

  if (
    value.includes('recycl') ||
    value.includes('plastic') ||
    value.includes('paper') ||
    value.includes('metal') ||
    value.includes('glass')
  ) {
    return 'Keep this material separated and take it to an appropriate recycling collection point.'
  }

  if (
    value.includes('hazard') ||
    value.includes('e_waste') ||
    value.includes('electronic')
  ) {
    return 'Do not put this in regular household waste. Use an authorized collection or recycling facility.'
  }

  return 'Keep this waste separated and use the appropriate local waste collection service.'
}

function WasteJourney({ onNavigate }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState(false)

  // FIX: was useMemo(() => ..., []) — read-only, could never reflect
  // a saved step completion. Now useState with a lazy initializer:
  // same "read sessionStorage exactly once" behavior, but updatable
  // once the backend confirms a step was saved.
  const [analysis, setAnalysis] = useState(() => {
    try {
      const stored =
        sessionStorage.getItem(
          'wastewise_analysis'
        )

      if (!stored) {
        return null
      }

      return JSON.parse(stored)
    } catch (error) {
      console.error(
        'Unable to read AI analysis:',
        error
      )

      return null
    }
  })

  const categories = analysis?.categories || []

  // ---------------------------------------------------------
  // BUILD DYNAMIC AI JOURNEY
  // ---------------------------------------------------------

  const journeySteps = useMemo(() => {
    const result = []

    categories.forEach((category) => {

      const steps =
        category.disposal_steps?.length
          ? category.disposal_steps
          : [
              // Fallback text only — no backend id, so this
              // step can't be marked complete server-side.
              { instruction: getRecommendation(category.category) },
            ]

      steps.forEach((stepEntry) => {

        // FIX: backend disposal_steps are objects
        //   { id, step_number, instruction, is_completed, completed_at }
        // not plain strings. Unwrap here instead of shoving the
        // whole object into `instruction`.
        const isStepObject =
          typeof stepEntry === 'object' && stepEntry !== null

        result.push({
          categoryId: category.id,
          category: category.category,
          items: category.items || [],
          stepId: isStepObject ? stepEntry.id : null,
          instruction: isStepObject
            ? stepEntry.instruction
            : stepEntry,
          isCompleted: isStepObject
            ? Boolean(stepEntry.is_completed)
            : false,
        })

      })
    })

    return result
  }, [categories])

  // ---------------------------------------------------------
  // SAVE STEP COMPLETION TO THE BACKEND
  //
  // Previously this page never called the API — "Next
  // Recommendation" only advanced local state, so is_completed
  // in the database never changed. This persists it.
  // ---------------------------------------------------------

  const markStepComplete = async (stepEntry) => {

    if (
      !stepEntry?.stepId ||
      !stepEntry?.categoryId ||
      !analysis?.id
    ) {
      // Fallback-text step with no backend id, or no analysis
      // loaded yet — nothing to persist.
      return
    }

    const accessToken = getAccessToken()

    if (!accessToken) {
      return
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/waste/${analysis.id}/categories/${stepEntry.categoryId}/steps/${stepEntry.stepId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            is_completed: true,
          }),
        }
      )

      if (response.ok) {
        const updated = await response.json()

        setAnalysis(updated)

        sessionStorage.setItem(
          'wastewise_analysis',
          JSON.stringify(updated)
        )
      }
    } catch (error) {
      console.error(
        'Unable to save step completion:',
        error
      )
      // Non-blocking on purpose: a flaky connection here
      // shouldn't stop the user from moving through the journey.
    }
  }

  // ---------------------------------------------------------
  // SUSTAINABILITY SCORE
  //
  // NOTE: this is a client-side heuristic based on category
  // type, not a value the backend calculates or stores. Same
  // status as the rewards mock on the Dashboard — fine as a
  // placeholder, just not backed by real data yet.
  // ---------------------------------------------------------

  const sustainabilityScore = useMemo(() => {

    if (!categories.length) {
      return 0
    }

    let score = 0

    categories.forEach((category) => {

      const value =
        String(category.category).toLowerCase()

      if (
        value.includes('recycl') ||
        value.includes('plastic') ||
        value.includes('paper') ||
        value.includes('metal') ||
        value.includes('glass')
      ) {
        score += 25
      } else if (
        value.includes('organic') ||
        value.includes('compost')
      ) {
        score += 30
      } else if (
        value.includes('reuse') ||
        value.includes('reusable')
      ) {
        score += 35
      } else {
        score += 15
      }

    })

    return Math.min(
      100,
      Math.round(
        score / categories.length
      )
    )

  }, [categories])

  // ---------------------------------------------------------
  // GREEN POINTS
  // ---------------------------------------------------------

  const greenPoints = useMemo(() => {

    return categories.reduce(
      (total, category) => {

        const value =
          String(category.category).toLowerCase()

        if (
          value.includes('reuse') ||
          value.includes('reusable')
        ) {
          return total + 35
        }

        if (
          value.includes('organic') ||
          value.includes('compost')
        ) {
          return total + 30
        }

        if (
          value.includes('recycl') ||
          value.includes('plastic') ||
          value.includes('paper') ||
          value.includes('metal') ||
          value.includes('glass')
        ) {
          return total + 25
        }

        return total + 10
      },
      0
    )

  }, [categories])

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

            <Trash2
              size={42}
              className="mx-auto text-green-700"
            />

            <h1 className="mt-5 text-2xl font-bold">
              No AI analysis found
            </h1>

            <p className="mt-3 text-slate-500">
              Please upload a waste image first so
              WasteWise can create your personalized
              disposal journey.
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

  const step =
    journeySteps[currentStep]

  const StepIcon =
    getCategoryIcon(step?.category)

  const handleNext = async () => {

    // Persist the step the user is leaving before advancing.
    await markStepComplete(step)

    if (
      currentStep <
      journeySteps.length - 1
    ) {
      setCurrentStep(
        (previous) => previous + 1
      )
    } else {
      setCompleted(true)
    }

  }

  // ---------------------------------------------------------
  // COMPLETED PAGE
  // ---------------------------------------------------------

  if (completed) {

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

          </div>

        </header>

        <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">

          <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

            <div className="bg-gradient-to-br from-green-800 to-emerald-600 px-6 py-12 text-center text-white sm:px-10">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15">
                <Trophy size={38} />
              </div>

              <p className="mt-6 text-xs font-bold tracking-[0.2em] text-green-100">
                AI JOURNEY COMPLETED
              </p>

              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                You made your waste count.
              </h1>

              <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-green-50">
                WasteWise AI analyzed your waste and
                generated a personalized disposal plan.
              </p>

            </div>

            <div className="p-6 sm:p-10">

              {/* DETECTED CATEGORIES */}

              <div>

                <p className="text-xs font-bold tracking-[0.16em] text-green-700">
                  AI DETECTED
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Your waste
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">

                  {categories.map(
                    (category, index) => {

                      const Icon =
                        getCategoryIcon(
                          category.category
                        )

                      return (

                        <article
                          key={`${category.category}-${index}`}
                          className="rounded-2xl border border-green-100 p-5"
                        >

                          <span
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${getCategoryColor(
                              category.category
                            )}`}
                          >
                            <Icon size={21} />
                          </span>

                          <p className="mt-5 text-sm text-slate-500 capitalize">
                            {String(
                              category.category
                            ).replace(
                              /_/g,
                              ' '
                            )}
                          </p>

                          <h3 className="mt-1 text-lg font-bold">
                            {category.items?.join(
                              ', '
                            )}
                          </h3>

                        </article>

                      )
                    }
                  )}

                </div>

              </div>

              {/* SCORE */}

              <div className="mt-6 grid gap-4 sm:grid-cols-3">

                <div className="rounded-2xl bg-green-50 p-5">

                  <p className="text-sm text-slate-500">
                    Sustainability Score
                  </p>

                  <p className="mt-1 text-3xl font-bold text-green-800">
                    {sustainabilityScore}/100
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Based on your AI waste categories
                  </p>

                </div>

                <div className="rounded-2xl bg-amber-50 p-5">

                  <p className="text-sm text-slate-500">
                    Green Points
                  </p>

                  <p className="mt-1 text-3xl font-bold text-amber-700">
                    +{greenPoints}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Earned from responsible disposal
                  </p>

                </div>

                <div className="rounded-2xl bg-sky-50 p-5">

                  <p className="text-sm text-slate-500">
                    Waste categories
                  </p>

                  <p className="mt-1 text-3xl font-bold text-sky-700">
                    {categories.length}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Identified by AI
                  </p>

                </div>

              </div>

              {/* PLACES */}

              <div className="mt-6 rounded-2xl border border-green-100 bg-[#f8fbf6] p-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                    <MapPin size={21} />
                  </div>

                  <div>

                    <h2 className="font-bold">
                      Find a nearby disposal location
                    </h2>

                    <p className="text-sm text-slate-500">
                      Find recycling and waste facilities near you.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    const query =
                      encodeURIComponent(
                        `${categories
                          .map(
                            (item) =>
                              item.category
                          )
                          .join(
                            ' '
                          )} recycling center`
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

              {/* BUTTONS */}

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={() => onNavigate('/my-impact')}
                  className="rounded-xl bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800"
                >
                  View My Impact
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/dashboard')}
                  className="rounded-xl border border-green-200 px-6 py-3 font-semibold text-green-800 transition hover:bg-green-50"
                >
                  Analyze Another Image
                </button>

              </div>

            </div>

          </section>

        </div>

      </main>
    )
  }

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
            Your disposal plan
          </h1>

          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
            These instructions were generated from the
            actual waste detected in your uploaded image.
          </p>

        </section>

        {/* DETECTED CATEGORIES */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {categories.map(
            (category, index) => {

              const Icon =
                getCategoryIcon(
                  category.category
                )

              return (

                <article
                  key={`${category.category}-${index}`}
                  className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm"
                >

                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${getCategoryColor(
                      category.category
                    )}`}
                  >
                    <Icon size={21} />
                  </span>

                  <p className="mt-5 text-sm text-slate-500 capitalize">
                    {String(
                      category.category
                    ).replace(
                      /_/g,
                      ' '
                    )}
                  </p>

                  <h2 className="mt-1 text-lg font-bold">
                    {category.items?.join(
                      ', '
                    )}
                  </h2>

                </article>

              )
            }
          )}

        </section>

        {/* DISPOSAL GUIDE */}

        <section className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">

            <div className="flex items-center justify-between gap-4">

              <div>

                <p className="text-xs font-bold tracking-[0.16em] text-green-700">
                  AI DISPOSAL GUIDE
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Recommended actions
                </h2>

              </div>

              <span className="text-sm font-semibold text-slate-500">
                {currentStep + 1} / {journeySteps.length}
              </span>

            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-green-600 transition-all duration-500"
                style={{
                  width: `${
                    ((currentStep + 1) /
                      journeySteps.length) *
                    100
                  }%`,
                }}
              />

            </div>

          </div>

          <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">

            <div className="flex justify-center">

              <div className="flex h-48 w-48 items-center justify-center rounded-full bg-green-50">

                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-green-100 text-green-700">

                  <StepIcon size={52} />

                </div>

              </div>

            </div>

            <div>

              <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold capitalize text-green-700">
                {String(
                  step.category
                ).replace(
                  /_/g,
                  ' '
                )}
              </span>

              <p className="mt-5 text-sm font-semibold text-green-700">
                AI recommendation
              </p>

              <h2 className="mt-2 text-3xl font-bold leading-tight">
                {step.items?.join(', ')}
              </h2>

              <div className="mt-5 rounded-2xl bg-green-50 p-5">

                <div className="flex items-start gap-3">

                  <CheckCircle2
                    size={21}
                    className="mt-0.5 flex-shrink-0 text-green-700"
                  />

                  <p className="leading-relaxed text-slate-700">
                    {step.instruction}
                  </p>

                </div>

              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800"
                >
                  {currentStep ===
                  journeySteps.length - 1
                    ? 'Complete Journey'
                    : 'Next Recommendation'}

                  {currentStep ===
                  journeySteps.length - 1 ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <ArrowRight size={18} />
                  )}

                </button>

              </div>

            </div>

          </div>

        </section>

        {/* SCORE PREVIEW */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2">

          <div className="rounded-2xl border border-green-100 bg-white p-5">

            <p className="text-sm text-slate-500">
              Current AI sustainability estimate
            </p>

            <p className="mt-1 text-3xl font-bold text-green-700">
              {sustainabilityScore}/100
            </p>

          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-5">

            <p className="text-sm text-slate-500">
              Potential Green Points
            </p>

            <p className="mt-1 text-3xl font-bold text-amber-700">
              +{greenPoints}
            </p>

          </div>

        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          WasteWise recommendations are generated from
          the waste detected in your image.
        </p>

      </div>

    </main>
  )
}

export default WasteJourney
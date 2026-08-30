import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  Clock,
  History,
  Leaf,
  Loader2,
  Recycle,
  Sparkles,
  Trash2,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { getCategoryMeta, formatRelativeDate } from '../utils/wasteCategory'

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

function MyActivity({ onNavigate }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [summaryStats, setSummaryStats] = useState({
    totalStepsDone: 0,
    totalCategoriesAnalysed: 0,
    totalPoints: 0,
    totalUploads: 0,
  })

  const [recentActivities, setRecentActivities] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [historyItems, setHistoryItems] = useState([])
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)

  const [updatingStepId, setUpdatingStepId] = useState(null)
  const [expandedCategories, setExpandedCategories] = useState({})

  const loadActivityData = async () => {
    const accessToken = getAccessToken()
    if (!accessToken) {
      onNavigate('/login')
      return
    }

    const authHeaders = { Authorization: `Bearer ${accessToken}` }

    try {
      setLoading(true)
      setError('')

      const [historyRes, statsRes, rewardRes, transRes] = await Promise.all([
        fetch(`${API_BASE_URL}/waste/history?page=1&page_size=50`, {
          headers: authHeaders,
        }),
        fetch(`${API_BASE_URL}/rewards/stats`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/rewards/me`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/rewards/transactions?page=1&page_size=6`, {
          headers: authHeaders,
        }),
      ])

      if (historyRes.status === 401 || rewardRes.status === 401) {
        onNavigate('/login')
        return
      }

      let allItems = []
      let totalUploads = 0
      let calculatedSteps = 0
      let detectedCategories = 0

      if (historyRes.ok) {
        const histData = await historyRes.json()
        allItems = histData.items || []
        totalUploads = histData.total ?? allItems.length

        const categorySet = new Set(
          allItems.flatMap((a) => (a.categories || []).map((c) => c.category))
        )
        detectedCategories = categorySet.size

        calculatedSteps = allItems.reduce(
          (sum, a) => sum + (a.completed_steps || 0),
          0
        )
      }

      let userPoints = 0
      if (rewardRes.ok) {
        const rewData = await rewardRes.json()
        userPoints = rewData.total_points ?? 0
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData.total_completed_steps !== undefined) {
          calculatedSteps = Math.max(
            calculatedSteps,
            statsData.total_completed_steps
          )
        }
        if (statsData.completed_categories && detectedCategories === 0) {
          detectedCategories = statsData.completed_categories
        }
      }

      if (transRes.ok) {
        const transData = await transRes.json()
        setRecentTransactions(transData.items || [])
      }

      setSummaryStats({
        totalStepsDone: calculatedSteps,
        totalCategoriesAnalysed: detectedCategories,
        totalPoints: userPoints,
        totalUploads: totalUploads,
      })

      const top2List = allItems.slice(0, 2)
      if (top2List.length > 0) {
        const detailedTop2 = await Promise.all(
          top2List.map((item) =>
            fetch(`${API_BASE_URL}/waste/${item.id}`, { headers: authHeaders })
              .then((res) => (res.ok ? res.json() : item))
              .catch(() => item)
          )
        )
        setRecentActivities(detailedTop2)
      } else {
        setRecentActivities([])
      }
    } catch (err) {
      console.error('Activity load error:', err)
      setError('Unable to retrieve your activity log right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivityData()
  }, [])

  const loadFullHistory = async (page = 1) => {
    const accessToken = getAccessToken()
    if (!accessToken) return

    try {
      setHistoryLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/waste/history?page=${page}&page_size=10`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (response.ok) {
        const data = await response.json()
        const items = data.items || []

        if (page === 1) {
          setHistoryItems(items)
        } else {
          setHistoryItems((prev) => [...prev, ...items])
        }

        setHistoryPage(page)
        const total = data.total ?? items.length
        setHasMoreHistory(page * 10 < total)
      }
    } catch (err) {
      console.error('Full history error:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const toggleHistorySection = () => {
    if (!showFullHistory && historyItems.length === 0) {
      loadFullHistory(1)
    }
    setShowFullHistory((prev) => !prev)
  }

  const toggleStep = async (analysisId, category, step) => {
    const accessToken = getAccessToken()
    if (!accessToken || !analysisId) return

    setUpdatingStepId(step.id)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/waste/${analysisId}/categories/${category.id}/steps/${step.id}`,
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

      const updatedAnalysis = await response.json()

      if (!response.ok) {
        throw new Error(updatedAnalysis?.detail || 'Unable to update step.')
      }

      setRecentActivities((prev) =>
        prev.map((act) => (act.id === analysisId ? updatedAnalysis : act))
      )

      loadActivityData()
    } catch (err) {
      console.error('Step update error:', err)
      setError(err.message || 'Unable to update disposal step.')
    } finally {
      setUpdatingStepId(null)
    }
  }

  const toggleCategoryExpand = (catId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }))
  }

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
      <Navbar activePath="my-activity" onNavigate={onNavigate} />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {/* HEADER */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-7 text-white shadow-xl shadow-green-950/10 lg:p-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Clock size={25} />
              </span>

              <p className="mt-6 text-xs font-bold tracking-[0.18em] text-green-100">
                ACTIVITY TRACKER
              </p>

              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Your Waste Disposal Log
              </h1>

              <p className="mt-3 max-w-xl leading-relaxed text-green-50">
                Track your active disposal steps, review recent classifications,
                and monitor your cumulative sustainability metrics.
              </p>
            </div>

            <div className="flex shrink-0 gap-3">
              <div className="rounded-2xl bg-white/10 px-6 py-4 backdrop-blur-sm">
                <p className="text-xs text-green-100">Total Uploads</p>
                <p className="mt-1 text-3xl font-bold">
                  {loading ? '—' : summaryStats.totalUploads}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS ROW */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <Leaf size={22} />
            </span>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Total Steps Done
            </p>
            <h3 className="mt-1 text-3xl font-bold text-slate-900">
              {loading ? '—' : summaryStats.totalStepsDone}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Verified disposal actions completed
            </p>
          </article>

          <article className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Recycle size={22} />
            </span>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Categories Analysed
            </p>
            <h3 className="mt-1 text-3xl font-bold text-slate-900">
              {loading ? '—' : summaryStats.totalCategoriesAnalysed}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Unique waste types identified
            </p>
          </article>

          <article className="rounded-2xl border border-amber-100 bg-[#fffaf0] p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Award size={22} />
            </span>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-700">
              Total Points Earned
            </p>
            <h3 className="mt-1 text-3xl font-bold text-amber-900">
              {loading ? '—' : summaryStats.totalPoints}
            </h3>
            <p className="mt-1 text-xs text-amber-600">
              Available in your Green Wallet
            </p>
          </article>
        </section>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {/* LATEST ACTIONS */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                LATEST ACTIONS
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                {recentActivities.length > 0
                  ? 'Recent Disposals (Last 2)'
                  : 'Recent Verified Actions'}
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-green-100 bg-white p-12 text-center text-sm text-slate-500">
              <Loader2 className="mx-auto mb-3 animate-spin text-green-700" size={24} />
              Loading your recent activities...
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="mt-6 space-y-6">
              {recentActivities.map((act) => {
                const totalSteps = act.total_steps || 0
                const completedSteps = act.completed_steps || 0
                const progress = Math.round(act.progress_percentage || 0)
                const isDone = totalSteps > 0 && completedSteps === totalSteps

                return (
                  <article
                    key={act.id}
                    className="overflow-hidden rounded-3xl border border-green-100 bg-white p-6 shadow-sm sm:p-8"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                      <div>
                        <span className="text-xs font-semibold text-slate-400">
                          {formatRelativeDate(act.created_at)}
                        </span>
                        <h3 className="mt-1 text-xl font-bold capitalize">
                          {act.categories
                            ?.map((c) => getCategoryMeta(c.category).label)
                            .join(', ') || 'Waste Analysis'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {act.status ? act.status.replace(/_/g, ' ') : 'In Progress'}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.setItem(
                              'wastewise_analysis',
                              JSON.stringify(act)
                            )
                            onNavigate('/waste-journey')
                          }}
                          className="flex items-center gap-1 rounded-xl bg-green-50 px-3.5 py-2 text-xs font-bold text-green-800 hover:bg-green-100"
                        >
                          View Plan
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>

                    {act.ai_summary && (
                      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#f8fbf6] p-3 text-sm text-slate-600">
                        <Sparkles size={16} className="mt-0.5 shrink-0 text-green-700" />
                        <p>{act.ai_summary}</p>
                      </div>
                    )}

                    <div className="mt-5">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Disposal Steps Progress</span>
                        <span>
                          {completedSteps}/{totalSteps} Completed ({progress}%)
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-green-600 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {act.categories && act.categories.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <p className="text-xs font-bold tracking-[0.12em] text-slate-400">
                          CATEGORIES &amp; DISPOSAL CHECKLIST
                        </p>

                        {act.categories.map((category) => {
                          const meta = getCategoryMeta(category.category)
                          const Icon = meta.icon
                          const isExpanded = !!expandedCategories[category.id]

                          return (
                            <div
                              key={category.id || category.category}
                              className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  category.id && toggleCategoryExpand(category.id)
                                }
                                className="flex w-full items-center justify-between text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.color}`}
                                  >
                                    <Icon size={18} />
                                  </span>
                                  <div>
                                    <h4 className="font-bold text-slate-800">
                                      {meta.label}
                                    </h4>
                                    {category.items && (
                                      <p className="text-xs text-slate-500">
                                        {category.items.join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {category.disposal_steps && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500">
                                      {category.completed_steps}/{category.total_steps} steps
                                    </span>
                                    <ChevronDown
                                      size={18}
                                      className={`text-slate-400 transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`}
                                    />
                                  </div>
                                )}
                              </button>

                              {isExpanded && category.disposal_steps && (
                                <div className="mt-4 border-t border-slate-200/60 pt-3">
                                  <ul className="space-y-2">
                                    {category.disposal_steps.map((step) => {
                                      const isUpdating = updatingStepId === step.id

                                      return (
                                        <li
                                          key={step.id}
                                          className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-xs"
                                        >
                                          <button
                                            type="button"
                                            disabled={isUpdating}
                                            onClick={() =>
                                              toggleStep(act.id, category, step)
                                            }
                                            className="mt-0.5 shrink-0 disabled:cursor-not-allowed"
                                          >
                                            {isUpdating ? (
                                              <Loader2
                                                size={18}
                                                className="animate-spin text-green-600"
                                              />
                                            ) : (
                                              <CircleCheck
                                                size={18}
                                                className={
                                                  step.is_completed
                                                    ? 'text-green-600'
                                                    : 'text-slate-300'
                                                }
                                              />
                                            )}
                                          </button>

                                          <span
                                            className={`text-sm ${
                                              step.is_completed
                                                ? 'text-slate-400 line-through'
                                                : 'text-slate-700'
                                            }`}
                                          >
                                            {step.instruction}
                                          </span>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-green-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                    <CheckCircle2 size={20} />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-800">
                      Completed Steps &amp; Point Actions
                    </h3>
                    <p className="text-xs text-slate-500">
                      Recent verified disposals from your activity ledger
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/dashboard')}
                  className="rounded-xl bg-green-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-800"
                >
                  Upload Waste Image
                </button>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {recentTransactions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    No recent actions found. Take a photo to start tracking.
                  </div>
                ) : (
                  recentTransactions.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
                          <CircleCheck size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {item.description}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatRelativeDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          item.points >= 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {item.points >= 0 ? `+${item.points}` : item.points} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        {/* FULL HISTORY WITH DUAL FALLBACK */}
        <section className="mt-12 pb-12">
          <div className="rounded-3xl border border-green-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                  ALL-TIME LOG
                </p>
                <h2 className="mt-1 text-2xl font-bold">Complete Activity History</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total of {summaryStats.totalUploads || recentTransactions.length} actions recorded.
                </p>
              </div>

              <button
                type="button"
                onClick={toggleHistorySection}
                className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-bold text-green-800 transition hover:bg-green-100"
              >
                <History size={18} />
                {showFullHistory ? 'Hide Full History' : 'View Full History'}
              </button>
            </div>

            {showFullHistory && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                {historyLoading && historyItems.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    <Loader2 className="mx-auto mb-2 animate-spin text-green-600" size={20} />
                    Loading full history...
                  </div>
                ) : historyItems.length > 0 ? (
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
                    {historyItems.map((item) => {
                      const primaryCat = item.categories?.[0]?.category
                      const meta = getCategoryMeta(primaryCat)
                      const Icon = meta.icon

                      return (
                        <div
                          key={item.id}
                          onClick={async () => {
                            const token = getAccessToken()
                            const fullRes = await fetch(
                              `${API_BASE_URL}/waste/${item.id}`,
                              { headers: { Authorization: `Bearer ${token}` } }
                            )
                            if (fullRes.ok) {
                              const fullData = await fullRes.json()
                              sessionStorage.setItem(
                                'wastewise_analysis',
                                JSON.stringify(fullData)
                              )
                              onNavigate('/waste-journey')
                            }
                          }}
                          className="flex cursor-pointer items-center justify-between gap-4 p-4 transition hover:bg-slate-50 sm:px-6"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.color}`}
                            >
                              <Icon size={19} />
                            </span>
                            <div>
                              <h4 className="font-semibold text-slate-900">
                                {item.categories
                                  ?.map((c) => getCategoryMeta(c.category).label)
                                  .join(', ') || 'Waste'}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {formatRelativeDate(item.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="hidden text-right sm:block">
                              <span className="text-sm font-semibold text-slate-700">
                                {item.completed_steps}/{item.total_steps} steps
                              </span>
                              <p className="text-xs text-amber-600">
                                {Math.round(item.progress_percentage || 0)}% done
                              </p>
                            </div>

                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700">
                              {item.status ? item.status.replace(/_/g, ' ') : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* FALLBACK HISTORY DISPLAY (WHEN FULL ANALYSES ARE ZERO) */
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
                    {recentTransactions.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-500">No records found.</p>
                    ) : (
                      recentTransactions.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
                              <CircleCheck size={16} />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{item.description}</p>
                              <p className="text-xs text-slate-400">{formatRelativeDate(item.created_at)}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600">+{item.points} pts</span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {hasMoreHistory && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      disabled={historyLoading}
                      onClick={() => loadFullHistory(historyPage + 1)}
                      className="flex items-center gap-2 rounded-xl border border-green-200 px-5 py-2.5 text-sm font-semibold text-green-800 transition hover:bg-green-50 disabled:opacity-50"
                    >
                      {historyLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                      Load More Records
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default MyActivity
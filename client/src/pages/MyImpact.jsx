import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Flame,
  Globe2,
  HelpCircle,
  Info,
  Leaf,
  Recycle,
  ShieldCheck,
  Sparkles,
  Sprout,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import CategoryBreakdownCard from '../components/CategoryBreakdownCard'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:8000/api/v1'
).replace(/\/$/, '')

const NEXT_MILESTONE = 500

function getAccessToken() {
  return (
    window.localStorage.getItem('wastewise_access_token') ||
    window.sessionStorage.getItem('wastewise_access_token')
  )
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function computeStreakAndWeek(historyItems) {
  const activeDates = new Set(
    historyItems.map((item) => new Date(item.created_at).toDateString())
  )

  let streak = 0
  const cursor = new Date()

  if (!activeDates.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (activeDates.has(cursor.toDateString())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  const today = new Date()
  const mondayOffset = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)

  const week = WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      day: label,
      active: activeDates.has(date.toDateString()),
    }
  })

  return { streak, week }
}

function getEcoTier(score) {
  if (score >= 90) {
    return {
      title: 'Eco Guardian',
      tagline: 'Top-tier sustainable habit master',
      badgeColor: 'bg-emerald-500 text-white',
    }
  }
  if (score >= 70) {
    return {
      title: 'Eco Champion',
      tagline: 'Consistent, responsible sorter',
      badgeColor: 'bg-green-600 text-white',
    }
  }
  return {
    title: 'Eco Explorer',
    tagline: 'Building a greener daily routine',
    badgeColor: 'bg-amber-500 text-white',
  }
}

function MyImpact({ onNavigate }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [impact, setImpact] = useState({
    totalEntries: 0,
    recyclableEntries: 0,
    stepsCompleted: 0,
    ecoScore: 75,
    greenPoints: 0,
    streak: 0,
    week: WEEKDAY_LABELS.map((label) => ({ day: label, active: false })),
    categoryBreakdown: [],
    totalAnalyses: 0,
  })

  useEffect(() => {
    const loadImpact = async () => {
      const accessToken = getAccessToken()
      if (!accessToken) {
        onNavigate('/login')
        return
      }

      const authHeaders = { Authorization: `Bearer ${accessToken}` }

      try {
        const [historyRes, statsRes, rewardRes] = await Promise.all([
          fetch(`${API_BASE_URL}/waste/history?page=1&page_size=100`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/rewards/stats`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/rewards/me`, { headers: authHeaders }),
        ])

        if (historyRes.status === 401) {
          onNavigate('/login')
          return
        }

        let items = []
        let total = 0
        if (historyRes.ok) {
          const histData = await historyRes.json()
          items = histData.items || []
          total = histData.total ?? items.length
        }

        let userPoints = 0
        if (rewardRes.ok) {
          const rewData = await rewardRes.json()
          userPoints = rewData.total_points ?? 0
        }

        const categoryCounts = {}
        let totalCatEntries = 0

        items.forEach((analysis) => {
          (analysis.categories || []).forEach(({ category }) => {
            totalCatEntries += 1
            categoryCounts[category] = (categoryCounts[category] || 0) + 1
          })
        })

        let stepsCompleted = items.reduce(
          (sum, a) => sum + (a.completed_steps || 0),
          0
        )

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          if (statsData.total_completed_steps !== undefined) {
            stepsCompleted = Math.max(stepsCompleted, statsData.total_completed_steps)
          }
        }

        const categoryBreakdown = Object.entries(categoryCounts)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)

        const { streak, week } = computeStreakAndWeek(items)

        // Unified Eco Score Formula: min 50, max 100
        const calculatedEcoScore = Math.min(
          100,
          Math.max(50, stepsCompleted * 10 + total * 5)
        )

        setImpact({
          totalEntries: totalCatEntries,
          recyclableEntries: categoryCounts.recyclable || 0,
          stepsCompleted,
          ecoScore: calculatedEcoScore,
          greenPoints: userPoints,
          streak,
          week,
          categoryBreakdown,
          totalAnalyses: total,
        })
      } catch (err) {
        console.error('Impact load error:', err)
        setError('Unable to load impact data right now.')
      } finally {
        setLoading(false)
      }
    }

    loadImpact()
  }, [])

  const ecoTier = getEcoTier(impact.ecoScore)

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
      <Navbar activePath="my-impact" onNavigate={onNavigate} />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {error && (
          <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}

        {/* HERO SECTION */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-7 text-white shadow-xl shadow-green-950/10 lg:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_.7fr]">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold tracking-[0.2em] text-green-100">
                  SUSTAINABILITY SNAPSHOT
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ecoTier.badgeColor}`}>
                  {ecoTier.title}
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                Your Ecological Impact
              </h1>
              <p className="mt-4 text-base leading-relaxed text-green-50">
                You have completed <strong className="text-white">{loading ? '—' : impact.stepsCompleted}</strong> disposal steps
                across <strong className="text-white">{loading ? '—' : impact.totalAnalyses}</strong> waste analyses.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs text-green-100">Eco Score</p>
                  <p className="mt-1 text-xl font-bold">{loading ? '—' : `${impact.ecoScore}/100`}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs text-green-100">Green Points</p>
                  <p className="mt-1 text-xl font-bold">{loading ? '—' : impact.greenPoints}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs text-green-100">Active Streak</p>
                  <p className="mt-1 text-xl font-bold">{loading ? '—' : `${impact.streak} days`}</p>
                </div>
              </div>
            </div>

            {/* RADIAL ECO SCORE VISUAL */}
            <div className="mx-auto w-full max-w-xs">
              <div className="relative flex aspect-square items-center justify-center rounded-full border-[14px] border-white/10">
                <div
                  className="absolute inset-[-14px] rounded-full"
                  style={{
                    background: `conic-gradient(
                      white ${impact.ecoScore}%,
                      rgba(255,255,255,0.12) ${impact.ecoScore}%
                    )`,
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 14px), #000 0)',
                    WebkitMask:
                      'radial-gradient(farthest-side, transparent calc(100% - 14px), #000 0)',
                  }}
                />

                <div className="text-center">
                  <Leaf size={27} className="mx-auto text-green-100" />
                  <p className="mt-2 text-5xl font-bold">{loading ? '—' : impact.ecoScore}</p>
                  <p className="mt-1 text-sm text-green-100">Eco Score</p>
                  <p className="mt-2 text-xs font-semibold text-green-100/90">
                    {ecoTier.tagline}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            NEW: "WHAT IS ECO SCORE & WHY IT MATTERS" DEEP-DIVE
        ========================================================= */}
        <section className="mt-8 rounded-3xl border border-green-100 bg-white p-7 lg:p-10 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <Sparkles size={24} />
            </span>
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-green-700 uppercase">
                Understanding Your Metric
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                What is your Eco Score and why does it matter?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-3xl">
                Your <strong>Eco Score</strong> is a dynamic reflection of your daily sustainability habits. It doesn't just measure what you throw away—it quantifies your commitment to sorting correctly, completing verified disposal steps, and keeping waste out of municipal landfills.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: How It's Calculated */}
            <div className="rounded-2xl border border-slate-100 bg-[#f8fbf6] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <Target size={20} />
              </div>
              <h3 className="mt-4 font-bold text-slate-800 text-lg">
                1. How It's Calculated
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Every verified AI classification and completed disposal checklist increases your score. Higher scores reflect multi-category sorting (organic, recyclable, e-waste) and disciplined task completion.
              </p>
            </div>

            {/* Card 2: Personal Perks & Benefits */}
            <div className="rounded-2xl border border-slate-100 bg-[#f8fbf6] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Trophy size={20} />
              </div>
              <h3 className="mt-4 font-bold text-slate-800 text-lg">
                2. Unlocks Real Rewards
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Higher Eco Score tiers accelerate your <strong>Green Points</strong> accumulation rate. Maintain a high score to unlock exclusive partner vouchers, café discounts, and health passes in the Marketplace.
              </p>
            </div>

            {/* Card 3: Environmental Impact */}
            <div className="rounded-2xl border border-slate-100 bg-[#f8fbf6] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Globe2 size={20} />
              </div>
              <h3 className="mt-4 font-bold text-slate-800 text-lg">
                3. Real Ecological Change
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Every correctly separated item prevents hazardous contamination in recycling plants, reduces methane emissions from rotting organic waste, and conserves valuable natural raw materials.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-green-700 p-5 text-white">
            <div className="flex items-center gap-3">
              <ShieldCheck size={24} className="shrink-0 text-green-200" />
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                Aim for <strong>90+ points</strong> to maintain <em>Eco Guardian</em> status and maximize your sustainability ranking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/marketplace')}
              className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-green-800 transition hover:bg-green-50"
            >
              Explore Tier Rewards
            </button>
          </div>
        </section>

        {/* WEEKLY CONSISTENCY */}
        <section className="mt-8 rounded-2xl border border-green-100 bg-white p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-green-700">WEEKLY STREAK</p>
              <h2 className="mt-1 text-xl font-bold">Your Consistency Log</h2>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
              <Flame size={16} /> {impact.streak} Day Streak
            </span>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-4">
            {impact.week.map((item, index) => (
              <div key={`${item.day}-${index}`} className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">{item.day}</span>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    item.active ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-300'
                  }`}
                >
                  {item.active ? <CheckCircle2 size={18} /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* CATEGORY CONTRIBUTION BREAKDOWN */}
        <section className="mt-8 pb-12">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-green-700">CATEGORIES SORTED</p>
            <h2 className="mt-1 text-xl font-bold">Where Your Waste Went</h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {impact.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500 sm:col-span-4">No waste categories detected yet.</p>
            ) : (
              impact.categoryBreakdown.map(({ category, count }) => (
                <CategoryBreakdownCard
                  key={category}
                  category={category}
                  count={count}
                  totalCount={impact.totalEntries}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default MyImpact
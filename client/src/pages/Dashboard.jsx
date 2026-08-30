import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  ChevronRight,
  Clock,
  Coffee,
  Dumbbell,
  Flame,
  History,
  ImageUp,
  Leaf,
  Lock,
  Recycle,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { getCategoryMeta, formatRelativeDate } from '../utils/wasteCategory'

const rewards = [
  {
    id: 1,
    icon: Coffee,
    title: 'Free Coffee',
    partner: 'Green Brew Cafe',
    category: 'Food & Drinks',
    requiredPoints: 500,
    description: 'Enjoy a complimentary organic coffee from our partner cafe.',
    expiry: 'Saturday',
    available: 10,
  },
  {
    id: 2,
    icon: Stethoscope,
    title: 'Free Consultation',
    partner: 'Green Health Clinic',
    category: 'Health',
    requiredPoints: 750,
    description: 'Complimentary general wellness checkup session.',
    expiry: 'Sunday',
    available: 5,
  },
  {
    id: 3,
    icon: Dumbbell,
    title: 'Free Gym Week',
    partner: 'GreenFit Gym',
    category: 'Fitness',
    requiredPoints: 1000,
    description: 'One week full access pass to sustainable eco-gym facilities.',
    expiry: 'Sunday',
    available: 3,
  },
]

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
).replace(/\/$/, '')

function getAccessToken() {
  return (
    window.localStorage.getItem('wastewise_access_token') ||
    window.sessionStorage.getItem('wastewise_access_token')
  )
}

function Dashboard({ onNavigate }) {
  const inputRef = useRef(null)

  const [image, setImage] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [rewardIndex, setRewardIndex] = useState(0)
  const [selectedRewardModal, setSelectedRewardModal] = useState(null)

  const [profile, setProfile] = useState(null)
  const [pendingDisposal, setPendingDisposal] = useState(null)
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])

  const [summaryStats, setSummaryStats] = useState({
    totalStepsDone: 0,
    totalCategoriesAnalysed: 0,
    totalPoints: 0,
    totalUploads: 0,
    streak: 0,
  })

  const [dashboardLoading, setDashboardLoading] = useState(true)

  const loadDashboardData = async () => {
    const accessToken = getAccessToken()

    if (!accessToken) {
      setDashboardLoading(false)
      onNavigate('/login')
      return
    }

    const authHeaders = { Authorization: `Bearer ${accessToken}` }
    setDashboardLoading(true)

    try {
      const [profileRes, activeRes, historyRes, statsRes, rewardRes, transRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/users/me`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/waste/active`, { headers: authHeaders }).catch(() => null),
          fetch(`${API_BASE_URL}/waste/history?page=1&page_size=20`, { headers: authHeaders }).catch(() => null),
          fetch(`${API_BASE_URL}/rewards/stats`, { headers: authHeaders }).catch(() => null),
          fetch(`${API_BASE_URL}/rewards/me`, { headers: authHeaders }).catch(() => null),
          fetch(`${API_BASE_URL}/rewards/transactions?page=1&page_size=6`, { headers: authHeaders }).catch(() => null),
        ])

      if (profileRes && profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData)
        if (profileData?.user_name) {
          window.localStorage.setItem('wastewise_username', profileData.user_name)
        }
      }

      // 1. Process active task
      let activeItem = null
      if (activeRes && activeRes.ok) {
        const activeData = await activeRes.json()
        if (activeData?.has_active && activeData?.analysis) {
          activeItem = activeData.analysis
        } else if (activeData?.id) {
          activeItem = activeData
        }
      }

      let allItems = []
      let totalUploads = 0
      let calculatedSteps = 0
      let detectedCategories = 0

      // 2. Process history items
      if (historyRes && historyRes.ok) {
        const histData = await historyRes.json()
        allItems = histData?.items || []
        totalUploads = histData?.total ?? allItems.length

        // Secondary fallback to history if active endpoint was null
        if (!activeItem && allItems.length > 0) {
          const candidate = allItems.find(
            (it) => it?.status === 'in_progress' || (it?.total_steps > 0 && it?.completed_steps < it?.total_steps)
          )
          if (candidate) {
            const detailRes = await fetch(`${API_BASE_URL}/waste/${candidate.id}`, { headers: authHeaders }).catch(() => null)
            activeItem = detailRes && detailRes.ok ? await detailRes.json() : candidate
          }
        }

        const categorySet = new Set(
          allItems.flatMap((a) => (a?.categories || []).map((c) => c?.category)).filter(Boolean)
        )
        detectedCategories = categorySet.size

        calculatedSteps = allItems.reduce(
          (sum, a) => sum + (Number(a?.completed_steps) || 0),
          0
        )
      }

      setPendingDisposal(activeItem)

      let userPoints = 0
      if (rewardRes && rewardRes.ok) {
        const rewData = await rewardRes.json()
        userPoints = rewData?.total_points ?? 0
      }

      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData?.total_completed_steps !== undefined) {
          calculatedSteps = Math.max(
            calculatedSteps,
            Number(statsData.total_completed_steps)
          )
        }
        if (statsData?.completed_categories && detectedCategories === 0) {
          detectedCategories = Number(statsData.completed_categories)
        }
      }

      let transList = []
      if (transRes && transRes.ok) {
        const transData = await transRes.json()
        transList = transData?.items || []
        setRecentTransactions(transList)
      }

      const allDates = [
        ...allItems.map((i) => new Date(i.created_at).toDateString()),
        ...transList.map((t) => new Date(t.created_at).toDateString()),
      ]
      const activeDates = new Set(allDates)
      let currentStreak = 0
      const cursor = new Date()
      if (!activeDates.has(cursor.toDateString())) {
        cursor.setDate(cursor.getDate() - 1)
      }
      while (activeDates.has(cursor.toDateString())) {
        currentStreak += 1
        cursor.setDate(cursor.getDate() - 1)
      }

      setSummaryStats({
        totalStepsDone: calculatedSteps,
        totalCategoriesAnalysed: detectedCategories,
        totalPoints: userPoints,
        totalUploads: totalUploads,
        streak: currentStreak,
      })

      setRecentAnalyses(allItems.slice(0, 3))
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setDashboardLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const resumePendingDisposal = (item) => {
    sessionStorage.setItem('wastewise_analysis', JSON.stringify(item))
    onNavigate('/waste-journey')
  }

  const selectImage = async (event) => {
    if (pendingDisposal) {
      setUploadError(
        'You have an unfinished waste disposal plan. Please complete all current steps before analyzing another item.'
      )
      return
    }

    const file = event.target.files?.[0]
    if (!file) return

    setUploadError('')
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size cannot exceed 10 MB.')
      return
    }

    try {
      setUploading(true)
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target.result
        setImage(dataUrl)
        sessionStorage.setItem('wastewise_uploaded_image', dataUrl)
        sessionStorage.removeItem('wastewise_analysis')
        onNavigate('/waste-classification')
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setUploadError('Unable to process the image.')
    } finally {
      setUploading(false)
    }
  }

  const currentPoints = summaryStats.totalPoints
  const reward = rewards[rewardIndex]
  const RewardIcon = reward.icon
  const progress = Math.min((currentPoints / reward.requiredPoints) * 100, 100)
  const remainingPoints = Math.max(reward.requiredPoints - currentPoints, 0)

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
      <Navbar activePath="dashboard" onNavigate={onNavigate} />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <section>
          <p className="text-xs font-bold tracking-[0.18em] text-green-700">
            YOUR SUSTAINABILITY JOURNEY
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Good morning, {profile?.user_name || 'User'}
          </h1>
          <p className="mt-2 text-slate-600">
            Let's make your waste count. Identify, dispose, and earn rewards.
          </p>
        </section>

        {/* PENDING DISPOSAL HERO CARD */}
        {pendingDisposal && (
          <section className="mt-6 overflow-hidden rounded-3xl border-2 border-amber-400 bg-amber-50 p-6 shadow-md shadow-amber-950/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                  <Clock size={24} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900">
                      Action Required
                    </span>
                    {pendingDisposal.created_at && (
                      <p className="text-xs text-slate-500">
                        Logged {formatRelativeDate(pendingDisposal.created_at)}
                      </p>
                    )}
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    You have an unfinished waste disposal plan
                  </h3>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
                    {(pendingDisposal.categories || [])
                      .map((c) => getCategoryMeta(c?.category).label)
                      .filter(Boolean)
                      .join(', ') || 'Pending Waste Items'}{' '}
                    &middot; Complete all checklist steps to earn your points and unlock new uploads.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => resumePendingDisposal(pendingDisposal)}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3.5 font-bold text-white shadow-md shadow-green-900/10 transition hover:bg-green-800"
              >
                <span>Resume Disposal Plan</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}

        {/* UPLOAD SECTION (DISABLED WHEN PENDING) */}
        <section className="mt-7 overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-7 text-white shadow-xl shadow-green-950/10 lg:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_.65fr]">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Recycle size={25} />
              </span>
              <p className="mt-6 text-xs font-bold tracking-[0.18em] text-green-100">
                AI WASTE IDENTIFICATION
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight">
                What kind of waste
                <br />
                do you have?
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-green-50">
                Upload a photo and WasteWise AI will identify the actual waste
                items, classify them, and create personalized disposal
                recommendations.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {pendingDisposal ? (
                  <button
                    type="button"
                    onClick={() => resumePendingDisposal(pendingDisposal)}
                    className="flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 font-bold text-amber-950 shadow-sm transition hover:bg-amber-300"
                  >
                    <Lock size={18} />
                    <span>Complete Pending Plan First</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-green-800 shadow-sm transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ImageUp size={19} />
                    {uploading ? 'Preparing...' : 'Upload photo'}
                  </button>
                )}

                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  disabled={Boolean(pendingDisposal)}
                  onChange={selectImage}
                />
              </div>

              {uploadError && (
                <div className="mt-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-100">
                  {uploadError}
                </div>
              )}
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className="aspect-square overflow-hidden rounded-[2rem] border border-white/25 bg-white/10 p-3 shadow-inner">
                <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/40 bg-white/5 text-center">
                  <span className="rounded-full bg-white/15 p-6">
                    {pendingDisposal ? <Lock size={44} /> : <ImageUp size={44} />}
                  </span>
                  <p className="mt-5 font-semibold">
                    {pendingDisposal
                      ? 'Disposal in Progress'
                      : 'Ready to identify'}
                  </p>
                  <p className="mt-1 text-sm text-green-100">
                    {pendingDisposal
                      ? 'Finish your active checklist above'
                      : 'Your photo will appear here.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REWARDS CAROUSEL */}
        <section className="mt-7 overflow-hidden rounded-2xl border border-amber-100 bg-[#fffaf0] p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                setRewardIndex((rewardIndex - 1 + rewards.length) % rewards.length)
              }
              className="flex-shrink-0 rounded-full bg-white p-2 text-amber-700 shadow-sm transition hover:bg-amber-50"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-5">
              <span className="hidden flex-shrink-0 rounded-2xl bg-amber-100 p-4 text-amber-700 sm:block">
                <RewardIcon size={30} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.15em] text-amber-700">
                  WASTEWISE REWARD
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{reward.title}</h2>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {reward.available} available
                  </span>
                </div>

                <p className="mt-1 text-sm font-medium text-slate-600">
                  {reward.partner}
                </p>

                <div className="mt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                    <span>
                      {currentPoints} / {reward.requiredPoints} Green Points
                    </span>
                    <span className="text-amber-700">
                      {remainingPoints > 0
                        ? `${remainingPoints} points remaining`
                        : 'Reward unlocked!'}
                    </span>
                  </div>

                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-amber-100">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRewardModal(reward)}
                className="hidden flex-shrink-0 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600 lg:block"
              >
                View Reward
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setRewardIndex((rewardIndex + 1) % rewards.length)
              }
              className="flex-shrink-0 rounded-full bg-white p-2 text-amber-700 shadow-sm transition hover:bg-amber-50"
            >
              <ArrowRight size={19} />
            </button>
          </div>
        </section>

        {/* METRICS ROW */}
        <section className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Leaf size={20} />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Total Steps Done
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                {dashboardLoading ? '—' : summaryStats.totalStepsDone}
              </h3>
            </article>

            <article className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Recycle size={20} />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Categories Detected
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                {dashboardLoading ? '—' : summaryStats.totalCategoriesAnalysed}
              </h3>
            </article>

            <article className="rounded-2xl border border-amber-100 bg-[#fffaf0] p-5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Award size={20} />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-700">
                Green Points
              </p>
              <h3 className="mt-1 text-2xl font-bold text-amber-900">
                {dashboardLoading ? '—' : summaryStats.totalPoints}
              </h3>
            </article>

            <article className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Flame size={20} />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                Active Streak
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                {dashboardLoading ? '—' : `${summaryStats.streak} days`}
              </h3>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}

export default Dashboard
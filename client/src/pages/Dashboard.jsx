import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  Coffee,
  Dumbbell,
  Flame,
  History,
  ImageUp,
  Leaf,
  Recycle,
  Sparkles,
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
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:8000/api/v1'
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
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])

  // EXACT STATE OBJECT MATCHED TO MYACTIVITY.JSX
  const [summaryStats, setSummaryStats] = useState({
    totalStepsDone: 0,
    totalCategoriesAnalysed: 0,
    totalPoints: 0,
    totalUploads: 0,
    streak: 0,
  })

  const [dashboardLoading, setDashboardLoading] = useState(true)

  // EXACT LOAD FUNCTION MATCHED TO MYACTIVITY.JSX
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
      const [profileRes, historyRes, statsRes, rewardRes, transRes] = await Promise.all([
        fetch(`${API_BASE_URL}/users/me`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/waste/history?page=1&page_size=50`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/rewards/stats`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/rewards/me`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/rewards/transactions?page=1&page_size=6`, { headers: authHeaders }),
      ])

      if (profileRes.status === 401 || historyRes.status === 401 || rewardRes.status === 401) {
        onNavigate('/login')
        return
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData)
        if (profileData?.user_name) {
          window.localStorage.setItem('wastewise_username', profileData.user_name)
        }
      }

      let allItems = []
      let totalUploads = 0
      let calculatedSteps = 0
      let detectedCategories = 0

      if (historyRes.ok) {
        const histData = await historyRes.json()
        allItems = histData.items || []
        totalUploads = histData.total ?? allItems.length

        // Extract distinct category count
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

      // Check stats endpoint from backend database
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData.total_completed_steps !== undefined) {
          calculatedSteps = Math.max(calculatedSteps, statsData.total_completed_steps)
        }
        if (statsData.completed_categories && detectedCategories === 0) {
          detectedCategories = statsData.completed_categories
        }
      }

      let transList = []
      if (transRes.ok) {
        const transData = await transRes.json()
        transList = transData.items || []
        setRecentTransactions(transList)
      }

      // Calculate streak
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

      // SET STATE WITH REAL VALUES
      setSummaryStats({
        totalStepsDone: calculatedSteps,
        totalCategoriesAnalysed: detectedCategories,
        totalPoints: userPoints,
        totalUploads: totalUploads,
        streak: currentStreak,
      })

      // Fetch top analyses with full details
      const top3List = allItems.slice(0, 3)
      if (top3List.length > 0) {
        const detailedTop3 = await Promise.all(
          top3List.map((item) =>
            fetch(`${API_BASE_URL}/waste/${item.id}`, { headers: authHeaders })
              .then((res) => (res.ok ? res.json() : item))
              .catch(() => item)
          )
        )
        setRecentAnalyses(detailedTop3)
      } else {
        setRecentAnalyses([])
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setDashboardLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const username =
    profile?.user_name ||
    window.localStorage.getItem('wastewise_username') ||
    'User'

  const currentPoints = summaryStats.totalPoints
  const reward = rewards[rewardIndex]
  const RewardIcon = reward.icon
  const progress = Math.min((currentPoints / reward.requiredPoints) * 100, 100)
  const remainingPoints = Math.max(reward.requiredPoints - currentPoints, 0)

  const prepareImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const maxSize = 1200
          let width = img.width
          let height = img.height

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width)
              width = maxSize
            } else {
              width = Math.round((width * maxSize) / height)
              height = maxSize
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const context = canvas.getContext('2d')
          context.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.onerror = () => reject(new Error('Unable to process image.'))
        img.src = event.target.result
      }
      reader.onerror = () => reject(new Error('Unable to read image.'))
      reader.readAsDataURL(file)
    })
  }

  const selectImage = async (event) => {
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
      const imageData = await prepareImage(file)
      setImage(imageData)
      sessionStorage.setItem('wastewise_uploaded_image', imageData)
      sessionStorage.removeItem('wastewise_analysis')
      onNavigate('/waste-classification')
    } catch (error) {
      console.error(error)
      setUploadError(error.message || 'Unable to process the image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
      <Navbar activePath="dashboard" onNavigate={onNavigate} />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {/* WELCOME */}
        <section>
          <p className="text-xs font-bold tracking-[0.18em] text-green-700">
            YOUR SUSTAINABILITY JOURNEY
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Good morning, {username}
          </h1>
          <p className="mt-2 text-slate-600">
            Let's make your waste count. Identify, dispose, and earn rewards.
          </p>
        </section>

        {/* UPLOAD SECTION */}
        <section className="mt-9 overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-7 text-white shadow-xl shadow-green-950/10 lg:p-10">
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
                Upload a photo and WasteWise AI will identify the actual waste items,
                classify them, and create personalized disposal recommendations.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-green-800 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Camera size={18} />
                  {uploading ? 'Preparing...' : 'Click photo'}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ImageUp size={18} />
                  Upload photo
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={selectImage}
                />
              </div>

              {uploadError && (
                <div className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-100">
                  {uploadError}
                </div>
              )}
              <p className="mt-4 text-xs text-green-100">
                JPG, PNG or WEBP. Maximum 10 MB.
              </p>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className="aspect-square overflow-hidden rounded-[2rem] border border-white/25 bg-white/10 p-3 shadow-inner">
                {image ? (
                  <img
                    src={image}
                    alt="Selected waste"
                    className="h-full w-full rounded-[1.5rem] object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/40 bg-white/5 text-center">
                    <span className="rounded-full bg-white/15 p-6">
                      <Camera size={44} />
                    </span>
                    <p className="mt-5 font-semibold">Ready to identify</p>
                    <p className="mt-1 text-sm text-green-100">
                      Your photo will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* REWARDS CAROUSEL */}
        <section className="mt-7 overflow-hidden rounded-2xl border border-amber-100 bg-[#fffaf0] p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setRewardIndex((rewardIndex - 1 + rewards.length) % rewards.length)}
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
              onClick={() => setRewardIndex((rewardIndex + 1) % rewards.length)}
              className="flex-shrink-0 rounded-full bg-white p-2 text-amber-700 shadow-sm transition hover:bg-amber-50"
            >
              <ArrowRight size={19} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedRewardModal(reward)}
            className="mt-5 w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600 lg:hidden"
          >
            View Reward
          </button>
        </section>

        {/* METRICS ROW (MATCHED 100% TO MYACTIVITY.JSX DATA) */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                YOUR IMPACT
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Your sustainability snapshot
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/my-impact')}
              className="hidden items-center gap-1 text-sm font-semibold text-green-700 sm:flex"
            >
              View full impact
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <p className="mt-1 text-xs text-slate-500">Verified actions completed</p>
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
              <p className="mt-1 text-xs text-slate-500">Distinct waste types identified</p>
            </article>

            <article className="rounded-2xl border border-amber-100 bg-[#fffaf0] p-5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Award size={20} />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-700">
                Green Points
              </p>
              <h3 className="mt-1 text-2xl font-bold text-amber-900">
                {dashboardLoading ? '—' : currentPoints}
              </h3>
              <p className="mt-1 text-xs text-amber-600">Available in your wallet</p>
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
              <p className="mt-1 text-xs text-slate-500">Daily consistency</p>
            </article>
          </div>
        </section>

        {/* RECENT ACTIVITY */}
        <section className="mt-10 pb-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                RECENT ACTIVITY
              </p>
              <h2 className="mt-2 text-2xl font-bold">Your latest waste records</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/my-activity')}
              className="hidden items-center gap-1 text-sm font-semibold text-green-700 sm:flex"
            >
              View all activity
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-green-100 bg-white shadow-sm">
            {dashboardLoading && (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading your activity...
              </div>
            )}

            {!dashboardLoading && recentAnalyses.length === 0 && recentTransactions.length === 0 && (
              <div className="p-8 sm:p-10 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                  <History size={26} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-800">
                  Track Your Waste History
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
                  Start scanning your daily waste items or review your complete activity and point transactions log.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('/my-activity')}
                    className="flex items-center gap-2 rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-800"
                  >
                    <History size={16} />
                    View My Activities
                  </button>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-5 py-3 text-sm font-bold text-green-800 transition hover:bg-green-50"
                  >
                    <Camera size={16} />
                    Upload Waste Image
                  </button>
                </div>
              </div>
            )}

            {/* RENDER FULL ANALYSES IF AVAILABLE */}
            {!dashboardLoading &&
              recentAnalyses.length > 0 && (
                <div>
                  {recentAnalyses.map((analysis) => {
                    const primaryCategory = analysis.categories?.[0]?.category
                    const meta = getCategoryMeta(primaryCategory)
                    const Icon = meta.icon

                    const categoryLabel =
                      analysis.categories
                        ?.map((c) => getCategoryMeta(c.category).label)
                        .join(', ') || 'Waste'

                    return (
                      <div
                        key={analysis.id}
                        onClick={async () => {
                          const token = getAccessToken()
                          const fullRes = await fetch(
                            `${API_BASE_URL}/waste/${analysis.id}`,
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
                        className="flex cursor-pointer items-center justify-between gap-4 border-b border-slate-100 p-5 transition last:border-0 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.color}`}
                          >
                            <Icon size={19} />
                          </span>
                          <div>
                            <h3 className="font-semibold">{categoryLabel}</h3>
                            <p className="text-xs text-slate-500">
                              {formatRelativeDate(analysis.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="hidden text-right sm:block">
                          <strong className="text-sm">
                            {analysis.completed_steps}/{analysis.total_steps} steps
                          </strong>
                          <p className="text-xs font-semibold text-amber-600">
                            {Math.round(analysis.progress_percentage || 0)}% done
                          </p>
                        </div>

                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold capitalize text-green-700">
                          {analysis.status ? analysis.status.replace(/_/g, ' ') : 'In Progress'}
                        </span>
                      </div>
                    )
                  })}
                  <div className="border-t border-slate-100 p-4 text-center bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => onNavigate('/my-activity')}
                      className="inline-flex items-center gap-2 text-xs font-bold text-green-800 hover:text-green-900"
                    >
                      <span>Go to Full Activity Tracker</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

            {/* FALLBACK: RENDER RECENT ACTIONS WITH ACTIVITY BUTTON */}
            {!dashboardLoading &&
              recentAnalyses.length === 0 &&
              recentTransactions.length > 0 && (
                <div>
                  <div className="divide-y divide-slate-100">
                    {recentTransactions.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 sm:px-6 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700">
                            <Leaf size={18} />
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
                        <span className="text-xs font-bold text-emerald-600">
                          +{item.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 p-4 text-center bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => onNavigate('/my-activity')}
                      className="inline-flex items-center gap-2 text-xs font-bold text-green-800 hover:text-green-900"
                    >
                      <span>View All In My Activities</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </section>
      </div>

      {/* MODAL VIEW */}
      {selectedRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <selectedRewardModal.icon size={26} />
              </span>
              <button
                type="button"
                onClick={() => setSelectedRewardModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <h3 className="mt-4 text-xl font-bold text-slate-900">
              {selectedRewardModal.title}
            </h3>
            <p className="text-sm font-semibold text-green-700">
              {selectedRewardModal.partner}
            </p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {selectedRewardModal.description}
            </p>

            <div className="mt-5 rounded-2xl bg-amber-50/70 p-4">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Required: {selectedRewardModal.requiredPoints} pts</span>
                <span>Balance: {currentPoints} pts</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{
                    width: `${Math.min(
                      (currentPoints / selectedRewardModal.requiredPoints) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedRewardModal(null)
                  onNavigate(`/marketplace/reward/${selectedRewardModal.id}`)
                }}
                className="flex-1 rounded-xl bg-green-700 py-3 text-sm font-bold text-white transition hover:bg-green-800"
              >
                Go to Details
              </button>
              <button
                type="button"
                onClick={() => setSelectedRewardModal(null)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Dashboard
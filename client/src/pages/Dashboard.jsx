import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Camera,
  ChevronRight,
  Coffee,
  Dumbbell,
  ImageUp,
  Recycle,
  Stethoscope,
  Trash2,
  Leaf,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { getCategoryMeta, formatRelativeDate } from '../utils/wasteCategory'

// ------------------------------------------------------------
// NOTE ON REWARDS CAROUSEL
//
// The marketplace/redemption side (which partner rewards exist,
// how many are "available") still has no backend model — this
// card stays mock. Green Points itself is now real, pulled from
// GET /rewards/me.
// ------------------------------------------------------------

const rewards = [
  {
    icon: Coffee,
    title: 'Free Coffee',
    partner: 'Green Brew Cafe',
    requiredPoints: 500,
    currentPoints: 340,
    expiry: 'Saturday',
    available: 10,
  },
  {
    icon: Stethoscope,
    title: 'Free Consultation',
    partner: 'Green Health Clinic',
    requiredPoints: 750,
    currentPoints: 340,
    expiry: 'Sunday',
    available: 5,
  },
  {
    icon: Dumbbell,
    title: 'Free Gym Week',
    partner: 'GreenFit Gym',
    requiredPoints: 1000,
    currentPoints: 340,
    expiry: 'Sunday',
    available: 3,
  },
  {
    icon: BookOpen,
    title: 'Novel Discount',
    partner: 'EcoReads',
    requiredPoints: 600,
    currentPoints: 340,
    expiry: '30 August',
    available: 20,
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

  // ---------------------------------------------------------
  // DYNAMIC DATA
  // ---------------------------------------------------------

  const [profile, setProfile] = useState(null)
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    categoriesDetected: 0,
    stepsCompleted: 0,
    stepsTotal: 0,
  })
  const [rewardSummary, setRewardSummary] = useState(null) // { total_points, total_earned, total_transactions }
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      const accessToken = getAccessToken()

      if (!accessToken) {
        setDashboardLoading(false)
        return
      }

      const authHeaders = { Authorization: `Bearer ${accessToken}` }

      try {
        const [profileResponse, historyResponse, rewardResponse] =
          await Promise.all([
            fetch(`${API_BASE_URL}/users/me`, { headers: authHeaders }),
            fetch(
              `${API_BASE_URL}/waste/history?page=1&page_size=50`,
              { headers: authHeaders }
            ),
            fetch(`${API_BASE_URL}/rewards/me`, { headers: authHeaders }),
          ])

        // Session expired / invalid token — send them back to login.
        // (No onLogout prop needed — Navbar owns the full logout
        // flow now; this is just a redirect for an already-expired
        // session, nothing left to clean up that Navbar wouldn't
        // already have cleared on the way here.)
        if (
          profileResponse.status === 401 ||
          historyResponse.status === 401 ||
          rewardResponse.status === 401
        ) {
          onNavigate('/login')
          return
        }

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setProfile(profileData)

          if (profileData?.user_name) {
            window.localStorage.setItem(
              'wastewise_username',
              profileData.user_name
            )
          }
        }

        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          const items = historyData.items || []

          // Most recent 3 for the activity feed.
          setRecentAnalyses(items.slice(0, 3))

          // Aggregate stats across every analysis on this page.
          const uniqueCategories = new Set(
            items.flatMap((analysis) =>
              (analysis.categories || []).map((c) => c.category)
            )
          )

          const stepsCompleted = items.reduce(
            (sum, analysis) => sum + (analysis.completed_steps || 0),
            0
          )

          const stepsTotal = items.reduce(
            (sum, analysis) => sum + (analysis.total_steps || 0),
            0
          )

          setStats({
            totalAnalyses: historyData.total ?? items.length,
            categoriesDetected: uniqueCategories.size,
            stepsCompleted,
            stepsTotal,
          })
        }

        // Rewards endpoint depends on the reward-service wiring —
        // if it's not deployed yet this just silently stays null
        // and the card below falls back to a loading dash.
        if (rewardResponse.ok) {
          const rewardData = await rewardResponse.json()
          setRewardSummary(rewardData)
        }
      } catch (err) {
        console.error('Dashboard load error:', err)
        setDashboardError(
          'Some dashboard data could not be loaded right now.'
        )
      } finally {
        setDashboardLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const username =
    profile?.user_name ||
    window.localStorage.getItem('wastewise_username') ||
    'User'

  const reward = rewards[rewardIndex]
  const RewardIcon = reward.icon

  const progress = Math.min(
    (reward.currentPoints / reward.requiredPoints) * 100,
    100
  )

  const remainingPoints = Math.max(
    reward.requiredPoints - reward.currentPoints,
    0
  )

  const overallStepsProgress =
    stats.stepsTotal > 0
      ? Math.round((stats.stepsCompleted / stats.stepsTotal) * 100)
      : 0

  // ---------------------------------------------------------
  // Compress image before temporarily storing it.
  // This allows the next page to access the selected image.
  // ---------------------------------------------------------

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
              height = Math.round(
                (height * maxSize) / width
              )
              width = maxSize
            } else {
              width = Math.round(
                (width * maxSize) / height
              )
              height = maxSize
            }
          }

          const canvas = document.createElement('canvas')

          canvas.width = width
          canvas.height = height

          const context = canvas.getContext('2d')

          context.drawImage(
            img,
            0,
            0,
            width,
            height
          )

          resolve(
            canvas.toDataURL('image/jpeg', 0.8)
          )
        }

        img.onerror = () => {
          reject(
            new Error('Unable to process the selected image.')
          )
        }

        img.src = event.target.result
      }

      reader.onerror = () => {
        reject(
          new Error('Unable to read the selected image.')
        )
      }

      reader.readAsDataURL(file)
    })
  }

  // ---------------------------------------------------------
  // SELECT IMAGE
  // ---------------------------------------------------------

  const selectImage = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

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

      // Store image temporarily for WasteClassification.
      sessionStorage.setItem(
        'wastewise_uploaded_image',
        imageData
      )

      // Remove old analysis.
      sessionStorage.removeItem(
        'wastewise_analysis'
      )

      // Go to AI analysis page.
      onNavigate('/waste-classification')
    } catch (error) {
      console.error(error)

      setUploadError(
        error.message ||
        'Unable to process the selected image.'
      )
    } finally {
      setUploading(false)
    }
  }

  // ---------------------------------------------------------
  // REWARD NAVIGATION
  // ---------------------------------------------------------

  const previousReward = () => {
    setRewardIndex(
      (rewardIndex - 1 + rewards.length) %
        rewards.length
    )
  }

  const nextReward = () => {
    setRewardIndex(
      (rewardIndex + 1) % rewards.length
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">

      <Navbar activePath="dashboard" onNavigate={onNavigate} />

      {/* MAIN */}

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">

        {dashboardError && (
          <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {dashboardError}
          </div>
        )}

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

        {/* UPLOAD */}

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
                Upload a photo and WasteWise AI will identify
                the actual waste items, classify them, and create
                personalized disposal recommendations.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-green-800 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Camera size={18} />

                  {uploading
                    ? 'Preparing...'
                    : 'Click photo'}
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

            {/* IMAGE PREVIEW */}

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

                    <p className="mt-5 font-semibold">
                      Ready to identify
                    </p>

                    <p className="mt-1 text-sm text-green-100">
                      Your photo will appear here.
                    </p>

                  </div>

                )}

              </div>

            </div>

          </div>

        </section>

        {/* REWARDS — marketplace side still mock, see note at top of file */}

        <section className="mt-7 overflow-hidden rounded-2xl border border-amber-100 bg-[#fffaf0] p-5 shadow-sm sm:p-7">

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={previousReward}
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

                  <h2 className="text-xl font-bold">
                    {reward.title}
                  </h2>

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
                      {reward.currentPoints} / {reward.requiredPoints} Green Points
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
                      style={{
                        width: `${progress}%`,
                      }}
                    />

                  </div>

                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">

                  <span>
                    Ends {reward.expiry}
                  </span>

                  <span>•</span>

                  <span>
                    {reward.available} rewards available
                  </span>

                </div>

              </div>

              <button
                type="button"
                onClick={() => onNavigate('/rewards')}
                className="hidden flex-shrink-0 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600 lg:block"
              >
                View Reward
              </button>

            </div>

            <button
              type="button"
              onClick={nextReward}
              className="flex-shrink-0 rounded-full bg-white p-2 text-amber-700 shadow-sm transition hover:bg-amber-50"
            >
              <ArrowRight size={19} />
            </button>

          </div>

          <button
            type="button"
            onClick={() => onNavigate('/rewards')}
            className="mt-5 w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600 lg:hidden"
          >
            View Reward
          </button>

          <div className="mt-5 flex justify-center gap-2">

            {rewards.map((_, index) => (

              <button
                key={index}
                type="button"
                onClick={() => setRewardIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === rewardIndex
                    ? 'w-6 bg-amber-500'
                    : 'w-2 bg-amber-200'
                }`}
              />

            ))}

          </div>

        </section>

        {/* IMPACT — now computed from GET /waste/history + GET /rewards/me */}

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

            {[
              {
                label: 'Total analyses',
                value: dashboardLoading ? '—' : String(stats.totalAnalyses),
                note: 'Waste images analyzed',
                icon: Trash2,
                color: 'text-slate-600 bg-slate-100',
              },
              {
                label: 'Categories detected',
                value: dashboardLoading ? '—' : String(stats.categoriesDetected),
                note: 'Distinct waste types found',
                icon: Recycle,
                color: 'text-sky-700 bg-sky-100',
              },
              {
                label: 'Disposal steps done',
                value: dashboardLoading
                  ? '—'
                  : `${stats.stepsCompleted}/${stats.stepsTotal}`,
                note: `${overallStepsProgress}% complete`,
                icon: Leaf,
                color: 'text-green-700 bg-green-100',
              },
              {
                label: 'Green points',
                value:
                  dashboardLoading || !rewardSummary
                    ? '—'
                    : String(rewardSummary.total_points),
                note:
                  dashboardLoading || !rewardSummary
                    ? 'Loading...'
                    : `Lifetime earned: ${rewardSummary.total_earned}`,
                icon: Award,
                color: 'text-amber-700 bg-amber-100',
              },
            ].map(
              ({
                label,
                value,
                note,
                icon: Icon,
                color,
              }) => (

                <article
                  key={label}
                  className="rounded-2xl border border-green-100 bg-white p-5"
                >

                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}
                  >
                    <Icon size={20} />
                  </span>

                  <p className="mt-5 text-sm text-slate-500">
                    {label}
                  </p>

                  <h3 className="mt-1 text-2xl font-bold">
                    {value}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {note}
                  </p>

                </article>

              )
            )}

          </div>

        </section>

        {/* ACTIVITY — now real recent analyses from GET /waste/history */}

        <section className="mt-10 pb-10">

          <div className="flex items-end justify-between">

            <div>

              <p className="text-xs font-bold tracking-[0.18em] text-green-700">
                RECENT ACTIVITY
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Your latest waste records
              </h2>

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

          <div className="mt-5 overflow-hidden rounded-2xl border border-green-100 bg-white">

            {dashboardLoading && (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading your activity...
              </div>
            )}

            {!dashboardLoading && recentAnalyses.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No waste analyses yet. Upload a photo above to get started.
              </div>
            )}

            {!dashboardLoading &&
              recentAnalyses.map((analysis) => {
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
                    onClick={() => {
                      sessionStorage.setItem(
                        'wastewise_analysis',
                        JSON.stringify(analysis)
                      )
                      onNavigate('/waste-journey')
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

                        <h3 className="font-semibold">
                          {categoryLabel}
                        </h3>

                        <p className="text-sm text-slate-500">
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
                      {analysis.status.replace(/_/g, ' ')}
                    </span>

                  </div>

                )
              })}

          </div>

        </section>

      </div>

    </main>
  )
}

export default Dashboard
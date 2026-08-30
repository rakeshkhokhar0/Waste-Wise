import { useEffect, useState } from 'react'
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coffee,
  Dumbbell,
  Gift,
  History,
  Medal,
  Search,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { formatRelativeDate } from '../utils/wasteCategory'

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

export const rewardsCatalog = [
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
    color: 'amber',
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
    color: 'green',
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
    color: 'sky',
  },
  {
    id: 4,
    icon: BookOpen,
    title: 'Eco Novel Discount',
    partner: 'EcoReads',
    category: 'Books',
    requiredPoints: 600,
    description: 'Get an exclusive 25% discount on curated literature.',
    expiry: '30 August',
    available: 20,
    color: 'violet',
  },
]

const categories = [
  'All Rewards',
  'Food & Drinks',
  'Health',
  'Fitness',
  'Books',
]

function Marketplace({ onNavigate }) {
  const [selectedCategory, setSelectedCategory] = useState('All Rewards')
  const [searchQuery, setSearchQuery] = useState('')
  const [userPoints, setUserPoints] = useState(null)
  const [rewardHistory, setRewardHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const [claimedReward, setClaimedReward] = useState(null)
  const [voucherCode, setVoucherCode] = useState('')

  useEffect(() => {
    const loadMarketplaceData = async () => {
      const accessToken = getAccessToken()
      if (!accessToken) {
        onNavigate('/login')
        return
      }

      const authHeaders = { Authorization: `Bearer ${accessToken}` }

      try {
        setLoading(true)
        const [summaryRes, transRes] = await Promise.all([
          fetch(`${API_BASE_URL}/rewards/me`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/rewards/transactions?page=1&page_size=10`, {
            headers: authHeaders,
          }),
        ])

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          setUserPoints(summaryData.total_points ?? 0)
        }

        if (transRes.ok) {
          const transData = await transRes.json()
          setRewardHistory(transData.items || [])
        }
      } catch (err) {
        console.error('Marketplace load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMarketplaceData()
  }, [])

  const currentBalance = userPoints ?? 0

  const handleClaim = (reward) => {
    if (currentBalance < reward.requiredPoints) return

    const code = `ECO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    setVoucherCode(code)
    setClaimedReward(reward)
    setUserPoints((prev) => Math.max(0, prev - reward.requiredPoints))
  }

  const filteredRewards = rewardsCatalog.filter((reward) => {
    const matchesCategory =
      selectedCategory === 'All Rewards' || reward.category === selectedCategory
    const matchesSearch =
      reward.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reward.partner.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
      <Navbar activePath="marketplace" onNavigate={onNavigate} />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {/* HERO BANNER */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-800 to-emerald-600 p-7 text-white shadow-xl shadow-green-950/10 lg:p-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <ShoppingBag size={25} />
              </span>
              <p className="mt-6 text-xs font-bold tracking-[0.18em] text-green-100">
                WASTEWISE STORE
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Redeem Your Green Points
              </h1>
              <p className="mt-3 max-w-xl leading-relaxed text-green-50">
                Turn your verified sustainable waste disposal actions into real rewards from partner businesses.
              </p>
            </div>

            <div className="flex shrink-0 gap-3">
              <div className="rounded-2xl bg-white/10 px-6 py-4 backdrop-blur-sm">
                <p className="text-xs text-green-100">Your Live Balance</p>
                <p className="mt-1 text-3xl font-bold">
                  {loading || userPoints === null ? '—' : currentBalance}{' '}
                  <span className="text-sm font-normal text-green-200">pts</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SEARCH & FILTERS */}
        <section className="mt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Partner Catalog</h2>
              <p className="text-sm text-slate-500">
                Real-time progress toward unlocking each reward offer.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search rewards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none focus:border-green-600"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  selectedCategory === cat
                    ? 'bg-green-700 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* REWARDS GRID */}
        <section className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredRewards.map((reward) => {
            const Icon = reward.icon
            const isEligible = currentBalance >= reward.requiredPoints
            const remaining = Math.max(0, reward.requiredPoints - currentBalance)
            const progress = Math.min((currentBalance / reward.requiredPoints) * 100, 100)

            return (
              <article
                key={reward.id}
                className="flex flex-col justify-between rounded-3xl border border-green-100 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <Icon size={24} />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {reward.category}
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {reward.partner}
                  </p>
                  <h3 className="mt-1 text-lg font-bold">{reward.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {reward.description}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>
                      {loading || userPoints === null ? '—' : currentBalance} / {reward.requiredPoints} pts
                    </span>
                    <span
                      className={
                        isEligible
                          ? 'font-bold text-green-600'
                          : 'text-amber-700'
                      }
                    >
                      {loading || userPoints === null
                        ? 'Loading...'
                        : isEligible
                          ? 'Eligible to Claim'
                          : `${remaining} pts needed`}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(`/marketplace/reward/${reward.id}`)
                      }
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      disabled={!isEligible}
                      onClick={() => handleClaim(reward)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                        isEligible
                          ? 'bg-green-700 text-white hover:bg-green-800'
                          : 'cursor-not-allowed bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isEligible ? 'Claim' : 'Locked'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        {/* LIVE REWARD TRANSACTIONS */}
        <section className="mt-12 pb-12">
          <div className="rounded-3xl border border-green-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <History size={20} />
              </span>
              <div>
                <h2 className="text-xl font-bold">Reward Activity History</h2>
                <p className="text-xs text-slate-500">
                  Live backend ledger from your wallet balance.
                </p>
              </div>
            </div>

            <div className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
              {loading ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  Loading reward transactions...
                </p>
              ) : rewardHistory.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  No reward transactions logged yet.
                </p>
              ) : (
                rewardHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {item.description}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatRelativeDate(item.created_at)}
                      </p>
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
        </section>
      </div>

      {/* CLAIM CONFIRMATION MODAL */}
      {claimedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Sparkles size={32} />
            </div>

            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              Reward Claimed!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You redeemed <strong className="text-slate-900">{claimedReward.title}</strong> from {claimedReward.partner}.
            </p>

            <div className="mt-6 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Your Redemption Voucher Code
              </p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-emerald-900">
                {voucherCode}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Present this code at {claimedReward.partner} checkout.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setClaimedReward(null)}
              className="mt-6 w-full rounded-xl bg-green-700 py-3 font-bold text-white transition hover:bg-green-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default Marketplace
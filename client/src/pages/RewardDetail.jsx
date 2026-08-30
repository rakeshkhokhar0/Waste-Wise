import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  Dumbbell,
  Gift,
  Leaf,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { rewardsCatalog } from './MarketPlace'

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

function RewardDetail({ rewardId, onNavigate }) {
  const [userPoints, setUserPoints] = useState(0)
  const [claimed, setClaimed] = useState(false)
  const [voucherCode, setVoucherCode] = useState('')

  const reward =
    rewardsCatalog.find((r) => String(r.id) === String(rewardId)) ||
    rewardsCatalog[0]
  const Icon = reward.icon

  useEffect(() => {
    const fetchUserPoints = async () => {
      const accessToken = getAccessToken()
      if (!accessToken) return

      try {
        const res = await fetch(`${API_BASE_URL}/rewards/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUserPoints(data.total_points ?? 0)
        }
      } catch (err) {
        console.error('Error loading points:', err)
      }
    }

    fetchUserPoints()
  }, [])

  const handleClaim = () => {
    if (userPoints < reward.requiredPoints) return
    const code = `ECO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    setVoucherCode(code)
    setUserPoints((prev) => Math.max(0, prev - reward.requiredPoints))
    setClaimed(true)
  }

  const isEligible = userPoints >= reward.requiredPoints

  return (
    <main className="min-h-screen bg-[#f5f8f3] text-slate-900">
      <Navbar activePath="marketplace" onNavigate={onNavigate} />

      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-10">
        <button
          type="button"
          onClick={() => onNavigate('/marketplace')}
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-green-800 transition hover:text-green-900"
        >
          <ArrowLeft size={18} />
          Back to Marketplace
        </button>

        <div className="overflow-hidden rounded-3xl border border-green-100 bg-white p-8 shadow-sm sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
                <Icon size={32} />
              </span>
              <div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {reward.category}
                </span>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                  {reward.title}
                </h1>
                <p className="text-sm font-semibold text-green-700">
                  {reward.partner}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-[#fffaf0] p-4 text-right">
              <p className="text-xs font-semibold text-slate-500">
                Required Points
              </p>
              <p className="text-2xl font-bold text-amber-700">
                {reward.requiredPoints} pts
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              About This Offer
            </h3>
            <p className="mt-2 text-base leading-relaxed text-slate-600">
              {reward.description} Redeemable across all participating{' '}
              {reward.partner} locations. Small daily actions make a huge
              impact—thank you for choosing sustainable disposal practices.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <Clock size={20} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Valid Until</p>
                  <p className="text-sm font-semibold">{reward.expiry}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <ShieldCheck size={20} className="text-green-600" />
                <div>
                  <p className="text-xs text-slate-500">Verification</p>
                  <p className="text-sm font-semibold">Instant Voucher</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <Award size={20} className="text-amber-600" />
                <div>
                  <p className="text-xs text-slate-500">Your Balance</p>
                  <p className="text-sm font-semibold">{userPoints} points</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            {claimed ? (
              <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-6 text-center">
                <Sparkles className="mx-auto text-emerald-600" size={28} />
                <h4 className="mt-2 text-lg font-bold text-emerald-900">
                  Voucher Ready!
                </h4>
                <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-emerald-950">
                  {voucherCode}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Show this code to the staff at {reward.partner}.
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={!isEligible}
                onClick={handleClaim}
                className={`w-full rounded-2xl py-4 font-bold transition shadow-md ${
                  isEligible
                    ? 'bg-green-700 text-white hover:bg-green-800 shadow-green-700/20'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400 shadow-none'
                }`}
              >
                {isEligible
                  ? `Redeem for ${reward.requiredPoints} Points`
                  : `Need ${reward.requiredPoints - userPoints} More Points`}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default RewardDetail
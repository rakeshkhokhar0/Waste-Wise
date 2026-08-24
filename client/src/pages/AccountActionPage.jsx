import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Leaf, Lock, Mail } from 'lucide-react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '')

const copy = {
  verify: {
    eyebrow: 'EMAIL VERIFICATION',
    title: 'Confirm your email address',
    description: 'Confirming your address activates your WasteWise account.',
    button: 'Verify email',
    endpoint: '/auth/verify-email',
  },
  forgot: {
    eyebrow: 'PASSWORD RESET',
    title: 'Reset your password',
    description: 'Enter your email or username and we will send a reset link if the account is eligible.',
    button: 'Send reset link',
    endpoint: '/auth/forgot-password',
  },
  reset: {
    eyebrow: 'CHOOSE A NEW PASSWORD',
    title: 'Create a new password',
    description: 'Choose a strong password that you have not used before.',
    button: 'Save new password',
    endpoint: '/auth/reset-password',
  },
}

function AccountActionPage({ mode, onNavigate }) {
  const details = copy[mode]
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const isVerified = mode === 'verify' && feedback.type === 'success'

  const submit = async (event) => {
    event.preventDefault()
    setFeedback({ type: '', message: '' })

    if ((mode === 'verify' || mode === 'reset') && !token) {
      setFeedback({ type: 'error', message: 'This link is missing its security token. Please request a new one.' })
      return
    }

    if (mode === 'reset' && password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' })
      return
    }

    const payload = mode === 'forgot'
      ? { identifier }
      : mode === 'reset'
        ? { reset_token: token, password, confirm_password: confirmPassword }
        : undefined
    const url = mode === 'verify'
      ? `${API_BASE_URL}${details.endpoint}?token=${encodeURIComponent(token)}`
      : `${API_BASE_URL}${details.endpoint}`

    setLoading(true)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.detail ?? 'Unable to complete this request.')
      }
      setFeedback({ type: 'success', message: data?.message ?? 'Your request was completed successfully.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Unable to complete this request.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#edf8ef] via-[#f8fbf7] to-[#e4f2e8] px-6 py-10 sm:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg flex-col justify-center">
        <button type="button" onClick={() => onNavigate('/login')} className="mb-10 inline-flex w-fit items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-900">
          <ArrowLeft size={17} /> Back to sign in
        </button>
        <section className="rounded-3xl border border-green-100 bg-white p-7 shadow-xl shadow-green-950/5 sm:p-10">
          <div className="mb-8 flex items-center gap-3 text-green-700">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100"><Leaf size={24} /></span>
            <span className="text-2xl font-bold tracking-tight">WasteWise</span>
          </div>
          <p className="text-xs font-bold tracking-[0.18em] text-green-600">{details.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{details.title}</h1>
          <p className="mt-3 leading-relaxed text-slate-600">{details.description}</p>

          {feedback.message ? <div className={`mt-6 flex gap-3 rounded-xl border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
            {feedback.type === 'success' ? <CheckCircle2 size={19} className="shrink-0" /> : <KeyRound size={19} className="shrink-0" />}
            <span>{feedback.message}</span>
          </div> : null}

          <form onSubmit={submit} className="mt-7 space-y-5">
            {mode === 'forgot' ? <label className="block text-sm font-medium text-slate-700">Email or username
              <span className="relative mt-2 block"><Mail size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required placeholder="you@example.com" className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" /></span>
            </label> : null}
            {mode === 'reset' ? <><label className="block text-sm font-medium text-slate-700">New password
              <span className="relative mt-2 block"><Lock size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength="8" className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" /></span>
            </label><label className="block text-sm font-medium text-slate-700">Confirm new password
              <span className="relative mt-2 block"><Lock size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength="8" className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" /></span>
            </label></> : null}
            <button type="submit" disabled={loading || isVerified} className={`group flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-semibold transition ${isVerified ? 'border border-green-200 bg-green-100 text-green-700 shadow-none' : 'bg-green-700 text-white shadow-lg shadow-green-200 hover:bg-green-800'} disabled:cursor-not-allowed disabled:opacity-70`}>
              {loading ? 'Please wait...' : isVerified ? 'Email verified' : details.button}<ArrowRight size={18} className={isVerified ? 'text-green-500' : 'transition-transform group-hover:translate-x-1'} />
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default AccountActionPage

import { useState } from 'react'
import { CheckCircle2, Loader2, MailWarning, X } from 'lucide-react'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:8000/api/v1'
).replace(/\/$/, '')

// Simple cooldown so the resend button can't be spammed.
const RESEND_COOLDOWN_SECONDS = 30

// Shown when a login attempt fails because the account's email
// isn't verified yet. Lets the user request a fresh verification
// link (POST /auth/resend-verification-email) without leaving
// the login screen.
//
// Props:
//   identifier - whatever the user typed into the login form
//                (email or username) — reused as the resend target
//   onClose    - () => void, closes the modal

function EmailVerificationModal({ identifier, onClose }) {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const handleResend = async () => {
    if (status === 'sending' || cooldown > 0) return

    setStatus('sending')
    setMessage('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/resend-verification-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier }),
        }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            'Unable to resend the verification email.'
        )
      }

      setStatus('sent')
      setMessage(
        data?.message ||
          'Verification email sent. Check your inbox — the link is only valid for a short time.'
      )

      setCooldown(RESEND_COOLDOWN_SECONDS)

      const timer = setInterval(() => {
        setCooldown((current) => {
          if (current <= 1) {
            clearInterval(timer)
            return 0
          }
          return current - 1
        })
      }, 1000)
    } catch (error) {
      setStatus('error')
      setMessage(
        error.message ||
          'Unable to resend the verification email.'
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-8">

        <div className="flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <MailWarning size={24} />
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-900">
          Verify your email to continue
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Your account hasn't been verified yet. Check your inbox for the
          verification link, or send a new one below.
        </p>

        {message && (
          <div
            className={`mt-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              status === 'sent'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {status === 'sent' && (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            )}
            <span>{message}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleResend}
          disabled={status === 'sending' || cooldown > 0}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'sending' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Sending...
            </>
          ) : cooldown > 0 ? (
            `Resend available in ${cooldown}s`
          ) : (
            'Resend verification link'
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Close
        </button>

      </div>
    </div>
  )
}

export default EmailVerificationModal
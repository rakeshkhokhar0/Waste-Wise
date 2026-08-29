import { useState } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  Mail,
  User,
} from 'lucide-react'
import EmailVerificationModal from '../components/Emailverificationmodal'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
).replace(/\/$/, '')

const initialLoginForm = {
  identifier: '',
  password: '',
}

const initialSignupForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: false,
}

function AuthPage({
  mode,
  onSwitchToLogin,
  onSwitchToSignup,
  onForgotPassword,
  onAuthenticated,
}) {
  const isLogin = mode === 'login'

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [feedback, setFeedback] = useState({
    type: '',
    message: '',
  })

  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [signupForm, setSignupForm] = useState(initialSignupForm)

  const [loginMethod, setLoginMethod] = useState('email')

  // NEW: email-verification gate. AuthServices.login() rejects
  // unverified users with ValueError("Please verify your email
  // before logging in.") before any token is issued, so this has
  // to be caught here at the failed-login step, not after.
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyIdentifier, setVerifyIdentifier] = useState('')

  const heading = isLogin
    ? 'Sign in to WasteWise'
    : 'Create your account'

  const subheading = isLogin
    ? 'Continue your journey toward a greener future.'
    : 'Join WasteWise and start tracking your sustainable impact.'

  const submitLabel = isLogin
    ? 'Sign In'
    : 'Create Account'

  const switchCopy = isLogin
    ? 'New to WasteWise?'
    : 'Already have an account?'

  const switchAction = isLogin
    ? onSwitchToSignup
    : onSwitchToLogin

  const endpoint = isLogin
    ? '/auth/login'
    : '/auth/register'

  // ==========================================
  // UPDATE LOGIN FORM
  // ==========================================

  const updateLoginForm = (field, value) => {
    setLoginForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // ==========================================
  // UPDATE SIGNUP FORM
  // ==========================================

  const updateSignupForm = (field, value) => {
    setSignupForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (loading) return

    setLoading(true)

    setFeedback({
      type: '',
      message: '',
    })

    // ==========================================
    // SIGNUP VALIDATION
    // ==========================================

    if (
      !isLogin &&
      signupForm.password !== signupForm.confirmPassword
    ) {
      setLoading(false)

      setFeedback({
        type: 'error',
        message: 'Passwords do not match.',
      })

      return
    }

    if (!isLogin && !signupForm.agreeTerms) {
      setLoading(false)

      setFeedback({
        type: 'error',
        message: 'Please accept the terms to continue.',
      })

      return
    }

    if (!isLogin && signupForm.password.length < 6) {
      setLoading(false)

      setFeedback({
        type: 'error',
        message:
          'Password must be at least 6 characters long.',
      })

      return
    }

    // ==========================================
    // REQUEST PAYLOAD
    // ==========================================

    const payload = isLogin
      ? {
          identifier: loginForm.identifier.trim(),
          password: loginForm.password,
        }
      : {
          username: signupForm.username.trim(),
          email: signupForm.email.trim(),
          password: signupForm.password,
          confirm_password: signupForm.confirmPassword,
        }

    try {
      // ==========================================
      // API REQUEST
      // ==========================================

      const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },

          body: JSON.stringify(payload),
        }
      )

      const data = await response
        .json()
        .catch(() => null)

      // ==========================================
      // API ERROR
      // ==========================================

      if (!response.ok) {

        // NEW: unverified-email is a distinct case, not a generic
        // error — show the resend modal instead of an error banner.
        // Backend text is fixed: AuthServices.login() raises
        // ValueError("Please verify your email before logging in.")
        // which the global ValueError handler turns into a 400 with
        // that exact string as `detail`.
        if (
          isLogin &&
          typeof data?.detail === 'string' &&
          data.detail.toLowerCase().includes('verify your email')
        ) {
          setVerifyIdentifier(loginForm.identifier.trim())
          setShowVerifyModal(true)
          setLoading(false)
          return
        }

        let errorMessage = `Unable to ${
          isLogin ? 'sign in' : 'sign up'
        } right now.`

        if (typeof data?.detail === 'string') {
          errorMessage = data.detail
        } else if (Array.isArray(data?.detail)) {
          errorMessage = data.detail
            .map((error) => {
              if (typeof error === 'string') {
                return error
              }

              return (
                error?.msg ??
                'Validation error.'
              )
            })
            .join(', ')
        } else if (
          typeof data?.message === 'string'
        ) {
          errorMessage = data.message
        }

        throw new Error(errorMessage)
      }

      // ==========================================
      // SUCCESSFUL LOGIN
      // ==========================================

      if (isLogin) {
        const accessToken =
          data?.access_token ??
          data?.accessToken ??
          data?.token

        const refreshToken =
          data?.refresh_token ??
          data?.refreshToken

        // ------------------------------------------
        // Make sure access token exists
        // ------------------------------------------

        if (!accessToken) {
          throw new Error(
            'Login successful, but no access token was returned by the server.'
          )
        }

        // ------------------------------------------
        // Save access token
        // ------------------------------------------

        window.localStorage.setItem(
          'wastewise_access_token',
          accessToken
        )

        // ------------------------------------------
        // Save refresh token if available
        // ------------------------------------------

        if (refreshToken) {
          window.localStorage.setItem(
            'wastewise_refresh_token',
            refreshToken
          )
        }

        // ------------------------------------------
        // GET USERNAME
        //
        // The login response itself has no username field
        // (TokenResponse only has tokens). Dashboard.jsx fetches
        // GET /users/me on mount and fills this in properly — this
        // fallback chain just covers older/alternate response
        // shapes if the backend ever changes.
        // ------------------------------------------

        const username =
          data?.username ??
          data?.user?.username ??
          data?.user?.name

        // ------------------------------------------
        // Save username
        // ------------------------------------------

        if (username) {
          window.localStorage.setItem(
            'wastewise_username',
            username
          )
        }

        // ------------------------------------------
        // Login success message
        // ------------------------------------------

        setFeedback({
          type: 'success',
          message:
            data?.message ??
            'Signed in successfully.',
        })

        // ------------------------------------------
        // Tell parent application login succeeded
        // ------------------------------------------

        onAuthenticated?.()

        return
      }

      // ==========================================
      // SUCCESSFUL SIGNUP
      // ==========================================

      setFeedback({
        type: 'success',
        message:
          data?.message ??
          'Account created successfully.',
      })

      // Reset signup form
      setSignupForm(initialSignupForm)

      // Go to login after 2 seconds
      window.setTimeout(() => {
        onSwitchToLogin?.()
      }, 2000)
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Authentication is not connected yet.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[#f7faf7] flex">

        {/* ==========================================
            LEFT SIDE - BRANDING
        ========================================== */}

        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 p-12 flex-col justify-between text-white">

          {/* Background Decorations */}

          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10" />

          <div className="absolute bottom-[-100px] left-[-80px] w-96 h-96 rounded-full bg-white/10" />

          {/* Logo */}

          <div className="relative flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Leaf size={25} />
            </div>

            <span className="text-2xl font-bold tracking-tight">
              WasteWise
            </span>

          </div>

          {/* Main Content */}

          <div className="relative max-w-lg">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm">
              Small actions. Real impact.
            </div>

            <h1 className="text-5xl font-bold leading-tight">
              Make sustainability a part of everyday life.
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-green-50">
              Turn everyday sustainable actions into measurable
              impact, Green Points, rewards, and a better future
              for our planet.
            </p>

            {/* Steps */}

            <div className="mt-10 flex gap-8">

              <div>
                <p className="text-2xl font-bold">
                  01
                </p>

                <p className="mt-1 text-sm text-green-100">
                  Take Action
                </p>
              </div>

              <div>
                <p className="text-2xl font-bold">
                  02
                </p>

                <p className="mt-1 text-sm text-green-100">
                  Earn Rewards
                </p>
              </div>

              <div>
                <p className="text-2xl font-bold">
                  03
                </p>

                <p className="mt-1 text-sm text-green-100">
                  Create Impact
                </p>
              </div>

            </div>
          </div>

          <p className="relative text-sm text-green-100">
            AI-powered sustainability for a cleaner tomorrow.
          </p>

        </div>

        {/* ==========================================
            RIGHT SIDE - AUTH FORM
        ========================================== */}

        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 sm:px-12">

          <div className="w-full max-w-md">

            {/* Mobile Logo */}

            <div className="lg:hidden flex items-center gap-2 mb-10 text-green-700">

              <Leaf size={28} />

              <span className="text-2xl font-bold">
                WasteWise
              </span>

            </div>

            {/* Heading */}

            <div className="mb-8">

              <p className="text-sm font-medium text-green-600 mb-2">
                {isLogin
                  ? 'WELCOME BACK'
                  : 'WELCOME TO WASTEWISE'}
              </p>

              <h2 className="text-3xl font-bold text-gray-900">
                {heading}
              </h2>

              <p className="mt-2 text-gray-500">
                {subheading}
              </p>

            </div>

            {/* Feedback */}

            {feedback.message ? (
              <div
                className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                  feedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
                role="alert"
              >
                {feedback.message}
              </div>
            ) : null}

            {/* ==========================================
                FORM
            ========================================== */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* ========================================
                  USERNAME - SIGNUP ONLY
              ======================================== */}

              {!isLogin ? (
                <div>

                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Username
                  </label>

                  <div className="relative">

                    <User
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="username"
                      type="text"
                      placeholder="Choose a username"
                      value={signupForm.username}
                      onChange={(event) =>
                        updateSignupForm(
                          'username',
                          event.target.value
                        )
                      }
                      required
                      autoComplete="username"
                      className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                    />

                  </div>

                </div>
              ) : null}

              {/* ========================================
                  EMAIL / USERNAME LOGIN
              ======================================== */}

              <div>

                {isLogin ? (
                  <div className="mb-3 grid grid-cols-2 rounded-xl bg-green-50 p-1 text-sm font-semibold">

                    <button
                      type="button"
                      onClick={() =>
                        setLoginMethod('email')
                      }
                      className={`rounded-lg py-2 transition ${
                        loginMethod === 'email'
                          ? 'bg-white text-green-800 shadow-sm'
                          : 'text-green-700/70'
                      }`}
                    >
                      Email
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setLoginMethod('username')
                      }
                      className={`rounded-lg py-2 transition ${
                        loginMethod === 'username'
                          ? 'bg-white text-green-800 shadow-sm'
                          : 'text-green-700/70'
                      }`}
                    >
                      Username
                    </button>

                  </div>
                ) : null}

                <label
                  htmlFor="identifier"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {isLogin
                    ? loginMethod === 'email'
                      ? 'Email address'
                      : 'Username'
                    : 'Email address'}
                </label>

                <div className="relative">

                  {isLogin &&
                  loginMethod === 'username' ? (
                    <User
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  ) : (
                    <Mail
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  )}

                  <input
                    id="identifier"
                    type={
                      isLogin &&
                      loginMethod === 'username'
                        ? 'text'
                        : 'email'
                    }
                    placeholder={
                      isLogin &&
                      loginMethod === 'username'
                        ? 'Enter your username'
                        : 'you@example.com'
                    }
                    value={
                      isLogin
                        ? loginForm.identifier
                        : signupForm.email
                    }
                    onChange={(event) =>
                      isLogin
                        ? updateLoginForm(
                            'identifier',
                            event.target.value
                          )
                        : updateSignupForm(
                            'email',
                            event.target.value
                          )
                    }
                    required
                    autoComplete={
                      isLogin
                        ? loginMethod === 'username'
                          ? 'username'
                          : 'email'
                        : 'email'
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />

                </div>

              </div>

              {/* ========================================
                  PASSWORD
              ======================================== */}

              <div>

                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>

                <div className="relative">

                  <Lock
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    placeholder="Enter your password"
                    value={
                      isLogin
                        ? loginForm.password
                        : signupForm.password
                    }
                    onChange={(event) =>
                      isLogin
                        ? updateLoginForm(
                            'password',
                            event.target.value
                          )
                        : updateSignupForm(
                            'password',
                            event.target.value
                          )
                    }
                    required
                    autoComplete={
                      isLogin
                        ? 'current-password'
                        : 'new-password'
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-12 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>

                </div>

              </div>

              {/* ========================================
                  CONFIRM PASSWORD - SIGNUP ONLY
              ======================================== */}

              {!isLogin ? (
                <div>

                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirm password
                  </label>

                  <div className="relative">

                    <Lock
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      id="confirmPassword"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Confirm your password"
                      value={
                        signupForm.confirmPassword
                      }
                      onChange={(event) =>
                        updateSignupForm(
                          'confirmPassword',
                          event.target.value
                        )
                      }
                      required
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-12 outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                    />

                  </div>

                </div>
              ) : null}

                         {/* TERMS / REMEMBER ME */}

              {isLogin ? (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loginForm.remember}
                    onChange={(event) =>
                      updateLoginForm(
                        'remember',
                        event.target.checked
                      )
                    }
                    className="h-4 w-4 accent-green-600"
                  />
                  Remember me for 30 days
                </label>
              ) : (
                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signupForm.agreeTerms}
                    onChange={(event) =>
                      updateSignupForm(
                        'agreeTerms',
                        event.target.checked
                      )
                    }
                    className="mt-0.5 h-4 w-4 accent-green-600"
                  />

                  <span>
                    I agree to the terms and privacy policy.
                  </span>
                </label>
              )}

              {/* FORGOT PASSWORD */}

              {isLogin ? (
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-medium text-green-600 hover:text-green-700"
                >
                  Forgot password?
                </button>
              ) : null}

              {/* ========================================
                  SUBMIT BUTTON
              ======================================== */}

              <button
                type="submit"
                disabled={loading}
                className="group w-full rounded-xl bg-green-600 py-3.5 font-semibold text-white shadow-lg shadow-green-200 transition hover:bg-green-700 hover:shadow-green-300 disabled:cursor-not-allowed disabled:opacity-70"
              >

                <span className="flex items-center justify-center gap-2">

                  {loading
                    ? 'Please wait...'
                    : submitLabel}

                  <ArrowRight
                    size={19}
                    className="transition-transform group-hover:translate-x-1"
                  />

                </span>

              </button>

            </form>

            {/* ==========================================
                SWITCH LOGIN / SIGNUP
            ========================================== */}

            <p className="mt-8 text-center text-sm text-gray-600">

              {switchCopy}{' '}

              <button
                type="button"
                onClick={switchAction}
                className="font-semibold text-green-600 hover:text-green-700"
              >
                {isLogin
                  ? 'Create an account'
                  : 'Sign in'}
              </button>

            </p>

          </div>
        </div>
      </div>

      {showVerifyModal && (
        <EmailVerificationModal
          identifier={verifyIdentifier}
          onClose={() => setShowVerifyModal(false)}
        />
      )}
    </>
  )
}

export default AuthPage
import { useEffect, useState } from 'react'
import Login from './pages/login'
import Signup from './pages/Signup'
import AccountActionPage from './pages/AccountActionPage'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/MarketPlace'
import RewardDetail from './pages/RewardDetail'
import MyImpact from './pages/MyImpact'
import MyActivity from './pages/MyActivity'
import WasteClassification from './pages/WasteClassification'
import WasteJourney from './pages/WasteJourney'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
).replace(/\/$/, '')

function getAccessToken() {
  return (
    window.localStorage.getItem('wastewise_access_token') ||
    window.sessionStorage.getItem('wastewise_access_token')
  )
}

function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (nextPath) => {
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  const logout = async () => {
    const refreshToken =
      window.localStorage.getItem('wastewise_refresh_token') ??
      window.sessionStorage.getItem('wastewise_refresh_token')

    try {
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
      }
    } finally {
      for (const storage of [window.localStorage, window.sessionStorage]) {
        storage.removeItem('wastewise_access_token')
        storage.removeItem('wastewise_refresh_token')
        storage.removeItem('wastewise_username')
      }

      sessionStorage.removeItem('wastewise_uploaded_image')
      sessionStorage.removeItem('wastewise_analysis')

      navigate('/login')
    }
  }

  // ---------------------------------------------------------
  // 1. PUBLIC LANDING / HOME PAGE
  // ---------------------------------------------------------
  if (path === '/') {
    return <Home onNavigate={navigate} />
  }

  // ---------------------------------------------------------
  // 2. AUTHENTICATION & ACTION PAGES
  // ---------------------------------------------------------
  if (path === '/auth/verify-email') {
    return <AccountActionPage mode="verify" onNavigate={navigate} />
  }

  if (path === '/auth/forgot-password') {
    return <AccountActionPage mode="forgot" onNavigate={navigate} />
  }

  if (path === '/auth/reset-password') {
    return <AccountActionPage mode="reset" onNavigate={navigate} />
  }

  if (path === '/signup') {
    return <Signup onSwitchToLogin={() => navigate('/login')} />
  }

  if (path === '/login') {
    return (
      <Login
        onSwitchToSignup={() => navigate('/signup')}
        onForgotPassword={() => navigate('/auth/forgot-password')}
        onAuthenticated={() => navigate('/dashboard')}
      />
    )
  }

  // ---------------------------------------------------------
  // 3. AUTHENTICATED INTERNAL PAGES
  // ---------------------------------------------------------
  const token = getAccessToken()

  if (!token) {
    return (
      <Login
        onSwitchToSignup={() => navigate('/signup')}
        onForgotPassword={() => navigate('/auth/forgot-password')}
        onAuthenticated={() => navigate('/dashboard')}
      />
    )
  }

  if (path === '/dashboard') {
    return <Dashboard onNavigate={navigate} onLogout={logout} />
  }

  if (path === '/my-activity') {
    return <MyActivity onNavigate={navigate} />
  }

  if (path === '/my-impact') {
    return <MyImpact onNavigate={navigate} />
  }

  if (path === '/marketplace') {
    return <Marketplace onNavigate={navigate} />
  }

  if (path.startsWith('/marketplace/reward/')) {
    const rewardId = path.split('/').pop()
    return <RewardDetail rewardId={rewardId} onNavigate={navigate} />
  }

  if (path === '/waste-classification') {
    return <WasteClassification onNavigate={navigate} />
  }

  if (path === '/waste-journey') {
    return <WasteJourney onNavigate={navigate} />
  }

  // Fallback to Dashboard if authenticated
  return <Dashboard onNavigate={navigate} onLogout={logout} />
}

export default App
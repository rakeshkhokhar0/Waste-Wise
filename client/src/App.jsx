import { useEffect, useState } from 'react'
import Login from './pages/login'
import Signup from './pages/Signup'
import AccountActionPage from './pages/AccountActionPage'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
).replace(/\/$/, '')

function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        })
      }
    } finally {
      for (const storage of [
        window.localStorage,
        window.sessionStorage,
      ]) {
        storage.removeItem('wastewise_access_token')
        storage.removeItem('wastewise_refresh_token')
      }

      navigate('/login')
    }
  }

  if (path === '/auth/verify-email') {
    return (
      <AccountActionPage
        mode="verify"
        onNavigate={navigate}
      />
    )
  }

  if (path === '/auth/forgot-password') {
    return (
      <AccountActionPage
        mode="forgot"
        onNavigate={navigate}
      />
    )
  }

  if (path === '/auth/reset-password') {
    return (
      <AccountActionPage
        mode="reset"
        onNavigate={navigate}
      />
    )
  }

  if (path === '/dashboard') {
    return (
      <Dashboard
        onNavigate={navigate}
        onLogout={logout}
      />
    )
  }

  if (path === '/') {
    return <Home onNavigate={navigate} />
  }

  if (path === '/signup') {
    return (
      <Signup
        onSwitchToLogin={() => navigate('/login')}
      />
    )
  }

  return (
    <Login
      onSwitchToSignup={() => navigate('/signup')}
      onForgotPassword={() => navigate('/auth/forgot-password')}
      onAuthenticated={() => navigate('/dashboard')}
    />
  )
}

export default App;
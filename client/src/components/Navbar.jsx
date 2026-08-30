import { useEffect, useState } from 'react'
import { Bell, Leaf, LogOut } from 'lucide-react'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:8000/api/v1'
).replace(/\/$/, '')

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Home', path: '/dashboard' },
  { key: 'my-activity', label: 'My activity', path: '/my-activity' },
  { key: 'marketplace', label: 'MarketPlace', path: '/marketplace' },
  { key: 'my-impact', label: 'My impact', path: '/my-impact' },
]

function getAccessToken() {
  return (
    window.localStorage.getItem('wastewise_access_token') ||
    window.sessionStorage.getItem('wastewise_access_token')
  )
}

function getRefreshToken() {
  return (
    window.localStorage.getItem('wastewise_refresh_token') ||
    window.sessionStorage.getItem('wastewise_refresh_token')
  )
}

// Fully self-contained navbar for every authenticated page.
//
// Drop it into any page with just `onNavigate` — the prop every
// page already receives from App.jsx — and `activePath`. No
// App.jsx changes, no extra props to wire through routing. It
// fetches its own username (GET /users/me) and owns its entire
// logout flow, so no page needs an onLogout prop passed down to
// use it.
//
// Props:
//   onNavigate - (path) => void — same prop every page already gets
//   activePath - which NAV_ITEMS key to highlight, e.g.
//                "dashboard", "my-activity", "my-impact",
//                "marketplace". Omit to highlight nothing.

function Navbar({ onNavigate, activePath }) {
  const [username, setUsername] = useState(
    () => window.localStorage.getItem('wastewise_username') || 'User'
  )

  useEffect(() => {
    const accessToken = getAccessToken()

    if (!accessToken) return

    fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.user_name) {
          setUsername(data.user_name)
          window.localStorage.setItem(
            'wastewise_username',
            data.user_name
          )
        }
      })
      .catch(() => {
        // Keep whatever's cached — not worth surfacing an error
        // just for the navbar's own avatar label.
      })
  }, [])

  const usernameInitial = username.charAt(0).toUpperCase()

  // ---------------------------------------------------------
  // LOGOUT — owned entirely by the navbar. Revokes the refresh
  // token server-side, then clears every WasteWise storage key
  // (tokens, cached username, and any in-flight upload/analysis
  // state) before sending the user to /login.
  // ---------------------------------------------------------

  const handleLogout = async () => {
    const refreshToken = getRefreshToken()

    try {
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
      }
    } finally {
      for (const storage of [
        window.localStorage,
        window.sessionStorage,
      ]) {
        storage.removeItem('wastewise_access_token')
        storage.removeItem('wastewise_refresh_token')
        storage.removeItem('wastewise_username')
      }

      sessionStorage.removeItem('wastewise_uploaded_image')
      sessionStorage.removeItem('wastewise_analysis')

      onNavigate('/login')
    }
  }

  return (
    <header className="border-b border-green-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4 lg:px-10">

        <button
          type="button"
          onClick={() => onNavigate('/dashboard')}
          className="flex items-center gap-2 text-xl font-bold text-green-800"
        >
          <Leaf size={23} />
          WasteWise
        </button>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-500 md:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={
                item.key === activePath ? 'text-green-700' : undefined
              }
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">

          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <Bell size={20} />
          </button>

          <div className="flex items-center gap-2 rounded-full bg-green-50 py-1.5 pl-1.5 pr-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white">
              {usernameInitial}
            </span>
            <span className="hidden text-sm font-semibold sm:block">
              {username}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-50"
          >
            <LogOut size={17} />
            <span className="hidden sm:inline">Logout</span>
          </button>

        </div>

      </div>
    </header>
  )
}

export default Navbar
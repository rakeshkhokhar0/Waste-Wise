import { useEffect, useState } from 'react'
import {
  Bell,
  ChevronDown,
  History,
  Home,
  Leaf,
  LogOut,
  Menu,
  ShoppingBag,
  TrendingUp,
  X,
} from 'lucide-react'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:8000/api/v1'
).replace(/\/$/, '')

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Home',
    path: '/dashboard',
    icon: Home,
  },
  {
    key: 'my-activity',
    label: 'My Activity',
    path: '/my-activity',
    icon: History,
  },
  {
    key: 'marketplace',
    label: 'Marketplace',
    path: '/marketplace',
    icon: ShoppingBag,
  },
  {
    key: 'my-impact',
    label: 'My Impact',
    path: '/my-impact',
    icon: TrendingUp,
  },
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

function Navbar({ onNavigate, activePath }) {
  const [username, setUsername] = useState(
    () => window.localStorage.getItem('wastewise_username') || 'User'
  )
  const [userEmail, setUserEmail] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // Fetch current user details
  useEffect(() => {
    const accessToken = getAccessToken()
    if (!accessToken) return

    fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const resolvedName = data.user_name || data.username || 'User'
          setUsername(resolvedName)
          setUserEmail(data.email || '')
          window.localStorage.setItem('wastewise_username', resolvedName)
        }
      })
      .catch((err) => console.error('Navbar profile fetch error:', err))
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('#user-menu-button') && !e.target.closest('#user-menu-dropdown')) {
        setProfileDropdownOpen(false)
      }
      if (!e.target.closest('#notifications-button') && !e.target.closest('#notifications-dropdown')) {
        setNotificationsOpen(false)
      }
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  const usernameInitial = username.charAt(0).toUpperCase()

  // Full-featured logout workflow
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
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      // Clear token and user storage
      for (const storage of [window.localStorage, window.sessionStorage]) {
        storage.removeItem('wastewise_access_token')
        storage.removeItem('wastewise_refresh_token')
        storage.removeItem('wastewise_username')
      }

      sessionStorage.removeItem('wastewise_uploaded_image')
      sessionStorage.removeItem('wastewise_analysis')

      onNavigate('/login')
    }
  }

  const handleNavClick = (path) => {
    setMobileMenuOpen(false)
    onNavigate(path)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-green-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-10">
        
        {/* BRAND / LOGO */}
        <button
          type="button"
          onClick={() => handleNavClick('/dashboard')}
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-green-900 transition hover:opacity-90"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-700 text-white shadow-sm shadow-green-700/20">
            <Leaf size={20} />
          </span>
          <span>WasteWise</span>
        </button>

        {/* DESKTOP NAV LINKS */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activePath
            const Icon = item.icon

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavClick(item.path)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-green-50 text-green-800 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-green-700'
                }`}
              >
                <Icon
                  size={17}
                  className={isActive ? 'text-green-700' : 'text-slate-400'}
                />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* RIGHT SIDE CONTROLS (Notifications & User Profile) */}
        <div className="flex items-center gap-3">
          
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              id="notifications-button"
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </button>

            {notificationsOpen && (
              <div
                id="notifications-dropdown"
                className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-900/10"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800">Notifications</h3>
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                    1 New
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl bg-green-50/60 p-3 text-xs text-slate-600">
                    <p className="font-semibold text-green-900">Points Awarded!</p>
                    <p className="mt-0.5 text-slate-500">
                      You earned bonus Green Points on your latest waste classification.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              id="user-menu-button"
              type="button"
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-full border border-green-100 bg-green-50/70 py-1 pl-1.5 pr-3 transition hover:bg-green-100/70"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-green-800 to-emerald-600 text-sm font-bold text-white shadow-xs">
                {usernameInitial}
              </span>
              <span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-800 sm:inline-block">
                {username}
              </span>
              <ChevronDown size={15} className="text-slate-400" />
            </button>

            {profileDropdownOpen && (
              <div
                id="user-menu-dropdown"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-xl shadow-slate-900/10"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">{username}</p>
                  {userEmail && (
                    <p className="truncate text-xs text-slate-500">{userEmail}</p>
                  )}
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      handleNavClick('/my-impact')
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-green-800"
                  >
                    <TrendingUp size={16} className="text-slate-400" />
                    Impact Score
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      handleNavClick('/marketplace')
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-green-800"
                  >
                    <ShoppingBag size={16} className="text-slate-400" />
                    My Rewards
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 text-slate-600 transition hover:bg-slate-50 md:hidden"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </div>

      {/* MOBILE COLLAPSIBLE DRAWER */}
      {mobileMenuOpen && (
        <div className="border-t border-green-100 bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.key === activePath
              const Icon = item.icon

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                    isActive
                      ? 'bg-green-50 text-green-800'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? 'text-green-700' : 'text-slate-400'}
                  />
                  {item.label}
                </button>
              )
            })}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut size={18} />
              Logout
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Navbar
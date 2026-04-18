import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/leagues">
          <img
            src="https://latvianpadeltour.com/images/service/latvian_padel_tour_logo_apdruka_png.png"
            alt="LPT Padel"
            className="h-8 w-auto object-contain"
          />
        </Link>
        {user && (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-gray-600 hidden sm:block">
              {profile?.name} {profile?.surname}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

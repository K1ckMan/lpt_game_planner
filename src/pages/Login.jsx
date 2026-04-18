import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Footer from '../components/Footer'

const googleProvider = new GoogleAuthProvider()
const facebookProvider = new FacebookAuthProvider()

export default function Login() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user && profile?.profile_complete) return <Navigate to="/leagues" replace />
  if (user && !profile?.profile_complete) return <Navigate to="/profile-setup" replace />

  async function handleSignIn(provider) {
    setError('')
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, provider)
      const { data } = await supabase
        .from('users')
        .select('profile_complete')
        .eq('id', result.user.uid)
        .single()
      navigate(data?.profile_complete ? '/leagues' : '/profile-setup')
    } catch (e) {
      setError(e.code === 'auth/popup-closed-by-user' ? '' : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-lg p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="https://latvianpadeltour.com/images/service/latvian_padel_tour_logo_apdruka_png.png"
            alt="LPT Padel"
            className="h-16 w-auto object-contain mx-auto"
          />
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleSignIn(googleProvider)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          <button
            onClick={() => handleSignIn(facebookProvider)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-blue-600 rounded hover:bg-blue-700 text-sm font-medium text-white disabled:opacity-50"
          >
            <FacebookIcon />
            Sign in with Facebook
          </button>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

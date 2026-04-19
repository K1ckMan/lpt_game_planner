import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ProfileSetup() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', surname: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user) return <Navigate to="/login" replace />
  if (profile?.profile_complete) return <Navigate to="/" replace />

  function set(field) {
    return (e) => setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.surname.trim() || !form.phone.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await supabase.from('users').upsert({
        id: user.uid,
        name: form.name.trim(),
        surname: form.surname.trim(),
        phone: form.phone.trim(),
        profile_complete: true,
      })
      if (err) throw err
      await refreshProfile()
      navigate('/')
    } catch {
      setError('Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Profile Setup</h1>
        <p className="text-sm text-gray-500 mb-6">Fill in your details to continue</p>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'First Name', field: 'name', placeholder: 'John' },
            { label: 'Last Name', field: 'surname', placeholder: 'Smith' },
            { label: 'Phone Number', field: 'phone', placeholder: '+371 20 000 000', type: 'tel' },
          ].map(({ label, field, placeholder, type = 'text' }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={form[field]}
                onChange={set(field)}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

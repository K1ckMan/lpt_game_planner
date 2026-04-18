import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!user) return
    loadNotifications()

    const channel = supabase
      .channel(`notifs-${user.uid}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.uid}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.uid)
      .eq('read', false)
      .order('created_at', { ascending: false })
    setNotifications(data || [])
  }

  async function handleConfirm(notif) {
    const { data: match } = await supabase
      .from('matches')
      .select('confirmed_by, required_players')
      .eq('id', notif.match_id)
      .single()

    if (!match) return

    const confirmedBy = [...(match.confirmed_by || []), user.uid]
    const allConfirmed = (match.required_players || []).every((uid) =>
      confirmedBy.includes(uid)
    )

    await supabase
      .from('matches')
      .update({ confirmed_by: confirmedBy, status: allConfirmed ? 'confirmed' : 'pending' })
      .eq('id', notif.match_id)

    await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
  }

  async function handleDecline(notif) {
    await supabase.from('matches').update({ status: 'cancelled' }).eq('id', notif.match_id)
    await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-500 hover:text-gray-800"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
            Уведомления
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Нет новых уведомлений</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                  <p className="text-sm text-gray-700 mb-2">{n.message}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirm(n)}
                      className="flex-1 text-xs py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    >
                      Подтвердить
                    </button>
                    <button
                      onClick={() => handleDecline(n)}
                      className="flex-1 text-xs py-1.5 border border-gray-200 text-gray-600 rounded hover:bg-gray-50"
                    >
                      Отклонить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

const LEAGUES = [
  { id: 'gold', label: 'Золотая лига', sub: 'Gold', color: 'text-amber-600', border: 'border-amber-200 hover:border-amber-400' },
  { id: 'silver', label: 'Серебряная лига', sub: 'Silver', color: 'text-slate-600', border: 'border-slate-200 hover:border-slate-400' },
  { id: 'bronze', label: 'Бронзовая лига', sub: 'Bronze', color: 'text-orange-600', border: 'border-orange-200 hover:border-orange-400' },
]

export default function LeagueSelect() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Выберите лигу</h1>
        <p className="text-sm text-gray-500 mb-6">Выберите ваш уровень игры</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {LEAGUES.map((l) => (
            <button
              key={l.id}
              onClick={() => navigate(`/leagues/${l.id}`)}
              className={`bg-white border-2 ${l.border} rounded-lg p-6 text-left transition-colors`}
            >
              <p className={`text-lg font-bold ${l.color}`}>{l.sub}</p>
              <p className="text-sm text-gray-600 mt-0.5">{l.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

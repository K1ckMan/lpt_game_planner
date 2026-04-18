import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const LEAGUES = [
  { id: 'gold', label: 'Gold League', sub: 'Gold', desc: 'Top Division', color: 'text-amber-600', border: 'border-amber-200 hover:border-amber-400' },
  { id: 'silver', label: 'Silver League', sub: 'Silver', desc: 'Mid Division', color: 'text-slate-600', border: 'border-slate-200 hover:border-slate-400' },
  { id: 'bronze', label: 'Bronze League', sub: 'Bronze', desc: 'Entry Division', color: 'text-orange-600', border: 'border-orange-200 hover:border-orange-400' },
]

export default function LeagueSelect() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="max-w-2xl w-full mx-auto px-4 py-10 grow">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Select League</h1>
        <p className="text-sm text-gray-500 mb-6">Choose your skill level</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {LEAGUES.map((l) => (
            <button
              key={l.id}
              onClick={() => navigate(`/leagues/${l.id}`)}
              className={`bg-white border-2 ${l.border} rounded-lg p-6 text-left transition-colors`}
            >
              <p className={`text-lg font-bold ${l.color}`}>{l.sub}</p>
              <p className="text-sm text-gray-600 mt-0.5">{l.label}</p>
              <p className="text-xs text-gray-400 mt-1">{l.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}

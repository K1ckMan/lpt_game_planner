import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

const LEAGUE_LABELS = {
  gold: 'Gold League',
  silver: 'Silver League',
  bronze: 'Bronze League',
}

export default function DivisionSelect() {
  const { league } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate('/leagues')}
          className="text-sm text-gray-400 hover:text-gray-600 mb-4 block"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">{LEAGUE_LABELS[league]}</h1>
        <p className="text-sm text-gray-500 mb-6">Select a division</p>

        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => navigate(`/leagues/${league}/divisions/${n}`)}
              className="bg-white border border-gray-200 rounded-lg py-5 text-center hover:border-emerald-400 transition-colors"
            >
              <span className="block text-2xl font-bold text-gray-300">{n}</span>
              <span className="block text-xs text-gray-500 mt-1">Division</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

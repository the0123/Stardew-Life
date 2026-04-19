import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStreaks } from '../api/tasks'

const CATEGORIES = [
  { key: 'health',   label: 'Health',   emoji: '💪', bg: 'bg-green-600' },
  { key: 'work',     label: 'Work',     emoji: '💼', bg: 'bg-yellow-600' },
  { key: 'learning', label: 'Learning', emoji: '📚', bg: 'bg-blue-600' },
  { key: 'social',   label: 'Social',   emoji: '🤝', bg: 'bg-pink-600' },
]

function flame(n: number) {
  if (n >= 7) return '🔥🔥🔥'
  if (n >= 3) return '🔥🔥'
  if (n >= 1) return '🔥'
  return '❄️'
}

export default function Streaks() {
  const navigate = useNavigate()
  const [streaks, setStreaks] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStreaks()
      .then(r => setStreaks(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-farm-dark text-white">
      <header className="flex items-center gap-3 px-4 py-3 bg-green-900 border-b border-farm-green">
        <button onClick={() => navigate('/')} className="text-farm-gold hover:text-yellow-300 transition-colors">
          ← Back
        </button>
        <h1 className="text-farm-gold font-bold">🔥 Streaks</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <p className="text-green-400 text-center py-12">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {CATEGORIES.map(cat => {
              const count = streaks?.[cat.key] ?? 0
              return (
                <div key={cat.key} className={`${cat.bg} rounded-2xl p-5 flex flex-col items-center gap-2`}>
                  <span className="text-3xl">{cat.emoji}</span>
                  <p className="text-white font-bold">{cat.label}</p>
                  <p className="text-white text-4xl font-black">{count}</p>
                  <p className="text-white/80 text-xs">day{count !== 1 ? 's' : ''} in a row</p>
                  <span className="text-2xl">{flame(count)}</span>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-green-600 text-xs text-center mt-6">
          A streak counts consecutive days with at least one logged task in that category.
        </p>
      </div>
    </div>
  )
}

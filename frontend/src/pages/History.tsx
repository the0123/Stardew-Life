import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHistory } from '../api/tasks'

interface TaskEntry {
  id: string
  category: string
  title: string
  effort: string
  xp_earned: number
  logged_at: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  health: '💪',
  work: '💼',
  learning: '📚',
  social: '🤝',
}

const EFFORT_COLOR: Record<string, string> = {
  quick: 'text-green-400',
  medium: 'text-yellow-400',
  deep: 'text-orange-400',
}

export default function History() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<TaskEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory(50, 0)
      .then(r => setTasks(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-farm-dark text-white">
      <header className="flex items-center gap-3 px-4 py-3 bg-green-900 border-b border-farm-green">
        <button onClick={() => navigate('/')} className="text-farm-gold hover:text-yellow-300 transition-colors">
          ← Back
        </button>
        <h1 className="text-farm-gold font-bold">📋 Task History</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <p className="text-green-400 text-center py-12">Loading...</p>
        ) : tasks.length === 0 ? (
          <p className="text-green-500 text-center py-12">No tasks logged yet.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="bg-green-900 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-xl mt-0.5">{CATEGORY_EMOJI[task.category] ?? '📝'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{task.title}</p>
                  <p className="text-green-400 text-xs mt-0.5">
                    <span className={EFFORT_COLOR[task.effort]}>{task.effort}</span>
                    {' · '}
                    {new Date(task.logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' · '}
                    {new Date(task.logged_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-farm-gold text-sm font-semibold shrink-0">+{task.xp_earned}xp</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

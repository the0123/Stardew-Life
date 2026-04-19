import { useState } from 'react'
import { useFarmStore } from '../../stores/farmStore'
import api from '../../api/client'

type Category = 'health' | 'work' | 'learning' | 'social'
type Effort = 'quick' | 'medium' | 'deep'

const CATEGORIES: { value: Category; label: string; emoji: string; bg: string }[] = [
  { value: 'health',   label: 'Health',   emoji: '💪', bg: 'bg-green-600' },
  { value: 'work',     label: 'Work',     emoji: '💼', bg: 'bg-yellow-600' },
  { value: 'learning', label: 'Learning', emoji: '📚', bg: 'bg-blue-600' },
  { value: 'social',   label: 'Social',   emoji: '🤝', bg: 'bg-pink-600' },
]

const EFFORTS: { value: Effort; label: string; xp: number }[] = [
  { value: 'quick',  label: 'Quick',  xp: 10 },
  { value: 'medium', label: 'Medium', xp: 25 },
  { value: 'deep',   label: 'Deep',   xp: 50 },
]

export default function TaskLogger() {
  const setFarm = useFarmStore(s => s.setFarm)
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('health')
  const [effort, setEffort] = useState<Effort>('medium')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const close = () => { setOpen(false); setTitle('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const { data } = await api.post('/tasks/log', { category, effort, title: title.trim() })
      if (data.farm_state) setFarm(data.farm_state)
      setSuccess(true)
      setTimeout(() => { setSuccess(false); close() }, 900)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-farm-gold rounded-full shadow-xl flex items-center justify-center text-3xl font-bold text-green-900 hover:bg-yellow-400 transition-colors z-40"
        aria-label="Log task"
      >
        +
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div className="relative bg-green-900 rounded-t-2xl p-6 pb-10 space-y-4">
            <h2 className="text-farm-gold font-bold text-lg">Log a Task</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`${c.bg} py-3 rounded-lg flex flex-col items-center gap-1 transition-all
                      ${category === c.value ? 'ring-2 ring-farm-gold opacity-100' : 'opacity-50'}`}
                  >
                    <span className="text-xl">{c.emoji}</span>
                    <span className="text-white text-xs font-medium">{c.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {EFFORTS.map(e => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEffort(e.value)}
                    className={`bg-green-800 py-2 rounded-lg text-sm font-medium transition-all
                      ${effort === e.value ? 'ring-2 ring-farm-gold opacity-100' : 'opacity-50'}`}
                  >
                    <span className="text-white">{e.label}</span>
                    <span className="text-farm-gold text-xs ml-1">+{e.xp}xp</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="What did you do?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-green-950 border border-farm-green rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-farm-gold"
                autoFocus
              />

              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="w-full bg-farm-gold hover:bg-yellow-400 disabled:opacity-40 text-green-900 font-bold py-3 rounded-lg transition-colors text-base"
              >
                {success ? '✓ Logged!' : loading ? 'Logging...' : 'Log Task 🌱'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

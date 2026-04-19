import { useEffect } from 'react'
import FarmGrid from '../components/FarmGrid/FarmGrid'
import StatsPanel from '../components/StatsPanel/StatsPanel'
import TaskLogger from '../components/TaskLogger/TaskLogger'
import { getMyFarm } from '../api/farm'
import { useAuthStore } from '../stores/authStore'
import { useFarmStore } from '../stores/farmStore'

export default function Home() {
  const user = useAuthStore(s => s.user)
  const { farm, isLoading, setFarm, setLoading } = useFarmStore()

  useEffect(() => {
    setLoading(true)
    getMyFarm()
      .then(r => setFarm(r.data.state))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-farm-dark text-white">
      <header className="flex items-center justify-between px-4 py-3 bg-green-900 border-b border-farm-green">
        <h1 className="text-farm-gold font-bold">🌾 {user?.display_name ?? 'Your Farm'}</h1>
        <span className="text-green-400 text-sm capitalize">{farm?.season ?? '...'}</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {isLoading ? (
          <p className="text-green-400 text-center py-12">Loading your farm...</p>
        ) : farm ? (
          <>
            <StatsPanel xp={farm.xp} level={farm.total_level} gold={farm.gold} />
            <FarmGrid grid={farm.grid} />
          </>
        ) : (
          <p className="text-red-400 text-center py-12">Failed to load farm.</p>
        )}
      </div>

      <TaskLogger />
    </div>
  )
}

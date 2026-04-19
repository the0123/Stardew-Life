import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import FarmGrid from '../components/FarmGrid/FarmGrid'
import StatsPanel from '../components/StatsPanel/StatsPanel'
import { getFarmByUsername } from '../api/farm'
import type { FarmState } from '../stores/farmStore'

interface FarmResponse {
  display_name: string
  username: string
  state: FarmState
}

export default function FriendFarm() {
  const { username } = useParams<{ username: string }>()
  const [data, setData] = useState<FarmResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) return
    getFarmByUsername(username)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return (
    <div className="min-h-screen bg-farm-dark flex items-center justify-center">
      <p className="text-farm-gold">Loading {username}'s farm...</p>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-farm-dark flex items-center justify-center">
      <p className="text-red-400">Farm not found.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-farm-dark text-white">
      <header className="flex items-center px-4 py-3 bg-green-900 border-b border-farm-green">
        <h1 className="text-farm-gold font-bold">🌾 {data.display_name}'s Farm</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <StatsPanel xp={data.state.xp} level={data.state.total_level} gold={data.state.gold} />
        <FarmGrid grid={data.state.grid} />
      </div>
    </div>
  )
}

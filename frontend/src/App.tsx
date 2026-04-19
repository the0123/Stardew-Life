import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import api from './api/client'
import Admin from './pages/Admin'
import FriendFarm from './pages/FriendFarm'
import History from './pages/History'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Streaks from './pages/Streaks'
import { useAuthStore } from './stores/authStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { setToken, setUser } = useAuthStore()
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: tokenData } = await api.post('/auth/refresh')
        setToken(tokenData.access_token)
        api.defaults.headers.common['Authorization'] = `Bearer ${tokenData.access_token}`
        const { data: user } = await api.get('/auth/me')
        setUser(user)
      } catch {
        // no valid session — stay on login
      } finally {
        setInitializing(false)
      }
    }
    init()
  }, [])

  if (initializing) {
    return (
      <div className="min-h-screen bg-farm-dark flex items-center justify-center">
        <p className="text-farm-gold text-sm animate-pulse">Loading...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/farm/:username" element={<FriendFarm />} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/streaks" element={<ProtectedRoute><Streaks /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
    </Routes>
  )
}

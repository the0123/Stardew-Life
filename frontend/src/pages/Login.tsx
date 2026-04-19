import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setToken(data.access_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
      const { data: user } = await api.get('/auth/me')
      setUser(user)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-farm-dark flex items-center justify-center px-4">
      <div className="bg-green-900 border border-farm-green rounded-xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="text-farm-gold text-2xl font-bold mb-1 text-center">🌾 Stardew Life</h1>
        <p className="text-green-400 text-xs text-center mb-6">Gamify your life</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-green-300 text-sm block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-farm-gold"
              required
            />
          </div>
          <div>
            <label className="text-green-300 text-sm block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-farm-gold"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-farm-green hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

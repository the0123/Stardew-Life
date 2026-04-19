import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuthStore } from '../stores/authStore'

export default function Register() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const [form, setForm] = useState({ email: '', username: '', display_name: '', password: '', invite_code: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setToken(data.access_token)
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
      const { data: user } = await api.get('/auth/me')
      setUser(user)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-farm-dark flex items-center justify-center px-4">
      <div className="bg-green-900 border border-farm-green rounded-xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="text-farm-gold text-2xl font-bold mb-1 text-center">🌾 Join the Farm</h1>
        <p className="text-green-400 text-xs text-center mb-6">You need an invite code to register</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-green-300 text-sm block mb-1">Invite Code</label>
            <input
              type="text"
              value={form.invite_code}
              onChange={set('invite_code')}
              className="w-full bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-farm-gold font-mono"
              placeholder="XXXXXXX"
              required
            />
          </div>
          <div>
            <label className="text-green-300 text-sm block mb-1">Display Name</label>
            <input
              type="text"
              value={form.display_name}
              onChange={set('display_name')}
              className="w-full bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-farm-gold"
              placeholder="Your Name"
              required
            />
          </div>
          <div>
            <label className="text-green-300 text-sm block mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={set('username')}
              className="w-full bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-farm-gold"
              placeholder="lowercase_username"
              required
            />
          </div>
          <div>
            <label className="text-green-300 text-sm block mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="w-full bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-farm-gold"
              required
            />
          </div>
          <div>
            <label className="text-green-300 text-sm block mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              className="w-full bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-farm-gold"
              required
              minLength={8}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-farm-green hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-green-500 text-xs text-center mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-farm-gold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

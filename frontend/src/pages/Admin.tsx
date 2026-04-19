import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuthStore } from '../stores/authStore'

interface Invite { code: string; used: boolean; expires_at: string | null }
interface UserEntry { id: string; username: string; email: string; is_admin: boolean }

export default function Admin() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [invites, setInvites] = useState<Invite[]>([])
  const [users, setUsers] = useState<UserEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user?.is_admin) { navigate('/'); return }
    Promise.all([api.get('/admin/invites'), api.get('/admin/users')])
      .then(([inv, usr]) => { setInvites(inv.data); setUsers(usr.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const generateInvite = async () => {
    setGenerating(true)
    try {
      const { data } = await api.post('/admin/invites')
      setNewCode(data.code)
      setInvites(prev => [{ code: data.code, used: false, expires_at: data.expires_at }, ...prev])
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-farm-dark text-white">
      <header className="flex items-center gap-3 px-4 py-3 bg-green-900 border-b border-farm-green">
        <button onClick={() => navigate('/')} className="text-farm-gold hover:text-yellow-300 transition-colors">
          ← Back
        </button>
        <h1 className="text-farm-gold font-bold">🔑 Admin Panel</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {loading ? (
          <p className="text-green-400 text-center py-12">Loading...</p>
        ) : (
          <>
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-farm-gold font-semibold">Invite Codes</h2>
                <button
                  onClick={generateInvite}
                  disabled={generating}
                  className="bg-farm-gold text-green-900 font-semibold px-4 py-1.5 rounded-lg text-sm disabled:opacity-50"
                >
                  {generating ? 'Generating...' : '+ New Code'}
                </button>
              </div>

              {newCode && (
                <div className="bg-green-800 border border-farm-gold rounded-xl p-4 mb-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-green-400 text-xs mb-1">New invite code — share this:</p>
                    <p className="text-farm-gold font-mono font-bold text-lg">{newCode}</p>
                  </div>
                  <button
                    onClick={() => copyCode(newCode)}
                    className="bg-farm-gold text-green-900 px-3 py-1.5 rounded-lg text-sm font-semibold shrink-0"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {invites.length === 0 && <p className="text-green-500 text-sm">No invite codes yet.</p>}
                {invites.map(inv => (
                  <div key={inv.code} className={`bg-green-900 rounded-xl px-4 py-3 flex items-center gap-3 ${inv.used ? 'opacity-50' : ''}`}>
                    <span className="font-mono text-sm text-green-100 flex-1 truncate">{inv.code}</span>
                    {inv.used ? (
                      <span className="text-xs text-green-600 bg-green-800 px-2 py-0.5 rounded-full">Used</span>
                    ) : (
                      <>
                        <button
                          onClick={() => copyCode(inv.code)}
                          className="text-xs text-farm-gold hover:underline shrink-0"
                        >
                          Copy
                        </button>
                        <span className="text-xs text-green-500 bg-green-800 px-2 py-0.5 rounded-full shrink-0">Active</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-farm-gold font-semibold mb-3">Users ({users.length})</h2>
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="bg-green-900 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">@{u.username}</p>
                      <p className="text-green-400 text-xs">{u.email}</p>
                    </div>
                    {u.is_admin && (
                      <span className="text-xs text-farm-gold bg-green-800 px-2 py-0.5 rounded-full">Admin</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

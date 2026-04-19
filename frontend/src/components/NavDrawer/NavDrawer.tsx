import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useAuthStore } from '../../stores/authStore'

interface NavDrawerProps {
  friends?: string[]
}

export default function NavDrawer({ friends = [] }: NavDrawerProps) {
  const navigate = useNavigate()
  const { user, logout: storeLogout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const close = () => {
    setOpen(false)
    setShowPasswordForm(false)
    setCurrentPassword('')
    setNewPassword('')
    setPwError('')
    setPwSuccess(false)
  }

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    storeLogout()
    navigate('/login')
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwLoading(true)
    try {
      await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
      setPwSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPwError(msg ?? 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  const nav = (path: string) => { close(); navigate(path) }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-farm-gold hover:text-yellow-300 transition-colors p-1"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div className="relative w-72 max-w-[85vw] bg-green-900 h-full shadow-2xl flex flex-col">
            <div className="p-5 border-b border-green-700">
              <p className="text-farm-gold font-bold text-lg">{user?.display_name}</p>
              <p className="text-green-400 text-xs">@{user?.username}</p>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <button onClick={() => nav('/')} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-green-100 hover:bg-green-800 transition-colors">
                <span>🌾</span> My Farm
              </button>

              {friends.length > 0 && (
                <div className="pt-2">
                  <p className="text-green-500 text-xs px-3 pb-1 uppercase tracking-wider">Friends</p>
                  {friends.map(username => (
                    <button key={username} onClick={() => nav(`/farm/${username}`)} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-green-100 hover:bg-green-800 transition-colors">
                      <span>👨‍🌾</span> {username}
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <p className="text-green-500 text-xs px-3 pb-1 uppercase tracking-wider">Stats</p>
                <button onClick={() => nav('/history')} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-green-100 hover:bg-green-800 transition-colors">
                  <span>📋</span> Task History
                </button>
                <button onClick={() => nav('/streaks')} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-green-100 hover:bg-green-800 transition-colors">
                  <span>🔥</span> Streaks
                </button>
              </div>

              {user?.is_admin && (
                <div className="pt-2">
                  <p className="text-green-500 text-xs px-3 pb-1 uppercase tracking-wider">Admin</p>
                  <button onClick={() => nav('/admin')} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-green-100 hover:bg-green-800 transition-colors">
                    <span>🔑</span> Admin Panel
                  </button>
                </div>
              )}

              <div className="pt-2">
                <p className="text-green-500 text-xs px-3 pb-1 uppercase tracking-wider">Account</p>
                <button
                  onClick={() => setShowPasswordForm(p => !p)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-green-100 hover:bg-green-800 transition-colors"
                >
                  <span>🔒</span> Change Password
                </button>

                {showPasswordForm && (
                  <form onSubmit={handleChangePassword} className="mx-3 mt-2 space-y-2">
                    <input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full bg-green-950 border border-green-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-farm-gold"
                      required
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-green-950 border border-green-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-farm-gold"
                      required
                      minLength={8}
                    />
                    {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
                    {pwSuccess && <p className="text-green-400 text-xs">Password changed!</p>}
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="w-full bg-farm-gold text-green-900 font-semibold py-1.5 rounded text-sm disabled:opacity-50"
                    >
                      {pwLoading ? 'Saving...' : 'Update Password'}
                    </button>
                  </form>
                )}
              </div>
            </nav>

            <div className="p-4 border-t border-green-700">
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-green-800 transition-colors"
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

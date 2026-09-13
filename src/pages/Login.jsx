import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function Login() {
  const { user, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-80">
        <div className="flex items-center gap-3 mb-1">
          <Logo size={32} />
          <h1 className="font-bold text-lg">ATTAbot!</h1>
        </div>
        <p className="text-xs text-gray-500 mb-6 uppercase tracking-wide">Audit, Tracking, Trending &amp; Accountability</p>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm"
        />
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm"
        />
        {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
        <button
          disabled={busy}
          className="w-full bg-emerald-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-[11px] text-gray-400 mt-4">
          Accounts are created by an admin in Supabase Auth. Contact your ATTAbot! admin if you need access.
        </p>
      </form>
    </div>
  )
}

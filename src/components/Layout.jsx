import { useState } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardCheck, BarChart3, ListChecks, FileClock, Users, Settings, LogOut, KeyRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Logo from './Logo'
import Mascot from './Mascot'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, roles: ['admin', 'auditor', 'reviewer', 'viewer'] },
  { to: '/review-queue', label: 'Review Queue', icon: ClipboardCheck, roles: ['admin', 'reviewer'] },
  { to: '/findings', label: 'Findings', icon: BarChart3, roles: ['admin', 'auditor', 'reviewer', 'viewer'] },
  { to: '/corrective-actions', label: 'Corrective Actions', icon: ListChecks, roles: ['admin', 'auditor', 'reviewer', 'viewer'] },
  { to: '/audit-log', label: 'Audit Log', icon: FileClock, roles: ['admin', 'auditor', 'reviewer', 'viewer'] },
  { to: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'auditor', 'reviewer'] },
  { to: '/admin', label: 'Admin', icon: Settings, roles: ['admin'] },
]

function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function submit(e) {
    e.preventDefault()
    setStatus('')
    if (newPassword.length < 8) return setStatus('Password must be at least 8 characters.')
    if (newPassword !== confirmPassword) return setStatus('Passwords do not match.')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) return setStatus(error.message)
    setStatus('Password updated.')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => { setOpen(false); setStatus('') }, 1500)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-white/60 hover:text-white mb-2">
        <KeyRound size={14} /> Change password
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="mb-3 space-y-1.5">
      <input
        type="password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full bg-white/10 border border-white/20 rounded-md px-2 py-1 text-white placeholder-white/40 text-xs"
      />
      <input
        type="password"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full bg-white/10 border border-white/20 rounded-md px-2 py-1 text-white placeholder-white/40 text-xs"
      />
      <div className="flex gap-2">
        <button disabled={saving} className="bg-teal-600 text-white rounded-md px-2 py-1 text-xs flex-1">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setStatus('') }} className="text-white/50 text-xs px-2">
          Cancel
        </button>
      </div>
      {status && <p className="text-[10px] text-teal-300">{status}</p>}
    </form>
  )
}

export default function Layout() {
  const { user, profile, role, loading, signOut } = useAuth()

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen flex">
      <aside className="w-80 shrink-0 bg-navy-950 text-white flex flex-col no-print">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <Logo />
          <div>
            <div className="font-bold text-base leading-tight">ATTAbot!</div>
            <div className="text-[10px] text-teal-400 leading-tight tracking-wide uppercase">
              Audit, Tracking, Trending &amp; Accountability
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.filter((n) => n.roles.includes(role)).map((n) => {
            const Icon = n.icon
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-teal-600 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={17} />
                {n.label}
              </NavLink>
            )
          })}
          <div className="mt-4 pt-5 border-t border-white/10 -mx-3 flex justify-center">
            <Mascot size={240} />
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-white/10 text-xs">
          <div className="text-white/90 font-medium mb-0.5">{profile?.full_name}</div>
          <div className="text-teal-400 uppercase tracking-wide text-[10px] mb-3">{role}</div>
          <ChangePassword />
          <button onClick={signOut} className="flex items-center gap-2 text-white/60 hover:text-white">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 max-w-7xl">
        <Outlet />
      </main>
    </div>
  )
}

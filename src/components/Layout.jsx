import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/', label: 'Overview', roles: ['admin', 'auditor', 'reviewer', 'viewer'] },
  { to: '/review-queue', label: 'Review Queue', roles: ['admin', 'reviewer'] },
  { to: '/findings', label: 'Findings', roles: ['admin', 'auditor', 'reviewer', 'viewer'] },
  { to: '/corrective-actions', label: 'Corrective Actions', roles: ['admin', 'auditor', 'reviewer', 'viewer'] },
  { to: '/audit-log', label: 'Audit Log', roles: ['admin', 'auditor', 'reviewer', 'viewer'] },
  { to: '/patients', label: 'Patients', roles: ['admin', 'auditor', 'reviewer'] },
  { to: '/admin', label: 'Admin', roles: ['admin'] },
]

export default function Layout() {
  const { user, profile, role, loading, signOut } = useAuth()

  if (loading) return <div className="p-8 text-warm-500">Loading...</div>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="font-bold text-lg mb-1">ATTAbot!</div>
        <div className="text-xs text-gray-500 mb-6">Expert Hospice Audit Console</div>
        <nav className="flex flex-col gap-1">
          {NAV.filter((n) => n.roles.includes(role)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-emerald-700 text-white' : 'text-gray-700 hover:bg-gray-100'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="mb-1">{profile?.full_name}</div>
          <div className="mb-2 uppercase text-[10px] tracking-wide">{role}</div>
          <button onClick={signOut} className="underline">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 p-6 max-w-6xl">
        <Outlet />
      </main>
    </div>
  )
}

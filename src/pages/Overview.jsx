import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function StatCard({ label, value, tone = '' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

export default function Overview() {
  const [stats, setStats] = useState(null)
  const [dueList, setDueList] = useState([])
  const [monthly, setMonthly] = useState([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [pending, criticalHigh, overdue, due, confirmedAudits] = await Promise.all([
      supabase.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
      supabase.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').in('risk_level', ['CRITICAL', 'HIGH']),
      supabase.from('corrective_actions').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']).lt('due_date', new Date().toISOString().slice(0, 10)),
      supabase.from('v_upcoming_audits').select('*').order('due_date', { ascending: true }).limit(10),
      supabase.from('audits').select('score, risk_level, confirmed_at').eq('status', 'confirmed').order('confirmed_at', { ascending: true }),
    ])

    setStats({
      pending: pending.count ?? 0,
      criticalHigh: criticalHigh.count ?? 0,
      overdue: overdue.count ?? 0,
    })
    setDueList(due.data ?? [])

    const byMonth = {}
    for (const a of confirmedAudits.data ?? []) {
      if (!a.confirmed_at) continue
      const key = a.confirmed_at.slice(0, 7)
      byMonth[key] = byMonth[key] ?? { total: 0, count: 0 }
      byMonth[key].total += a.score ?? 0
      byMonth[key].count += 1
    }
    setMonthly(
      Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, v]) => ({ month, avg: Math.round(v.total / v.count), count: v.count }))
    )
  }

  if (!stats) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Overview</h1>
      <p className="text-sm text-gray-500 mb-6">QAPI snapshot -- proof of an ongoing audit program, not a one-time cleanup.</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Pending review" value={stats.pending} />
        <StatCard label="Confirmed CRITICAL / HIGH" value={stats.criticalHigh} tone="risk-CRITICAL" />
        <StatCard label="Overdue corrective actions" value={stats.overdue} tone="risk-HIGH" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-sm mb-3">Average score by month (confirmed audits)</h2>
          {monthly.length === 0 && <p className="text-xs text-gray-400">No confirmed audits yet.</p>}
          {monthly.map((m) => (
            <div key={m.month} className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>{m.month} ({m.count})</span>
                <span>{m.avg}/100</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-2 bg-emerald-600" style={{ width: `${m.avg}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-sm mb-3">Due soon (admission / recert / F2F)</h2>
          {dueList.length === 0 && <p className="text-xs text-gray-400">Nothing due in the next 30-45 days.</p>}
          <ul className="text-sm space-y-2">
            {dueList.map((d, i) => (
              <li key={i} className="flex justify-between border-b border-gray-100 pb-1">
                <span>{d.full_name} <span className="text-gray-400">({d.mrn})</span></span>
                <span className="text-gray-500 text-xs">{d.due_type} -- {String(d.due_date).slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6">
        <Link to="/review-queue" className="text-emerald-700 text-sm underline">Go to review queue &rarr;</Link>
      </p>
    </div>
  )
}

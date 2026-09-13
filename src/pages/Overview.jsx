import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { ClipboardList, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { riskLabel } from '../lib/format'

const RISK_COLORS = { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#ca8a04', LOW: '#16a34a' }

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-xl font-bold leading-tight">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  )
}

export default function Overview() {
  const [stats, setStats] = useState(null)
  const [dueList, setDueList] = useState([])
  const [monthly, setMonthly] = useState([])
  const [riskDist, setRiskDist] = useState([])
  const [topIssues, setTopIssues] = useState([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [pending, criticalHigh, overdue, confirmedCount, due, confirmedAudits, findingRows] = await Promise.all([
      supabase.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'pending_review').eq('archived', false),
      supabase.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').eq('archived', false).in('risk_level', ['CRITICAL', 'HIGH']),
      supabase.from('corrective_actions').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']).lt('due_date', new Date().toISOString().slice(0, 10)),
      supabase.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').eq('archived', false),
      supabase.from('v_upcoming_audits').select('*').order('due_date', { ascending: true }).limit(8),
      supabase.from('audits').select('score, risk_level, confirmed_at').eq('status', 'confirmed').eq('archived', false).order('confirmed_at', { ascending: true }),
      supabase.from('audit_findings').select('status, checklist_items(title), audits!inner(status, archived)').eq('audits.status', 'confirmed').eq('audits.archived', false).in('status', ['fail', 'flag']),
    ])

    setStats({
      pending: pending.count ?? 0,
      criticalHigh: criticalHigh.count ?? 0,
      overdue: overdue.count ?? 0,
      confirmed: confirmedCount.count ?? 0,
    })
    setDueList(due.data ?? [])

    const byMonth = {}
    const byRisk = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const a of confirmedAudits.data ?? []) {
      if (a.confirmed_at) {
        const key = a.confirmed_at.slice(0, 7)
        byMonth[key] = byMonth[key] ?? { total: 0, count: 0 }
        byMonth[key].total += a.score ?? 0
        byMonth[key].count += 1
      }
      if (a.risk_level) byRisk[a.risk_level] = (byRisk[a.risk_level] ?? 0) + 1
    }
    setMonthly(
      Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, v]) => ({ month, avg: Math.round(v.total / v.count) }))
    )
    setRiskDist(
      Object.entries(byRisk)
        .filter(([, count]) => count > 0)
        .map(([risk, count]) => ({ name: riskLabel(risk), value: count, risk }))
    )

    const byTitle = {}
    for (const r of findingRows.data ?? []) {
      const title = r.checklist_items?.title ?? 'Unknown'
      byTitle[title] = (byTitle[title] ?? 0) + 1
    }
    setTopIssues(
      Object.entries(byTitle)
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    )
  }

  if (!stats) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Overview</h1>
      <p className="text-sm text-gray-500 mb-6">QAPI snapshot -- proof of an ongoing audit program, not a one-time cleanup.</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={ClipboardList} label="Pending review" value={stats.pending} tone="bg-blue-50 text-blue-600" />
        <StatCard icon={AlertTriangle} label="Confirmed Critical / High" value={stats.criticalHigh} tone="bg-red-50 text-red-600" />
        <StatCard icon={Clock} label="Overdue corrective actions" value={stats.overdue} tone="bg-orange-50 text-orange-600" />
        <StatCard icon={CheckCircle2} label="Confirmed audits total" value={stats.confirmed} tone="bg-teal-50 text-teal-600" />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-sm mb-3">Average score by month (confirmed audits)</h2>
          {monthly.length === 0 ? (
            <p className="text-xs text-gray-400">No confirmed audits yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={28} />
                <Tooltip />
                <Area type="monotone" dataKey="avg" stroke="#0d9488" fill="url(#scoreFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-sm mb-3">Risk severity distribution</h2>
          {riskDist.length === 0 ? (
            <p className="text-xs text-gray-400">No confirmed audits yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={riskDist} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {riskDist.map((d) => (
                    <Cell key={d.risk} fill={RISK_COLORS[d.risk]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-sm">Top recurring findings</h2>
            <Link to="/findings" className="text-xs text-teal-700 underline">See all &rarr;</Link>
          </div>
          {topIssues.length === 0 ? (
            <p className="text-xs text-gray-400">No confirmed Fail/Flag findings yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topIssues} layout="vertical" margin={{ left: 12 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="title" width={160} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-sm mb-3">Due soon</h2>
          {dueList.length === 0 && <p className="text-xs text-gray-400">Nothing due in the next 30-45 days.</p>}
          <ul className="text-sm space-y-2 max-h-52 overflow-auto">
            {dueList.map((d, i) => (
              <li key={i} className="flex justify-between border-b border-gray-100 pb-1">
                <span>{d.full_name} <span className="text-gray-400 text-xs">({d.mrn})</span></span>
                <span className="text-gray-500 text-xs">{d.due_type} -- {String(d.due_date).slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

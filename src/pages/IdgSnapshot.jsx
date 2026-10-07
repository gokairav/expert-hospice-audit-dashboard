import { useEffect, useState } from 'react'
import { Printer, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

function addDays(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function daysInRange(fromStr, toStr) {
  return Math.round((new Date(toStr) - new Date(fromStr)) / 86400000) + 1
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function Tile({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function ScoreTrend({ current, prior }) {
  if (current == null) return <Tile label="Average score this period" value="--" sub="No confirmed audits in this period." />
  const delta = prior == null ? null : Math.round(current - prior)
  let Arrow = Minus
  let tone = 'text-gray-400'
  if (delta != null && delta > 0) { Arrow = ArrowUp; tone = 'text-emerald-600' }
  else if (delta != null && delta < 0) { Arrow = ArrowDown; tone = 'text-red-600' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-1.5">
        <div className="text-2xl font-bold leading-tight">{Math.round(current)}</div>
        {delta != null && (
          <span className={`flex items-center text-xs font-semibold ${tone}`}>
            <Arrow size={13} /> {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">Average score this period</div>
      <div className="text-[11px] text-gray-400 mt-1">
        {prior == null ? 'No prior-period audits to compare.' : `vs. ${Math.round(prior)} the period before`}
      </div>
    </div>
  )
}

export default function IdgSnapshot() {
  const [to, setTo] = useState(todayStr())
  const [from, setFrom] = useState(addDays(todayStr(), -13))
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  async function load() {
    setLoading(true)
    const toEnd = to + 'T23:59:59'
    const priorFrom = addDays(from, -daysInRange(from, to))
    const priorTo = addDays(from, -1) + 'T23:59:59'
    const today = todayStr()

    const [thisPeriod, priorPeriod, openCriticalHigh, overdueNow, findingsThisPeriod, closedThisPeriod] = await Promise.all([
      supabase.from('audits').select('id, audit_type, score').eq('status', 'confirmed').eq('archived', false).gte('confirmed_at', from).lte('confirmed_at', toEnd),
      supabase.from('audits').select('score').eq('status', 'confirmed').eq('archived', false).gte('confirmed_at', priorFrom).lte('confirmed_at', priorTo),
      supabase.from('audits').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').eq('archived', false).in('risk_level', ['CRITICAL', 'HIGH']),
      supabase.from('corrective_actions').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']).lt('due_date', today),
      supabase.from('audit_findings').select('status, checklist_items(title), audits!inner(status, archived, confirmed_at)').eq('audits.status', 'confirmed').eq('audits.archived', false).gte('audits.confirmed_at', from).lte('audits.confirmed_at', toEnd).in('status', ['fail', 'flag']),
      supabase.from('corrective_actions').select('id', { count: 'exact', head: true }).eq('status', 'done').gte('closed_at', from).lte('closed_at', toEnd),
    ])

    const auditsThisPeriod = thisPeriod.data ?? []
    const byType = auditsThisPeriod.reduce((acc, a) => {
      acc[a.audit_type] = (acc[a.audit_type] ?? 0) + 1
      return acc
    }, {})
    const scores = auditsThisPeriod.map((a) => a.score).filter((s) => s != null)
    const avgThisPeriod = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    const priorScores = (priorPeriod.data ?? []).map((a) => a.score).filter((s) => s != null)
    const avgPriorPeriod = priorScores.length ? priorScores.reduce((a, b) => a + b, 0) / priorScores.length : null

    const byTitle = {}
    for (const r of findingsThisPeriod.data ?? []) {
      const title = r.checklist_items?.title ?? 'Unknown'
      byTitle[title] = (byTitle[title] ?? 0) + 1
    }
    const topFindings = Object.entries(byTitle).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count).slice(0, 3)

    // Opened-this-period corrective actions are counted via the confirmed
    // audit that spawned them (same period window as "audits completed"),
    // rather than a created_at column on corrective_actions -- that column
    // isn't used anywhere else in this app, so this avoids guessing at a
    // field that might not exist. Reuses the audit_findings!inner(audit_id)
    // + dot-notation filter pattern already proven in AuditDetail.jsx.
    const auditIdsThisPeriod = auditsThisPeriod.map((a) => a.id)
    let openedThisPeriod = 0
    if (auditIdsThisPeriod.length) {
      const { count } = await supabase
        .from('corrective_actions')
        .select('id, audit_findings!inner(audit_id)', { count: 'exact', head: true })
        .in('audit_findings.audit_id', auditIdsThisPeriod)
      openedThisPeriod = count ?? 0
    }

    setData({
      auditsCount: auditsThisPeriod.length,
      admissionCount: byType.admission ?? 0,
      recertCount: byType.recert ?? 0,
      avgThisPeriod,
      avgPriorPeriod,
      openCriticalHigh: openCriticalHigh.count ?? 0,
      overdueNow: overdueNow.count ?? 0,
      topFindings,
      openedThisPeriod,
      closedThisPeriod: closedThisPeriod.count ?? 0,
    })
    setLoading(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1 print:hidden">
        <h1 className="text-xl font-bold">IDG Snapshot</h1>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs border border-gray-300 rounded-lg px-3 py-1.5">
          <Printer size={14} /> Print / save as PDF
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4 print:hidden">
        A one-page summary to pull up or print for IDG -- pick the date range since your last meeting below.
      </p>

      <div className="flex gap-3 mb-6 print:hidden items-center">
        <label className="text-xs text-gray-600 flex items-center gap-1.5">
          From <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-gray-600 flex items-center gap-1.5">
          To <input type="date" value={to} min={from} max={todayStr()} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        </label>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}

      {!loading && data && (
        <div>
          <div className="mb-5 hidden print:block">
            <h1 className="text-xl font-bold">Expert Hospice -- IDG Snapshot</h1>
            <p className="text-sm text-gray-600">
              {from} to {to} -- generated {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-5">
            <Tile
              label="Audits completed this period"
              value={data.auditsCount}
              sub={data.auditsCount > 0 ? `${data.admissionCount} admission / ${data.recertCount} recert` : null}
            />
            <ScoreTrend current={data.avgThisPeriod} prior={data.avgPriorPeriod} />
            <Tile label="Open Critical / High findings" value={data.openCriticalHigh} sub="as of today" />
            <Tile label="Corrective actions overdue" value={data.overdueNow} sub="as of today" />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-sm mb-3">Top recurring findings this period</h2>
              {data.topFindings.length === 0 ? (
                <p className="text-xs text-gray-400">No confirmed Fail/Flag findings in this period.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {data.topFindings.map((f) => (
                    <li key={f.title} className="flex justify-between border-b border-gray-100 pb-1.5">
                      <span>{f.title}</span>
                      <span className="text-gray-500">{f.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-sm mb-3">Corrective actions this period</h2>
              <div className="flex gap-6">
                <div>
                  <div className="text-2xl font-bold">{data.openedThisPeriod}</div>
                  <div className="text-xs text-gray-500">Opened</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.closedThisPeriod}</div>
                  <div className="text-xs text-gray-500">Closed</div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                {data.overdueNow} still overdue as of today (see tile above).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

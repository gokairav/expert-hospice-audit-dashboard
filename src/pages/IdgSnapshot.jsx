import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, ArrowUp, ArrowDown, Minus, CheckCircle2, AlertTriangle, Clock, Gauge, Bot } from 'lucide-react'
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

function pluralize(n, singular, plural = singular + 's') {
  return n === 1 ? singular : plural
}

// "ATTAbot says..." -- built from the same data the KPI cards/sections show,
// never hand-written per meeting. Finding titles are the actual checklist
// item titles lowercased, not a paraphrase -- an LLM call to make these read
// more naturally is a reasonable future upgrade, but isn't worth the added
// latency/failure mode for a page meant to load instantly before a meeting.
function buildBriefText(data) {
  const sentences = []

  if (data.auditsCount === 0) {
    sentences.push('No audits were completed this period.')
  } else {
    const typeParts = []
    if (data.admissionCount > 0) typeParts.push(`${data.admissionCount} admission`)
    if (data.recertCount > 0) typeParts.push(`${data.recertCount} recertification`)
    sentences.push(
      `${typeParts.join(' and ')} ${pluralize(data.auditsCount, 'audit')} ${pluralize(data.auditsCount, 'was', 'were')} completed this period.`
    )
  }

  if (data.topFindings.length > 0) {
    const names = data.topFindings.map((f) => f.title.toLowerCase())
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    sentences.push(
      `The most consistent ${pluralize(names.length, 'deficiency', 'deficiencies')} ${names.length === 1 ? 'was' : 'were'} ${list}.`
    )
  }

  sentences.push(
    `${data.openCriticalHigh} high-priority ${pluralize(data.openCriticalHigh, 'finding')} ${pluralize(data.openCriticalHigh, 'requires', 'require')} review, ` +
    `and ${data.overdueNow} corrective ${pluralize(data.overdueNow, 'action')} ${pluralize(data.overdueNow, 'remains', 'remain')} overdue.`
  )

  return sentences.join(' ')
}

const ACCENTS = {
  teal: { bar: 'bg-teal-500', iconBg: 'bg-teal-100', iconText: 'text-teal-700' },
  emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-100', iconText: 'text-emerald-700' },
  amber: { bar: 'bg-amber-500', iconBg: 'bg-amber-100', iconText: 'text-amber-700' },
  red: { bar: 'bg-red-500', iconBg: 'bg-red-100', iconText: 'text-red-700' },
}

// `urgent` scales the card's visual weight up (bigger number, red tint,
// tinted card background) instead of treating every KPI as equally calm --
// a 100-count overdue card should not look like a 6-count completed-audits
// card.
function Kpi({ icon: Icon, label, value, sub, accent = 'teal', urgent = false }) {
  const a = ACCENTS[accent]
  return (
    <div className={`relative rounded-xl border overflow-hidden p-4 ${urgent ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${a.bar}`} />
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${a.iconBg} ${a.iconText}`}>
          <Icon size={18} />
        </div>
        <div>
          <div className={`font-bold leading-tight ${urgent ? 'text-3xl text-red-700' : 'text-2xl'}`}>{value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
      </div>
      {sub && <div className="text-[11px] text-gray-400 mt-2">{sub}</div>}
    </div>
  )
}

function scoreAccent(score) {
  if (score == null) return 'teal'
  if (score >= 90) return 'emerald'
  if (score >= 70) return 'amber'
  return 'red'
}

function ScoreKpi({ current, prior }) {
  const a = ACCENTS[scoreAccent(current)]
  const delta = current != null && prior != null ? Math.round(current - prior) : null
  let Arrow = Minus
  let arrowTone = 'text-gray-400'
  if (delta != null && delta > 0) { Arrow = ArrowUp; arrowTone = 'text-emerald-600' }
  else if (delta != null && delta < 0) { Arrow = ArrowDown; arrowTone = 'text-red-600' }
  return (
    <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden p-4">
      <div className={`absolute top-0 left-0 right-0 h-1 ${a.bar}`} />
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${a.iconBg} ${a.iconText}`}>
          <Gauge size={18} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <div className="text-2xl font-bold leading-tight">{current == null ? '--' : Math.round(current)}</div>
            {delta != null && (
              <span className={`flex items-center text-xs font-semibold ${arrowTone}`}>
                <Arrow size={13} /> {delta > 0 ? '+' : ''}{delta}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Average score this period</div>
        </div>
      </div>
      <div className="text-[11px] text-gray-400 mt-2">
        {current == null ? 'No confirmed audits in this period.' : prior == null ? 'No prior-period audits to compare.' : `vs. ${Math.round(prior)} the period before`}
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

    // Fail/flag tracked separately (not just a flat count) so the recurring-
    // findings section can show proportional severity bars like the
    // Findings-by-category page does, not just a bare number.
    const byTitle = {}
    for (const r of findingsThisPeriod.data ?? []) {
      const title = r.checklist_items?.title ?? 'Unknown'
      byTitle[title] = byTitle[title] ?? { fail: 0, flag: 0 }
      byTitle[title][r.status] += 1
    }
    const topFindings = Object.entries(byTitle)
      .map(([title, counts]) => ({ title, ...counts, total: counts.fail + counts.flag }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)

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

  const attentionItems = []
  if (data?.openCriticalHigh > 0) {
    attentionItems.push({
      to: '/audit-log?status=confirmed&risk=CRITICAL,HIGH',
      label: `${data.openCriticalHigh} HIGH-PRIORITY FINDING${data.openCriticalHigh === 1 ? '' : 'S'}`,
    })
  }
  if (data?.overdueNow > 0) {
    attentionItems.push({ to: '/corrective-actions?filter=overdue', label: `${data.overdueNow} OVERDUE ACTION${data.overdueNow === 1 ? '' : 'S'}` })
  }
  if (data?.topFindings.length > 0) {
    attentionItems.push({ to: '/findings', label: `${data.topFindings.length} RECURRING DEFICIENC${data.topFindings.length === 1 ? 'Y' : 'IES'}` })
  }

  const findingsMax = data ? Math.max(1, ...data.topFindings.map((f) => f.total)) : 1
  const closedPct = data && data.openedThisPeriod > 0 ? Math.min(100, Math.round((data.closedThisPeriod / data.openedThisPeriod) * 100)) : 0

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

          <div className="grid grid-cols-4 gap-4 mb-4">
            <Kpi
              icon={CheckCircle2}
              label="Audits completed this period"
              value={data.auditsCount}
              sub={data.auditsCount > 0 ? `${data.admissionCount} admission / ${data.recertCount} recert` : null}
              accent="teal"
            />
            <ScoreKpi current={data.avgThisPeriod} prior={data.avgPriorPeriod} />
            <Kpi
              icon={AlertTriangle}
              label="Open Critical / High findings"
              value={data.openCriticalHigh}
              sub="as of today"
              accent={data.openCriticalHigh > 0 ? 'red' : 'emerald'}
              urgent={data.openCriticalHigh > 0}
            />
            <Kpi
              icon={Clock}
              label="Corrective actions overdue"
              value={data.overdueNow}
              sub="as of today"
              accent={data.overdueNow > 0 ? 'red' : 'emerald'}
              urgent={data.overdueNow > 0}
            />
          </div>

          {attentionItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-5 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs font-bold text-red-800 tracking-wide">
              <AlertTriangle size={14} className="shrink-0" />
              {attentionItems.map((item, i) => (
                <span key={item.to} className="flex items-center gap-2">
                  {i > 0 && <span className="text-red-300">&middot;</span>}
                  <Link to={item.to} className="hover:underline">{item.label}</Link>
                </span>
              ))}
            </div>
          )}

          <div className="relative bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <div className="pr-32 sm:pr-40">
              <h2 className="font-semibold text-sm text-teal-700 mb-2 flex items-center gap-1.5">
                <Bot size={16} /> ATTAbot IDG Brief
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">{buildBriefText(data)}</p>
            </div>
            <img
              src="/mascot-dab.png"
              alt="ATTAbot"
              className="hidden sm:block absolute -right-5 bottom-0 h-28 w-auto object-contain pointer-events-none select-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-sm mb-3">Top recurring findings this period</h2>
              {data.topFindings.length === 0 ? (
                <p className="text-xs text-gray-400">No confirmed Fail/Flag findings in this period.</p>
              ) : (
                <div className="space-y-3">
                  {data.topFindings.map((f) => (
                    <div key={f.title}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{f.title}</span>
                        <span className="text-gray-500">{f.fail} fail / {f.flag} flag</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-2.5 bg-red-500" style={{ width: `${(f.fail / findingsMax) * 100}%` }} />
                        <div className="h-2.5 bg-amber-400" style={{ width: `${(f.flag / findingsMax) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm">Corrective actions this period</h2>
                {data.overdueNow > 0 && (
                  <span className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {data.overdueNow} OVERDUE
                  </span>
                )}
              </div>
              <div className="flex gap-6 mb-3">
                <div>
                  <div className="text-2xl font-bold">{data.openedThisPeriod}</div>
                  <div className="text-xs text-gray-500">Opened</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.closedThisPeriod}</div>
                  <div className="text-xs text-gray-500">Closed</div>
                </div>
              </div>
              <div className="text-[11px] text-gray-500 mb-1">
                {data.closedThisPeriod} of {data.openedThisPeriod} opened this period closed so far
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-2.5 bg-emerald-500" style={{ width: `${closedPct}%` }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                Overdue count (top) covers every open corrective action past due, not just ones opened this period.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

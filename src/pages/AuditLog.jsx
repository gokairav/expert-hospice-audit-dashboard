import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function AuditLog() {
  const [audits, setAudits] = useState(null)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    load()
  }, [from, to])

  async function load() {
    let query = supabase
      .from('audits')
      .select('id, audit_type, score, risk_level, status, created_at, confirmed_at, patients(full_name, mrn)')
      .order('created_at', { ascending: false })
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to + 'T23:59:59')
    const { data } = await query
    setAudits(data ?? [])
  }

  const filtered = (audits ?? []).filter((a) => {
    if (!search) return true
    const s = search.toLowerCase()
    return a.patients?.full_name?.toLowerCase().includes(s) || a.patients?.mrn?.toLowerCase().includes(s)
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-1 print:hidden">
        <h1 className="text-xl font-bold">Audit Log</h1>
        <button onClick={() => window.print()} className="text-xs border border-gray-300 rounded-lg px-3 py-1.5">
          Print / export for survey binder
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4 print:hidden">Full, searchable audit history.</p>

      <div className="flex gap-3 mb-4 print:hidden">
        <input
          placeholder="Search patient name or MRN"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1"
        />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
      </div>

      {!audits && <p className="text-gray-500">Loading...</p>}
      {audits && (
        <table className="w-full text-sm bg-white border border-gray-200 rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="p-3">Patient</th>
              <th className="p-3">MRN</th>
              <th className="p-3">Type</th>
              <th className="p-3">Score</th>
              <th className="p-3">Risk</th>
              <th className="p-3">Status</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">Confirmed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="p-3"><Link className="text-emerald-700 underline print:no-underline print:text-black" to={`/audits/${a.id}`}>{a.patients?.full_name}</Link></td>
                <td className="p-3">{a.patients?.mrn}</td>
                <td className="p-3">{a.audit_type}</td>
                <td className="p-3">{a.score ?? '-'}</td>
                <td className="p-3"><span className={`risk-badge risk-${a.risk_level}`}>{a.risk_level ?? '-'}</span></td>
                <td className="p-3">{a.status}</td>
                <td className="p-3">{new Date(a.created_at).toLocaleDateString()}</td>
                <td className="p-3">{a.confirmed_at ? new Date(a.confirmed_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

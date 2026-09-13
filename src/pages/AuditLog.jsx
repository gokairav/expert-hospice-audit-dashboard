import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ArchiveRestore, Trash2, Printer } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { riskLabel } from '../lib/format'

export default function AuditLog() {
  const { role } = useAuth()
  const [audits, setAudits] = useState(null)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    load()
  }, [from, to, showArchived])

  async function load() {
    let query = supabase
      .from('audits')
      .select('id, audit_type, score, risk_level, status, archived, created_at, confirmed_at, patients(full_name, mrn)')
      .order('created_at', { ascending: false })
    if (!showArchived) query = query.eq('archived', false)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to + 'T23:59:59')
    const { data } = await query
    setAudits(data ?? [])
  }

  async function toggleArchive(a) {
    await supabase.from('audits').update({ archived: !a.archived }).eq('id', a.id)
    load()
  }

  async function deleteAudit(a) {
    if (a.status === 'confirmed') return
    if (!confirm(`Permanently delete this ${a.audit_type} audit for ${a.patients?.full_name}? This cannot be undone.`)) return
    const { error } = await supabase.from('audits').delete().eq('id', a.id)
    if (error) alert(error.message)
    load()
  }

  const filtered = (audits ?? []).filter((a) => {
    if (!search) return true
    const s = search.toLowerCase()
    return a.patients?.full_name?.toLowerCase().includes(s) || a.patients?.mrn?.toLowerCase().includes(s)
  })

  const canManage = role === 'admin' || role === 'reviewer'

  return (
    <div>
      <div className="flex justify-between items-center mb-1 print:hidden">
        <h1 className="text-xl font-bold">Audit Log</h1>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs border border-gray-300 rounded-lg px-3 py-1.5">
          <Printer size={14} /> Print / export for survey binder
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4 print:hidden">Full, searchable audit history.</p>

      <div className="flex gap-3 mb-4 print:hidden items-center">
        <input
          placeholder="Search patient name or MRN"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1"
        />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
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
              {canManage && <th className="p-3 no-print"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className={`border-t border-gray-100 ${a.archived ? 'opacity-50' : ''}`}>
                <td className="p-3"><Link className="text-teal-700 underline print:no-underline print:text-black" to={`/audits/${a.id}`}>{a.patients?.full_name}</Link></td>
                <td className="p-3">{a.patients?.mrn}</td>
                <td className="p-3">{a.audit_type}</td>
                <td className="p-3">{a.score ?? '-'}</td>
                <td className="p-3"><span className={`risk-badge risk-${a.risk_level}`}>{riskLabel(a.risk_level)}</span></td>
                <td className="p-3">{a.status}{a.archived ? ' (archived)' : ''}</td>
                <td className="p-3">{new Date(a.created_at).toLocaleDateString()}</td>
                <td className="p-3">{a.confirmed_at ? new Date(a.confirmed_at).toLocaleDateString() : '-'}</td>
                {canManage && (
                  <td className="p-3 no-print">
                    <div className="flex gap-2">
                      <button title={a.archived ? 'Unarchive' : 'Archive'} onClick={() => toggleArchive(a)} className="text-gray-400 hover:text-gray-700">
                        {a.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                      </button>
                      {role === 'admin' && a.status !== 'confirmed' && (
                        <button title="Delete" onClick={() => deleteAudit(a)} className="text-gray-400 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

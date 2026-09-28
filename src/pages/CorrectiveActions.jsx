import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CorrectiveActions() {
  const [actions, setActions] = useState(null)
  const [filter, setFilter] = useState('open')
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [filter])

  async function load() {
    setError('')
    // corrective_actions has TWO foreign keys to users_profiles (owner_user_id
    // and closed_by) -- embedding users_profiles(...) without a hint is
    // ambiguous to PostgREST, which rejects the whole query with an error
    // instead of data. That error was going unchecked here, silently showing
    // "Nothing here" even when rows existed -- !owner_user_id picks the right one.
    let query = supabase
      .from('corrective_actions')
      .select('*, audit_findings(checklist_items(title), audits(patients(full_name, mrn))), owner:users_profiles!owner_user_id(full_name)')
      .order('due_date', { ascending: true })
    if (filter === 'open') query = query.in('status', ['open', 'in_progress'])
    if (filter === 'overdue') query = query.in('status', ['open', 'in_progress']).lt('due_date', new Date().toISOString().slice(0, 10))
    if (filter === 'done') query = query.eq('status', 'done')
    const { data, error } = await query
    if (error) {
      setError(error.message)
      setActions([])
      return
    }
    setActions(data ?? [])
  }

  async function markStatus(id, status) {
    await supabase.from('corrective_actions').update({
      status,
      closed_at: status === 'done' ? new Date().toISOString() : null,
    }).eq('id', id)
    load()
  }

  if (!actions) return <p className="text-gray-500">Loading...</p>
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Corrective Actions</h1>
      <p className="text-sm text-gray-500 mb-4">Every confirmed Fail/Flag becomes a tracked action -- not just a line in a report.</p>

      <div className="flex gap-2 mb-4">
        {['open', 'overdue', 'done', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs border ${filter === f ? 'bg-emerald-700 text-white border-emerald-700' : 'border-gray-300 text-gray-600'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 mb-3">Error loading corrective actions: {error}</p>}
      {!error && actions.length === 0 && <p className="text-gray-400">Nothing here.</p>}
      <div className="space-y-2">
        {actions.map((a) => {
          const overdue = a.status !== 'done' && a.due_date && a.due_date < today
          return (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="text-sm font-medium">{a.description}</div>
                <div className="text-xs text-gray-500">
                  {a.audit_findings?.audits?.patients?.full_name} ({a.audit_findings?.audits?.patients?.mrn}) --
                  {' '}{a.audit_findings?.checklist_items?.title} -- owner: {a.owner?.full_name ?? 'unassigned'}
                </div>
                <div className={`text-xs mt-1 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                  due {a.due_date ?? '-'} {overdue && '(overdue)'}
                </div>
              </div>
              {a.status !== 'done' ? (
                <button onClick={() => markStatus(a.id, 'done')} className="text-xs bg-emerald-700 text-white rounded-lg px-3 py-1.5">
                  Mark done
                </button>
              ) : (
                <span className="text-xs text-gray-400">closed {a.closed_at ? new Date(a.closed_at).toLocaleDateString() : ''}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

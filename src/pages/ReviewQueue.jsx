import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ReviewQueue() {
  const [audits, setAudits] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('audits')
      .select('id, audit_type, score, risk_level, created_at, patients(full_name, mrn)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
    setAudits(data ?? [])
  }

  if (!audits) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Review Queue</h1>
      <p className="text-sm text-gray-500 mb-6">
        Nothing here counts toward dashboards or QAPI trends until a reviewer confirms it.
      </p>
      {audits.length === 0 && <p className="text-gray-400">Nothing pending review.</p>}
      <div className="space-y-2">
        {audits.map((a) => (
          <Link
            key={a.id}
            to={`/audits/${a.id}`}
            className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-600"
          >
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{a.patients?.full_name} <span className="text-gray-400 text-sm">({a.patients?.mrn})</span></div>
                <div className="text-xs text-gray-500">{a.audit_type} -- submitted {new Date(a.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">preview score: {a.score}/100</div>
                <span className={`risk-badge risk-${a.risk_level}`}>{a.risk_level}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Findings() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('audit_findings')
      .select('status, checklist_items(title), audits!inner(status)')
      .eq('audits.status', 'confirmed')
      .in('status', ['fail', 'flag'])

    const byTitle = {}
    for (const r of data ?? []) {
      const title = r.checklist_items?.title ?? 'Unknown'
      byTitle[title] = byTitle[title] ?? { fail: 0, flag: 0 }
      byTitle[title][r.status] += 1
    }
    const list = Object.entries(byTitle)
      .map(([title, counts]) => ({ title, ...counts, total: counts.fail + counts.flag }))
      .sort((a, b) => b.total - a.total)
    setRows(list)
  }

  if (!rows) return <p className="text-gray-500">Loading...</p>
  const max = Math.max(1, ...rows.map((r) => r.total))

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Findings by Category</h1>
      <p className="text-sm text-gray-500 mb-6">
        Recurring deficiencies across confirmed audits -- this is the trend QAPI needs to see, not just individual chart results.
      </p>
      {rows.length === 0 && <p className="text-gray-400">No confirmed Fail/Flag findings yet.</p>}
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.title} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{r.title}</span>
              <span className="text-gray-500">{r.fail} fail / {r.flag} flag</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-3 bg-red-500" style={{ width: `${(r.fail / max) * 100}%` }} />
              <div className="h-3 bg-amber-400" style={{ width: `${(r.flag / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

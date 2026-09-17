import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Archive, ArchiveRestore, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { computeScore } from '../lib/scoring'
import { riskLabel } from '../lib/format'

export default function AuditDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [audit, setAudit] = useState(null)
  const [findings, setFindings] = useState([])
  const [checklistItemsById, setChecklistItemsById] = useState({})
  const [actions, setActions] = useState([])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const canEdit = role === 'reviewer' || role === 'admin'

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    const { data: auditRow } = await supabase
      .from('audits')
      .select('*, patients(full_name, mrn, admission_date)')
      .eq('id', id)
      .single()
    setAudit(auditRow)

    const { data: findingRows } = await supabase
      .from('audit_findings')
      .select('*, checklist_items(id, title, guidance_text, status_options, sort_order, is_critical_trigger, fail_weight, flag_weight)')
      .eq('audit_id', id)
    const sorted = (findingRows ?? []).sort((a, b) => a.checklist_items.sort_order - b.checklist_items.sort_order)
    setFindings(sorted)
    setChecklistItemsById(Object.fromEntries(sorted.map((f) => [f.checklist_item_id, f.checklist_items])))

    if (auditRow?.status === 'confirmed') {
      const { data: actionRows } = await supabase
        .from('corrective_actions')
        .select('*, audit_findings!inner(audit_id, checklist_items(title))')
        .eq('audit_findings.audit_id', id)
      setActions(actionRows ?? [])
    }
  }

  function updateFinding(findingId, patch) {
    setFindings((prev) => prev.map((f) => (f.id === findingId ? { ...f, ...patch } : f)))
  }

  const preview = findings.length ? computeScore(findings, checklistItemsById) : null

  async function reopenForCorrection() {
    if (!confirm(
      'Reopen this confirmed audit for correction? It will move back to Pending Review so you can fix the ' +
      'wrong data, then re-confirm it. Any corrective actions already created from it will NOT be automatically ' +
      'updated -- review those separately if the correction changes which items failed.'
    )) return
    setSaving(true)
    const { error } = await supabase
      .from('audits')
      .update({ status: 'pending_review', confirmed_by: null, confirmed_at: null })
      .eq('id', id)
    setSaving(false)
    if (error) return setStatus(`Error: ${error.message}`)
    setStatus('Reopened -- edit below, then Confirm audit again when correct.')
    await load()
  }

  async function saveChanges(alsoConfirm) {
    setSaving(true)
    setStatus('')
    try {
      for (const f of findings) {
        const reviewerEdited = f.status !== f.original_status || f.finding_text !== f.original_finding_text
        await supabase
          .from('audit_findings')
          .update({ status: f.status, finding_text: f.finding_text, reviewer_edited: reviewerEdited })
          .eq('id', f.id)
      }

      const { score, riskLevel } = computeScore(findings, checklistItemsById)
      const patch = { score, risk_level: riskLevel }
      if (alsoConfirm) {
        patch.status = 'confirmed'
        patch.confirmed_by = user.id
        patch.confirmed_at = new Date().toISOString()
      }
      const { error } = await supabase.from('audits').update(patch).eq('id', id)
      if (error) throw error

      setStatus(alsoConfirm ? 'Confirmed.' : 'Saved.')
      await load()
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (!audit) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-xs text-gray-500 mb-3 underline">&larr; Back</button>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-xl font-bold">{audit.patients?.full_name} <span className="text-gray-400 text-base">({audit.patients?.mrn})</span></h1>
          <p className="text-sm text-gray-500">
            {audit.audit_type} audit -- status: {audit.status}{audit.archived ? ' (archived)' : ''}
          </p>
        </div>
        <div className="flex items-start gap-4">
          <div className="text-right">
            <div className="text-lg font-bold">{preview?.score ?? audit.score}/100</div>
            <span className={`risk-badge risk-${preview?.riskLevel ?? audit.risk_level}`}>{riskLabel(preview?.riskLevel ?? audit.risk_level)}</span>
          </div>
          {(role === 'admin' || role === 'reviewer') && (
            <button
              onClick={async () => { await supabase.from('audits').update({ archived: !audit.archived }).eq('id', id); load() }}
              title={audit.archived ? 'Unarchive' : 'Archive'}
              className="text-gray-400 hover:text-gray-700 mt-1"
            >
              {audit.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
            </button>
          )}
          {role === 'admin' && audit.status === 'confirmed' && (
            <button
              onClick={reopenForCorrection}
              disabled={saving}
              title="Reopen for correction"
              className="text-gray-400 hover:text-amber-600 mt-1"
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {findings.map((f) => (
          <div key={f.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium text-sm">{f.checklist_items.title}</div>
              {f.reviewer_edited && <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">edited from original</span>}
            </div>
            <p className="text-xs text-gray-400 mb-2">{f.checklist_items.guidance_text}</p>
            <div className="flex gap-3">
              <select
                disabled={!canEdit}
                value={f.status}
                onChange={(e) => updateFinding(f.id, { status: e.target.value })}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
              >
                {f.checklist_items.status_options.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <textarea
                disabled={!canEdit}
                value={f.finding_text ?? ''}
                onChange={(e) => updateFinding(f.id, { finding_text: e.target.value })}
                rows={2}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {canEdit && audit.status !== 'confirmed' && (
        <div className="flex gap-3 mb-4">
          <button onClick={() => saveChanges(false)} disabled={saving} className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm">
            Save changes
          </button>
          <button onClick={() => saveChanges(true)} disabled={saving} className="bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm">
            Confirm audit
          </button>
        </div>
      )}
      {status && <p className="text-sm text-gray-600 mb-4">{status}</p>}

      {audit.raw_report_text && (
        <details className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <summary className="text-sm cursor-pointer font-medium">Original pasted report</summary>
          <pre className="text-xs whitespace-pre-wrap mt-2 text-gray-600">{audit.raw_report_text}</pre>
        </details>
      )}

      {actions.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-2">Corrective actions from this audit</h2>
          <ul className="space-y-1 text-sm">
            {actions.map((a) => (
              <li key={a.id} className="bg-white border border-gray-200 rounded-lg p-3">
                {a.description} -- due {a.due_date} -- <span className="uppercase text-xs">{a.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

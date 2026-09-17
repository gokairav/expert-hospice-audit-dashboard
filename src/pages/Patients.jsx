import { useEffect, useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const empty = { full_name: '', mrn: '', primary_diagnosis: '', admission_date: '', current_bp_number: '', current_bp_end: '' }

function toFormShape(p) {
  return {
    full_name: p.full_name ?? '',
    mrn: p.mrn ?? '',
    primary_diagnosis: p.primary_diagnosis ?? '',
    admission_date: p.admission_date ?? '',
    current_bp_number: p.current_bp_number ?? '',
    current_bp_end: p.current_bp_end ?? '',
  }
}

function toDbShape(f) {
  return {
    ...f,
    current_bp_number: f.current_bp_number ? Number(f.current_bp_number) : null,
    admission_date: f.admission_date || null,
    current_bp_end: f.current_bp_end || null,
  }
}

export default function Patients() {
  const [patients, setPatients] = useState(null)
  const [form, setForm] = useState(empty)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(empty)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase.from('patients').select('*').order('full_name')
    setPatients(data ?? [])
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('patients').insert([toDbShape(form)])
    if (error) return setError(error.message)
    setForm(empty)
    setShowForm(false)
    load()
  }

  async function toggleStatus(p) {
    await supabase.from('patients').update({ status: p.status === 'active' ? 'discharged' : 'active' }).eq('id', p.id)
    load()
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditForm(toFormShape(p))
    setError('')
  }

  async function saveEdit() {
    setError('')
    const { error } = await supabase.from('patients').update(toDbShape(editForm)).eq('id', editingId)
    if (error) return setError(error.message)
    setEditingId(null)
    load()
  }

  if (!patients) return <p className="text-gray-500">Loading...</p>

  const inputCls = 'border rounded-lg px-2 py-1 text-xs w-full'

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-xl font-bold">Patients</h1>
        <button onClick={() => setShowForm((s) => !s)} className="text-sm bg-teal-600 text-white rounded-lg px-3 py-1.5">
          + Add patient
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Click the pencil on any row to fix a typo or update benefit period info.</p>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {showForm && (
        <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input required placeholder="MRN" value={form.mrn} onChange={(e) => setForm({ ...form, mrn: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input placeholder="Primary diagnosis" value={form.primary_diagnosis} onChange={(e) => setForm({ ...form, primary_diagnosis: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input type="date" placeholder="Admission date" value={form.admission_date} onChange={(e) => setForm({ ...form, admission_date: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input type="number" min="1" placeholder="Current BP #" value={form.current_bp_number} onChange={(e) => setForm({ ...form, current_bp_number: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input type="date" placeholder="Current BP end date" value={form.current_bp_end} onChange={(e) => setForm({ ...form, current_bp_end: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <button className="col-span-2 bg-teal-600 text-white rounded-lg py-2 text-sm">Save patient</button>
        </form>
      )}

      <table className="w-full text-sm bg-white border border-gray-200 rounded-xl overflow-hidden">
        <thead className="bg-gray-50 text-left text-xs text-gray-500">
          <tr>
            <th className="p-3">Name</th><th className="p-3">MRN</th><th className="p-3">Dx</th>
            <th className="p-3">Admitted</th><th className="p-3">BP #</th><th className="p-3">BP end</th>
            <th className="p-3">Status</th><th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) =>
            editingId === p.id ? (
              <tr key={p.id} className="border-t border-gray-100 bg-teal-50/40">
                <td className="p-2"><input className={inputCls} value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></td>
                <td className="p-2"><input className={inputCls} value={editForm.mrn} onChange={(e) => setEditForm({ ...editForm, mrn: e.target.value })} /></td>
                <td className="p-2"><input className={inputCls} value={editForm.primary_diagnosis} onChange={(e) => setEditForm({ ...editForm, primary_diagnosis: e.target.value })} /></td>
                <td className="p-2"><input type="date" className={inputCls} value={editForm.admission_date} onChange={(e) => setEditForm({ ...editForm, admission_date: e.target.value })} /></td>
                <td className="p-2"><input type="number" min="1" className={inputCls} value={editForm.current_bp_number} onChange={(e) => setEditForm({ ...editForm, current_bp_number: e.target.value })} /></td>
                <td className="p-2"><input type="date" className={inputCls} value={editForm.current_bp_end} onChange={(e) => setEditForm({ ...editForm, current_bp_end: e.target.value })} /></td>
                <td className="p-2 text-xs text-gray-400">{p.status}</td>
                <td className="p-2">
                  <div className="flex gap-1.5">
                    <button onClick={saveEdit} title="Save" className="text-teal-700 hover:text-teal-900"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} title="Cancel" className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="p-3">{p.full_name}</td>
                <td className="p-3">{p.mrn}</td>
                <td className="p-3">{p.primary_diagnosis ?? '-'}</td>
                <td className="p-3">{p.admission_date ?? '-'}</td>
                <td className="p-3">{p.current_bp_number ?? '-'}</td>
                <td className="p-3">{p.current_bp_end ?? '-'}</td>
                <td className="p-3">{p.status}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(p)} title="Edit" className="text-gray-400 hover:text-gray-700"><Pencil size={14} /></button>
                    <button onClick={() => toggleStatus(p)} className="text-xs underline text-gray-500 whitespace-nowrap">
                      {p.status === 'active' ? 'mark discharged' : 'mark active'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

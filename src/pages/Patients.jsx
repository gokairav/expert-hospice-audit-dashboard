import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const empty = { full_name: '', mrn: '', primary_diagnosis: '', admission_date: '', current_bp_number: '', current_bp_end: '' }

export default function Patients() {
  const [patients, setPatients] = useState(null)
  const [form, setForm] = useState(empty)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase.from('patients').select('*').order('full_name')
    setPatients(data ?? [])
  }

  async function save(e) {
    e.preventDefault()
    await supabase.from('patients').insert([{
      ...form,
      current_bp_number: form.current_bp_number ? Number(form.current_bp_number) : null,
      admission_date: form.admission_date || null,
      current_bp_end: form.current_bp_end || null,
    }])
    setForm(empty)
    setShowForm(false)
    load()
  }

  async function toggleStatus(p) {
    await supabase.from('patients').update({ status: p.status === 'active' ? 'discharged' : 'active' }).eq('id', p.id)
    load()
  }

  if (!patients) return <p className="text-gray-500">Loading...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Patients</h1>
        <button onClick={() => setShowForm((s) => !s)} className="text-sm bg-emerald-700 text-white rounded-lg px-3 py-1.5">
          + Add patient
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 grid grid-cols-2 gap-3">
          <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input required placeholder="MRN" value={form.mrn} onChange={(e) => setForm({ ...form, mrn: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input placeholder="Primary diagnosis" value={form.primary_diagnosis} onChange={(e) => setForm({ ...form, primary_diagnosis: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input type="date" placeholder="Admission date" value={form.admission_date} onChange={(e) => setForm({ ...form, admission_date: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input type="number" min="1" placeholder="Current BP #" value={form.current_bp_number} onChange={(e) => setForm({ ...form, current_bp_number: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input type="date" placeholder="Current BP end date" value={form.current_bp_end} onChange={(e) => setForm({ ...form, current_bp_end: e.target.value })} className="border rounded-lg px-2 py-1.5 text-sm" />
          <button className="col-span-2 bg-emerald-700 text-white rounded-lg py-2 text-sm">Save patient</button>
        </form>
      )}

      <table className="w-full text-sm bg-white border border-gray-200 rounded-xl overflow-hidden">
        <thead className="bg-gray-50 text-left text-xs text-gray-500">
          <tr><th className="p-3">Name</th><th className="p-3">MRN</th><th className="p-3">Dx</th><th className="p-3">BP end</th><th className="p-3">Status</th><th className="p-3"></th></tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id} className="border-t border-gray-100">
              <td className="p-3">{p.full_name}</td>
              <td className="p-3">{p.mrn}</td>
              <td className="p-3">{p.primary_diagnosis ?? '-'}</td>
              <td className="p-3">{p.current_bp_end ?? '-'}</td>
              <td className="p-3">{p.status}</td>
              <td className="p-3"><button onClick={() => toggleStatus(p)} className="text-xs underline text-gray-500">
                {p.status === 'active' ? 'mark discharged' : 'mark active'}
              </button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

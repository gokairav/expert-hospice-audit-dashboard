import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Admin() {
  const [users, setUsers] = useState(null)
  const [items, setItems] = useState(null)

  useEffect(() => {
    loadUsers()
    loadItems()
  }, [])

  async function loadUsers() {
    const { data } = await supabase.from('users_profiles').select('*').order('full_name')
    setUsers(data ?? [])
  }

  async function loadItems() {
    const { data } = await supabase
      .from('checklist_items')
      .select('*, checklist_versions(audit_type, is_active)')
      .order('sort_order')
    setItems(data ?? [])
  }

  async function updateUser(id, patch) {
    await supabase.from('users_profiles').update(patch).eq('id', id)
    loadUsers()
  }

  async function updateItem(id, patch) {
    await supabase.from('checklist_items').update(patch).eq('id', id)
    loadItems()
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-bold mb-1">Admin -- Users</h1>
        <p className="text-sm text-gray-500 mb-4">Accounts are created in Supabase Auth; manage role and digest here.</p>
        {!users && <p className="text-gray-500">Loading...</p>}
        {users && (
          <table className="w-full text-sm bg-white border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Weekly digest</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="p-3">{u.full_name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <select value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value })} className="border rounded-lg px-2 py-1 text-xs">
                      {['admin', 'reviewer', 'auditor', 'viewer'].map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <input type="checkbox" checked={u.receives_digest} onChange={(e) => updateUser(u.id, { receives_digest: e.target.checked })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h1 className="text-xl font-bold mb-1">Admin -- Checklist Rubrics</h1>
        <p className="text-sm text-gray-500 mb-4">
          Edit weights/guidance here instead of redeploying code -- historical audits keep the checklist version they were scored under.
        </p>
        {!items && <p className="text-gray-500">Loading...</p>}
        {items && ['admission', 'recert'].map((type) => (
          <div key={type} className="mb-6">
            <h2 className="font-semibold text-sm mb-2 capitalize">{type}</h2>
            <div className="space-y-2">
              {items.filter((i) => i.checklist_versions?.audit_type === type).map((i) => (
                <div key={i.id} className="bg-white border border-gray-200 rounded-xl p-3 flex gap-3 items-start">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{i.title}</div>
                    <textarea
                      defaultValue={i.guidance_text}
                      onBlur={(e) => e.target.value !== i.guidance_text && updateItem(i.id, { guidance_text: e.target.value })}
                      rows={2}
                      className="w-full border rounded-lg px-2 py-1 text-xs mt-1"
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <label className="text-[10px] text-gray-400">Fail weight</label>
                    <input
                      type="number" defaultValue={i.fail_weight}
                      onBlur={(e) => Number(e.target.value) !== i.fail_weight && updateItem(i.id, { fail_weight: Number(e.target.value) })}
                      className="w-full border rounded-lg px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <label className="text-[10px] text-gray-400">Critical trigger</label>
                    <input
                      type="checkbox" checked={i.is_critical_trigger}
                      onChange={(e) => updateItem(i.id, { is_critical_trigger: e.target.checked })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

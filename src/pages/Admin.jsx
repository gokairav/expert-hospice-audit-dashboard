import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const emptyNewUser = { email: '', full_name: '', role: 'auditor', password: '' }

function randomPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8)
}

export default function Admin() {
  const [users, setUsers] = useState(null)
  const [items, setItems] = useState(null)
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUser, setNewUser] = useState({ ...emptyNewUser, password: randomPassword() })
  const [newUserStatus, setNewUserStatus] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadUsers()
    loadItems()
  }, [])

  async function createUser(e) {
    e.preventDefault()
    setCreating(true)
    setNewUserStatus('')
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: newUser })
    setCreating(false)
    if (error) {
      setNewUserStatus(`Error: ${error.message}`)
      return
    }
    setNewUserStatus(
      `Created ${data.email} as ${data.role}. Temporary password: ${newUser.password} -- share it with them directly (Slack/text/verbally), they aren't emailed automatically.`
    )
    setNewUser({ ...emptyNewUser, password: randomPassword() })
    loadUsers()
  }

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
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-xl font-bold">Admin -- Users</h1>
          <button
            onClick={() => setShowNewUser((s) => !s)}
            className="flex items-center gap-1.5 text-sm bg-teal-600 text-white rounded-lg px-3 py-1.5"
          >
            <UserPlus size={15} /> Add user
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Manage roles and digest recipients, or create a new account below.</p>

        {showNewUser && (
          <form onSubmit={createUser} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
            <input required type="email" placeholder="Email" value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm" />
            <input required placeholder="Full name" value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm" />
            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm">
              {['admin', 'reviewer', 'auditor', 'viewer'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex gap-2">
              <input required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="flex-1 border rounded-lg px-2 py-1.5 text-sm font-mono" />
              <button type="button" onClick={() => setNewUser({ ...newUser, password: randomPassword() })}
                className="text-xs border rounded-lg px-2">regenerate</button>
            </div>
            <button disabled={creating} className="col-span-2 bg-teal-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">
              {creating ? 'Creating...' : 'Create account'}
            </button>
            {newUserStatus && <p className="col-span-2 text-xs text-gray-600">{newUserStatus}</p>}
          </form>
        )}

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

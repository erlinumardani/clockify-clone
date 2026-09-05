import { useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { useStore } from '../store'
import { Avatar, Badge, Button, Modal, PageHeader } from '../components/ui'
import type { Role } from '../types'
import { entrySeconds, formatDuration } from '../lib/time'

export default function Team() {
  const { state, dispatch, currentUser } = useStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const invite = () => {
    const em = email.trim()
    if (!em) return
    if (state.members.some((m) => m.email.toLowerCase() === em.toLowerCase())) return alert('That person is already in the workspace.')
    dispatch({ type: 'member/add', member: { id: crypto.randomUUID(), name: name.trim() || em.split('@')[0], email: em, role: 'Member', status: 'Pending', hourlyRate: null } })
    setOpen(false); setName(''); setEmail('')
  }

  const tracked = (id: string) => state.entries.filter((e) => e.userId === id).reduce((a, e) => a + entrySeconds(e), 0)

  return (
    <div>
      <PageHeader title="Team">
        <Button onClick={() => setOpen(true)}><UserPlus size={16} /> Add new member</Button>
      </PageHeader>
      <div className="ck-card overflow-x-auto">
        <table className="ck-table w-full min-w-[720px]">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Hourly rate</th><th className="text-right">Tracked</th><th>Status</th><th className="w-12" /></tr></thead>
          <tbody>
            {state.members.map((m) => {
              const isMe = m.id === currentUser.id
              return (
                <tr key={m.id} className="hover:bg-ck-bg/40">
                  <td>
                    <span className="inline-flex items-center gap-2"><Avatar name={m.name} size={28} /> {m.name} {isMe && <span className="text-xs text-ck-muted">(you)</span>}</span>
                  </td>
                  <td className="text-[#666]">{m.email}</td>
                  <td>
                    <select className="ck-select h-8" value={m.role} disabled={m.role === 'Owner'} onChange={(e) => dispatch({ type: 'member/update', id: m.id, patch: { role: e.target.value as Role } })}>
                      {(['Owner', 'Admin', 'Member'] as Role[]).map((r) => <option key={r} value={r} disabled={r === 'Owner'}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number" min={0}
                      className="ck-input h-8 w-28"
                      placeholder={`${state.settings.hourlyRate}`}
                      value={m.hourlyRate ?? ''}
                      onChange={(e) => dispatch({ type: 'member/update', id: m.id, patch: { hourlyRate: e.target.value === '' ? null : Number(e.target.value) } })}
                    />
                  </td>
                  <td className="text-right font-mono">{formatDuration(tracked(m.id), state.settings.durationFormat)}</td>
                  <td>
                    {m.status === 'Active' ? <Badge tone="green">Active</Badge> : (
                      <button type="button" onClick={() => dispatch({ type: 'member/update', id: m.id, patch: { status: 'Active' } })} title="Mark as joined">
                        <Badge tone="orange">Pending</Badge>
                      </button>
                    )}
                  </td>
                  <td className="text-center">
                    {m.role !== 'Owner' && (
                      <button type="button" className="text-ck-muted hover:text-ck-red" title="Remove" onClick={() => confirm(`Remove ${m.name} from the workspace?`) && dispatch({ type: 'member/delete', id: m.id })}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add new member" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={invite} disabled={!email.trim()}>Send invite</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="ck-label">Email</label>
            <input autoFocus type="email" className="ck-input" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && invite()} />
          </div>
          <div>
            <label className="ck-label">Name (optional)</label>
            <input className="ck-input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && invite()} />
          </div>
          <p className="text-xs text-ck-muted">This demo does not send invitation emails. The member appears as “Pending” until you mark them active.</p>
        </div>
      </Modal>
    </div>
  )
}

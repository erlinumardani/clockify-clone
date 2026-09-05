import { useState } from 'react'
import { Archive, ArchiveRestore, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Button, EmptyState, PageHeader } from '../components/ui'

export default function Clients() {
  const { state, dispatch, addClient } = useStore()
  const [name, setName] = useState('')
  const [filter, setFilter] = useState<'active' | 'archived'>('active')
  const list = state.clients.filter((c) => (filter === 'archived') === c.archived).sort((a, b) => a.name.localeCompare(b.name))

  const add = () => {
    const n = name.trim()
    if (!n) return
    addClient(n)
    setName('')
  }

  return (
    <div>
      <PageHeader title="Clients" />
      <div className="ck-card mb-4 flex flex-wrap items-center gap-2 p-3">
        <input className="ck-input min-w-[220px] flex-1" placeholder="Add new client" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add} disabled={!name.trim()}><Plus size={16} /> Add</Button>
        <select className="ck-select" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="active">Show active</option>
          <option value="archived">Show archived</option>
        </select>
      </div>
      <div className="ck-card overflow-hidden">
        {list.length === 0 ? (
          <EmptyState title={filter === 'active' ? 'No clients yet' : 'No archived clients'} hint="Clients help you group projects and filter reports." />
        ) : (
          <table className="ck-table w-full">
            <thead><tr><th>Name</th><th>Projects</th><th className="w-28 text-right">Actions</th></tr></thead>
            <tbody>
              {list.map((c) => {
                const projects = state.projects.filter((p) => p.clientId === c.id)
                return (
                  <tr key={c.id} className="hover:bg-ck-bg/40">
                    <td>
                      <input
                        className="w-full max-w-md rounded-sm border border-transparent bg-transparent px-2 py-1 outline-none hover:border-ck-border focus:border-ck-blue"
                        defaultValue={c.name}
                        onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.name) dispatch({ type: 'client/update', id: c.id, patch: { name: v } }); else e.target.value = c.name }}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      />
                    </td>
                    <td className="text-[#666]">{projects.length ? projects.map((p) => p.name).join(', ') : <span className="text-ck-muted">—</span>}</td>
                    <td className="text-right">
                      <button type="button" className="mr-2 text-ck-muted hover:text-ck-text" title={c.archived ? 'Restore' : 'Archive'} onClick={() => dispatch({ type: 'client/update', id: c.id, patch: { archived: !c.archived } })}>
                        {c.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                      </button>
                      <button type="button" className="text-ck-muted hover:text-ck-red" title="Delete" onClick={() => confirm(`Delete client "${c.name}"? Projects will keep existing without a client.`) && dispatch({ type: 'client/delete', id: c.id })}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

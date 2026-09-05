import { useState } from 'react'
import { Archive, ArchiveRestore, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Button, EmptyState, PageHeader } from '../components/ui'

export default function Tags() {
  const { state, dispatch, addTag } = useStore()
  const [name, setName] = useState('')
  const [filter, setFilter] = useState<'active' | 'archived'>('active')
  const list = state.tags.filter((t) => (filter === 'archived') === t.archived).sort((a, b) => a.name.localeCompare(b.name))

  const add = () => {
    const n = name.trim()
    if (!n) return
    if (state.tags.some((t) => t.name.toLowerCase() === n.toLowerCase())) return alert('A tag with that name already exists.')
    addTag(n)
    setName('')
  }

  return (
    <div>
      <PageHeader title="Tags" />
      <div className="ck-card mb-4 flex flex-wrap items-center gap-2 p-3">
        <input className="ck-input min-w-[220px] flex-1" placeholder="Add new tag" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button onClick={add} disabled={!name.trim()}><Plus size={16} /> Add</Button>
        <select className="ck-select" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="active">Show active</option>
          <option value="archived">Show archived</option>
        </select>
      </div>
      <div className="ck-card overflow-hidden">
        {list.length === 0 ? (
          <EmptyState title={filter === 'active' ? 'No tags yet' : 'No archived tags'} hint="Tags add another dimension to your time entries, e.g. “urgent” or “research”." />
        ) : (
          <table className="ck-table w-full">
            <thead><tr><th>Name</th><th className="text-right">Entries</th><th className="w-28 text-right">Actions</th></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="hover:bg-ck-bg/40">
                  <td>
                    <input
                      className="w-full max-w-md rounded-sm border border-transparent bg-transparent px-2 py-1 outline-none hover:border-ck-border focus:border-ck-blue"
                      defaultValue={t.name}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.name) dispatch({ type: 'tag/update', id: t.id, patch: { name: v } }); else e.target.value = t.name }}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    />
                  </td>
                  <td className="text-right text-[#666]">{state.entries.filter((e) => e.tagIds.includes(t.id)).length}</td>
                  <td className="text-right">
                    <button type="button" className="mr-2 text-ck-muted hover:text-ck-text" title={t.archived ? 'Restore' : 'Archive'} onClick={() => dispatch({ type: 'tag/update', id: t.id, patch: { archived: !t.archived } })}>
                      {t.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                    </button>
                    <button type="button" className="text-ck-muted hover:text-ck-red" title="Delete" onClick={() => confirm(`Delete tag "${t.name}"? It will be removed from all entries.`) && dispatch({ type: 'tag/delete', id: t.id })}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Check, Plus, Tag as TagIcon } from 'lucide-react'
import { useStore } from '../store'
import { Popover, cn } from './ui'

export function TagLabel({ tagIds, className }: { tagIds: string[]; className?: string }) {
  const { tagById } = useStore()
  const names = tagIds.map((id) => tagById(id)?.name).filter(Boolean)
  if (!names.length) return <TagIcon size={16} className={cn('text-ck-muted', className)} />
  return <span className={cn('truncate text-sm text-ck-text', className)}>{names.join(', ')}</span>
}

export function TagPicker({ value, onChange, align = 'left', className }: {
  value: string[]; onChange: (ids: string[]) => void; align?: 'left' | 'right'; className?: string
}) {
  const { state, addTag } = useStore()
  const [q, setQ] = useState('')
  const tags = state.tags.filter((t) => !t.archived && t.name.toLowerCase().includes(q.toLowerCase()))
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  const create = () => {
    const name = q.trim()
    if (!name) return
    const t = addTag(name)
    onChange([...value, t.id])
    setQ('')
  }
  return (
    <Popover
      align={align}
      width={260}
      className={className}
      trigger={() => (
        <button type="button" title="Tags" className="flex max-w-[180px] items-center rounded-sm px-2 py-1.5 hover:bg-black/5">
          <TagLabel tagIds={value} />
        </button>
      )}
    >
      {() => (
        <div className="flex max-h-[320px] flex-col">
          <div className="border-b border-ck-border-light p-2">
            <input autoFocus className="ck-input h-8" placeholder="Search tags..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && tags.length === 0 && create()} />
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {tags.map((t) => {
              const on = value.includes(t.id)
              return (
                <button key={t.id} type="button" onClick={() => toggle(t.id)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-ck-bg">
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded-sm border', on ? 'border-ck-blue bg-ck-blue text-white' : 'border-ck-border bg-white')}>
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                  {t.name}
                </button>
              )
            })}
            {tags.length === 0 && <div className="px-3 py-3 text-center text-sm text-ck-muted">No tags found</div>}
          </div>
          <div className="border-t border-ck-border-light p-2">
            <button type="button" disabled={!q.trim()} onClick={create} className="flex w-full items-center justify-center gap-1 rounded-sm border border-ck-blue py-1.5 text-xs font-medium uppercase tracking-wide text-ck-blue hover:bg-ck-blue-light disabled:opacity-40">
              <Plus size={14} /> Create {q.trim() ? `"${q.trim()}"` : 'new tag'}
            </button>
          </div>
        </div>
      )}
    </Popover>
  )
}

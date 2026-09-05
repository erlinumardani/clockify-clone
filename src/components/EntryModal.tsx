import { useEffect, useState } from 'react'
import { DollarSign, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Button, Modal, cn } from './ui'
import { ProjectPicker } from './ProjectPicker'
import { TagPicker } from './TagPicker'
import { formatDuration, fromDateKey, pad, parseTimeInput, toDateKey } from '../lib/time'
import type { TimeEntry } from '../types'

export interface EntryModalTarget {
  /** existing entry id, or null when creating */
  id: string | null
  start: Date
  end: Date
  description?: string
  projectId?: string | null
  taskId?: string | null
  tagIds?: string[]
  billable?: boolean
}

export function EntryModal({ target, onClose }: { target: EntryModalTarget | null; onClose: () => void }) {
  const { state, addEntry, updateEntry, deleteEntry } = useStore()
  const [description, setDescription] = useState('')
  const [project, setProject] = useState<{ projectId: string | null; taskId: string | null }>({ projectId: null, taskId: null })
  const [tagIds, setTagIds] = useState<string[]>([])
  const [billable, setBillable] = useState(false)
  const [date, setDate] = useState('')
  const [startStr, setStartStr] = useState('')
  const [endStr, setEndStr] = useState('')

  useEffect(() => {
    if (!target) return
    setDescription(target.description ?? '')
    setProject({ projectId: target.projectId ?? null, taskId: target.taskId ?? null })
    setTagIds(target.tagIds ?? [])
    setBillable(target.billable ?? state.settings.billableByDefault)
    setDate(toDateKey(target.start))
    setStartStr(`${pad(target.start.getHours())}:${pad(target.start.getMinutes())}`)
    setEndStr(`${pad(target.end.getHours())}:${pad(target.end.getMinutes())}`)
  }, [target, state.settings.billableByDefault])

  if (!target) return null

  const base = fromDateKey(date || toDateKey(new Date()))
  const start = parseTimeInput(startStr, base)
  let end = parseTimeInput(endStr, base)
  if (start && end && end <= start) end = new Date(end.getTime() + 86400000)
  const valid = !!start && !!end
  const seconds = valid ? Math.round((end!.getTime() - start!.getTime()) / 1000) : 0

  const save = () => {
    if (!valid) return
    const patch: Partial<TimeEntry> = {
      description, projectId: project.projectId, taskId: project.taskId, tagIds, billable,
      start: start!.toISOString(), end: end!.toISOString(),
    }
    if (target.id) updateEntry(target.id, patch)
    else addEntry({ description, projectId: project.projectId, taskId: project.taskId, tagIds, billable, start: start!, end: end! })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={target.id ? 'Edit time entry' : 'Add time entry'}
      footer={
        <>
          {target.id && (
            <Button variant="ghost" className="mr-auto text-ck-red" onClick={() => { if (confirm('Delete this time entry?')) { deleteEntry(target.id!); onClose() } }}>
              <Trash2 size={16} /> Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!valid}>{target.id ? 'Save' : 'Add'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="ck-label">Description</label>
          <input autoFocus className="ck-input" placeholder="What have you worked on?" value={description} onChange={(e) => setDescription(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 rounded-sm border border-ck-border">
            <ProjectPicker value={project} onChange={setProject} />
          </div>
          <div className="rounded-sm border border-ck-border">
            <TagPicker value={tagIds} onChange={setTagIds} align="right" />
          </div>
          <button
            type="button"
            title={billable ? 'Billable' : 'Non-billable'}
            onClick={() => setBillable(!billable)}
            className={cn('flex h-9 w-9 items-center justify-center rounded-sm border', billable ? 'border-ck-blue bg-ck-blue-light text-ck-blue' : 'border-ck-border text-ck-muted')}
          >
            <DollarSign size={16} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="ck-label">Start</label>
            <input className="ck-input" value={startStr} onChange={(e) => setStartStr(e.target.value)} placeholder="09:00" />
          </div>
          <div>
            <label className="ck-label">End</label>
            <input className="ck-input" value={endStr} onChange={(e) => setEndStr(e.target.value)} placeholder="10:00" />
          </div>
          <div>
            <label className="ck-label">Date</label>
            <input type="date" className="ck-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="text-sm text-[#666]">
          Duration: <span className={cn('font-mono', !valid && 'text-ck-red')}>{valid ? formatDuration(seconds) : 'invalid time'}</span>
        </div>
      </div>
    </Modal>
  )
}

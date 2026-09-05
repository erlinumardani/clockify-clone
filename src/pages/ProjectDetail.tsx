import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Button, ProjectDot, Tabs, Toggle, cn } from '../components/ui'
import { ColorPicker } from './Projects'
import { entrySeconds, formatDuration, formatMoney } from '../lib/time'
import type { Project } from '../types'

type Tab = 'tasks' | 'status' | 'settings'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dispatch, clientById, rateFor } = useStore()
  const project = state.projects.find((p) => p.id === id)
  const [tab, setTab] = useState<Tab>('tasks')
  const [taskName, setTaskName] = useState('')

  const entries = useMemo(() => state.entries.filter((e) => e.projectId === id), [state.entries, id])

  if (!project) {
    return (
      <div className="ck-card p-10 text-center">
        <div className="text-[#666]">Project not found.</div>
        <Link to="/projects" className="mt-2 inline-block text-ck-blue hover:underline">Back to projects</Link>
      </div>
    )
  }

  const total = entries.reduce((a, e) => a + entrySeconds(e), 0)
  const billableSecs = entries.filter((e) => e.billable).reduce((a, e) => a + entrySeconds(e), 0)
  const amount = entries.reduce((a, e) => a + (entrySeconds(e) / 3600) * rateFor(e), 0)
  const update = (patch: Partial<Project>) => dispatch({ type: 'project/update', id: project.id, patch })

  const addTask = () => {
    const name = taskName.trim()
    if (!name) return
    dispatch({ type: 'task/add', projectId: project.id, task: { id: crypto.randomUUID(), name, done: false } })
    setTaskName('')
  }

  const byTask = project.tasks.map((t) => ({ task: t, secs: entries.filter((e) => e.taskId === t.id).reduce((a, e) => a + entrySeconds(e), 0) }))
  const noTaskSecs = entries.filter((e) => !e.taskId).reduce((a, e) => a + entrySeconds(e), 0)
  const byMember = state.members.map((m) => ({ m, secs: entries.filter((e) => e.userId === m.id).reduce((a, e) => a + entrySeconds(e), 0) })).filter((x) => x.secs > 0)

  return (
    <div className="space-y-4">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-ck-muted hover:text-ck-text"><ArrowLeft size={14} /> Projects</Link>
      <div className="flex flex-wrap items-center gap-3">
        <ProjectDot color={project.color} size={14} />
        <h1 className="text-2xl font-light" style={{ color: project.color }}>{project.name}</h1>
        {project.clientId && <span className="text-[#666]">— {clientById(project.clientId)?.name}</span>}
        {project.archived && <span className="rounded-sm bg-black/5 px-2 py-0.5 text-xs font-medium uppercase text-ck-muted">Archived</span>}
        <span className="ml-auto font-mono text-lg text-[#555]">{formatDuration(total, state.settings.durationFormat)}</span>
      </div>

      <Tabs tabs={[{ id: 'tasks', label: 'Tasks' }, { id: 'status', label: 'Status' }, { id: 'settings', label: 'Settings' }]} value={tab} onChange={setTab} />

      {tab === 'tasks' && (
        <div className="ck-card">
          <div className="flex gap-2 border-b border-ck-border-light p-3">
            <input className="ck-input" placeholder="Add new task" value={taskName} onChange={(e) => setTaskName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
            <Button onClick={addTask} disabled={!taskName.trim()}><Plus size={16} /> Add</Button>
          </div>
          {project.tasks.length === 0 ? (
            <div className="px-4 py-10 text-center text-ck-muted">No tasks yet. Tasks let you split a project into smaller pieces.</div>
          ) : (
            <table className="ck-table w-full">
              <thead><tr><th>Task</th><th className="text-right">Tracked</th><th className="w-24 text-right">Status</th><th className="w-12" /></tr></thead>
              <tbody>
                {byTask.map(({ task, secs }) => (
                  <tr key={task.id} className="hover:bg-ck-bg/40">
                    <td>
                      <button type="button" className="inline-flex items-center gap-2" onClick={() => dispatch({ type: 'task/update', projectId: project.id, taskId: task.id, patch: { done: !task.done } })}>
                        <span className={cn('flex h-4 w-4 items-center justify-center rounded-sm border', task.done ? 'border-ck-green bg-ck-green text-white' : 'border-ck-border')}>{task.done && <Check size={12} strokeWidth={3} />}</span>
                        <span className={cn(task.done && 'text-ck-muted line-through')}>{task.name}</span>
                      </button>
                    </td>
                    <td className="text-right font-mono">{formatDuration(secs, state.settings.durationFormat)}</td>
                    <td className="text-right text-xs uppercase text-ck-muted">{task.done ? 'Done' : 'Active'}</td>
                    <td className="text-center">
                      <button type="button" className="text-ck-muted hover:text-ck-red" title="Delete task" onClick={() => confirm(`Delete task "${task.name}"?`) && dispatch({ type: 'task/delete', projectId: project.id, taskId: task.id })}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'status' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="ck-card p-4">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-ck-muted">Overview</div>
            <dl className="space-y-2 text-sm">
              <Row k="Total tracked" v={formatDuration(total, state.settings.durationFormat)} />
              <Row k="Billable" v={formatDuration(billableSecs, state.settings.durationFormat)} />
              <Row k="Amount" v={formatMoney(amount, state.settings.currency)} />
              <Row k="Entries" v={String(entries.length)} />
              {project.estimateHours != null && (
                <div>
                  <Row k="Estimate" v={`${(total / 3600).toFixed(1)}h of ${project.estimateHours}h`} />
                  <div className="mt-1 h-1.5 rounded-full bg-ck-border-light">
                    <div className={cn('h-1.5 rounded-full', total / 3600 > project.estimateHours ? 'bg-ck-red' : 'bg-ck-green')} style={{ width: `${Math.min(100, (total / 3600 / project.estimateHours) * 100)}%` }} />
                  </div>
                </div>
              )}
            </dl>
          </div>
          <div className="ck-card p-4">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-ck-muted">By task</div>
            <ul className="space-y-2 text-sm">
              {byTask.map(({ task, secs }) => <BarRow key={task.id} label={task.name} secs={secs} total={total} color={project.color} fmt={state.settings.durationFormat} />)}
              {noTaskSecs > 0 && <BarRow label="Without task" secs={noTaskSecs} total={total} color="#c6d2d9" fmt={state.settings.durationFormat} />}
              {total === 0 && <li className="text-ck-muted">No time tracked yet.</li>}
            </ul>
            <div className="mb-3 mt-6 text-xs font-medium uppercase tracking-wide text-ck-muted">By member</div>
            <ul className="space-y-2 text-sm">
              {byMember.map(({ m, secs }) => <BarRow key={m.id} label={m.name} secs={secs} total={total} color={project.color} fmt={state.settings.durationFormat} />)}
              {!byMember.length && <li className="text-ck-muted">No time tracked yet.</li>}
            </ul>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="ck-card space-y-4 p-4">
            <div>
              <label className="ck-label">Name</label>
              <input className="ck-input" value={project.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div>
              <label className="ck-label">Client</label>
              <select className="ck-select w-full" value={project.clientId ?? ''} onChange={(e) => update({ clientId: e.target.value || null })}>
                <option value="">No client</option>
                {state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="ck-label">Color</label>
              <ColorPicker value={project.color} onChange={(color) => update({ color })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="ck-label">Hourly rate ({state.settings.currency})</label>
                <input type="number" min={0} className="ck-input" placeholder={`Workspace: ${state.settings.hourlyRate}`} value={project.hourlyRate ?? ''} onChange={(e) => update({ hourlyRate: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div>
                <label className="ck-label">Estimate (hours)</label>
                <input type="number" min={0} className="ck-input" placeholder="None" value={project.estimateHours ?? ''} onChange={(e) => update({ estimateHours: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
            </div>
            <Toggle checked={project.billable} onChange={(billable) => update({ billable })} label="Billable by default" />
          </div>
          <div className="ck-card space-y-3 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-ck-muted">Danger zone</div>
            <p className="text-sm text-[#666]">Archiving hides the project from pickers but keeps its time entries. Deleting removes the project and unassigns its entries.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => update({ archived: !project.archived })}>{project.archived ? 'Restore' : 'Archive'}</Button>
              <Button variant="danger" onClick={() => { if (confirm(`Delete project "${project.name}"? Its ${entries.length} time entries will be kept without a project.`)) { dispatch({ type: 'project/delete', id: project.id }); navigate('/projects') } }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><dt className="text-[#666]">{k}</dt><dd className="font-mono">{v}</dd></div>
}

function BarRow({ label, secs, total, color, fmt }: { label: string; secs: number; total: number; color: string; fmt: 'full' | 'compact' | 'decimal' }) {
  return (
    <li>
      <div className="flex justify-between"><span>{label}</span><span className="font-mono text-[#666]">{formatDuration(secs, fmt)}</span></div>
      <div className="mt-1 h-1 rounded-full bg-ck-border-light"><div className="h-1 rounded-full" style={{ width: `${total ? (secs / total) * 100 : 0}%`, background: color }} /></div>
    </li>
  )
}

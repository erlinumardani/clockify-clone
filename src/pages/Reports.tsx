import { useMemo, useState } from 'react'
import { eachDayOfInterval, format, differenceInCalendarDays } from 'date-fns'
import { Download } from 'lucide-react'
import { useStore } from '../store'
import { Button, PageHeader, ProjectDot, Tabs, cn } from '../components/ui'
import { entrySeconds, formatDuration, formatMoney, formatTime, inRange, presetRange, RANGE_PRESETS, toDateKey, type RangePreset } from '../lib/time'
import type { TimeEntry } from '../types'

type Tab = 'summary' | 'detailed'

export default function Reports() {
  const { state, projectById, clientById, tagById, taskById, rateFor } = useStore()
  const { settings } = state
  const [tab, setTab] = useState<Tab>('summary')
  const [preset, setPreset] = useState<RangePreset>('thisWeek')
  const [custom, setCustom] = useState<[string, string]>(() => { const [f, t] = presetRange('thisWeek', settings.weekStart); return [toDateKey(f), toDateKey(t)] })
  const [projectFilter, setProjectFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [billableFilter, setBillableFilter] = useState<'all' | 'billable' | 'non'>('all')
  const [q, setQ] = useState('')

  const [from, to] = useMemo<[Date, Date]>(() => {
    if (preset === 'custom') {
      const [f, t] = custom
      const fd = new Date(f), td = new Date(t)
      return isNaN(fd.getTime()) || isNaN(td.getTime()) ? presetRange('thisWeek', settings.weekStart) : fd <= td ? [fd, td] : [td, fd]
    }
    return presetRange(preset, settings.weekStart)
  }, [preset, custom, settings.weekStart])

  const entries = useMemo(() => {
    return state.entries
      .filter((e) => e.end !== null && inRange(e, from, to))
      .filter((e) => !projectFilter || e.projectId === projectFilter)
      .filter((e) => !clientFilter || projectById(e.projectId)?.clientId === clientFilter)
      .filter((e) => !tagFilter || e.tagIds.includes(tagFilter))
      .filter((e) => billableFilter === 'all' || (billableFilter === 'billable') === e.billable)
      .filter((e) => !q || e.description.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.start.localeCompare(a.start))
  }, [state.entries, from, to, projectFilter, clientFilter, tagFilter, billableFilter, q, projectById])

  const amount = (e: TimeEntry) => (entrySeconds(e) / 3600) * rateFor(e)
  const total = entries.reduce((a, e) => a + entrySeconds(e), 0)
  const billableTotal = entries.filter((e) => e.billable).reduce((a, e) => a + entrySeconds(e), 0)
  const totalAmount = entries.reduce((a, e) => a + amount(e), 0)

  // daily series (cap at 62 days for the bar chart; fall back to weekly buckets otherwise)
  const daily = useMemo(() => {
    const days = eachDayOfInterval({ start: from, end: to })
    const span = differenceInCalendarDays(to, from)
    const bucketByWeek = span > 62
    const map = new Map<string, number>()
    for (const e of entries) {
      const d = new Date(e.start)
      const key = bucketByWeek ? format(d, 'yyyy-ww') : toDateKey(d)
      map.set(key, (map.get(key) ?? 0) + entrySeconds(e))
    }
    if (bucketByWeek) {
      const seen = new Map<string, Date>()
      for (const d of days) { const k = format(d, 'yyyy-ww'); if (!seen.has(k)) seen.set(k, d) }
      return [...seen.entries()].map(([k, d]) => ({ label: format(d, 'MMM d'), secs: map.get(k) ?? 0 }))
    }
    return days.map((d) => ({ label: format(d, span > 14 ? 'd' : 'EEE d'), secs: map.get(toDateKey(d)) ?? 0 }))
  }, [entries, from, to])

  const byProject = useMemo(() => {
    const map = new Map<string, { secs: number; amount: number; items: Map<string, { secs: number; amount: number }> }>()
    for (const e of entries) {
      const key = e.projectId ?? ''
      const g = map.get(key) ?? { secs: 0, amount: 0, items: new Map() }
      const s = entrySeconds(e)
      g.secs += s; g.amount += amount(e)
      const desc = e.description || '(no description)'
      const it = g.items.get(desc) ?? { secs: 0, amount: 0 }
      it.secs += s; it.amount += amount(e)
      g.items.set(desc, it)
      map.set(key, g)
    }
    return [...map.entries()]
      .map(([id, g]) => ({ id: id || null, ...g, items: [...g.items.entries()].sort((a, b) => b[1].secs - a[1].secs) }))
      .sort((a, b) => b.secs - a.secs)
  }, [entries])

  const exportCsv = () => {
    const rows = [['Project', 'Client', 'Description', 'Task', 'Tags', 'Billable', 'Start', 'End', 'Duration (h)', 'Amount']]
    for (const e of entries) {
      const p = projectById(e.projectId)
      rows.push([
        p?.name ?? '', clientById(p?.clientId ?? null)?.name ?? '', e.description, taskById(e.projectId, e.taskId)?.name ?? '',
        e.tagIds.map((t) => tagById(t)?.name ?? '').join('; '), e.billable ? 'Yes' : 'No',
        format(new Date(e.start), 'yyyy-MM-dd HH:mm'), format(new Date(e.end!), 'yyyy-MM-dd HH:mm'),
        (entrySeconds(e) / 3600).toFixed(2), amount(e).toFixed(2),
      ])
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `jamify-report-${toDateKey(from)}_${toDateKey(to)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const maxDay = Math.max(1, ...daily.map((d) => d.secs))
  const activeProjects = state.projects.filter((p) => !p.archived || p.id === projectFilter)

  return (
    <div className="space-y-4">
      <PageHeader title="Reports">
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!entries.length}><Download size={14} /> Export CSV</Button>
      </PageHeader>

      {/* filters */}
      <div className="ck-card flex flex-wrap items-center gap-2 p-3">
        <select className="ck-select" value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)}>
          {RANGE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {preset === 'custom' && (
          <div className="flex items-center gap-1">
            <input type="date" className="ck-input w-auto" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} />
            <span className="text-ck-muted">–</span>
            <input type="date" className="ck-input w-auto" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} />
          </div>
        )}
        <span className="text-sm text-ck-muted">{format(from, 'MMM d, yyyy')} – {format(to, 'MMM d, yyyy')}</span>
        <div className="mx-1 hidden h-6 w-px bg-ck-border-light sm:block" />
        <select className="ck-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">All projects</option>
          {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="ck-select" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
          <option value="">All clients</option>
          {state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="ck-select" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="">All tags</option>
          {state.tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="ck-select" value={billableFilter} onChange={(e) => setBillableFilter(e.target.value as typeof billableFilter)}>
          <option value="all">Billable & non-billable</option>
          <option value="billable">Billable</option>
          <option value="non">Non-billable</option>
        </select>
        <input className="ck-input w-auto min-w-[160px]" placeholder="Description contains..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {/* summary tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Total time" value={formatDuration(total, settings.durationFormat)} />
        <Tile label="Billable time" value={formatDuration(billableTotal, settings.durationFormat)} />
        <Tile label="Amount" value={formatMoney(totalAmount, settings.currency)} />
        <Tile label="Entries" value={String(entries.length)} />
      </div>

      <Tabs tabs={[{ id: 'summary', label: 'Summary' }, { id: 'detailed', label: 'Detailed' }]} value={tab} onChange={setTab} />

      {tab === 'summary' && (
        <>
          {/* bar chart */}
          <div className="ck-card p-4">
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-ck-muted">Tracked time per {differenceInCalendarDays(to, from) > 62 ? 'week' : 'day'}</div>
            <div className="flex h-44 items-end gap-1 overflow-x-auto">
              {daily.map((d, i) => (
                <div key={i} className="group relative flex min-w-[14px] flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
                  <div
                    className="ck-grow w-full rounded-t-sm bg-ck-blue transition-colors group-hover:bg-ck-blue-dark"
                    style={{ height: `${(d.secs / maxDay) * 100}%`, minHeight: d.secs ? 2 : 0, animationDelay: `${i * 20}ms` }}
                  />
                  <div className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded-sm bg-ck-text px-1.5 py-0.5 font-mono text-[10px] text-white group-hover:block">{formatDuration(d.secs, 'compact')}</div>
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-1 overflow-hidden">
              {daily.map((d, i) => <div key={i} className="min-w-[14px] flex-1 truncate text-center text-[10px] text-ck-muted">{d.label}</div>)}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="ck-card p-4">
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-ck-muted">By project</div>
              <Donut slices={byProject.map((g) => ({ value: g.secs, color: projectById(g.id)?.color ?? '#c6d2d9' }))} total={total} />
              <ul className="mt-4 space-y-2 text-sm">
                {byProject.map((g) => {
                  const p = projectById(g.id)
                  return (
                    <li key={g.id ?? 'none'} className="flex items-center gap-2">
                      <ProjectDot color={p?.color ?? '#c6d2d9'} />
                      <span className="min-w-0 flex-1 truncate">{p?.name ?? 'Without project'}</span>
                      <span className="text-ck-muted">{total ? Math.round((g.secs / total) * 100) : 0}%</span>
                      <span className="w-20 text-right font-mono">{formatDuration(g.secs, settings.durationFormat)}</span>
                    </li>
                  )
                })}
                {!byProject.length && <li className="text-ck-muted">No data</li>}
              </ul>
            </div>

            <div className="ck-card overflow-hidden">
              <table className="ck-table w-full">
                <thead>
                  <tr><th>Project / Description</th><th className="text-right">Duration</th><th className="text-right">Amount</th></tr>
                </thead>
                <tbody>
                  {byProject.map((g) => {
                    const p = projectById(g.id)
                    return (
                      <GroupRows key={g.id ?? 'none'} group={g} projectName={p?.name ?? 'Without project'} color={p?.color ?? '#c6d2d9'} clientName={clientById(p?.clientId ?? null)?.name} />
                    )
                  })}
                  {!byProject.length && <tr><td colSpan={3} className="py-10 text-center text-ck-muted">No time entries in this period</td></tr>}
                </tbody>
                {byProject.length > 0 && (
                  <tfoot>
                    <tr className="bg-ck-bg/60 font-medium">
                      <td>Total</td>
                      <td className="text-right font-mono">{formatDuration(total, settings.durationFormat)}</td>
                      <td className="text-right">{formatMoney(totalAmount, settings.currency)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'detailed' && (
        <div className="ck-card overflow-x-auto">
          <table className="ck-table w-full min-w-[760px]">
            <thead>
              <tr><th>Description</th><th>Project</th><th>Tags</th><th>Date</th><th>Time</th><th className="text-right">Duration</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const p = projectById(e.projectId)
                const task = taskById(e.projectId, e.taskId)
                return (
                  <tr key={e.id}>
                    <td>{e.description || <span className="text-ck-muted">(no description)</span>}</td>
                    <td>
                      {p ? (
                        <span className="inline-flex items-center gap-1.5" style={{ color: p.color }}>
                          <ProjectDot color={p.color} />{p.name}{task && <span className="text-ck-text">: {task.name}</span>}
                        </span>
                      ) : <span className="text-ck-muted">—</span>}
                    </td>
                    <td className="text-ck-muted">{e.tagIds.map((t) => tagById(t)?.name).filter(Boolean).join(', ') || '—'}</td>
                    <td className="whitespace-nowrap">{format(new Date(e.start), 'MMM d, yyyy')}</td>
                    <td className="whitespace-nowrap text-ck-muted">{formatTime(new Date(e.start), settings.timeFormat)} – {formatTime(new Date(e.end!), settings.timeFormat)}</td>
                    <td className="text-right font-mono">{formatDuration(entrySeconds(e), settings.durationFormat)}</td>
                    <td className={cn('text-right', !e.billable && 'text-ck-muted')}>{e.billable ? formatMoney(amount(e), settings.currency) : '—'}</td>
                  </tr>
                )
              })}
              {!entries.length && <tr><td colSpan={7} className="py-10 text-center text-ck-muted">No time entries in this period</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="ck-card px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ck-muted">{label}</div>
      <div className="mt-1 font-mono text-xl">{value}</div>
    </div>
  )
}

function GroupRows({ group, projectName, color, clientName }: {
  group: { secs: number; amount: number; items: [string, { secs: number; amount: number }][] }
  projectName: string; color: string; clientName?: string
}) {
  const { state } = useStore()
  const [open, setOpen] = useState(true)
  return (
    <>
      <tr className="cursor-pointer bg-white hover:bg-ck-bg/40" onClick={() => setOpen(!open)}>
        <td className="font-medium">
          <span className="inline-flex items-center gap-2"><ProjectDot color={color} /> {projectName}{clientName && <span className="font-normal text-ck-muted">- {clientName}</span>}</span>
        </td>
        <td className="text-right font-mono">{formatDuration(group.secs, state.settings.durationFormat)}</td>
        <td className="text-right">{formatMoney(group.amount, state.settings.currency)}</td>
      </tr>
      {open && group.items.map(([desc, it]) => (
        <tr key={desc} className="text-[#555]">
          <td className="pl-10">{desc}</td>
          <td className="text-right font-mono">{formatDuration(it.secs, state.settings.durationFormat)}</td>
          <td className="text-right">{formatMoney(it.amount, state.settings.currency)}</td>
        </tr>
      ))}
    </>
  )
}

export function Donut({ slices, total, size = 160 }: { slices: { value: number; color: string }[]; total: number; size?: number }) {
  const r = 40, c = 2 * Math.PI * r
  let offset = 0
  const { state } = useStore()
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e4eaee" strokeWidth="14" />
        {total > 0 && slices.map((s, i) => {
          const len = (s.value / total) * c
          const el = <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-sm">{formatDuration(total, state.settings.durationFormat)}</span>
        <span className="text-[10px] uppercase tracking-wide text-ck-muted">total</span>
      </div>
    </div>
  )
}

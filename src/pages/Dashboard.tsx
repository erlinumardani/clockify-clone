import { useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { PageHeader, ProjectDot } from '../components/ui'
import { Donut } from './Reports'
import { entrySeconds, formatDuration, formatMoney, presetRange, sumSeconds, weekDays, formatTime } from '../lib/time'

export default function Dashboard() {
  const { state, now, running, projectById, rateFor } = useStore()
  const { settings } = state
  const today = new Date()
  const days = weekDays(today, settings.weekStart)
  const [wFrom, wTo] = presetRange('thisWeek', settings.weekStart)

  const weekEntries = useMemo(() => {
    const f = wFrom.getTime(), t = wTo.getTime()
    return state.entries.filter((e) => { const s = new Date(e.start).getTime(); return s >= f && s <= t })
  }, [state.entries, wFrom, wTo])

  const todaySecs = sumSeconds(state.entries.filter((e) => isSameDay(new Date(e.start), today)), now)
  const weekSecs = sumSeconds(weekEntries, now)
  const billableSecs = sumSeconds(weekEntries.filter((e) => e.billable), now)
  const weekAmount = weekEntries.reduce((a, e) => a + (entrySeconds(e, now) / 3600) * rateFor(e), 0)
  const perDay = days.map((d) => sumSeconds(weekEntries.filter((e) => isSameDay(new Date(e.start), d)), now))
  const maxDay = Math.max(1, ...perDay)

  const byProject = useMemo(() => {
    const m = new Map<string | null, number>()
    for (const e of weekEntries) m.set(e.projectId, (m.get(e.projectId) ?? 0) + entrySeconds(e, now))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [weekEntries, now])

  const recent = useMemo(() => [...state.entries].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 8), [state.entries])

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard">
        <span className="text-sm text-ck-muted">{format(wFrom, 'MMM d')} – {format(wTo, 'MMM d, yyyy')}</span>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today" value={formatDuration(todaySecs, settings.durationFormat)} accent={!!running} />
        <Stat label="This week" value={formatDuration(weekSecs, settings.durationFormat)} />
        <Stat label="Billable this week" value={formatDuration(billableSecs, settings.durationFormat)} sub={weekSecs ? `${Math.round((billableSecs / weekSecs) * 100)}% of tracked` : undefined} />
        <Stat label="Earned this week" value={formatMoney(weekAmount, settings.currency)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="ck-card p-4">
          <div className="mb-4 text-xs font-medium uppercase tracking-wide text-ck-muted">Tracked time this week</div>
          <div className="flex h-52 items-end gap-3">
            {days.map((d, i) => {
              const isT = isSameDay(d, today)
              return (
                <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="font-mono text-[11px] text-[#666] opacity-0 transition-opacity group-hover:opacity-100">{formatDuration(perDay[i], 'compact')}</div>
                  <div className="relative w-full max-w-[56px] flex-1">
                    <div className="absolute inset-x-0 bottom-0 rounded-t-sm bg-ck-border-light" style={{ height: '100%' }} />
                    <div
                      className={`ck-grow absolute inset-x-0 bottom-0 rounded-t-sm ${isT ? 'bg-ck-blue' : 'bg-ck-blue/60'}`}
                      style={{ height: `${(perDay[i] / maxDay) * 100}%`, animationDelay: `${i * 60}ms` }}
                    />
                  </div>
                  <div className={`text-xs ${isT ? 'font-medium text-ck-blue' : 'text-ck-muted'}`}>{format(d, 'EEE')}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="ck-card p-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-ck-muted">Top projects</div>
          <Donut slices={byProject.map(([id, v]) => ({ value: v, color: projectById(id)?.color ?? '#c6d2d9' }))} total={weekSecs} size={140} />
          <ul className="mt-4 space-y-2 text-sm">
            {byProject.slice(0, 6).map(([id, v]) => {
              const p = projectById(id)
              return (
                <li key={id ?? 'none'}>
                  <div className="flex items-center gap-2">
                    <ProjectDot color={p?.color ?? '#c6d2d9'} />
                    <span className="min-w-0 flex-1 truncate">{p ? <Link to={`/projects/${p.id}`} className="hover:underline">{p.name}</Link> : 'Without project'}</span>
                    <span className="font-mono text-[#666]">{formatDuration(v, settings.durationFormat)}</span>
                  </div>
                  <div className="ml-4 mt-1 h-1 rounded-full bg-ck-border-light">
                    <div className="h-1 rounded-full" style={{ width: `${weekSecs ? (v / weekSecs) * 100 : 0}%`, background: p?.color ?? '#c6d2d9' }} />
                  </div>
                </li>
              )
            })}
            {!byProject.length && <li className="text-ck-muted">Nothing tracked this week yet.</li>}
          </ul>
        </div>
      </div>

      <div className="ck-card overflow-hidden">
        <div className="border-b border-ck-border-light px-4 py-3 text-xs font-medium uppercase tracking-wide text-ck-muted">Recent activity</div>
        <ul>
          {recent.map((e) => {
            const p = projectById(e.projectId)
            const isRunning = e.end === null
            return (
              <li key={e.id} className="flex items-center gap-3 border-b border-ck-border-light px-4 py-2.5 text-sm last:border-b-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${isRunning ? 'bg-ck-red ck-pulse' : ''}`} style={!isRunning ? { background: p?.color ?? '#c6d2d9' } : undefined} />
                <span className="min-w-0 flex-1 truncate">{e.description || <span className="text-ck-muted">(no description)</span>}</span>
                {p && <span className="hidden truncate text-xs sm:inline" style={{ color: p.color }}>{p.name}</span>}
                <span className="hidden whitespace-nowrap text-xs text-ck-muted md:inline">{format(new Date(e.start), 'MMM d')} · {formatTime(new Date(e.start), settings.timeFormat)}</span>
                <span className="w-20 text-right font-mono text-[#555]">{formatDuration(entrySeconds(e, now), settings.durationFormat)}</span>
              </li>
            )
          })}
          {!recent.length && <li className="px-4 py-8 text-center text-ck-muted">No activity yet. <Link to="/tracker" className="text-ck-blue hover:underline">Start tracking</Link>.</li>}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`ck-card px-4 py-3 ${accent ? 'border-l-[3px] border-l-ck-blue' : ''}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ck-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl font-light">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ck-muted">{sub}</div>}
    </div>
  )
}

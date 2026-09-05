import { supabase } from './supabase'
import { createSeedState, type SeedUser } from './seed'
import type { AppState, Client, Member, Project, Settings, Tag, Task, TimeEntry } from '../types'
import type { Action } from '../store'

/* ── row shapes ─────────────────────────────────────────────── */

interface WorkspaceRow {
  user_id: string; name: string; currency: string; hourly_rate: number; week_start: number
  time_format: string; duration_format: string; billable_by_default: boolean
}
interface MemberRow { id: string; name: string; email: string; role: string; status: string; hourly_rate: number | null }
interface ClientRow { id: string; name: string; archived: boolean }
interface ProjectRow {
  id: string; name: string; client_id: string | null; color: string; billable: boolean; archived: boolean
  hourly_rate: number | null; estimate_hours: number | null
}
interface TaskRow { id: string; project_id: string; name: string; done: boolean; position: number }
interface TagRow { id: string; name: string; archived: boolean }
interface EntryRow {
  id: string; description: string; project_id: string | null; task_id: string | null; tag_ids: string[]
  billable: boolean; start_at: string; end_at: string | null; member_id: string | null
}

const num = (v: number | string | null) => (v == null ? null : Number(v))

/* ── app → row ──────────────────────────────────────────────── */

const entryToRow = (e: TimeEntry): EntryRow => ({
  id: e.id, description: e.description, project_id: e.projectId, task_id: e.taskId, tag_ids: e.tagIds,
  billable: e.billable, start_at: e.start, end_at: e.end, member_id: e.userId,
})
function entryPatch(p: Partial<TimeEntry>): Partial<EntryRow> {
  const r: Partial<EntryRow> = {}
  if ('description' in p) r.description = p.description
  if ('projectId' in p) r.project_id = p.projectId ?? null
  if ('taskId' in p) r.task_id = p.taskId ?? null
  if ('tagIds' in p) r.tag_ids = p.tagIds
  if ('billable' in p) r.billable = p.billable
  if ('start' in p) r.start_at = p.start
  if ('end' in p) r.end_at = p.end ?? null
  if ('userId' in p) r.member_id = p.userId ?? null
  return r
}
const projectToRow = (p: Project): ProjectRow => ({
  id: p.id, name: p.name, client_id: p.clientId, color: p.color, billable: p.billable, archived: p.archived,
  hourly_rate: p.hourlyRate, estimate_hours: p.estimateHours,
})
function projectPatch(p: Partial<Project>): Partial<ProjectRow> {
  const r: Partial<ProjectRow> = {}
  if ('name' in p) r.name = p.name
  if ('clientId' in p) r.client_id = p.clientId ?? null
  if ('color' in p) r.color = p.color
  if ('billable' in p) r.billable = p.billable
  if ('archived' in p) r.archived = p.archived
  if ('hourlyRate' in p) r.hourly_rate = p.hourlyRate ?? null
  if ('estimateHours' in p) r.estimate_hours = p.estimateHours ?? null
  return r
}
const taskToRow = (t: Task, projectId: string, position: number): TaskRow => ({ id: t.id, project_id: projectId, name: t.name, done: t.done, position })
const memberToRow = (m: Member): MemberRow => ({ id: m.id, name: m.name, email: m.email, role: m.role, status: m.status, hourly_rate: m.hourlyRate })
function memberPatch(p: Partial<Member>): Partial<MemberRow> {
  const r: Partial<MemberRow> = {}
  if ('name' in p) r.name = p.name
  if ('email' in p) r.email = p.email
  if ('role' in p) r.role = p.role
  if ('status' in p) r.status = p.status
  if ('hourlyRate' in p) r.hourly_rate = p.hourlyRate ?? null
  return r
}
const settingsToRow = (s: Settings): Omit<WorkspaceRow, 'user_id'> => ({
  name: s.workspaceName, currency: s.currency, hourly_rate: s.hourlyRate, week_start: s.weekStart,
  time_format: s.timeFormat, duration_format: s.durationFormat, billable_by_default: s.billableByDefault,
})
function settingsPatch(p: Partial<Settings>): Partial<WorkspaceRow> {
  const r: Partial<WorkspaceRow> = {}
  if ('workspaceName' in p) r.name = p.workspaceName
  if ('currency' in p) r.currency = p.currency
  if ('hourlyRate' in p) r.hourly_rate = p.hourlyRate
  if ('weekStart' in p) r.week_start = p.weekStart
  if ('timeFormat' in p) r.time_format = p.timeFormat
  if ('durationFormat' in p) r.duration_format = p.durationFormat
  if ('billableByDefault' in p) r.billable_by_default = p.billableByDefault
  return r
}

/* ── row → app ──────────────────────────────────────────────── */

const rowToEntry = (r: EntryRow, fallbackMember: string): TimeEntry => ({
  id: r.id, description: r.description, projectId: r.project_id, taskId: r.task_id, tagIds: r.tag_ids ?? [],
  billable: r.billable, start: r.start_at, end: r.end_at, userId: r.member_id ?? fallbackMember,
})

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

/* ── load ───────────────────────────────────────────────────── */

export async function loadState(userId: string, seedUser: SeedUser): Promise<AppState> {
  const [ws, members, clients, projects, tasks, tags, entries] = await Promise.all([
    supabase.from('workspaces').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('members').select('*').order('created_at'),
    supabase.from('clients').select('*').order('created_at'),
    supabase.from('projects').select('*').order('created_at'),
    supabase.from('tasks').select('*').order('position').order('created_at'),
    supabase.from('tags').select('*').order('created_at'),
    supabase.from('time_entries').select('*').order('start_at', { ascending: false }),
  ])
  const wsRow = check<WorkspaceRow | null>(ws)
  if (!wsRow) {
    // first sign-in: create the workspace with demo data
    const seed = createSeedState(seedUser)
    await replaceAll(userId, seed)
    return seed
  }
  const memberRows = check<MemberRow[]>(members)
  const taskRows = check<TaskRow[]>(tasks)
  const memberList: Member[] = memberRows.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role as Member['role'], status: m.status as Member['status'], hourlyRate: num(m.hourly_rate) }))
  const owner = memberList.find((m) => m.role === 'Owner') ?? memberList[0]
  return {
    version: 1,
    settings: {
      workspaceName: wsRow.name, currency: wsRow.currency, hourlyRate: Number(wsRow.hourly_rate),
      weekStart: (wsRow.week_start === 0 ? 0 : 1), timeFormat: wsRow.time_format as Settings['timeFormat'],
      durationFormat: wsRow.duration_format as Settings['durationFormat'], billableByDefault: wsRow.billable_by_default,
    },
    members: memberList,
    currentUserId: owner?.id ?? '',
    clients: check<ClientRow[]>(clients).map((c): Client => ({ id: c.id, name: c.name, archived: c.archived })),
    tags: check<TagRow[]>(tags).map((t): Tag => ({ id: t.id, name: t.name, archived: t.archived })),
    projects: check<ProjectRow[]>(projects).map((p): Project => ({
      id: p.id, name: p.name, clientId: p.client_id, color: p.color, billable: p.billable, archived: p.archived,
      hourlyRate: num(p.hourly_rate), estimateHours: num(p.estimate_hours),
      tasks: taskRows.filter((t) => t.project_id === p.id).map((t): Task => ({ id: t.id, name: t.name, done: t.done })),
    })),
    entries: check<EntryRow[]>(entries).map((e) => rowToEntry(e, owner?.id ?? '')),
  }
}

/* ── replace everything (reset / import) ───────────────────── */

export async function replaceAll(userId: string, s: AppState): Promise<void> {
  // children first so foreign keys never block
  for (const table of ['time_entries', 'tasks', 'projects', 'clients', 'tags', 'members']) {
    check(await supabase.from(table).delete().eq('user_id', userId))
  }
  check(await supabase.from('workspaces').upsert({ user_id: userId, ...settingsToRow(s.settings) }))
  if (s.members.length) check(await supabase.from('members').insert(s.members.map(memberToRow)))
  if (s.clients.length) check(await supabase.from('clients').insert(s.clients.map((c) => ({ id: c.id, name: c.name, archived: c.archived }))))
  if (s.tags.length) check(await supabase.from('tags').insert(s.tags.map((t) => ({ id: t.id, name: t.name, archived: t.archived }))))
  if (s.projects.length) check(await supabase.from('projects').insert(s.projects.map(projectToRow)))
  const tasks = s.projects.flatMap((p) => p.tasks.map((t, i) => taskToRow(t, p.id, i)))
  if (tasks.length) check(await supabase.from('tasks').insert(tasks))
  // insert entries in chunks to stay well under request limits
  const rows = s.entries.map(entryToRow)
  for (let i = 0; i < rows.length; i += 500) check(await supabase.from('time_entries').insert(rows.slice(i, i + 500)))
}

/* ── write-through for each store action ───────────────────── */

export async function persist(userId: string, a: Action): Promise<void> {
  switch (a.type) {
    case 'entry/add':
      return void check(await supabase.from('time_entries').insert(entryToRow(a.entry)))
    case 'entry/update':
      return void check(await supabase.from('time_entries').update(entryPatch(a.patch)).eq('id', a.id))
    case 'entry/delete':
      return void check(await supabase.from('time_entries').delete().eq('id', a.id))
    case 'entry/deleteMany':
      if (!a.ids.length) return
      return void check(await supabase.from('time_entries').delete().in('id', a.ids))
    case 'timer/start':
      check(await supabase.from('time_entries').update({ end_at: a.entry.start }).is('end_at', null).eq('user_id', userId))
      return void check(await supabase.from('time_entries').insert(entryToRow(a.entry)))
    case 'timer/stop':
      return void check(await supabase.from('time_entries').update({ end_at: a.at }).is('end_at', null).eq('user_id', userId))
    case 'project/add':
      return void check(await supabase.from('projects').insert(projectToRow(a.project)))
    case 'project/update':
      return void check(await supabase.from('projects').update(projectPatch(a.patch)).eq('id', a.id))
    case 'project/delete':
      return void check(await supabase.from('projects').delete().eq('id', a.id))
    case 'task/add': {
      const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('project_id', a.projectId)
      return void check(await supabase.from('tasks').insert(taskToRow(a.task, a.projectId, count ?? 0)))
    }
    case 'task/update':
      return void check(await supabase.from('tasks').update({ ...('name' in a.patch ? { name: a.patch.name } : {}), ...('done' in a.patch ? { done: a.patch.done } : {}) }).eq('id', a.taskId))
    case 'task/delete':
      return void check(await supabase.from('tasks').delete().eq('id', a.taskId))
    case 'client/add':
      return void check(await supabase.from('clients').insert({ id: a.client.id, name: a.client.name, archived: a.client.archived }))
    case 'client/update':
      return void check(await supabase.from('clients').update(a.patch).eq('id', a.id))
    case 'client/delete':
      return void check(await supabase.from('clients').delete().eq('id', a.id))
    case 'tag/add':
      return void check(await supabase.from('tags').insert({ id: a.tag.id, name: a.tag.name, archived: a.tag.archived }))
    case 'tag/update':
      return void check(await supabase.from('tags').update(a.patch).eq('id', a.id))
    case 'tag/delete':
      return void check(await supabase.from('tags').delete().eq('id', a.id))
    case 'member/add':
      return void check(await supabase.from('members').insert(memberToRow(a.member)))
    case 'member/update':
      return void check(await supabase.from('members').update(memberPatch(a.patch)).eq('id', a.id))
    case 'member/delete':
      return void check(await supabase.from('members').delete().eq('id', a.id))
    case 'settings/update':
      return void check(await supabase.from('workspaces').update(settingsPatch(a.patch)).eq('user_id', userId))
    case 'state/replace':
      return replaceAll(userId, a.state)
  }
}

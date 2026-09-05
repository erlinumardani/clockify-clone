import { addDays, setHours, setMinutes, startOfDay } from 'date-fns'
import type { AppState, Client, Member, Project, Tag, TimeEntry } from '../types'

const uid = () => crypto.randomUUID()

// tiny seeded PRNG so the demo data is stable across resets
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export interface SeedUser {
  name: string
  email: string
}

export function createSeedState(user: SeedUser = { name: 'Me', email: 'me@example.com' }): AppState {
  const me: Member = { id: uid(), name: user.name, email: user.email, role: 'Owner', status: 'Active', hourlyRate: null }
  const members: Member[] = [
    me,
    { id: uid(), name: 'Ayu Lestari', email: 'ayu@example.com', role: 'Admin', status: 'Active', hourlyRate: 45 },
    { id: uid(), name: 'Bima Pratama', email: 'bima@example.com', role: 'Member', status: 'Active', hourlyRate: 35 },
    { id: uid(), name: 'Citra Dewi', email: 'citra@example.com', role: 'Member', status: 'Pending', hourlyRate: null },
  ]

  const clients: Client[] = [
    { id: uid(), name: 'Acme Corp', archived: false },
    { id: uid(), name: 'Globex', archived: false },
    { id: uid(), name: 'Initech', archived: false },
  ]

  const projects: Project[] = [
    {
      id: uid(), name: 'Website Redesign', clientId: clients[0].id, color: '#03a9f4', billable: true, archived: false,
      hourlyRate: 60, estimateHours: 120,
      tasks: [
        { id: uid(), name: 'Design', done: false },
        { id: uid(), name: 'Frontend', done: false },
        { id: uid(), name: 'QA', done: false },
      ],
    },
    {
      id: uid(), name: 'Mobile App', clientId: clients[1].id, color: '#8bc34a', billable: true, archived: false,
      hourlyRate: 75, estimateHours: 200,
      tasks: [
        { id: uid(), name: 'API integration', done: false },
        { id: uid(), name: 'Onboarding flow', done: true },
      ],
    },
    {
      id: uid(), name: 'Marketing Campaign', clientId: clients[2].id, color: '#ff9800', billable: true, archived: false,
      hourlyRate: null, estimateHours: 40, tasks: [],
    },
    {
      id: uid(), name: 'Internal Meetings', clientId: null, color: '#9c27b0', billable: false, archived: false,
      hourlyRate: null, estimateHours: null, tasks: [],
    },
    {
      id: uid(), name: 'Legacy Migration', clientId: clients[0].id, color: '#607d8b', billable: true, archived: true,
      hourlyRate: 50, estimateHours: 80, tasks: [],
    },
  ]

  const tags: Tag[] = [
    { id: uid(), name: 'urgent', archived: false },
    { id: uid(), name: 'bug', archived: false },
    { id: uid(), name: 'research', archived: false },
    { id: uid(), name: 'meeting', archived: false },
  ]

  const descriptions: Record<string, string[]> = {
    [projects[0].id]: ['Hero section layout', 'Navigation component', 'Fix responsive footer', 'Design review with client', 'Accessibility audit'],
    [projects[1].id]: ['Auth flow', 'Push notifications', 'Sync offline cache', 'Crash on login screen', 'Release build 2.3'],
    [projects[2].id]: ['Landing page copy', 'Ad creative review', 'Newsletter draft'],
    [projects[3].id]: ['Daily standup', 'Sprint planning', '1:1 with Ayu', 'Retro'],
  }

  const rand = rng(42)
  const entries: TimeEntry[] = []
  const today = startOfDay(new Date())
  const workProjects = projects.filter((p) => !p.archived)

  for (let dayOffset = 20; dayOffset >= 0; dayOffset--) {
    const day = addDays(today, -dayOffset)
    const dow = day.getDay()
    if (dow === 0 || dow === 6) continue
    let cursor = setMinutes(setHours(day, 9), 0)
    const count = 3 + Math.floor(rand() * 3)
    for (let i = 0; i < count; i++) {
      const project = workProjects[Math.floor(rand() * workProjects.length)]
      const descs = descriptions[project.id]
      const description = descs[Math.floor(rand() * descs.length)]
      const minutes = 30 + Math.floor(rand() * 8) * 15
      const start = cursor
      const end = addDays(start, 0)
      end.setMinutes(end.getMinutes() + minutes)
      const tagIds: string[] = []
      if (project.id === projects[3].id) tagIds.push(tags[3].id)
      else if (rand() < 0.25) tagIds.push(tags[Math.floor(rand() * 3)].id)
      const task = project.tasks.length && rand() < 0.7 ? project.tasks[Math.floor(rand() * project.tasks.length)] : null
      if (dayOffset === 0 && end.getTime() > Date.now()) break
      entries.push({
        id: uid(), description, projectId: project.id, taskId: task?.id ?? null, tagIds,
        billable: project.billable, start: start.toISOString(), end: end.toISOString(), userId: me.id,
      })
      cursor = new Date(end.getTime() + (5 + Math.floor(rand() * 4)) * 5 * 60000)
    }
  }

  return {
    version: 1,
    clients, projects, tags, entries, members,
    settings: {
      workspaceName: `${user.name}'s workspace`,
      currency: 'USD',
      hourlyRate: 40,
      weekStart: 1,
      timeFormat: '24',
      durationFormat: 'full',
      billableByDefault: false,
    },
    currentUserId: me.id,
  }
}

export interface Client {
  id: string
  name: string
  archived: boolean
}

export interface Task {
  id: string
  name: string
  done: boolean
}

export interface Project {
  id: string
  name: string
  clientId: string | null
  color: string
  billable: boolean
  archived: boolean
  hourlyRate: number | null
  estimateHours: number | null
  tasks: Task[]
}

export interface Tag {
  id: string
  name: string
  archived: boolean
}

export interface TimeEntry {
  id: string
  description: string
  projectId: string | null
  taskId: string | null
  tagIds: string[]
  billable: boolean
  /** ISO string */
  start: string
  /** ISO string, null while the timer is running */
  end: string | null
  userId: string
}

export type Role = 'Owner' | 'Admin' | 'Member'

export interface Member {
  id: string
  name: string
  email: string
  role: Role
  status: 'Active' | 'Pending'
  hourlyRate: number | null
}

export type DurationFormat = 'full' | 'compact' | 'decimal'
export type TimeFormat = '12' | '24'

export interface Settings {
  workspaceName: string
  currency: string
  hourlyRate: number
  weekStart: 0 | 1
  timeFormat: TimeFormat
  durationFormat: DurationFormat
  billableByDefault: boolean
}

export interface AppState {
  version: number
  clients: Client[]
  projects: Project[]
  tags: Tag[]
  entries: TimeEntry[]
  members: Member[]
  settings: Settings
  currentUserId: string
}

export interface EntryDraft {
  description: string
  projectId: string | null
  taskId: string | null
  tagIds: string[]
  billable: boolean
}

export const PROJECT_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
  '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
  '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b', '#9e9e9e',
]

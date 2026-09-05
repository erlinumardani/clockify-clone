# Clockify clone

A front-end clone of [Clockify](https://clockify.me) built with React 19, TypeScript, Vite and Tailwind CSS v4.
All data lives in the browser's `localStorage` (no backend), and a fresh workspace is seeded with demo data.

## Features

- **Time Tracker** – start/stop timer, manual entry mode, entries grouped by week and day, inline editing of description, project/task, tags, billable flag, start/end time, date and duration; continue, duplicate and delete entries.
- **Calendar** – week/day grid with entries positioned by time, overlap layout, current-time line; click a slot to add, click an entry to edit.
- **Timesheet** – weekly grid per project/task, editable duration cells, add rows, copy last week.
- **Dashboard** – today/week totals, billable share, earnings, weekly bar chart, top projects, recent activity.
- **Reports** – date-range presets and custom ranges, filters (project, client, tag, billable, description), summary with daily bars and project donut, detailed list, CSV export.
- **Projects** – list with tracked time, amount, estimate progress; project page with tasks, status breakdown and settings (client, color, rate, estimate, archive, delete).
- **Clients, Tags, Team** – simple CRUD, archive/restore, roles and hourly rates.
- **Settings** – workspace name, currency, hourly rate, week start, time/duration format, billable default, JSON export/import, reset to demo data.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

```bash
npm run build   # type-check + production build into dist/
npm run preview # serve the production build
```

## Structure

```
src/
  types.ts            data model
  store.tsx           reducer + localStorage persistence + helpers (useStore)
  lib/time.ts         duration/time parsing and formatting, date ranges
  lib/seed.ts         demo workspace generator
  components/         Layout, UI kit, ProjectPicker, TagPicker, EntryModal
  pages/              TimeTracker, Calendar, Timesheet, Dashboard, Reports,
                      Projects, ProjectDetail, Clients, Tags, Team, Settings
```

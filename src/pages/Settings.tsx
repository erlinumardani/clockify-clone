import { useRef, useState } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'
import { useStore } from '../store'
import { Button, PageHeader, Toggle } from '../components/ui'
import type { AppState, DurationFormat, TimeFormat } from '../types'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'IDR', 'JPY', 'AUD', 'CAD', 'SGD', 'INR']

export default function SettingsPage() {
  const { state, dispatch, resetData, importData } = useStore()
  const s = state.settings
  const fileRef = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState(false)

  const set = (patch: Partial<typeof s>) => {
    dispatch({ type: 'settings/update', patch })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1200)
  }

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'jamify-workspace.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppState
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) throw new Error('bad format')
      if (confirm('Replace the current workspace with the imported data?')) importData(parsed)
    } catch {
      alert('Could not import: the file is not a valid workspace export.')
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Workspace settings">{saved && <span className="text-sm text-ck-green">Saved</span>}</PageHeader>

      <div className="space-y-4">
        <section className="ck-card space-y-4 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ck-muted">General</h2>
          <div>
            <label className="ck-label">Workspace name</label>
            <input className="ck-input" value={s.workspaceName} onChange={(e) => set({ workspaceName: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ck-label">Currency</label>
              <select className="ck-select w-full" value={s.currency} onChange={(e) => set({ currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="ck-label">Workspace hourly rate</label>
              <input type="number" min={0} className="ck-input" value={s.hourlyRate} onChange={(e) => set({ hourlyRate: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <Toggle checked={s.billableByDefault} onChange={(v) => set({ billableByDefault: v })} label="New time entries are billable by default" />
        </section>

        <section className="ck-card space-y-4 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ck-muted">Time & date</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="ck-label">Week starts on</label>
              <select className="ck-select w-full" value={s.weekStart} onChange={(e) => set({ weekStart: Number(e.target.value) as 0 | 1 })}>
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
              </select>
            </div>
            <div>
              <label className="ck-label">Time format</label>
              <select className="ck-select w-full" value={s.timeFormat} onChange={(e) => set({ timeFormat: e.target.value as TimeFormat })}>
                <option value="24">24-hour (14:30)</option>
                <option value="12">12-hour (2:30 PM)</option>
              </select>
            </div>
            <div>
              <label className="ck-label">Duration format</label>
              <select className="ck-select w-full" value={s.durationFormat} onChange={(e) => set({ durationFormat: e.target.value as DurationFormat })}>
                <option value="full">Full (01:30:00)</option>
                <option value="compact">Compact (1h 30m)</option>
                <option value="decimal">Decimal (1.50)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="ck-card space-y-3 p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ck-muted">Data</h2>
          <p className="text-sm text-[#666]">Everything in this workspace is stored in Supabase under your account. Export a backup, import one, or reset to the demo data.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportJson}><Download size={15} /> Export JSON</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import JSON</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }} />
            <Button variant="danger" onClick={() => confirm('Reset the workspace to demo data? All your entries will be lost.') && resetData()}><RotateCcw size={15} /> Reset to demo data</Button>
          </div>
        </section>
      </div>
    </div>
  )
}

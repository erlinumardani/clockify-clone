import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

export interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthApi {
  user: AuthUser
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthApi | null>(null)

function toUser(s: Session): AuthUser {
  const email = s.user.email ?? ''
  const meta = s.user.user_metadata as { name?: string; full_name?: string } | undefined
  return { id: s.user.id, email, name: meta?.name || meta?.full_name || email.split('@')[0] || 'Me' }
}

export function AuthProvider({ children }: { children: (user: AuthUser) => ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-ck-border border-t-ck-blue" />
      </div>
    )
  }
  if (!session) return <AuthPage />

  const user = toUser(session)
  return (
    <AuthContext.Provider value={{ user, signOut: async () => { await supabase.auth.signOut() } }}>
      {children(user)}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(null); setNotice(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: name.trim() || undefined } } })
        if (error) throw error
        if (!data.session) setNotice('Account created. Check your inbox and confirm your email address, then sign in.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-ck-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="text-2xl font-medium tracking-tight">clockify</span>
        </div>
        <form onSubmit={submit} className="ck-card space-y-4 p-6">
          <h1 className="text-lg font-normal">{mode === 'signin' ? 'Log in' : 'Create your account'}</h1>
          {mode === 'signup' && (
            <div>
              <label className="ck-label">Name</label>
              <input className="ck-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
            </div>
          )}
          <div>
            <label className="ck-label">Email</label>
            <input className="ck-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoComplete="email" autoFocus />
          </div>
          <div>
            <label className="ck-label">Password</label>
            <input className="ck-input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          </div>
          {error && <div className="rounded-sm bg-red-50 px-3 py-2 text-sm text-ck-red">{error}</div>}
          {notice && <div className="rounded-sm bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>}
          <button type="submit" disabled={busy} className="h-10 w-full rounded-sm bg-ck-blue text-sm font-medium uppercase tracking-wide text-white hover:bg-ck-blue-dark disabled:opacity-60">
            {busy ? 'Please wait…' : mode === 'signin' ? 'Log in' : 'Sign up'}
          </button>
          <div className="text-center text-sm text-[#666]">
            {mode === 'signin' ? (
              <>Don't have an account? <button type="button" className="text-ck-blue hover:underline" onClick={() => { setMode('signup'); setError(null) }}>Sign up</button></>
            ) : (
              <>Already have an account? <button type="button" className="text-ck-blue hover:underline" onClick={() => { setMode('signin'); setError(null) }}>Log in</button></>
            )}
          </div>
        </form>
        <p className="mt-4 text-center text-xs text-ck-muted">Your data is stored securely in Supabase and only visible to you.</p>
      </div>
    </div>
  )
}

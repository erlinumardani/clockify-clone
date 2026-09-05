import { createClient } from '@supabase/supabase-js'

// The publishable key is safe to ship to the browser: every table is protected by
// row level security, so a key alone grants no access to anyone else's data.
// Override with VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY when pointing at another project.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://zzvvpujhnqnycizqqmpw.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_DHrzrEMkCAFOcjrs9yaPww_uHFrk7VJ'

export const supabase = createClient(url, key)

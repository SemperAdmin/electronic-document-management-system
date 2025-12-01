import { createClient } from '@supabase/supabase-js'

let client: any = null

declare const __ENV_SUPABASE_URL: string
declare const __ENV_SUPABASE_ANON_KEY: string

export function getSupabase(): any {
  try {
    if (client) return client
    const url = ((import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined) || (typeof __ENV_SUPABASE_URL !== 'undefined' ? __ENV_SUPABASE_URL : undefined)
    const anonKey = ((import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY as string | undefined) || (typeof __ENV_SUPABASE_ANON_KEY !== 'undefined' ? __ENV_SUPABASE_ANON_KEY : undefined)
    if (!url || !anonKey) {
      console.warn('Supabase env missing', { url, anonKey })
    }
    if (url && anonKey) {
      client = createClient(url, anonKey)
    }
  } catch {}
  return client
}

export const supabase: any = getSupabase()
export const hasSupabase = !!getSupabase()

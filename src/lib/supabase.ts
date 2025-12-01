import { createClient } from '@supabase/supabase-js'

let client: any = null
let warned = false

declare const __ENV_SUPABASE_URL: string
declare const __ENV_SUPABASE_ANON_KEY: string

function resolveSupabaseConfig(): { url?: string; anonKey?: string } {
  try {
    const ie = (import.meta as any)?.env || {}
    const viaEnv = {
      url: (ie.VITE_SUPABASE_URL as string | undefined),
      anonKey: (ie.VITE_SUPABASE_ANON_KEY as string | undefined),
    }
    const viaGlobals = (globalThis as any).__SUPABASE_CONFIG || {}
    const viaDecl = {
      url: typeof __ENV_SUPABASE_URL !== 'undefined' ? __ENV_SUPABASE_URL : undefined,
      anonKey: typeof __ENV_SUPABASE_ANON_KEY !== 'undefined' ? __ENV_SUPABASE_ANON_KEY : undefined,
    }
    let viaStorage: { url?: string; anonKey?: string } = {}
    try {
      const sUrl = localStorage.getItem('supabase_url') || localStorage.getItem('VITE_SUPABASE_URL') || ''
      const sKey = localStorage.getItem('supabase_anon_key') || localStorage.getItem('VITE_SUPABASE_ANON_KEY') || ''
      viaStorage = {
        url: sUrl || undefined,
        anonKey: sKey || undefined,
      }
    } catch {}
    const url = viaEnv.url || viaDecl.url || viaGlobals.url || viaStorage.url
    const anonKey = viaEnv.anonKey || viaDecl.anonKey || viaGlobals.anonKey || viaStorage.anonKey
    return { url, anonKey }
  } catch {
    return {}
  }
}

export function getSupabase(): any {
  try {
    if (client) return client
    const { url, anonKey } = resolveSupabaseConfig()
    if (!url || !anonKey) {
      if (!warned) { console.warn('Supabase env missing', { url: url || '', anonKey: anonKey || '' }); warned = true }
      return null
    }
    client = createClient(String(url), String(anonKey))
  } catch {}
  return client
}

export const supabase: any = getSupabase()
export const hasSupabase = !!getSupabase()
export function getSupabaseUrl(): string | undefined {
  try {
    const { url } = resolveSupabaseConfig()
    return url
  } catch {
    return undefined
  }
}

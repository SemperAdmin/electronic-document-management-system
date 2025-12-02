import { createClient } from '@supabase/supabase-js'

let client: any = null
let warned = false

// In-memory cache for environments where localStorage is blocked (private browsing, incognito mode)
let memoryCache: { url?: string; anonKey?: string } = {}

declare const __ENV_SUPABASE_URL: string
declare const __ENV_SUPABASE_ANON_KEY: string

// NOTE: Supabase config resolution order intentionally fixed.
// Do NOT change env key names or remove sanitization.
// Runtime query params (?supabase_url & ?supabase_key) are for emergency prod debugging only.
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
    let localStorageAvailable = true
    try {
      const sUrl = localStorage.getItem('supabase_url') || localStorage.getItem('VITE_SUPABASE_URL') || ''
      const sKey = localStorage.getItem('supabase_anon_key') || localStorage.getItem('VITE_SUPABASE_ANON_KEY') || ''
      viaStorage = {
        url: sUrl || undefined,
        anonKey: sKey || undefined,
      }
    } catch (e) {
      // localStorage blocked (private/incognito mode) - use memory cache
      localStorageAvailable = false
      console.warn('localStorage unavailable (private mode?), using memory cache for Supabase config')
      viaStorage = memoryCache
    }
    const sanitize = (v?: string) => {
      if (!v) return v
      const trimmed = String(v).trim()
      const noTicks = trimmed.replace(/^`+|`+$/g, '').replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '')
      return noTicks
    }
    const url = sanitize(viaEnv.url || viaDecl.url || viaGlobals.url || viaStorage.url)
    const anonKey = sanitize(viaEnv.anonKey || viaDecl.anonKey || viaGlobals.anonKey || viaStorage.anonKey)

    // allow runtime query param override for prod debugging
    try {
      const params = new URLSearchParams(window.location.search)
      const qpUrl = sanitize(params.get('supabase_url') || undefined)
      const qpKey = sanitize(params.get('supabase_key') || undefined)
      const finalUrl = qpUrl || url
      const finalKey = qpKey || anonKey

      // Cache config to both localStorage (if available) and memory
      if (finalUrl && finalKey) {
        if (localStorageAvailable) {
          try {
            localStorage.setItem('supabase_url', finalUrl)
            localStorage.setItem('supabase_anon_key', finalKey)
            localStorage.setItem('VITE_SUPABASE_URL', finalUrl)
            localStorage.setItem('VITE_SUPABASE_ANON_KEY', finalKey)
          } catch (e) {
            console.warn('Failed to cache Supabase config to localStorage:', e)
          }
        }
        // Always cache to memory as fallback
        memoryCache = { url: finalUrl, anonKey: finalKey }
      }
      return { url: finalUrl, anonKey: finalKey }
    } catch {
      // Errors in this block are not critical, fall through to return the base url/key
    }
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
    return client
  } catch {
    return null
  }
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

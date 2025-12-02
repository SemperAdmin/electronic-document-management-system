import { createClient } from '@supabase/supabase-js'

// --- Forced Initialization for Mobile Stability ---
// This approach ensures the Supabase client is created immediately when this module
// is loaded, preventing race conditions or initialization failures on mobile browsers
// that may have issues with Vite's lazy environment variable loading.

// *** CRITICAL DIAGNOSTIC HARDCODE - MUST BE REMOVED AFTER FIX ***
const SUPABASE_URL = 'https://rjcbsaxdkggloyzjbbln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
// *** END HARDCODE ***

// In-memory cache for environments where localStorage is blocked
const memoryCache: { [key: string]: string } = {};

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

  get length(): number {
    return Object.keys(this.data).length;
  }

  clear(): void {
    this.data = {};
  }

  getItem(key: string): string | null {
    return this.data[key] || null;
  }

  key(index: number): string | null {
    return Object.keys(this.data)[index] || null;
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  setItem(key: string, value: string): void {
    this.data[key] = value;
  }
}

// Custom storage implementation that falls back to in-memory storage
// This is crucial for environments like iOS private browsing where localStorage is unavailable.
const safeLocalStorage = (() => {
  try {
    const testKey = '__supabase_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return localStorage;
  } catch (e) {
    console.warn('localStorage is not available. Falling back to in-memory storage for Supabase session.');
    return new MemoryStorage();
  }
})();

// Immediately create and export the client
export const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      storage: safeLocalStorage, // Use the safe storage implementation
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Maintain the original getSupabase function for compatibility
export function getSupabase(): any {
  return supabaseClient;
}

// Export a convenience getter for the URL if needed elsewhere
export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}

// Legacy exports for compatibility
export const supabase = supabaseClient;
export const hasSupabase = !!supabaseClient;

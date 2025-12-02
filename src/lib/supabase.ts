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

class MemoryStorage implements Storage {
  private data: { [key: string]: string } = {};

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

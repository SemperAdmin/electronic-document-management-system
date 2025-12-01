import { createClient } from '@supabase/supabase-js'

// --- Forced Initialization for Mobile Stability ---
// This approach ensures the Supabase client is created immediately when this module
// is loaded, preventing race conditions or initialization failures on mobile browsers
// that may have issues with Vite's lazy environment variable loading.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rjcbsaxdkggloyzjbbln.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqY2JzYXhka2dnbG95empibGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI5MTgwNDksImV4cCI6MjAxODQ5NDA0OX0.VWl-w6h--f4dG5qV-1_x2q-2-Gl-J-u-C-e-T-p-E-g';

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

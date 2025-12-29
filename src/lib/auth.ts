import { getSupabase } from './supabase'

export async function signUp(email: string, password: string) {
  const sb = getSupabase()
  if (!sb?.auth) return { data: null as any, error: new Error('supabase_not_initialized') } as any
  return await sb.auth.signUp({ email, password })
}

export async function signInWithPassword(email: string, password: string) {
  const sb = getSupabase()
  if (!sb?.auth) return { data: null as any, error: new Error('supabase_not_initialized') } as any
  return await sb.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  const sb = getSupabase()
  if (!sb?.auth) return { error: new Error('supabase_not_initialized') } as any
  return await sb.auth.signOut()
}

export async function getCurrentAuthUser() {
  const sb = getSupabase()
  if (!sb?.auth) return null
  const { data } = await sb.auth.getUser()
  return data?.user ?? null
}

export async function getSession() {
  const sb = getSupabase()
  if (!sb?.auth) return null
  const { data } = await sb.auth.getSession()
  return data?.session ?? null
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.access_token ?? null
}

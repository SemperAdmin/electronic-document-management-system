import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env.local')
let url = ''
let anonKey = ''
let serviceKey = ''
try {
  const raw = fs.readFileSync(envPath, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (key === 'VITE_SUPABASE_URL') url = val
    if (key === 'VITE_SUPABASE_ANON_KEY') anonKey = val
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = val
  }
} catch {}

if (!url || !anonKey || !serviceKey) {
  console.error('Missing env: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, anonKey)
const admin = createClient(url, serviceKey)

const email = `test${Date.now()}@example.com`
const password = 'Passw0rd!'

const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
if (createErr) {
  console.error('Admin create user failed:', createErr?.message || createErr)
  process.exit(1)
}

const userId = String(created?.user?.id || '')
if (!userId) {
  console.error('Auth user id missing after sign up')
  process.exit(1)
}

const edipi = '1234567890'
const encoder = new TextEncoder()
const subtle = (globalThis.crypto || (await import('node:crypto')).webcrypto).subtle

async function sha256Hex(input) {
  const digest = await subtle.digest('SHA-256', encoder.encode(input))
  return Buffer.from(digest).toString('hex')
}

const row = {
  id: userId,
  email,
  rank: 'Pvt',
  first_name: 'Test',
  last_name: 'User',
  service: 'Marine Corps',
  role: 'MEMBER',
  unit_uic: null,
  unit: 'N/A',
  company: 'N/A',
  is_unit_admin: false,
  is_command_staff: false,
  edipi,
  password_hash: await sha256Hex(password),
  edipi_hash: await sha256Hex(edipi),
}

const { error: upErr } = await supabase.from('edms_users').upsert(row)
if (upErr) {
  console.error('DB upsert failed:', upErr?.message || upErr)
  process.exit(1)
}

console.log('Test user created:', { id: userId, email })

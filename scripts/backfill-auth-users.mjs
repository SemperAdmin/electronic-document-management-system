import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

function loadEnv() {
  const envPath = path.join(root, '.env.local')
  try {
    const raw = fs.readFileSync(envPath, 'utf8')
    const lines = raw.split(/\r?\n/)
    const map = {}
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) {
        const key = m[1]
        let val = m[2]
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
        map[key] = val
      }
    }
    return map
  } catch {
    return {}
  }
}

const env = loadEnv()
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing env: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey)

async function getEdmsUsers() {
  const { data, error } = await admin.from('edms_users').select('*')
  if (error) throw error
  return data || []
}

async function backfill() {
  const users = await getEdmsUsers()
  let created = 0
  for (const u of users) {
    const email = String(u.email || '').trim()
    if (!email) continue
    try {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: 'TempP@ss1234',
        email_confirm: true,
        user_metadata: { edms_id: u.id }
      })
      if (error) {
        // Skip if user exists
        if (String(error?.message || '').toLowerCase().includes('already registered')) continue
        console.error(`Failed to create auth for ${email}:`, error.message)
        continue
      }
      created++
    } catch (e) {
      console.error(`Error creating user ${email}:`, e?.message || e)
    }
  }
  console.log(`Backfill complete. Auth users created: ${created}`)
}

backfill().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })


import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
  } catch { return {} }
}

const env = loadEnv()
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const emailArg = process.argv.find(a => a.startsWith('--email='))
const email = emailArg ? emailArg.split('=')[1] : ''
const newPasswordArg = process.argv.find(a => a.startsWith('--password='))
const newPassword = newPasswordArg ? newPasswordArg.split('=')[1] : 'TempP@ss1234'

if (!url || !serviceKey || !email) {
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/admin-set-password.mjs --email=user@example.com [--password=NewP@ss]')
  process.exit(1)
}

const admin = createClient(url, serviceKey)

async function findUserByEmail(email) {
  let page = 1
  const perPage = 100
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const found = (data?.users || []).find(u => String(u.email || '').toLowerCase() === String(email).toLowerCase())
    if (found) return found
    if (!data?.users?.length) break
    page++
  }
  return null
}

;(async () => {
  const user = await findUserByEmail(email)
  if (!user) { console.error('Auth user not found for', email); process.exit(1) }
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
  if (error) { console.error('Update failed:', error.message); process.exit(1) }
  console.log('Password updated for', email)
  process.exit(0)
})()


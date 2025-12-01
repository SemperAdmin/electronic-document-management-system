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
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Missing Supabase env: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(url, anonKey)

function readJsonDir(relDir) {
  const dir = path.join(root, relDir)
  const items = []
  try {
    const files = fs.readdirSync(dir)
    for (const f of files) {
      if (f.toLowerCase().endsWith('.json')) {
        const fp = path.join(dir, f)
        try {
          const raw = fs.readFileSync(fp, 'utf8')
          items.push(JSON.parse(raw))
        } catch {}
      }
    }
  } catch {}
  return items
}

async function migrateUsers() {
  const disk = readJsonDir('src/users')
  const byId = new Map()
  for (const u of disk) if (u && u.id) byId.set(u.id, u)
  const users = Array.from(byId.values())
  if (!users.length) return { count: 0 }
  const rows = users.map(u => ({
    id: String(u.id),
    email: u.email ?? null,
    rank: u.rank ?? null,
    first_name: u.firstName ?? null,
    last_name: u.lastName ?? null,
    mi: u.mi ?? null,
    service: u.service ?? null,
    role: u.role ?? null,
    unit_uic: u.unitUic ?? null,
    unit: u.unit ?? null,
    company: u.company ?? null,
    is_unit_admin: !!u.isUnitAdmin,
    is_command_staff: !!u.isCommandStaff,
    edipi: u.edipi != null ? String(u.edipi) : null,
  }))
  const { error } = await supabase.from('edms_users').upsert(rows)
  if (error) throw error
  return { count: rows.length }
}

async function migrateRequests() {
  const disk = readJsonDir('src/requests')
  const byId = new Map()
  for (const r of disk) if (r && r.id) byId.set(r.id, r)
  const reqs = Array.from(byId.values())
  if (!reqs.length) return { count: 0 }
  const rows = reqs.map(r => ({
    id: String(r.id),
    subject: String(r.subject || ''),
    due_date: r.dueDate ?? null,
    notes: r.notes ?? null,
    unit_uic: String(r.unitUic || ''),
    uploaded_by_id: String(r.uploadedById || ''),
    submit_for_user_id: r.submitForUserId ?? null,
    document_ids: Array.isArray(r.documentIds) ? r.documentIds.map(String) : [],
    created_at: String(r.createdAt || new Date().toISOString()),
    current_stage: r.currentStage ?? null,
    activity: Array.isArray(r.activity) ? r.activity : [],
  }))
  const { error } = await supabase.from('edms_requests').upsert(rows)
  if (error) throw error
  return { count: rows.length }
}

async function migrateDocuments() {
  const disk = readJsonDir('src/documents')
  const byId = new Map()
  for (const d of disk) if (d && d.id) byId.set(d.id, d)
  const docs = Array.from(byId.values())
  if (!docs.length) return { count: 0 }
  const rows = docs.map(d => ({
    id: String(d.id),
    name: String(d.name || ''),
    type: String(d.type || ''),
    size: Number(d.size || 0),
    uploaded_at: String(d.uploadedAt || new Date().toISOString()),
    category: String(d.category || ''),
    tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
    unit_uic: String(d.unitUic || ''),
    subject: String(d.subject || ''),
    due_date: d.dueDate ?? null,
    notes: d.notes ?? null,
    uploaded_by_id: d.uploadedById ?? null,
    current_stage: d.currentStage ?? null,
    request_id: d.requestId ?? null,
    file_url: d.fileUrl ?? null,
  }))
  const { error } = await supabase.from('edms_documents').upsert(rows)
  if (error) throw error
  return { count: rows.length }
}

;(async () => {
  try {
    console.log('Starting migration...')
    const u = await migrateUsers()
    console.log(`Users migrated: ${u.count}`)
    const r = await migrateRequests()
    console.log(`Requests migrated: ${r.count}`)
    const d = await migrateDocuments()
    console.log(`Documents migrated: ${d.count}`)
    console.log('Migration completed successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err?.message || err)
    process.exit(1)
  }
})()


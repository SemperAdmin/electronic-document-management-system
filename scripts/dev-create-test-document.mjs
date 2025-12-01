import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env.local')
let url = ''
let anonKey = ''
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
  }
} catch {}

if (!url || !anonKey) {
  console.error('Missing env: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(url, anonKey)

const now = new Date().toISOString()

const { data: users, error: uErr } = await supabase.from('edms_users').select('id').limit(1)
if (uErr || !users || users.length === 0) {
  console.error('No users found to attach request/document')
  process.exit(1)
}
const userId = users[0].id

const id = `doc-${Date.now()}`
const reqId = `req-${Date.now()}`
const req = {
  id: reqId,
  subject: 'Test Request',
  due_date: null,
  notes: 'Demo request',
  unit_uic: 'M11110',
  uploaded_by_id: userId,
  submit_for_user_id: userId,
  document_ids: [],
  created_at: now,
  current_stage: 'PLATOON_REVIEW',
  activity: []
}

const doc = {
  id,
  name: 'test.pdf',
  type: 'application/pdf',
  size: 12345,
  uploaded_at: now,
  category: 'administration',
  tags: [],
  unit_uic: 'M11110',
  subject: 'Test Document',
  due_date: null,
  notes: 'Demo insert',
  uploaded_by_id: userId,
  current_stage: 'PLATOON_REVIEW',
  request_id: reqId,
  file_url: 'https://example.com/test.pdf'
}

const { error: rErr } = await supabase.from('edms_requests').upsert(req)
if (rErr) {
  console.error('Insert request failed:', rErr?.message || rErr)
  process.exit(1)
}

const { error } = await supabase.from('edms_documents').upsert(doc)
if (error) {
  console.error('Insert failed:', error?.message || error)
  process.exit(1)
}

console.log('Inserted document:', id)

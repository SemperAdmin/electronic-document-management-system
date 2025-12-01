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

const { data, error } = await supabase
  .from('edms_documents')
  .select('*')
  .order('uploaded_at', { ascending: false })
  .limit(10)

if (error) {
  console.error('Error reading edms_documents:', error?.message || error)
  process.exit(1)
}

console.log(JSON.stringify(data ?? [], null, 2))

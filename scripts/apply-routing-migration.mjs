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
  console.error('❌ Missing Supabase env: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  console.error('')
  console.error('To apply this migration manually:')
  console.error('1. Go to your Supabase project dashboard')
  console.error('2. Navigate to the SQL Editor')
  console.error('3. Run the SQL from: supabase/migrations/012_add_request_routing_columns.sql')
  process.exit(1)
}

console.log('⚠️  Note: The Supabase JavaScript client cannot execute DDL statements directly.')
console.log('')
console.log('To apply the routing columns migration, please:')
console.log('1. Go to your Supabase project dashboard at:', url.replace('.supabase.co', '.supabase.co/project/_'))
console.log('2. Navigate to: SQL Editor (in the left sidebar)')
console.log('3. Create a new query and paste the following SQL:')
console.log('')
console.log('─'.repeat(80))

const migrationPath = path.join(root, 'supabase', 'migrations', '012_add_request_routing_columns.sql')
const sql = fs.readFileSync(migrationPath, 'utf8')
console.log(sql)

console.log('─'.repeat(80))
console.log('')
console.log('4. Click "Run" to execute the migration')
console.log('5. Verify the columns were added successfully')
console.log('')
console.log('After applying the migration, the command sections routing will work correctly!')

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
const serviceKey = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY

if (!url || !serviceKey) {
  console.error('Missing Supabase env: VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY')
  console.error('Note: You need the service role key to run SQL migrations.')
  console.error('You can also apply the migration manually via the Supabase dashboard.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function applySqlMigration(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8')
  console.log(`Applying migration: ${path.basename(filePath)}`)

  // Split by semicolons to execute each statement separately
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    if (!statement) continue

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      if (error) {
        console.error(`Error executing statement: ${statement.substring(0, 100)}...`)
        console.error(error)
      }
    } catch (err) {
      console.error(`Exception executing statement: ${statement.substring(0, 100)}...`)
      console.error(err)
    }
  }
}

async function applyAllMigrations() {
  const migrationsDir = path.join(root, 'supabase', 'migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`Found ${files.length} migration files`)

  for (const file of files) {
    const filePath = path.join(migrationsDir, file)
    await applySqlMigration(filePath)
  }
}

;(async () => {
  try {
    console.log('Starting SQL migrations...')
    await applyAllMigrations()
    console.log('SQL migrations completed successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err?.message || err)
    process.exit(1)
  }
})()

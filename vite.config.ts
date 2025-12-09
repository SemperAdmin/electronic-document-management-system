import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_PUBLIC_BASE || './',
    build: {
      outDir: 'docs'
    },
    plugins: [
    react(),
    {
      name: 'users-save-middleware',
      configureServer(server) {
        server.middlewares.use('/api/users/save', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const user = JSON.parse(body)
              const outDir = path.resolve(process.cwd(), 'src', 'users')
              if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
              const outFile = path.resolve(outDir, `${user.id}.json`)
              fs.writeFileSync(outFile, JSON.stringify(user, null, 2), 'utf-8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: String(e) }))
            }
          })
        })

        server.middlewares.use('/api/requests/save', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const request = JSON.parse(body)
              const outDir = path.resolve(process.cwd(), 'src', 'requests')
              if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
              const outFile = path.resolve(outDir, `${request.id}.json`)
              fs.writeFileSync(outFile, JSON.stringify(request, null, 2), 'utf-8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: String(e) }))
            }
          })
        })

        server.middlewares.use('/api/documents/save', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const doc = JSON.parse(body)
              const outDir = path.resolve(process.cwd(), 'src', 'documents')
              if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
              const outFile = path.resolve(outDir, `${doc.id}.json`)
              fs.writeFileSync(outFile, JSON.stringify(doc, null, 2), 'utf-8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: String(e) }))
            }
          })
        })

        server.middlewares.use('/api/unit-structure/save', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const structure = JSON.parse(body)
              const outDir = path.resolve(process.cwd(), 'src', 'unit-structure')
              if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
              if (structure && typeof structure === 'object') {
                for (const [uic, data] of Object.entries(structure)) {
                  const mcc = (data && typeof data === 'object' && (data as any)._mcc) ? String((data as any)._mcc) : ''
                  const unitName = (data && typeof data === 'object' && (data as any)._unitName) ? String((data as any)._unitName) : ''
                  const safeMcc = mcc.replace(/[^A-Za-z0-9_-]/g, '') || 'MCC'
                  const safeUnit = unitName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                  const base = `${uic}__${safeMcc}${safeUnit ? `__${safeUnit}` : ''}`
                  const file = path.resolve(outDir, `${base}.json`)
                  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
                }
              }
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: String(e) }))
            }
          })
        })

        server.middlewares.use('/api/unit-structure', (req, res, next) => {
          if (req.method !== 'GET') return next()
          try {
            const dir = path.resolve(process.cwd(), 'src', 'unit-structure')
            const merged = {} as Record<string, any>
            if (fs.existsSync(dir)) {
              const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json') && !/^(readme|unit-sections|sample)/i.test(f))
              for (const f of files) {
                try {
                  const raw = fs.readFileSync(path.join(dir, f), 'utf-8')
                  const data = JSON.parse(raw)
                  const uic = path.basename(f, '.json')
                  merged[uic] = data
                } catch {}
              }
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(merged))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
        })

        server.middlewares.use('/api/hqmc-structure/save', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body || '[]')
              const outDir = path.resolve(process.cwd(), 'src', 'hqmc-structure')
              if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
              const rows = Array.isArray(payload) ? payload : [payload]
              for (const row of rows) {
                if (!row || typeof row !== 'object') continue
                const divCode = String(row.division_code || '').replace(/[^A-Za-z0-9_-]/g, '')
                const divName = String(row.division_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                const branch = String(row.branch || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                if (!divCode || !branch) continue
                const base = `${divCode}${divName ? `__${divName}` : ''}__${branch}`
                const file = path.resolve(outDir, `${base}.json`)
                fs.writeFileSync(file, JSON.stringify({ division_code: row.division_code, division_name: row.division_name, branch: row.branch, description: row.description || '' }, null, 2), 'utf-8')
              }
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: String(e) }))
            }
          })
        })

        server.middlewares.use('/api/hqmc-structure', (req, res, next) => {
          if (req.method !== 'GET') return next()
          try {
            const dir = path.resolve(process.cwd(), 'src', 'hqmc-structure')
            const rows: any[] = []
            if (fs.existsSync(dir)) {
              const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json') && !/^(readme|sample)/i.test(f))
              for (const f of files) {
                try {
                  const raw = fs.readFileSync(path.join(dir, f), 'utf-8')
                  const data = JSON.parse(raw)
                  rows.push(data)
                } catch {}
              }
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(rows))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
        })

        server.middlewares.use('/api/permissions-audit/save', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              const entry = JSON.parse(body)
              const outDir = path.resolve(process.cwd(), 'src', 'audit')
              if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
              const logFile = path.resolve(outDir, 'permissions-log.json')
              let existing: any[] = []
              if (fs.existsSync(logFile)) {
                try { existing = JSON.parse(fs.readFileSync(logFile, 'utf-8')) } catch { existing = [] }
              }
              existing.push(entry)
              fs.writeFileSync(logFile, JSON.stringify(existing, null, 2), 'utf-8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: String(e) }))
            }
          })
        })

        // Supabase Storage: create signed upload URL for client-side uploads
        server.middlewares.use('/api/storage/sign-upload', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const json = JSON.parse(body || '{}')
              const pathKey = String(json.path || '')
              if (!pathKey) throw new Error('path_required')
              const url = env.VITE_SUPABASE_URL
              const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
              if (!url || !serviceKey) throw new Error('supabase_env_missing')
              const sb = createClient(url, serviceKey)
              try { await sb.storage.createBucket('edms-docs', { public: true }) } catch {}
              const { data, error } = await sb.storage.from('edms-docs').createSignedUploadUrl(pathKey)
              if (error) throw error
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, signedUrl: data?.signedUrl, path: data?.path }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: String((e as any)?.message || e) }))
            }
          })
        })
      }
    }
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src')
      }
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      __ENV_SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL || ''),
      __ENV_SUPABASE_ANON_KEY: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    server: {
      middlewareMode: false
    }
  }
})

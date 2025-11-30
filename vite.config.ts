import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
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
              const outFile = path.resolve(outDir, 'unit-structure.json')
              fs.writeFileSync(outFile, JSON.stringify(structure, null, 2), 'utf-8')
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
            const outFile = path.resolve(process.cwd(), 'src', 'unit-structure', 'unit-structure.json')
            if (!fs.existsSync(outFile)) {
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({}))
              return
            }
            const content = fs.readFileSync(outFile, 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(content)
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
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src')
    }
  },
  server: {
    middlewareMode: false
  }
})

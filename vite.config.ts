import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

// Google Drive client initialization (lazy loaded)
let driveClient: ReturnType<typeof google.drive> | null = null
function getGoogleDriveClient(env: Record<string, string>) {
  if (driveClient) return driveClient

  const clientEmail = env.GOOGLE_CLIENT_EMAIL
  const privateKey = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    return null
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  driveClient = google.drive({ version: 'v3', auth })
  return driveClient
}

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

        // Google Drive Storage: Initialize resumable upload session
        // Returns uploadUri for direct client upload and fileId for finalization
        server.middlewares.use('/api/storage/init-upload', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const json = JSON.parse(body || '{}')
              const fileName = String(json.fileName || '')
              const mimeType = String(json.mimeType || 'application/octet-stream')
              const fileSize = Number(json.fileSize || 0)
              const folderPath = String(json.folderPath || '')

              if (!fileName) throw new Error('fileName_required')
              if (!fileSize) throw new Error('fileSize_required')

              const drive = getGoogleDriveClient(env)
              if (!drive) throw new Error('google_drive_not_configured')

              const rootFolderId = env.GOOGLE_DRIVE_FOLDER_ID
              if (!rootFolderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID_not_set')

              // Find or create folder structure (e.g., unitUic/requestId)
              let targetFolderId = rootFolderId
              if (folderPath) {
                const parts = folderPath.split('/').filter(Boolean)
                for (const folderName of parts) {
                  // Search for existing folder
                  const searchRes = await drive.files.list({
                    q: `name = '${folderName}' and '${targetFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                    fields: 'files(id)',
                  })
                  const existing = searchRes.data.files?.[0]
                  if (existing?.id) {
                    targetFolderId = existing.id
                  } else {
                    // Create new folder
                    const createRes = await drive.files.create({
                      requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [targetFolderId] },
                      fields: 'id',
                    })
                    if (!createRes.data.id) throw new Error('failed_to_create_folder')
                    targetFolderId = createRes.data.id
                  }
                }
              }

              // Get access token for resumable upload
              const auth = drive.context._options.auth as InstanceType<typeof google.auth.JWT>
              const accessToken = await auth.getAccessToken()
              if (!accessToken.token) throw new Error('failed_to_get_access_token')

              // Initiate resumable upload session
              const initResponse = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken.token}`,
                    'Content-Type': 'application/json',
                    'X-Upload-Content-Type': mimeType,
                    'X-Upload-Content-Length': String(fileSize),
                  },
                  body: JSON.stringify({ name: fileName, parents: [targetFolderId] }),
                }
              )

              if (!initResponse.ok) {
                const errorText = await initResponse.text()
                throw new Error(`resumable_init_failed: ${errorText}`)
              }

              const uploadUri = initResponse.headers.get('Location')
              if (!uploadUri) throw new Error('no_upload_uri_returned')

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, uploadUri, folderId: targetFolderId }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: String((e as any)?.message || e) }))
            }
          })
        })

        // Finalize upload: make file public and return the public URL
        server.middlewares.use('/api/storage/finalize-upload', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const json = JSON.parse(body || '{}')
              const fileId = String(json.fileId || '')
              if (!fileId) throw new Error('fileId_required')

              const drive = getGoogleDriveClient(env)
              if (!drive) throw new Error('google_drive_not_configured')

              // Make file public
              await drive.permissions.create({
                fileId,
                requestBody: { role: 'reader', type: 'anyone' },
              })

              // Get the public link
              const fileInfo = await drive.files.get({
                fileId,
                fields: 'webViewLink,webContentLink',
              })

              const publicUrl = fileInfo.data.webContentLink || fileInfo.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, publicUrl, fileId }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: String((e as any)?.message || e) }))
            }
          })
        })

        // Delete a file by its Google Drive file ID or URL
        server.middlewares.use('/api/storage/delete-object', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const json = JSON.parse(body || '{}')
              let fileId = String(json.fileId || json.path || '')
              if (!fileId) throw new Error('fileId_required')

              // Extract file ID from URL if a full URL was provided
              const urlPatterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/files\/([a-zA-Z0-9_-]+)/]
              for (const pattern of urlPatterns) {
                const match = fileId.match(pattern)
                if (match?.[1]) { fileId = match[1]; break }
              }

              const drive = getGoogleDriveClient(env)
              if (!drive) throw new Error('google_drive_not_configured')

              await drive.files.delete({ fileId })

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: String((e as any)?.message || e) }))
            }
          })
        })

        // Delete all files in a folder path
        server.middlewares.use('/api/storage/delete-folder', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const json = JSON.parse(body || '{}')
              const folderId = String(json.folderId || '')
              const folderPath = String(json.prefix || json.folderPath || '')

              const drive = getGoogleDriveClient(env)
              if (!drive) throw new Error('google_drive_not_configured')

              let targetFolderId = folderId

              // If folder path provided instead of ID, navigate to find the folder
              if (!targetFolderId && folderPath) {
                const rootFolderId = env.GOOGLE_DRIVE_FOLDER_ID
                if (!rootFolderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID_not_set')

                targetFolderId = rootFolderId
                const parts = folderPath.split('/').filter(Boolean)
                for (const folderName of parts) {
                  const searchRes = await drive.files.list({
                    q: `name = '${folderName}' and '${targetFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                    fields: 'files(id)',
                  })
                  const existing = searchRes.data.files?.[0]
                  if (!existing?.id) throw new Error(`folder_not_found: ${folderName}`)
                  targetFolderId = existing.id
                }
              }

              if (!targetFolderId) throw new Error('folderId_or_folderPath_required')

              // List and delete all files in the folder
              let deletedCount = 0
              let pageToken: string | undefined
              do {
                const listRes = await drive.files.list({
                  q: `'${targetFolderId}' in parents and trashed = false`,
                  fields: 'nextPageToken, files(id)',
                  pageSize: 100,
                  pageToken,
                })
                const files = listRes.data.files || []
                for (const file of files) {
                  if (file.id) {
                    await drive.files.delete({ fileId: file.id })
                    deletedCount++
                  }
                }
                pageToken = listRes.data.nextPageToken || undefined
              } while (pageToken)

              // Optionally delete the folder itself
              if (json.deleteFolder) {
                await drive.files.delete({ fileId: targetFolderId })
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, removed: deletedCount }))
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
      'import.meta.env.VITE_STORAGE_API_URL': JSON.stringify(env.VITE_STORAGE_API_URL || 'https://electronic-document-management-system.onrender.com'),
      __ENV_SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL || ''),
      __ENV_SUPABASE_ANON_KEY: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    server: {
      middlewareMode: false
    }
  }
})

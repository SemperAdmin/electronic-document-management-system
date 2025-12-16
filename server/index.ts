import express from 'express'
import cors from 'cors'
import { google } from 'googleapis'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Google Drive client
function getGoogleDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    return null
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  return google.drive({ version: 'v3', auth })
}

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

// Initialize resumable upload
app.post('/api/storage/init-upload', async (req, res) => {
  try {
    const { fileName, mimeType = 'application/octet-stream', fileSize, folderPath } = req.body

    if (!fileName) throw new Error('fileName_required')
    if (!fileSize) throw new Error('fileSize_required')

    const drive = getGoogleDriveClient()
    if (!drive) throw new Error('google_drive_not_configured')

    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    if (!rootFolderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID_not_set')

    // Find or create folder structure
    let targetFolderId = rootFolderId
    if (folderPath) {
      const parts = String(folderPath).split('/').filter(Boolean)
      for (const folderName of parts) {
        const searchRes = await drive.files.list({
          q: `name = '${folderName}' and '${targetFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id)',
        })
        const existing = searchRes.data.files?.[0]
        if (existing?.id) {
          targetFolderId = existing.id
        } else {
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
          'X-Upload-Content-Type': String(mimeType),
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

    res.json({ ok: true, uploadUri, folderId: targetFolderId })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

// Finalize upload - make public and return URL
app.post('/api/storage/finalize-upload', async (req, res) => {
  try {
    const { fileId } = req.body
    if (!fileId) throw new Error('fileId_required')

    const drive = getGoogleDriveClient()
    if (!drive) throw new Error('google_drive_not_configured')

    // Make file public
    await drive.permissions.create({
      fileId: String(fileId),
      requestBody: { role: 'reader', type: 'anyone' },
    })

    // Get the public link
    const fileInfo = await drive.files.get({
      fileId: String(fileId),
      fields: 'webViewLink,webContentLink',
    })

    const publicUrl = fileInfo.data.webContentLink || fileInfo.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`

    res.json({ ok: true, publicUrl, fileId })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

// Delete a file
app.post('/api/storage/delete-object', async (req, res) => {
  try {
    let fileId = String(req.body.fileId || req.body.path || '')
    if (!fileId) throw new Error('fileId_required')

    // Extract file ID from URL if needed
    const urlPatterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/files\/([a-zA-Z0-9_-]+)/]
    for (const pattern of urlPatterns) {
      const match = fileId.match(pattern)
      if (match?.[1]) { fileId = match[1]; break }
    }

    const drive = getGoogleDriveClient()
    if (!drive) throw new Error('google_drive_not_configured')

    await drive.files.delete({ fileId })

    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

// Delete folder contents
app.post('/api/storage/delete-folder', async (req, res) => {
  try {
    const { folderId: inputFolderId, prefix, folderPath, deleteFolder } = req.body

    const drive = getGoogleDriveClient()
    if (!drive) throw new Error('google_drive_not_configured')

    let targetFolderId = String(inputFolderId || '')

    // Navigate to folder by path if needed
    if (!targetFolderId && (prefix || folderPath)) {
      const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
      if (!rootFolderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID_not_set')

      targetFolderId = rootFolderId
      const parts = String(prefix || folderPath).split('/').filter(Boolean)
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

    // Delete all files in folder
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

    if (deleteFolder) {
      await drive.files.delete({ fileId: targetFolderId })
    }

    res.json({ ok: true, removed: deletedCount })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

app.listen(PORT, () => {
  console.log(`EDMS Storage API running on port ${PORT}`)
})

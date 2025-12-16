import { google } from 'googleapis'

let driveClient: ReturnType<typeof google.drive> | null = null

export interface GoogleDriveConfig {
  clientEmail: string
  privateKey: string
  folderId: string
}

/**
 * Initialize Google Drive client with service account credentials
 */
export function initGoogleDrive(config: GoogleDriveConfig) {
  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  driveClient = google.drive({ version: 'v3', auth })
  return driveClient
}

/**
 * Get the initialized Google Drive client
 */
export function getDriveClient() {
  return driveClient
}

/**
 * Create a resumable upload session for direct client upload
 * Returns the resumable upload URI that the client can use to upload directly
 */
export async function createResumableUpload(params: {
  fileName: string
  mimeType: string
  folderId: string
  fileSize?: number
}): Promise<{ uploadUri: string; fileId?: string }> {
  if (!driveClient) {
    throw new Error('Google Drive client not initialized')
  }

  const { fileName, mimeType, folderId, fileSize } = params

  // Create file metadata
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  }

  // Initiate resumable upload session
  const response = await driveClient.files.create(
    {
      requestBody: fileMetadata,
      media: {
        mimeType,
      },
      fields: 'id',
    },
    {
      // Request resumable upload
      params: {
        uploadType: 'resumable',
      },
      headers: fileSize ? { 'X-Upload-Content-Length': String(fileSize) } : {},
    }
  )

  // The resumable upload URI is in the response headers
  const rawUrl = response.config?.url
  const uploadUri = rawUrl ? String(rawUrl) : ''
  const fileId = response.data?.id

  if (!uploadUri) {
    throw new Error('Failed to get resumable upload URI')
  }

  return { uploadUri, fileId: fileId || undefined }
}

/**
 * Create a resumable upload session and return the upload URI
 * This uses the Google Drive API resumable upload protocol
 */
export async function initiateResumableUpload(params: {
  fileName: string
  mimeType: string
  folderId: string
  fileSize: number
}): Promise<{ uploadUri: string }> {
  if (!driveClient) {
    throw new Error('Google Drive client not initialized')
  }

  const { fileName, mimeType, folderId, fileSize } = params

  // Get the auth client to make a raw request
  const auth = driveClient.context._options.auth as InstanceType<typeof google.auth.JWT>
  const accessToken = await auth.getAccessToken()

  if (!accessToken.token) {
    throw new Error('Failed to get access token')
  }

  // Make a POST request to initiate resumable upload
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
      body: JSON.stringify({
        name: fileName,
        parents: [folderId],
      }),
    }
  )

  if (!initResponse.ok) {
    const errorText = await initResponse.text()
    throw new Error(`Failed to initiate upload: ${errorText}`)
  }

  const uploadUri = initResponse.headers.get('Location')
  if (!uploadUri) {
    throw new Error('No upload URI returned from Google Drive')
  }

  return { uploadUri }
}

/**
 * Make a file publicly accessible and return the web view link
 */
export async function makeFilePublic(fileId: string): Promise<string> {
  if (!driveClient) {
    throw new Error('Google Drive client not initialized')
  }

  // Create public permission
  await driveClient.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  // Get the web view link
  const file = await driveClient.files.get({
    fileId,
    fields: 'webViewLink,webContentLink',
  })

  // Return direct download link if available, otherwise web view link
  return file.data.webContentLink || file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`
}

/**
 * Delete a file by its ID
 */
export async function deleteFile(fileId: string): Promise<void> {
  if (!driveClient) {
    throw new Error('Google Drive client not initialized')
  }

  await driveClient.files.delete({ fileId })
}

/**
 * Delete all files in a folder (but not the folder itself)
 */
export async function deleteFilesInFolder(folderId: string): Promise<number> {
  if (!driveClient) {
    throw new Error('Google Drive client not initialized')
  }

  let deletedCount = 0
  let pageToken: string | undefined

  do {
    const response = await driveClient.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id)',
      pageSize: 100,
      pageToken,
    })

    const files = response.data.files || []
    for (const file of files) {
      if (file.id) {
        await driveClient.files.delete({ fileId: file.id })
        deletedCount++
      }
    }

    pageToken = response.data.nextPageToken || undefined
  } while (pageToken)

  return deletedCount
}

/**
 * Create a folder in Google Drive
 */
export async function createFolder(name: string, parentFolderId: string): Promise<string> {
  if (!driveClient) {
    throw new Error('Google Drive client not initialized')
  }

  const response = await driveClient.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  })

  if (!response.data.id) {
    throw new Error('Failed to create folder')
  }

  return response.data.id
}

/**
 * Find or create a folder by path (e.g., "unitUic/requestId")
 */
export async function findOrCreateFolderPath(
  path: string,
  rootFolderId: string
): Promise<string> {
  if (!driveClient) {
    throw new Error('Google Drive client not initialized')
  }

  const parts = path.split('/').filter(Boolean)
  let currentParentId = rootFolderId

  for (const folderName of parts) {
    // Search for existing folder
    const searchResponse = await driveClient.files.list({
      q: `name = '${folderName}' and '${currentParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
    })

    const existingFolder = searchResponse.data.files?.[0]

    if (existingFolder?.id) {
      currentParentId = existingFolder.id
    } else {
      // Create new folder
      currentParentId = await createFolder(folderName, currentParentId)
    }
  }

  return currentParentId
}

/**
 * Get file ID from a Google Drive URL
 */
export function extractFileIdFromUrl(url: string): string | null {
  // Handle various Google Drive URL formats
  // https://drive.google.com/file/d/{fileId}/view
  // https://drive.google.com/open?id={fileId}
  // https://www.googleapis.com/drive/v3/files/{fileId}?alt=media

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/files\/([a-zA-Z0-9_-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  // If the string looks like a raw file ID (no URL structure)
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url
  }

  return null
}

/**
 * Upload a file directly (server-side) - used for small files or fallback
 */
export async function uploadFile(params: {
  fileName: string
  mimeType: string
  folderId: string
  buffer: Buffer
}): Promise<{ fileId: string; webViewLink: string }> {
  if (!driveClient) {
    throw new Error('Google Drive client not initialized')
  }

  const { fileName, mimeType, folderId, buffer } = params

  const { Readable } = await import('stream')
  const stream = Readable.from(buffer)

  const response = await driveClient.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id,webViewLink',
  })

  if (!response.data.id) {
    throw new Error('Failed to upload file')
  }

  // Make file public
  const publicUrl = await makeFilePublic(response.data.id)

  return {
    fileId: response.data.id,
    webViewLink: publicUrl,
  }
}

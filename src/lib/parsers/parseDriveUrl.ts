// Utilitaires Google Drive
export function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com/.test(url)
}

export function extractDriveFileId(url: string): string | null {
  // /file/d/FILE_ID/view
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

export function buildDriveExportUrl(fileId: string, mimeType: 'pdf' | 'txt' = 'txt'): string {
  const exportMime = mimeType === 'pdf' ? 'application/pdf' : 'text/plain'
  return `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${exportMime}`
}

export function buildDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`
}

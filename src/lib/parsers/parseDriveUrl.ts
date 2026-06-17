/**
 * Extracts Google Drive file ID from a Drive URL.
 */
export function parseDriveUrl(url: string): string | null {
  try {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export function getDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`
}

/**
 * Returns true if the given URL is a Google Drive file URL.
 */
export function isGoogleDriveUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === 'drive.google.com'
  } catch {
    return false
  }
}

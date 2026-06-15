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

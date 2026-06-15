/**
 * Extrait l'ID d'un document Google Drive
 * Supporte: docs.google.com/document/d/ID, drive.google.com/file/d/ID
 */
export function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function isDriveUrl(url: string): boolean {
  return /(?:docs\.google\.com|drive\.google\.com)/.test(url);
}

export function getDriveExportUrl(fileId: string, format: 'txt' | 'pdf' = 'txt'): string {
  const mimeType = format === 'txt' ? 'text/plain' : 'application/pdf';
  return `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${mimeType}`;
}

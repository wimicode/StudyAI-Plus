/**
 * Extracts YouTube video ID from any YouTube URL format.
 */
export function parseYoutubeUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    return null
  } catch {
    return null
  }
}

/** Alias: returns true if the URL is a YouTube URL */
export function isYoutubeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')
  } catch {
    return false
  }
}

/** Alias: extracts the YouTube video ID */
export function extractYoutubeId(url: string): string | null {
  return parseYoutubeUrl(url)
}

/** Builds a YouTube thumbnail URL from a video ID */
export function buildYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/** Legacy aliases for backwards compatibility */
export function getYoutubeThumbnail(videoId: string): string {
  return buildYoutubeThumbnail(videoId)
}

export function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

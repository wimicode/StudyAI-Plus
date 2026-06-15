/**
 * Extrait l'ID de la vidéo YouTube depuis une URL
 * Supporte: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 */
export function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function isYoutubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

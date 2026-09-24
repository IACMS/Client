export function detectFileType(urlOrMime: string | undefined): string {
  if (!urlOrMime) return 'unknown';
  const lower = urlOrMime.toLowerCase();

  // MIME type detection
  if (lower.startsWith('application/pdf') || lower.endsWith('.pdf')) return 'pdf';
  if (lower.startsWith('image/') || lower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/)) return 'image';
  if (lower.startsWith('video/') || lower.match(/\.(mp4|webm|ogv|ogg|mov|avi|mkv|m4v)$/)) return 'video';
  if (lower.startsWith('audio/') || lower.match(/\.(mp3|wav|ogg|aac|flac|m4a|opus|wma)$/)) return 'audio';
  if (lower.match(/\.(doc|docx|odt|rtf)$/) || lower.includes('word') || lower.includes('opendocument.text')) return 'word';

  return 'other';
}

export function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

export function getFileTypeBadgeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'pdf':   return 'PDF';
    case 'image': return 'Image';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'word':  return 'Document';
    default:      return 'File';
  }
}

export function resolveImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  // If it's a relative URL, prepend the base path if needed
  return url;
}

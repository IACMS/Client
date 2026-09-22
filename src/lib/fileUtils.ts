export function detectFileType(url: string | undefined): string {
  if (!url) return 'unknown';
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
  if (lower.match(/\.(doc|docx)$/)) return 'word';
  return 'unknown';
}

export function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

export function getFileTypeBadgeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'pdf': return 'PDF';
    case 'image': return 'IMG';
    case 'word': return 'DOC';
    default: return 'FILE';
  }
}

export function resolveImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  // If it's a relative URL, prepend the base path if needed
  return url;
}

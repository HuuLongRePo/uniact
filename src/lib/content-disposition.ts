function toAsciiFallbackFilename(filename: string): string {
  const normalized = filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  const ascii = normalized
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\;]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return ascii || 'download';
}

export function buildAttachmentContentDisposition(filename: string): string {
  const value = String(filename || '').trim() || 'download';
  const fallback = toAsciiFallbackFilename(value);
  const encoded = encodeURIComponent(value);

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}


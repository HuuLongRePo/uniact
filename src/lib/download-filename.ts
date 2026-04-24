const UTF8_FILENAME_PREFIX = "utf-8''";

function sanitizeFilename(value: string): string {
  return value.replace(/[/\\\r\n]/g, '').trim();
}

function tryDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function extractFilenameFromContentDisposition(
  contentDisposition: string | null | undefined
): string | null {
  if (!contentDisposition) return null;

  const filenameStarMatch = contentDisposition.match(/filename\*\s*=\s*([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    let value = filenameStarMatch[1].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.toLowerCase().startsWith(UTF8_FILENAME_PREFIX)) {
      value = value.slice(UTF8_FILENAME_PREFIX.length);
    }

    const decoded = sanitizeFilename(tryDecodeUriComponent(value));
    if (decoded) return decoded;
  }

  const filenameMatch = contentDisposition.match(/filename\s*=\s*("?)([^";]+)\1/i);
  if (filenameMatch?.[2]) {
    const decoded = sanitizeFilename(tryDecodeUriComponent(filenameMatch[2].trim()));
    if (decoded) return decoded;
  }

  return null;
}

export function resolveDownloadFilename(
  contentDisposition: string | null | undefined,
  fallbackFilename: string
): string {
  return extractFilenameFromContentDisposition(contentDisposition) || fallbackFilename;
}

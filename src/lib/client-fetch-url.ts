export function resolveClientFetchUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }

  return new URL(path, 'http://127.0.0.1:3000').toString();
}

/**
 * LAN Network Utilities
 * Utilities for validating internal LAN requests only
 * No internet connectivity required or used
 */

/**
 * Kiểm tra xem URL có phải là internal/LAN không
 */
export function isInternalURL(url: string): boolean {
  try {
    // Relative URLs are always internal
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return true;
    }

    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Localhost (including IPv6)
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    ) {
      return true;
    }

    // Private IP ranges (LAN)
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipRegex);

    if (match) {
      const [, a, b, c, d] = match.map(Number);

      // 10.0.0.0/8
      if (a === 10) return true;

      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) return true;
    }

    // .local domains (mDNS/Bonjour)
    if (hostname.endsWith('.local')) return true;

    return false;
  } catch {
    // If URL parsing fails, assume it's a relative URL (internal)
    return true;
  }
}

/**
 * Detect whether the current environment can reach an internal endpoint.
 * This is LAN-only: it never tries external domains.
 */
export async function detectInternetConnection(options?: {
  url?: string;
  timeoutMs?: number;
}): Promise<boolean> {
  const url = options?.url ?? '/api/health';
  const timeoutMs = options?.timeoutMs ?? 2000;

  if (!isInternalURL(url)) return false;

  // In SSR environments, skip network probing.
  if (typeof fetch === 'undefined') return false;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timeout = setTimeout(() => controller?.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller?.signal } as any);
    return !!(res && (res as any).ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Override global fetch để chặn external requests
 * Chỉ cho phép requests tới LAN/localhost
 */
export function installInternetBlocker() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (!isInternalURL(url)) {
      console.error('🚫 BLOCKED: External request detected', url);
      return Promise.reject(
        new Error(
          `INTERNET_BLOCKED: External requests are not allowed in offline LAN mode. Attempted: ${url}`
        )
      );
    }

    return originalFetch.call(window, input, init);
  };

  console.warn('🔒 Internet blocker installed - Only LAN requests allowed');
}

// Auto-install blocker (can be disabled via env var)
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BLOCK_INTERNET !== 'false') {
  installInternetBlocker();
}

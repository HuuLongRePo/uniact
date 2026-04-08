/**
 * API utility functions with error handling and retries
 */

interface FetchOptions extends RequestInit {
  retries?: number;
  timeout?: number;
}

/**
 * Enhanced fetch with timeout and retries
 */
export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const { retries = 3, timeout = 10000, ...fetchOptions } = options;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok && i < retries - 1) {
        // Retry on server errors
        if (response.status >= 500) {
          await sleep(1000 * (i + 1)); // Exponential backoff
          continue;
        }
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }

  throw new Error('Max retries reached');
}

/**
 * Type-safe API call
 */
export async function apiCall<T>(url: string, options?: FetchOptions): Promise<T> {
  const response = await fetchWithRetry(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

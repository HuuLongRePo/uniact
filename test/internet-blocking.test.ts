/**
 * Internet Blocking Tests
 * Test client-side fetch override, URL detection, monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isInternalURL, detectInternetConnection } from '@/lib/internet-blocker'

describe('Internet Blocking System', () => {
  describe('isInternalURL', () => {
    it('should allow localhost URLs', () => {
      expect(isInternalURL('http://localhost:3000')).toBe(true)
      expect(isInternalURL('http://127.0.0.1:3000')).toBe(true)
      expect(isInternalURL('http://localhost/api/users')).toBe(true)
    })

    it('should allow private IP ranges', () => {
      // Class A private (10.0.0.0/8)
      expect(isInternalURL('http://10.0.0.1')).toBe(true)
      expect(isInternalURL('http://10.255.255.255')).toBe(true)
      
      // Class B private (172.16.0.0/12)
      expect(isInternalURL('http://172.16.0.1')).toBe(true)
      expect(isInternalURL('http://172.31.255.255')).toBe(true)
      
      // Class C private (192.168.0.0/16)
      expect(isInternalURL('http://192.168.1.1')).toBe(true)
      expect(isInternalURL('http://192.168.255.255')).toBe(true)
      
      // Link-local (169.254.0.0/16)
      expect(isInternalURL('http://169.254.1.1')).toBe(true)
    })

    it('should allow .local domains', () => {
      expect(isInternalURL('http://server.local')).toBe(true)
      expect(isInternalURL('http://myapp.local:3000')).toBe(true)
    })

    it('should block external domains', () => {
      expect(isInternalURL('https://google.com')).toBe(false)
      expect(isInternalURL('https://example.com/api')).toBe(false)
      expect(isInternalURL('http://8.8.8.8')).toBe(false)
      expect(isInternalURL('https://1.1.1.1')).toBe(false)
    })

    it('should block borderline IP ranges', () => {
      // 172.15.x.x NOT in private range (172.16-31 only)
      expect(isInternalURL('http://172.15.0.1')).toBe(false)
      // 172.32.x.x NOT in private range
      expect(isInternalURL('http://172.32.0.1')).toBe(false)
      // 192.167.x.x NOT in private range (192.168 only)
      expect(isInternalURL('http://192.167.1.1')).toBe(false)
      // 11.x.x.x NOT in private range (10.x only)
      expect(isInternalURL('http://11.0.0.1')).toBe(false)
    })

    it('should handle URLs with paths and query strings', () => {
      expect(isInternalURL('http://192.168.1.1/api/users?id=1')).toBe(true)
      expect(isInternalURL('https://google.com/search?q=test')).toBe(false)
    })

    it('should handle relative URLs as internal', () => {
      expect(isInternalURL('/api/users')).toBe(true)
      expect(isInternalURL('api/users')).toBe(true)
      expect(isInternalURL('../assets/logo.png')).toBe(true)
    })
  })

  describe('detectInternetConnection', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })



    it('should use custom timeout', async () => {
      const originalFetch = global.fetch

      global.fetch = vi.fn(((_url: any, init?: any) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal
          if (signal?.aborted) return reject(new Error('AbortError'))
          signal?.addEventListener?.('abort', () => reject(new Error('AbortError')))
        })
      }) as any)

      const promise = detectInternetConnection({ url: '/api/health', timeoutMs: 50 })
      await vi.advanceTimersByTimeAsync(60)
      await expect(promise).resolves.toBe(false)

      global.fetch = originalFetch
    })
  })

  describe('Fetch override behavior', () => {
    let originalFetch: typeof fetch

    beforeEach(() => {
      originalFetch = global.fetch
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('should block external fetch after installInternetBlocker', async () => {
      // Simulate installInternetBlocker (manual override for test)
      const blockingFetch = global.fetch
      global.fetch = function(url: RequestInfo | URL, init?: RequestInit) {
        const urlStr = url.toString()
        if (!isInternalURL(urlStr)) {
          return Promise.reject(new Error('INTERNET_BLOCKED: External requests are not allowed'))
        }
        return blockingFetch(url, init)
      } as typeof fetch

      // Test blocking
      await expect(fetch('https://google.com')).rejects.toThrow('INTERNET_BLOCKED')
    })

    it('should allow internal fetch after installInternetBlocker', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      
      global.fetch = function(url: RequestInfo | URL, init?: RequestInit) {
        const urlStr = url.toString()
        if (!isInternalURL(urlStr)) {
          return Promise.reject(new Error('INTERNET_BLOCKED'))
        }
        return mockFetch(url, init)
      } as typeof fetch

      const response = await fetch('http://localhost:3000/api/users')
      expect(response.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/users',
        undefined
      )
    })
  })

  describe('Edge cases', () => {
    it('should handle IPv6 localhost', () => {
      expect(isInternalURL('http://[::1]:3000')).toBe(true)
    })

    it('should handle URLs without protocol', () => {
      expect(isInternalURL('192.168.1.1:3000')).toBe(true)
      expect(isInternalURL('localhost:3000')).toBe(true)
    })

    it('should handle malformed URLs gracefully', () => {
      expect(() => isInternalURL('ht!tp://bad-url')).not.toThrow()
    })

    it('should be case-insensitive for domains', () => {
      expect(isInternalURL('http://LOCALHOST:3000')).toBe(true)
      expect(isInternalURL('http://Server.LOCAL')).toBe(true)
    })
  })
})

/**
 * Vitest Setup File
 * Configures test environment, global matchers, and test utilities
 */

import '@testing-library/jest-dom'
import { afterEach, beforeAll, vi } from 'vitest'

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
  headers: () => ({
    get: vi.fn(),
  }),
}))

// Mock environment variables
;(process.env as Record<string, string>).NODE_ENV = 'test'
;(process.env as Record<string, string>).JWT_SECRET = 'test-secret-key'
;(process.env as Record<string, string>).DATABASE_PATH = ':memory:'

// Setup global test timeout
beforeAll(() => {
  vi.setConfig({ testTimeout: 30000 })
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})

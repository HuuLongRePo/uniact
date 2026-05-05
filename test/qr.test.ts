import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/guards', () => ({
  requireApiRole: async () => ({ id: 2, role: 'teacher' }),
}))
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: () => ({ allowed: true }),
}))
vi.mock('@/lib/network-proximity', () => ({
  resolveRequestNetworkPrefix: () => '10.20.30',
}))

vi.mock('@/lib/database', () => ({
  dbGet: async (query: string) => {
    if (query.includes('FROM activities')) {
      return {
        id: 42,
        teacher_id: 2,
        status: 'published',
        approval_status: 'approved',
      }
    }

    return undefined
  },
  dbRun: async () => ({ changes: 1 }),
  dbAll: async () => [],
  dbHelpers: {
    createQRSession: async (
      _activity_id: number,
      _creator_id: number,
      _session_token: string,
      _expires_at: string,
      _metadata: string
    ) => ({ lastID: 123 }),
  },
}))

import * as qrRoute from '../src/app/api/qr-sessions/route'

function makeReq(body: any) {
  return {
    json: async () => body,
    headers: {
      get: (_name: string) => null,
    },
    cookies: {
      get: (_name: string) => ({ value: 'dummy-token' }),
    },
  } as any
}

describe('POST /api/qr-sessions', () => {
  it('creates a session when called by teacher', async () => {
    const req = makeReq({ activity_id: 42, expires_minutes: 10 })
    const res: any = await (qrRoute as any).POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data).toHaveProperty('session_token')
    expect(body.data).toHaveProperty('expires_at')
    expect(body.data.session_id).toBe(123)
  })
})

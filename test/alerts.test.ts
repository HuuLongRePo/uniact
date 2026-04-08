import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock guards and db helpers
vi.mock('@/lib/guards', () => ({
  getUserFromRequest: async () => ({ id: 1, role: 'admin' })
}))
vi.mock('@/lib/database', () => ({
  dbAll: async (sql: string, params?: any[]) => {
    if (sql.includes('COUNT')) return { total: 3 }
    return [
      { id: 1, level: 'info', message: 'A', is_read: 0, created_at: 't' },
      { id: 2, level: 'warning', message: 'B', is_read: 1, created_at: 't' }
    ]
  },
  dbGet: async () => ({ total: 3 }),
  dbRun: async () => ({ changes: 1 })
}))

import * as alertsRoute from '../src/app/api/alerts/route'

function makeGetReq(qs = '') {
  return {
    nextUrl: new URL('http://localhost/' + qs),
    cookies: { get: (_: string) => ({ value: 'dummy' }) }
  } as any
}

function makePostReq(body: any) {
  return {
    json: async () => body,
    cookies: { get: (_: string) => ({ value: 'dummy' }) }
  } as any
}

describe('Alerts API (unit)', () => {
  it('GET returns paginated alerts with meta', async () => {
    const res: any = await (alertsRoute as any).GET(makeGetReq('?page=1&per_page=10'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('alerts')
    expect(body).toHaveProperty('meta')
  })

  it('POST bulk marks alerts', async () => {
    const res: any = await (alertsRoute as any).POST(makePostReq({ ids: [1, 2] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('marked', 2)
  })
})

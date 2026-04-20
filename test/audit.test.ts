import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/guards', () => ({
  getUserFromRequest: async () => ({ id: 1, role: 'admin' })
}))
vi.mock('@/lib/database', () => ({
  dbAll: async (sql: string, params?: any[]) => {
    if (sql.includes('COUNT')) return { total: 2 }
    return [
      { id: 1, actor_id: 1, action: 'create_activity', target_table: 'activities', target_id: 5, details: 'ok', created_at: 't' }
    ]
  },
  dbGet: async () => ({ total: 2 })
}))

import * as auditRoute from '../src/app/api/audit-logs/route'

function makeReq(qs = '') {
  return {
    nextUrl: new URL('http://localhost/' + qs),
    cookies: { get: (_: string) => ({ value: 'dummy' }) }
  } as any
}

describe('Audit API unit', () => {
  it('GET returns logs and meta', async () => {
    const res: any = await (auditRoute as any).GET(makeReq('?page=1&per_page=10'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meta).toBeDefined()
    expect(Array.isArray(body.logs)).toBe(true)
  })

  it('GET export csv returns csv field', async () => {
    const res: any = await (auditRoute as any).GET(makeReq('?export=csv'))
    const body = await res.json()
    expect(body.csv).toBeDefined()
  })

  it('GET preserves action and target filters in audit queries', async () => {
    const res: any = await (auditRoute as any).GET(
      makeReq('?action=teacher_broadcast_notification&target_table=notifications&target_id=5')
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.meta).toBeDefined()
  })
})

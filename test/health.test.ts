import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/database', () => ({
  dbGet: async () => ({ c: 21 }),
  dbAll: async () => ([{ version: '005', name: 'approval_workflow', applied_at: '2025-11-18T00:00:00Z' }])
}))

import * as healthRoute from '../src/app/api/health/route'

describe('Health API', () => {
  it('returns ok status and basic structure', async () => {
    const res: any = await (healthRoute as any).GET({} as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body).toHaveProperty('uptime_seconds')
    expect(body).toHaveProperty('database')
    expect(body.database).toHaveProperty('latest_migration')
  })
})

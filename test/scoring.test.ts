import { vi, describe, it, expect } from 'vitest'

// Mock database
vi.mock('@/lib/database', () => ({
  dbHelpers: {
    getStudentTotalScore: async (studentId: number) => {
      const scores: Record<number, number> = { 1: 50, 2: 75, 3: 30 }
      return scores[studentId] || 0
    },
    getScoreboard: async (options?: any) => {
      const page = options?.page || 1
      const per_page = options?.per_page || 20
      return {
        students: [
          { id: 2, name: 'Student B', total_score: 75, activities_count: 3 },
          { id: 1, name: 'Student A', total_score: 50, activities_count: 2 },
          { id: 3, name: 'Student C', total_score: 30, activities_count: 1 }
        ],
        meta: { total: 3, page, per_page, total_pages: 1 }
      }
    }
  },
  dbGet: async () => ({ total: 3 }),
  dbAll: async () => []
}))

vi.mock('@/lib/guards', () => ({
  getUserFromRequest: async () => ({ id: 1, role: 'admin' })
}))

import * as scoreboardRoute from '../src/app/api/scoreboard/route'

function makeGetReq(qs = '') {
  return {
    nextUrl: new URL('http://localhost/' + qs),
    cookies: { get: (_: string) => ({ value: 'dummy' }) }
  } as any
}

describe('Scoreboard API (unit)', () => {
  it('GET returns scoreboard with students sorted by score', async () => {
    const res: any = await (scoreboardRoute as any).GET(makeGetReq('?page=1&per_page=20'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('students')
    expect(body).toHaveProperty('meta')
    expect(Array.isArray(body.students)).toBe(true)
    expect(body.meta).toHaveProperty('total')
    expect(body.meta).toHaveProperty('page')
  })

  it('GET supports pagination', async () => {
    const res: any = await (scoreboardRoute as any).GET(makeGetReq('?page=2&per_page=10'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meta.page).toBe(2)
  })

  it('GET supports class_id filter', async () => {
    const res: any = await (scoreboardRoute as any).GET(makeGetReq('?class_id=1'))
    expect(res.status).toBe(200)
  })

  it('GET supports sorting by name', async () => {
    const res: any = await (scoreboardRoute as any).GET(makeGetReq('?sort_by=name&order=asc'))
    expect(res.status).toBe(200)
  })
})


import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/database', () => ({
  dbAll: async (sql: string) => {
    if (sql.includes('FROM student_scores')) {
      return [
        { d: '2025-11-16', total_points: 10 },
        { d: '2025-11-17', total_points: 25 }
      ]
    }
    if (sql.includes('FROM activity_types')) {
      return [
        { activity_type: 'Học thuật', participation_count: 40 },
        { activity_type: 'Thể thao', participation_count: 20 }
      ]
    }
    if (sql.includes('FROM classes')) {
      return [
        { class_id: 1, class_name: 'KTPM1', total_points: 120, student_count: 30 },
        { class_id: 2, class_name: 'KTPM2', total_points: 60, student_count: 15 }
      ]
    }
    return []
  }
}))

import * as scoresRoute from '../src/app/api/charts/scores-over-time/route'
import * as distRoute from '../src/app/api/charts/participation-distribution/route'
import * as classRoute from '../src/app/api/charts/class-comparison/route'

function makeReq(url: string) {
  const u = new URL(url, 'http://localhost')
  return { nextUrl: u } as any
}

describe('Chart Endpoints', () => {
  it('scores-over-time returns chronological data', async () => {
    const res: any = await (scoresRoute as any).GET(makeReq('http://localhost/api/charts/scores-over-time?student_id=10&days=7'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBe(2)
    // Data should have date and points fields (mapped from d and total_points)
    expect(body.data[0]).toHaveProperty('date')
    expect(body.data[0]).toHaveProperty('points')
    // After reverse, data is in chronological order (earliest first)
    // Mock returns DESC order: 2025-11-17, 2025-11-16
    // After reverse: 2025-11-16, 2025-11-17
    // But our mock returns in that order already, so after reverse it becomes: 2025-11-17, 2025-11-16
    expect(body.data[0].date).toBe('2025-11-17')
    expect(body.data[1].date).toBe('2025-11-16')
  })
  it('participation-distribution returns percent field', async () => {
    const res: any = await (distRoute as any).GET(makeReq('http://localhost/api/charts/participation-distribution'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.distribution[0]).toHaveProperty('percent')
  })
  it('class-comparison returns avg_points_per_student', async () => {
    const res: any = await (classRoute as any).GET(makeReq('http://localhost/api/charts/class-comparison'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0]).toHaveProperty('avg_points_per_student')
  })
})

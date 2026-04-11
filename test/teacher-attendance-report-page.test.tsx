import {
  buildOverallStats,
  getClassesFromResponse,
  getRecordsFromResponse,
  getSummaryFromResponse,
  normalizeMethod,
} from '@/features/reports/attendance-report-helpers'
import { describe, expect, it } from 'vitest'

describe('teacher attendance report helpers', () => {
  it('normalizes attendance records and keeps method mix information', () => {
    const records = getRecordsFromResponse({
      data: {
        records: [
          {
            student_id: 1,
            student_name: 'Nguyen Van A',
            student_code: 'SV001',
            class_name: 'CTK42',
            activity_name: 'QR Event',
            activity_date: '2027-01-01',
            status: 'present',
            method: 'qr',
          },
          {
            student_id: 2,
            student_name: 'Tran Thi B',
            student_code: 'SV002',
            class_name: 'CTK42',
            activity_name: 'Manual Event',
            activity_date: '2027-01-02',
            status: 'not_participated',
            method: null,
          },
          {
            student_id: 3,
            student_name: 'Le Van C',
            student_code: 'SV003',
            class_name: 'CTK42',
            activity_name: 'Face Event',
            activity_date: '2027-01-03',
            status: 'present',
            method: 'face',
          },
        ],
      },
    })

    expect(records.map((record) => record.method)).toEqual(['qr', 'unknown', 'face'])

    const stats = buildOverallStats(records)
    expect(stats.totalRecords).toBe(3)
    expect(stats.notParticipated).toBe(1)
    expect(stats.qr).toBe(1)
    expect(stats.face).toBe(1)
    expect(stats.manual).toBe(0)
  })

  it('extracts classes and summaries safely from varying payloads', () => {
    expect(
      getClassesFromResponse({
        data: { classes: [{ id: 1, name: 'CTK42' }] },
      })
    ).toEqual([{ id: 1, name: 'CTK42' }])

    expect(
      getSummaryFromResponse<{ class_name: string }>({
        data: { summary: [{ class_name: 'CTK42' }] },
      })
    ).toEqual([{ class_name: 'CTK42' }])

    expect(getSummaryFromResponse({ data: { summary: { bad: true } } })).toEqual([])
    expect(getClassesFromResponse({ classes: [{ id: 2, name: 'CTK43' }] })).toEqual([
      { id: 2, name: 'CTK43' },
    ])
  })

  it('normalizes unknown attendance methods defensively', () => {
    expect(normalizeMethod('manual')).toBe('manual')
    expect(normalizeMethod('face')).toBe('face')
    expect(normalizeMethod('something-else')).toBe('unknown')
    expect(normalizeMethod(undefined)).toBe('unknown')
  })
})

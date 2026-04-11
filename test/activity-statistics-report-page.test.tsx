import {
  buildActivityStatisticsUrl,
  EMPTY_ACTIVITY_INSIGHTS,
  EMPTY_ACTIVITY_STATS,
  normalizeActivity,
  normalizeInsights,
  normalizeStatistics,
} from '@/features/reports/admin-activity-statistics-helpers'
import { describe, expect, it } from 'vitest'

describe('admin activity statistics helpers', () => {
  it('normalizes statistics including method-mix totals', () => {
    const stats = normalizeStatistics({
      total_activities: '2',
      total_participants: '15',
      total_attended: '10',
      total_registered_only: '5',
      total_manual_attendance: '3',
      total_qr_attendance: '5',
      total_face_attendance: '2',
      avg_participants_per_activity: '7.5',
      attendance_rate: '66.7',
      face_adoption_rate: '20',
    })

    expect(stats).toMatchObject({
      total_activities: 2,
      total_participants: 15,
      total_attended: 10,
      total_registered_only: 5,
      total_manual_attendance: 3,
      total_qr_attendance: 5,
      total_face_attendance: 2,
      avg_participants_per_activity: 7.5,
      attendance_rate: 66.7,
      face_adoption_rate: 20,
    })
  })

  it('normalizes hotspots and activity rows defensively', () => {
    const insights = normalizeInsights({
      top_not_participated_activities: [
        {
          id: '12',
          title: 'Tech Talk',
          registered_only: '4',
          total_participants: '10',
          attended_count: '6',
        },
      ],
    })

    const activity = normalizeActivity({
      id: '11',
      title: 'Citizen Orientation',
      date_time: '2026-04-10T08:00:00.000Z',
      location: 'Hall A',
      organizer_name: 'Student Affairs',
      activity_type: 'Civic',
      organization_level: 'School',
      max_participants: '50',
      total_participants: '5',
      attended_count: '4',
      registered_only: '1',
      excellent_count: '2',
      good_count: '1',
      avg_points_per_student: '8.5',
      manual_attendance_count: '1',
      qr_attendance_count: '2',
      face_attendance_count: '1',
    })

    expect(insights.top_not_participated_activities).toEqual([
      {
        id: 12,
        title: 'Tech Talk',
        registered_only: 4,
        total_participants: 10,
        attended_count: 6,
      },
    ])
    expect(activity).toMatchObject({
      id: 11,
      title: 'Citizen Orientation',
      registered_only: 1,
      manual_attendance_count: 1,
      qr_attendance_count: 2,
      face_attendance_count: 1,
    })
  })

  it('returns safe defaults for invalid payloads and builds query URLs', () => {
    expect(normalizeStatistics(undefined)).toEqual(EMPTY_ACTIVITY_STATS)
    expect(normalizeInsights(undefined)).toEqual(EMPTY_ACTIVITY_INSIGHTS)
    expect(normalizeActivity(null)).toBeNull()
    expect(buildActivityStatisticsUrl('', '')).toContain('/api/admin/reports/activity-statistics')
    expect(buildActivityStatisticsUrl('2026-04-01', '2026-04-30')).toContain(
      'start_date=2026-04-01'
    )
  })
})

// Template trang Học viên
// Scaffold nhanh cho UI học viên

/**
 * TEMPLATE: Student Dashboard Page
 * Path: /student/dashboard/page.tsx
 */
export const STUDENT_DASHBOARD_PAGE = `
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'

interface DashboardStats {
  total_activities: number
  attended_count: number
  total_points: number
  upcoming_activities: any[]
  recent_scores: any[]
}

export default function StudentDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/student/dashboard')
      if (!res.ok) throw new Error('Không thể tải dữ liệu')
      const data = await res.json()
      setStats(data.data)
    } catch (error) {
      console.error('Lỗi:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />

  if (!stats) {
    return <EmptyState title="Không thể tải dữ liệu" />
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Bảng điều khiển</h1>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Tổng hoạt động</div>
          <div className="text-3xl font-bold text-blue-600">{stats.total_activities}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Đã tham gia</div>
          <div className="text-3xl font-bold text-green-600">{stats.attended_count}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Tổng điểm</div>
          <div className="text-3xl font-bold text-purple-600">{stats.total_points}</div>
        </div>
      </div>

      {/* Hoạt động sắp tới */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Hoạt động sắp tới</h2>
        {stats.upcoming_activities.length === 0 ? (
          <p className="text-gray-500">Không có hoạt động sắp tới</p>
        ) : (
          <div className="space-y-3">
            {stats.upcoming_activities.map((activity: any) => (
              <div key={activity.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <h3 className="font-semibold">{activity.title}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(activity.date_time).toLocaleString('vi-VN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Điểm gần đây */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Điểm gần đây</h2>
        {stats.recent_scores.length === 0 ? (
          <p className="text-gray-500">Chưa có điểm</p>
        ) : (
          <div className="space-y-3">
            {stats.recent_scores.map((score: any) => (
              <div key={score.id} className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-semibold">{score.activity_title}</h3>
                  <p className="text-sm text-gray-600">{score.achievement_level}</p>
                </div>
                <div className="text-xl font-bold text-green-600">
                  +{score.total_points}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
`;

/**
 * TEMPLATE: Student Activities List Page
 * Path: /student/activities/page.tsx
 */
export const STUDENT_ACTIVITIES_PAGE = `
'use client'

import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { NoActivitiesFound } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export default function StudentActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<number | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<any>(null)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activities')
      const data = await res.json()
      setActivities(data.activities || [])
    } catch (error) {
      console.error('Lỗi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (activityId: number, forceRegister = false) => {
    setRegistering(activityId)
    try {
      const res = await fetch(\`/api/activities/\${activityId}/register\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_register: forceRegister })
      })

      if (res.status === 409) {
        // Phát hiện xung đột
        const data = await res.json()
        setConfirmDialog({
          activityId,
          message: data.message,
          conflicts: data.conflicts
        })
        return
      }

      if (!res.ok) throw new Error('Đăng ký thất bại')
      
      // UI nên hiển thị toast thông báo
      fetchActivities()
    } catch (error: any) {
      // UI nên hiển thị toast lỗi
    } finally {
      setRegistering(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Hoạt động</h1>

      {activities.length === 0 ? (
        <NoActivitiesFound />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-2">{activity.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{activity.description}</p>
              
              <div className="space-y-2 text-sm">
                <div>📅 {new Date(activity.date_time).toLocaleString('vi-VN')}</div>
                <div>📍 {activity.location}</div>
                <div>👥 {activity.participant_count || 0}/{activity.max_participants}</div>
              </div>

              <button
                onClick={() => handleRegister(activity.id)}
                disabled={registering === activity.id || activity.is_registered > 0}
                className="mt-4 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {activity.is_registered > 0 ? 'Đã đăng ký' : 'Đăng ký'}
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          isOpen={true}
          title="Xác nhận đăng ký"
          message={confirmDialog.message}
          onConfirm={() => {
            handleRegister(confirmDialog.activityId, true)
            setConfirmDialog(null)
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}
`;

export default {
  STUDENT_DASHBOARD_PAGE,
  STUDENT_ACTIVITIES_PAGE,
};

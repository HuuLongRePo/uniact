'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Summary {
  total_activities: number;
  pending_activities: number;
  published_activities: number;
  total_participants: number;
  total_attended: number;
}

interface DashboardData {
  summary: Summary;
  activitiesByMonth: Array<{ month: string; count: number; participants: number }>;
  activitiesByType: Array<{
    type_name: string;
    type_color: string;
    count: number;
    avg_participants: number;
  }>;
  participationByClass: Array<{
    class_name: string;
    total_students: number;
    active_students: number;
    participation_rate: number;
  }>;
  recentActivities: Array<{
    id: number;
    title: string;
    date_time: string;
    status: string;
    participant_count: number;
    attended_count: number;
  }>;
  topStudents: Array<{
    student_id: number;
    student_name: string;
    class_name: string;
    total_points: number;
    activities_count: number;
  }>;
}

export default function TeacherDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.push('/login');
      return;
    }
    if (user) fetchDashboard();
  }, [user, authLoading, router]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/teacher/dashboard-stats');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!data)
    return (
      <div className="max-w-7xl mx-auto p-6">
        <p>Không có dữ liệu</p>
      </div>
    );

  const maxMonth = Math.max(...data.activitiesByMonth.map((m) => m.count), 1);
  const maxType = Math.max(...data.activitiesByType.map((t) => t.count), 1);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6" data-testid="dashboard-heading">
        📊 Dashboard Giảng viên
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6" data-testid="stat-total-activities">
          <div className="text-sm text-gray-600 mb-2">Tổng hoạt động</div>
          <div className="text-3xl font-bold">{data.summary.total_activities}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6" data-testid="stat-pending-activities">
          <div className="text-sm text-gray-600 mb-2">Chờ duyệt</div>
          <div className="text-3xl font-bold text-yellow-600">
            {data.summary.pending_activities}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6" data-testid="stat-published-activities">
          <div className="text-sm text-gray-600 mb-2">Đã phát hành</div>
          <div className="text-3xl font-bold text-green-600">
            {data.summary.published_activities}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6" data-testid="stat-total-participants">
          <div className="text-sm text-gray-600 mb-2">Đăng ký</div>
          <div className="text-3xl font-bold text-blue-600">{data.summary.total_participants}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-2">Điểm danh</div>
          <div className="text-3xl font-bold text-purple-600">{data.summary.total_attended}</div>
        </div>
      </div>

      <div
        className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-5"
        data-testid="attendance-policy-cta"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-blue-900">Điều phối điểm danh theo policy</h2>
            <p className="mt-1 text-sm text-blue-800">
              Xem activity nào đủ điều kiện pilot face attendance, kiểm tra preset QR fallback, và
              chuẩn bị phương án chuyển sang mixed/manual khi quá tải.
            </p>
          </div>
          <Link
            href="/teacher/attendance/policy"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Mở attendance policy
          </Link>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">📅 Hoạt động theo tháng</h2>
          <div className="space-y-3">
            {data.activitiesByMonth.map((m, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{m.month}</span>
                  <span>
                    {m.count} hoạt động • {m.participants} đăng ký
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full"
                    style={{ width: `${(m.count / maxMonth) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🎯 Hoạt động theo loại</h2>
          <div className="space-y-3">
            {data.activitiesByType.map((t, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{t.type_name}</span>
                  <span>
                    {t.count} hoạt động • TB {t.avg_participants.toFixed(1)} SV
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full"
                    style={{
                      width: `${(t.count / maxType) * 100}%`,
                      backgroundColor: t.type_color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Participation by Class */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">🏫 Tỷ lệ tham gia theo lớp</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Lớp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SV hoạt động
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tổng SV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tỷ lệ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.participationByClass.map((c, i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{c.class_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.active_students}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{c.total_students}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${c.participation_rate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {c.participation_rate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">⏱️ Hoạt động gần đây</h2>
          <div className="space-y-3">
            {data.recentActivities.map((a) => (
              <div key={a.id} className="border-b pb-3 last:border-0">
                <Link
                  href={`/teacher/activities/${a.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {a.title}
                </Link>
                <div className="text-sm text-gray-600 mt-1">
                  {new Date(a.date_time).toLocaleDateString('vi-VN')} •{' '}
                  {a.status === 'published' && (
                    <span className="text-green-600">✅ Đã phát hành</span>
                  )}
                  {a.status === 'pending' && <span className="text-yellow-600">⏳ Chờ duyệt</span>}
                  {a.status === 'draft' && <span className="text-gray-600">📝 Nháp</span>}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {a.attended_count}/{a.participant_count} điểm danh
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Students */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🏆 Sinh viên xuất sắc</h2>
          <div className="space-y-3">
            {data.topStudents.map((s, i) => (
              <div
                key={s.student_id}
                className="flex items-center gap-3 pb-3 border-b last:border-0"
              >
                <div className="text-2xl font-bold text-gray-400 w-6">
                  {i === 0 && '🥇'}
                  {i === 1 && '🥈'}
                  {i === 2 && '🥉'}
                  {i > 2 && `${i + 1}`}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{s.student_name}</div>
                  <div className="text-sm text-gray-600">{s.class_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{s.total_points} điểm</div>
                  <div className="text-sm text-gray-500">{s.activities_count} HĐ</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

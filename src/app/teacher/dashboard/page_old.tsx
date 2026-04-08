'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

interface DashboardData {
  classes: Array<{ id: number; name: string; major: string }>;
  total_students: number;
  total_activities: number;
  avg_participation_rate: number;
  monthly_trends: Array<{
    month: string;
    activities_count: number;
    participations_count: number;
    attendances_count: number;
  }>;
  top_students: Array<{
    id: number;
    name: string;
    email: string;
    total_points: number;
    activities_count: number;
    attendance_count: number;
  }>;
  activity_breakdown: Array<{
    activity_type: string;
    count: number;
    total_participations: number;
    avg_points: number;
  }>;
  weak_students: Array<{
    id: number;
    name: string;
    email: string;
    activities_count: number;
    total_points: number;
    last_activity_date: string | null;
    participation_rate: number;
  }>;
}

export default function TeacherDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

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
      const dashboardData = await res.json();
      if (res.ok) {
        setData(dashboardData);
      }
    } catch (e) {
      console.error('Fetch dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;
  if (!data) return <div className="container mx-auto px-4 py-8">Không có dữ liệu</div>;

  const maxActivities = Math.max(...data.monthly_trends.map((t) => t.activities_count), 1);
  const maxParticipations = Math.max(...data.monthly_trends.map((t) => t.participations_count), 1);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">📊 Bảng Điều Khiển Giảng Viên</h1>

      {/* Thống kê tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <div className="text-blue-800 text-sm font-medium">Tổng lớp học</div>
          <div className="text-3xl font-bold text-blue-900">{data.classes.length}</div>
        </div>
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <div className="text-green-800 text-sm font-medium">Tổng học viên</div>
          <div className="text-3xl font-bold text-green-900">{data.total_students}</div>
        </div>
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
          <div className="text-purple-800 text-sm font-medium">Tổng hoạt động</div>
          <div className="text-3xl font-bold text-purple-900">{data.total_activities}</div>
        </div>
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
          <div className="text-orange-800 text-sm font-medium">Tỷ lệ tham gia TB</div>
          <div className="text-3xl font-bold text-orange-900">{data.avg_participation_rate}%</div>
        </div>
      </div>

      {/* Xu hướng 6 tháng */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">📈 Xu Hướng 6 Tháng Gần Nhất</h2>
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {data.monthly_trends.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Chưa có dữ liệu</p>
            ) : (
              <div className="space-y-6">
                {/* Biểu đồ cột hoạt động */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Số hoạt động</h3>
                  <div className="flex items-end gap-2 h-32">
                    {data.monthly_trends.map((trend) => (
                      <div key={trend.month} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                          style={{ height: `${(trend.activities_count / maxActivities) * 100}%` }}
                          title={`${trend.activities_count} hoạt động`}
                        />
                        <div className="text-xs mt-2 text-gray-600">{trend.month}</div>
                        <div className="text-xs font-medium">{trend.activities_count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Biểu đồ cột tham gia */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Lượt tham gia</h3>
                  <div className="flex items-end gap-2 h-32">
                    {data.monthly_trends.map((trend) => (
                      <div key={trend.month} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                          style={{
                            height: `${(trend.participations_count / maxParticipations) * 100}%`,
                          }}
                          title={`${trend.participations_count} lượt tham gia`}
                        />
                        <div className="text-xs mt-2 text-gray-600">{trend.month}</div>
                        <div className="text-xs font-medium">{trend.participations_count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top học viên */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🏆 Top 10 Học Viên Xuất Sắc</h2>
          <div className="space-y-2">
            {data.top_students.map((student, index) => (
              <Link
                key={student.id}
                href={`/teacher/students/${student.id}`}
                className="flex items-center p-3 border rounded hover:bg-gray-50 transition"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mr-3">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-gray-600">
                    {student.activities_count} hoạt động • {student.attendance_count} điểm danh
                  </div>
                </div>
                <div className="text-lg font-bold text-blue-600">{student.total_points}</div>
              </Link>
            ))}
          </div>
          {data.top_students.length === 0 && (
            <p className="text-gray-500 text-center py-8">Chưa có dữ liệu</p>
          )}
        </div>

        {/* Phân loại hoạt động */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">📋 Phân Loại Hoạt Động</h2>
          <div className="space-y-3">
            {data.activity_breakdown.map((item) => (
              <div key={item.activity_type} className="border-l-4 border-blue-500 pl-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium">{item.activity_type}</div>
                  <div className="text-sm font-bold text-blue-600">{item.count}</div>
                </div>
                <div className="text-sm text-gray-600">
                  {item.total_participations} lượt tham gia • TB {item.avg_points.toFixed(1)} điểm
                </div>
              </div>
            ))}
          </div>
          {data.activity_breakdown.length === 0 && (
            <p className="text-gray-500 text-center py-8">Chưa có dữ liệu</p>
          )}
        </div>
      </div>

      {/* Học viên yếu cần quan tâm */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">⚠️ Học Viên Cần Quan Tâm</h2>
        <div className="text-sm text-gray-600 mb-4">
          Học viên có tỷ lệ tham gia {'<'}40% hoặc không hoạt động trong 30 ngày
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Tên học viên</th>
                <th className="text-left p-3">Email</th>
                <th className="text-center p-3">Tỷ lệ tham gia</th>
                <th className="text-center p-3">Số hoạt động</th>
                <th className="text-center p-3">Tổng điểm</th>
                <th className="text-left p-3">Hoạt động cuối</th>
              </tr>
            </thead>
            <tbody>
              {data.weak_students.map((student) => (
                <tr key={student.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <Link
                      href={`/teacher/students/${student.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {student.name}
                    </Link>
                  </td>
                  <td className="p-3 text-sm text-gray-600">{student.email}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        student.participation_rate < 20
                          ? 'bg-red-100 text-red-800'
                          : student.participation_rate < 40
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {student.participation_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3 text-center">{student.activities_count}</td>
                  <td className="p-3 text-center">{student.total_points}</td>
                  <td className="p-3 text-sm">
                    {student.last_activity_date
                      ? new Date(student.last_activity_date).toLocaleDateString('vi-VN')
                      : 'Chưa có'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.weak_students.length === 0 && (
          <p className="text-green-600 text-center py-8">✅ Tất cả học viên đều tham gia tốt!</p>
        )}
      </div>
    </div>
  );
}

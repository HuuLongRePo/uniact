'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import { useAdminStats, useReportData } from '@/lib/domain-hooks';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface ActivityMonth {
  month: string;
  total: number;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  total_points: number;
}

export interface ClassParticipation {
  id: number;
  name: string;
  activities_participated: number;
  distinct_students: number;
}

export interface PopularActivity {
  id: number;
  title: string;
  participant_count: number;
}

interface HealthData {
  database: {
    size_mb: string;
    table_count: number;
  };
  activities: {
    draft: number;
    published: number;
    completed: number;
    cancelled: number;
    new_24h: number;
  };
  participations: {
    total: number;
    registered: number;
    attended: number;
    absent: number;
    new_24h: number;
  };
  attendance?: {
    total: number;
    attended: number;
    absent: number;
    new_24h: number;
    rate: number;
  };
  users: {
    new_24h: number;
  };
  system: {
    uptime_hours: number;
    node_version: string;
    memory: {
      heap_used_mb: string;
      heap_total_mb: string;
    };
  };
  top_activities?: PopularActivity[];
}

interface DashboardReportData {
  stats: {
    total_students: number;
    total_activities: number;
  };
  activities_by_month?: ActivityMonth[];
  top_students?: Student[];
  participation_by_class?: ClassParticipation[];
  popular_activities?: PopularActivity[];
}

interface AttendancePolicyOverview {
  version: string;
  selectionMode: string;
  qrFallbackPreset: string;
  configuredPilotActivities: number;
  eligiblePilotActivities: number;
  totalScannedActivities: number;
}

export default function DashboardAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [attendancePolicyOverview, setAttendancePolicyOverview] =
    useState<AttendancePolicyOverview | null>(null);

  const { data, loading: statsLoading, refetch: refetchStats } = useAdminStats();
  const {
    data: dashboardData,
    loading: dashLoading,
    refetch: refetchDash,
  } = useReportData('dashboard');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    let cancelled = false;

    const loadAttendancePolicyOverview = async () => {
      try {
        const [configRes, activitiesRes] = await Promise.all([
          fetch('/api/system-config?category=attendance'),
          fetch('/api/teacher/attendance/pilot-activities'),
        ]);

        if (!configRes.ok || !activitiesRes.ok) {
          return;
        }

        const configBody = await configRes.json();
        const configRows = configBody?.configs || configBody?.data?.configs || [];
        const configMap = new Map<string, string>(
          configRows.map((row: any) => [
            String(row?.config_key || ''),
            String(row?.config_value || ''),
          ])
        );

        let configuredPilotActivities = 0;
        try {
          const selectedIds = JSON.parse(
            configMap.get('attendance_face_pilot_activity_ids') || '[]'
          );
          if (Array.isArray(selectedIds)) {
            configuredPilotActivities = selectedIds.filter((id) =>
              Number.isInteger(Number(id))
            ).length;
          }
        } catch {
          configuredPilotActivities = 0;
        }

        const activitiesBody = await activitiesRes.json();
        const activities = activitiesBody?.data?.activities || activitiesBody?.activities || [];
        const eligiblePilotActivities = activities.filter(
          (item: any) => item?.policy_summary?.eligible
        ).length;

        if (!cancelled) {
          setAttendancePolicyOverview({
            version: configMap.get('attendance_policy_version') || 'pilot-v1',
            selectionMode:
              configMap.get('attendance_face_pilot_selection_mode') || 'selected_or_heuristic',
            qrFallbackPreset: configMap.get('attendance_qr_fallback_preset') || 'pilot-default',
            configuredPilotActivities,
            eligiblePilotActivities,
            totalScannedActivities: activities.length,
          });
        }
      } catch (error) {
        console.error('Load attendance policy overview error:', error);
      }
    };

    void loadAttendancePolicyOverview();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const loading = authLoading || statsLoading || dashLoading;
  const healthData = data as HealthData | null;
  const reportData = dashboardData as DashboardReportData | null;

  const attendanceTotal = Number(
    healthData?.attendance?.total ?? healthData?.participations?.total ?? 0
  );
  const attendedCount = Number(
    healthData?.attendance?.attended ?? healthData?.participations?.attended ?? 0
  );
  const attendanceRate =
    attendanceTotal > 0
      ? Number(
          healthData?.attendance?.rate ??
            Math.round((attendedCount / Math.max(attendanceTotal, 1)) * 100)
        )
      : 0;

  const participationBreakdown = [
    {
      name: 'Đã tham gia',
      value: Number(healthData?.participations?.attended || 0),
      color: '#10b981',
    },
    {
      name: 'Đã đăng ký',
      value: Number(healthData?.participations?.registered || 0),
      color: '#3b82f6',
    },
    {
      name: 'Vắng mặt',
      value: Number(healthData?.participations?.absent || 0),
      color: '#ef4444',
    },
  ];

  const activityStatusData = [
    { status: 'Bản nháp', count: Number(healthData?.activities?.draft || 0) },
    { status: 'Đã công bố', count: Number(healthData?.activities?.published || 0) },
    { status: 'Hoàn thành', count: Number(healthData?.activities?.completed || 0) },
    { status: 'Đã hủy', count: Number(healthData?.activities?.cancelled || 0) },
  ];

  if (loading) {
    return <ActivitySkeleton count={5} />;
  }

  if (!healthData && !reportData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Không tìm thấy dữ liệu"
          message="Hiện chưa có dữ liệu tổng quan để hiển thị."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 data-testid="dashboard-heading" className="text-3xl font-bold">
          📊 Tổng quan quản trị
        </h1>
        <button
          onClick={() => {
            refetchStats();
            refetchDash();
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Đang tải...
            </>
          ) : (
            <>🔄 Làm mới</>
          )}
        </button>
      </div>

      {healthData && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5 shadow">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-blue-700">Dung lượng cơ sở dữ liệu</h3>
                <span className="text-2xl">💾</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{healthData.database.size_mb} MB</p>
              <p className="mt-1 text-xs text-blue-600">{healthData.database.table_count} bảng</p>
            </div>

            <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-5 shadow">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-green-700">Thời gian hoạt động</h3>
                <span className="text-2xl">⏱️</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {healthData.system.uptime_hours.toFixed(1)}h
              </p>
              <p className="mt-1 text-xs text-green-600">Node {healthData.system.node_version}</p>
            </div>

            <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-5 shadow">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-purple-700">Bộ nhớ đang dùng</h3>
                <span className="text-2xl">🧠</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {healthData.system.memory.heap_used_mb} MB
              </p>
              <p className="mt-1 text-xs text-purple-600">
                trên tổng {healthData.system.memory.heap_total_mb} MB heap
              </p>
            </div>

            <div className="rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-5 shadow">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-orange-700">Tỷ lệ điểm danh</h3>
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{attendanceRate}%</p>
              <p className="mt-1 text-xs text-orange-600">
                {attendedCount}/{attendanceTotal}
              </p>
            </div>
          </div>

          {attendancePolicyOverview && (
            <div
              className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6 shadow"
              data-testid="admin-attendance-policy-overview"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-blue-900">🎛️ Attendance policy rollout</h2>
                  <p className="mt-1 text-sm text-blue-800">
                    Theo dõi preset đang chạy cho QR fallback / face pilot và mở nhanh màn cấu hình
                    vận hành.
                  </p>
                </div>
                <Link
                  href="/admin/system-config/attendance-policy"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Mở chính sách điểm danh
                </Link>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-white/80 p-4">
                  <div className="text-xs uppercase tracking-wide text-blue-600">
                    policy version
                  </div>
                  <div className="mt-1 text-lg font-semibold text-blue-950">
                    {attendancePolicyOverview.version}
                  </div>
                </div>
                <div className="rounded-lg bg-white/80 p-4">
                  <div className="text-xs uppercase tracking-wide text-blue-600">
                    selection mode
                  </div>
                  <div className="mt-1 text-lg font-semibold text-blue-950">
                    {attendancePolicyOverview.selectionMode}
                  </div>
                </div>
                <div className="rounded-lg bg-white/80 p-4">
                  <div className="text-xs uppercase tracking-wide text-blue-600">
                    configured pilot activities
                  </div>
                  <div className="mt-1 text-lg font-semibold text-blue-950">
                    {attendancePolicyOverview.configuredPilotActivities}
                  </div>
                </div>
                <div className="rounded-lg bg-white/80 p-4">
                  <div className="text-xs uppercase tracking-wide text-blue-600">
                    eligible / scanned activities
                  </div>
                  <div className="mt-1 text-lg font-semibold text-blue-950">
                    {attendancePolicyOverview.eligiblePilotActivities}/
                    {attendancePolicyOverview.totalScannedActivities}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-sm text-blue-800">
                QR fallback preset hiện tại:{' '}
                <span className="font-semibold">{attendancePolicyOverview.qrFallbackPreset}</span>
              </div>
            </div>
          )}

          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">📈 Phân bổ trạng thái tham gia</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={participationBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {participationBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">📊 Phân bổ trạng thái hoạt động</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Số lượng" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">🕐 Hoạt động trong 24 giờ gần nhất</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{healthData.users.new_24h}</p>
                <p className="mt-1 text-sm text-gray-600">Người dùng mới</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{healthData.activities.new_24h}</p>
                <p className="mt-1 text-sm text-gray-600">Hoạt động mới</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {healthData.participations.new_24h}
                </p>
                <p className="mt-1 text-sm text-gray-600">Lượt đăng ký mới</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-4 text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {healthData.attendance?.new_24h || 0}
                </p>
                <p className="mt-1 text-sm text-gray-600">Lượt điểm danh mới</p>
              </div>
            </div>
          </div>

          {healthData.top_activities && healthData.top_activities.length > 0 && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold">🔥 Hoạt động được quan tâm nhiều nhất</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={healthData.top_activities} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="title" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="participation_count" fill="#8b5cf6" name="Người tham gia" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <h2 className="mb-4 mt-8 border-t pt-6 text-2xl font-bold">📚 Phân tích theo thời gian</h2>

      {reportData && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-500">Tổng số học viên</h3>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {reportData.stats.total_students}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-500">
                Hoạt động đã công bố hoặc hoàn thành
              </h3>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {reportData.stats.total_activities}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-500">Điểm cao nhất</h3>
              <p className="mt-2 text-3xl font-bold text-indigo-600">
                {reportData.top_students?.[0]?.total_points || 0}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-500">Lượt tham gia cao nhất</h3>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {reportData.popular_activities?.[0]?.participant_count || 0}
              </p>
            </div>
          </div>

          {reportData.activities_by_month && reportData.activities_by_month.length > 0 && (
            <div className="mb-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold">
                Hoạt động theo tháng trong 6 tháng gần nhất
              </h2>
              <div className="space-y-2">
                {reportData.activities_by_month.map((item) => {
                  const maxMonthTotal = Math.max(
                    ...reportData.activities_by_month!.map((month) => month.total),
                    1
                  );

                  return (
                    <div key={item.month}>
                      <div className="flex justify-between text-sm">
                        <span>{item.month}</span>
                        <span>{item.total}</span>
                      </div>
                      <div className="h-3 rounded bg-gray-100">
                        <div
                          className="h-full rounded bg-blue-500"
                          style={{ width: `${(item.total / maxMonthTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reportData.participation_by_class && reportData.participation_by_class.length > 0 && (
            <div className="mb-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold">
                Mức độ tham gia theo lớp của 10 lớp dẫn đầu
              </h2>
              <div className="space-y-2">
                {reportData.participation_by_class.map((item) => {
                  const maxClassActivities = Math.max(
                    ...reportData.participation_by_class!.map(
                      (classItem) => classItem.activities_participated
                    ),
                    1
                  );

                  return (
                    <div key={item.id}>
                      <div className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span>{item.activities_participated} hoạt động</span>
                      </div>
                      <div className="h-3 rounded bg-gray-100">
                        <div
                          className="h-full rounded bg-green-500"
                          style={{
                            width: `${(item.activities_participated / maxClassActivities) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Học viên tham gia: {item.distinct_students}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reportData.popular_activities && reportData.popular_activities.length > 0 && (
            <div className="mb-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold">10 hoạt động phổ biến nhất</h2>
              <div className="space-y-2">
                {reportData.popular_activities.map((item) => {
                  const maxPopular = Math.max(
                    ...reportData.popular_activities!.map((activity) => activity.participant_count),
                    1
                  );

                  return (
                    <div key={item.id}>
                      <div className="flex justify-between text-sm">
                        <span>{item.title}</span>
                        <span>{item.participant_count} người</span>
                      </div>
                      <div className="h-3 rounded bg-gray-100">
                        <div
                          className="h-full rounded bg-purple-500"
                          style={{ width: `${(item.participant_count / maxPopular) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reportData.top_students && reportData.top_students.length > 0 && (
            <div className="mb-12 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold">10 học viên dẫn đầu theo điểm</h2>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2">#</th>
                    <th className="py-2">Tên</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Tổng điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.top_students.map((student, index) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{index + 1}</td>
                      <td className="py-2 font-medium">{student.name}</td>
                      <td className="py-2 text-gray-600">{student.email}</td>
                      <td className="py-2 font-bold text-indigo-600">{student.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

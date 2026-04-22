'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Calendar,
  Download,
  QrCode,
  RefreshCw,
  ScanFace,
  SquarePen,
  TrendingUp,
  Users,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildActivityStatisticsUrl,
  EMPTY_ACTIVITY_INSIGHTS,
  EMPTY_ACTIVITY_STATS,
  normalizeActivity,
  normalizeInsights,
  normalizeStatistics,
  type ActivityStatistics,
  type ActivityStatisticsInsights,
  type Statistics,
} from '@/features/reports/admin-activity-statistics-helpers';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

async function requestActivityStatistics(startDate: string, endDate: string) {
  const response = await fetch(buildActivityStatisticsUrl(startDate, endDate));
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'Không thể tải báo cáo thống kê.'
    );
  }

  const activities = Array.isArray(data?.data)
    ? data.data.map(normalizeActivity).filter((item): item is ActivityStatistics => item !== null)
    : [];

  return {
    activities,
    statistics: normalizeStatistics(data?.statistics),
    insights: normalizeInsights(data?.insights),
  };
}

export default function ActivityStatisticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityStatistics[]>([]);
  const [stats, setStats] = useState<Statistics>(EMPTY_ACTIVITY_STATS);
  const [insights, setInsights] = useState<ActivityStatisticsInsights>(EMPTY_ACTIVITY_INSIGHTS);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = useCallback(
    async (nextStartDate = startDate, nextEndDate = endDate) => {
      try {
        setLoading(true);
        const data = await requestActivityStatistics(nextStartDate, nextEndDate);
        setActivities(data.activities);
        setStats(data.statistics);
        setInsights(data.insights);
      } catch (error) {
        console.error('Fetch activity statistics error:', error);
        toast.error(getErrorMessage(error, 'Lỗi khi tải báo cáo thống kê.'));
      } finally {
        setLoading(false);
      }
    },
    [endDate, startDate]
  );

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchData('', '');
    }
  }, [authLoading, fetchData, router, user]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('format', 'csv');

    window.location.href = `/api/admin/reports/activity-statistics?${params}`;
    toast.success('Đang tải file CSV...');
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    void fetchData('', '');
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">Thống kê hoạt động</h1>
        <p className="text-gray-600">
          Theo dõi độ phủ tham gia, method mix điểm danh và các hotspot vận hành theo từng hoạt
          động.
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 font-bold">Bộ lọc</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              <Calendar className="mr-1 inline h-4 w-4" />
              Từ ngày
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              <Calendar className="mr-1 inline h-4 w-4" />
              Đến ngày
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => void fetchData()}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Áp dụng
            </button>
            <button
              onClick={handleReset}
              className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
            >
              Đặt lại
            </button>
          </div>
          <div className="flex items-end justify-end gap-2">
            <button
              onClick={() => void fetchData()}
              className="flex items-center gap-2 rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Tổng hoạt động</div>
              <div className="mt-1 text-3xl font-bold">{stats.total_activities}</div>
            </div>
            <BarChart3 className="h-10 w-10 opacity-80" />
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Tổng đăng ký</div>
              <div className="mt-1 text-3xl font-bold">{stats.total_participants}</div>
            </div>
            <Users className="h-10 w-10 opacity-80" />
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Đã tham gia</div>
              <div className="mt-1 text-3xl font-bold">{stats.total_attended}</div>
            </div>
            <TrendingUp className="h-10 w-10 opacity-80" />
          </div>
        </div>

        <div
          className="rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 p-6 text-white shadow"
          data-testid="admin-not-participated-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Chưa tham gia</div>
              <div className="mt-1 text-3xl font-bold">{stats.total_registered_only}</div>
            </div>
            <Users className="h-10 w-10 opacity-80" />
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Tỷ lệ tham gia</div>
              <div className="mt-1 text-3xl font-bold">{stats.attendance_rate.toFixed(1)}%</div>
            </div>
            <TrendingUp className="h-10 w-10 opacity-80" />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          className="rounded-lg border border-violet-200 bg-violet-50 p-5 shadow-sm"
          data-testid="admin-method-card-qr"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
            <QrCode className="h-4 w-4" />
            QR attendance
          </div>
          <div className="mt-2 text-3xl font-bold text-violet-900">{stats.total_qr_attendance}</div>
        </div>

        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm"
          data-testid="admin-method-card-manual"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <SquarePen className="h-4 w-4" />
            Manual attendance
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-900">
            {stats.total_manual_attendance}
          </div>
        </div>

        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm"
          data-testid="admin-method-card-face"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <ScanFace className="h-4 w-4" />
            Face attendance
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-900">
            {stats.total_face_attendance}
          </div>
        </div>

        <div
          className="rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-sm"
          data-testid="admin-face-adoption-card"
        >
          <div className="text-sm font-medium text-blue-700">Tỷ lệ face trên lượt đã tham gia</div>
          <div className="mt-2 text-3xl font-bold text-blue-900">
            {stats.face_adoption_rate.toFixed(1)}%
          </div>
        </div>
      </div>

      <div
        className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-6 shadow-sm"
        data-testid="admin-attendance-hotspots"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-orange-900">Hotspots chưa tham gia</h2>
            <p className="text-sm text-orange-800">
              Các hoạt động có số lượt đăng ký nhưng chưa điểm danh cao nhất trong phạm vi lọc hiện
              tại.
            </p>
          </div>
        </div>

        {insights.top_not_participated_activities.length === 0 ? (
          <div className="rounded-lg bg-white/70 p-4 text-sm text-orange-900">
            Chưa có hotspot chưa tham gia nổi bật trong khoảng thời gian này.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {insights.top_not_participated_activities.map((activity) => (
              <div key={activity.id} className="rounded-lg bg-white/80 p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">{activity.title}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div>
                    <div className="uppercase tracking-wide text-gray-400">Đăng ký</div>
                    <div className="mt-1 text-base font-semibold text-blue-700">
                      {activity.total_participants}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide text-gray-400">Đã tham gia</div>
                    <div className="mt-1 text-base font-semibold text-green-700">
                      {activity.attended_count}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide text-gray-400">Chưa tham gia</div>
                    <div className="mt-1 text-base font-semibold text-slate-800">
                      {activity.registered_only}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Hoạt động
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Người tổ chức
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Loại / Cấp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Đăng ký
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Tham gia
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Chưa tham gia
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  QR / Manual / Face
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Xuất sắc
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Tốt
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  TB điểm
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{activity.title}</div>
                      <div className="text-sm text-gray-500">
                        {activity.location || 'Chưa cập nhật'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {activity.organizer_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-gray-900">{activity.activity_type || '-'}</div>
                      <div className="text-xs text-gray-500">
                        {activity.organization_level || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(activity.date_time).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-blue-600">{activity.total_participants}</div>
                      <div className="text-xs text-gray-500">
                        {activity.max_participants > 0
                          ? `/ ${activity.max_participants}`
                          : 'Không giới hạn'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-green-600">{activity.attended_count}</div>
                      <div className="text-xs text-gray-500">
                        {activity.total_participants > 0
                          ? `${((activity.attended_count / activity.total_participants) * 100).toFixed(0)}%`
                          : '0%'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {activity.registered_only}
                    </td>
                    <td className="px-4 py-3 text-sm" data-testid="admin-method-mix-cell">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800">
                          QR {activity.qr_attendance_count}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                          Manual {activity.manual_attendance_count}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                          Face {activity.face_attendance_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                        {activity.excellent_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {activity.good_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {activity.avg_points_per_student.toFixed(1)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activities.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Hiển thị {activities.length} hoạt động.
        </div>
      )}
    </div>
  );
}

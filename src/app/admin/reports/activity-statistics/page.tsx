'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BarChart3, Calendar, Download, RefreshCw, TrendingUp } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface ActivityStatistics {
  id: number;
  title: string;
  date_time: string;
  location: string;
  organizer_name: string;
  activity_type: string;
  organization_level: string;
  max_participants: number;
  total_participants: number;
  attended_count: number;
  registered_only: number;
  excellent_count: number;
  good_count: number;
  avg_points_per_student: number;
}

interface Statistics {
  total_activities: number;
  total_participants: number;
  total_attended: number;
  avg_participants_per_activity: number;
  attendance_rate: number;
}

const EMPTY_STATS: Statistics = {
  total_activities: 0,
  total_participants: 0,
  total_attended: 0,
  avg_participants_per_activity: 0,
  attendance_rate: 0,
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function normalizeStatistics(payload: unknown): Statistics {
  if (!payload || typeof payload !== 'object') {
    return EMPTY_STATS;
  }

  const record = payload as Partial<Statistics>;

  return {
    total_activities: toNumber(record.total_activities),
    total_participants: toNumber(record.total_participants),
    total_attended: toNumber(record.total_attended),
    avg_participants_per_activity: toNumber(record.avg_participants_per_activity),
    attendance_rate: toNumber(record.attendance_rate),
  };
}

function normalizeActivity(payload: unknown): ActivityStatistics | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  return {
    id: toNumber(record.id),
    title: typeof record.title === 'string' ? record.title : 'Chưa đặt tên',
    date_time: typeof record.date_time === 'string' ? record.date_time : '',
    location: typeof record.location === 'string' ? record.location : '',
    organizer_name: typeof record.organizer_name === 'string' ? record.organizer_name : '',
    activity_type: typeof record.activity_type === 'string' ? record.activity_type : '',
    organization_level:
      typeof record.organization_level === 'string' ? record.organization_level : '',
    max_participants: toNumber(record.max_participants),
    total_participants: toNumber(record.total_participants),
    attended_count: toNumber(record.attended_count),
    registered_only: toNumber(record.registered_only),
    excellent_count: toNumber(record.excellent_count),
    good_count: toNumber(record.good_count),
    avg_points_per_student: toNumber(record.avg_points_per_student),
  };
}

function buildActivityStatisticsUrl(startDate: string, endDate: string): string {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const query = params.toString();
  const path = `/api/admin/reports/activity-statistics${query ? `?${query}` : ''}`;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }

  return path;
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
  };
}

export default function ActivityStatisticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityStatistics[]>([]);
  const [stats, setStats] = useState<Statistics>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async (nextStartDate = startDate, nextEndDate = endDate) => {
    try {
      setLoading(true);
      const data = await requestActivityStatistics(nextStartDate, nextEndDate);
      setActivities(data.activities);
      setStats(data.statistics);
    } catch (error) {
      console.error('Fetch activity statistics error:', error);
      toast.error(getErrorMessage(error, 'Lỗi khi tải báo cáo thống kê.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void (async () => {
        try {
          setLoading(true);
          const data = await requestActivityStatistics('', '');
          setActivities(data.activities);
          setStats(data.statistics);
        } catch (error) {
          console.error('Initial activity statistics fetch error:', error);
          toast.error(getErrorMessage(error, 'Lỗi khi tải báo cáo thống kê.'));
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [authLoading, router, user]);

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
          Báo cáo chi tiết về hiệu quả tổ chức và mức độ tham gia của từng hoạt động.
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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <TrendingUp className="h-10 w-10 opacity-80" />
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

        <div className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">TB người/hoạt động</div>
              <div className="mt-1 text-3xl font-bold">
                {stats.avg_participants_per_activity.toFixed(1)}
              </div>
            </div>
            <BarChart3 className="h-10 w-10 opacity-80" />
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
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
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

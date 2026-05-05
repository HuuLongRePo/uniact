'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
import { formatDate } from '@/lib/formatters';
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
      typeof data?.error === 'string' ? data.error : 'Khong the tai bao cao thong ke.'
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
        toast.error(getErrorMessage(error, 'Loi khi tai bao cao thong ke.'));
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
    toast.success('Dang tai file CSV...');
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    void fetchData('', '');
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai thong ke hoat dong..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Activity analytics
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Thong ke hoat dong</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Tach ro luong dang ky, co mat va mix phuong thuc diem danh de admin nhin ra hotspot
              van hanh va muc do ap dung face attendance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchData()}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tai lai
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Xuat CSV
            </button>
            <Link
              href="/admin/reports"
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              Ve trung tam bao cao
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto]">
          <label className="block text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-700" />
              Tu ngay
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-700" />
              Den ngay
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
          </label>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="self-end rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
          >
            Ap dung
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="self-end rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Dat lai
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-cyan-800">Tong hoat dong</div>
              <div className="mt-3 text-3xl font-semibold text-cyan-950">{stats.total_activities}</div>
            </div>
            <BarChart3 className="h-8 w-8 text-cyan-700" />
          </div>
        </article>

        <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-800">Tong dang ky</div>
              <div className="mt-3 text-3xl font-semibold text-blue-950">{stats.total_participants}</div>
            </div>
            <Users className="h-8 w-8 text-blue-700" />
          </div>
        </article>

        <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-emerald-800">Da tham gia</div>
              <div className="mt-3 text-3xl font-semibold text-emerald-950">{stats.total_attended}</div>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-700" />
          </div>
        </article>

        <article
          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
          data-testid="admin-not-participated-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700">Chua tham gia</div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">
                {stats.total_registered_only}
              </div>
            </div>
            <Users className="h-8 w-8 text-slate-700" />
          </div>
        </article>

        <article className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-violet-800">Ti le tham gia</div>
              <div className="mt-3 text-3xl font-semibold text-violet-950">
                {stats.attendance_rate.toFixed(1)}%
              </div>
            </div>
            <TrendingUp className="h-8 w-8 text-violet-700" />
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article
          className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm"
          data-testid="admin-method-card-qr"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
            <QrCode className="h-4 w-4" />
            QR attendance
          </div>
          <div className="mt-2 text-3xl font-semibold text-violet-950">{stats.total_qr_attendance}</div>
        </article>

        <article
          className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"
          data-testid="admin-method-card-manual"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <SquarePen className="h-4 w-4" />
            Manual attendance
          </div>
          <div className="mt-2 text-3xl font-semibold text-amber-950">
            {stats.total_manual_attendance}
          </div>
        </article>

        <article
          className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"
          data-testid="admin-method-card-face"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <ScanFace className="h-4 w-4" />
            Face attendance
          </div>
          <div className="mt-2 text-3xl font-semibold text-emerald-950">
            {stats.total_face_attendance}
          </div>
        </article>

        <article
          className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm"
          data-testid="admin-face-adoption-card"
        >
          <div className="text-sm font-medium text-blue-700">Ti le face tren luot da tham gia</div>
          <div className="mt-2 text-3xl font-semibold text-blue-950">
            {stats.face_adoption_rate.toFixed(1)}%
          </div>
        </article>
      </section>

      <section
        className="rounded-[2rem] border border-orange-200 bg-orange-50 p-6 shadow-sm"
        data-testid="admin-attendance-hotspots"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-orange-900">Hotspots chua tham gia</h2>
            <p className="text-sm text-orange-800">
              Cac hoat dong co luot dang ky nhung chua check-in cao nhat trong pham vi loc hien tai.
            </p>
          </div>
          <RefreshCw className="h-5 w-5 text-orange-700" />
        </div>

        {insights.top_not_participated_activities.length === 0 ? (
          <div className="rounded-3xl bg-white/80 p-4 text-sm text-orange-900">
            Chua co hotspot chua tham gia noi bat trong khoang thoi gian nay.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {insights.top_not_participated_activities.map((activity) => (
              <article key={activity.id} className="rounded-3xl bg-white/85 p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">{activity.title}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                  <div>
                    <div className="uppercase tracking-wide text-slate-400">Dang ky</div>
                    <div className="mt-1 text-base font-semibold text-blue-700">
                      {activity.total_participants}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide text-slate-400">Da tham gia</div>
                    <div className="mt-1 text-base font-semibold text-emerald-700">
                      {activity.attended_count}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wide text-slate-400">Chua tham gia</div>
                    <div className="mt-1 text-base font-semibold text-slate-800">
                      {activity.registered_only}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:hidden">
          {activities.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Khong co du lieu.
            </div>
          ) : (
            activities.map((activity) => (
              <article key={activity.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-slate-950">{activity.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{activity.location || 'Chua cap nhat'}</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cyan-700 shadow-sm">
                    {formatDate(activity.date_time, 'date')}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                    Dang ky
                    <div className="mt-1 font-semibold text-blue-700">{activity.total_participants}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                    Tham gia
                    <div className="mt-1 font-semibold text-emerald-700">{activity.attended_count}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                    Chua tham gia
                    <div className="mt-1 font-semibold text-slate-800">{activity.registered_only}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                    TB diem
                    <div className="mt-1 font-semibold text-violet-700">
                      {activity.avg_points_per_student.toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2" data-testid="admin-method-mix-cell">
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
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  Hoat dong
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  Nguoi to chuc
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  Loai / Cap
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  Thoi gian
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  Dang ky
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  Tham gia
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  Chua tham gia
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  QR / Manual / Face
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  Xuat sac
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  Tot
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                  TB diem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                    Khong co du lieu.
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{activity.title}</div>
                      <div className="text-sm text-slate-500">
                        {activity.location || 'Chua cap nhat'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {activity.organizer_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-slate-900">{activity.activity_type || '-'}</div>
                      <div className="text-xs text-slate-500">{activity.organization_level || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(activity.date_time, 'date')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-blue-700">{activity.total_participants}</div>
                      <div className="text-xs text-slate-500">
                        {activity.max_participants > 0 ? `/ ${activity.max_participants}` : 'Khong gioi han'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-emerald-700">{activity.attended_count}</div>
                      <div className="text-xs text-slate-500">
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
                      <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800">
                        {activity.excellent_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        {activity.good_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {activity.avg_points_per_student.toFixed(1)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {activities.length > 0 ? (
          <div className="mt-4 text-center text-sm text-slate-600">
            Hien thi {activities.length} hoat dong.
          </div>
        ) : null}
      </section>
    </div>
  );
}

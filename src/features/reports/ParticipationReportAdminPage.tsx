'use client';

import React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { calculateAttendanceRate } from '@/lib/calculations';
import { formatDate } from '@/lib/formatters';

export interface ActivityRow {
  id: number;
  title: string;
  date_time: string;
  location: string;
  participant_count: number;
  attended_count: number;
}

interface ClassOption {
  id: number;
  name: string;
}

interface ActivityTypeOption {
  id: number;
  name: string;
}

interface ReportFilters {
  start: string;
  end: string;
  class_id: string;
  activity_type_id: string;
}

const DEFAULT_FILTERS: ReportFilters = {
  start: '',
  end: '',
  class_id: '',
  activity_type_id: '',
};

function buildSearchParams(filters: ReportFilters): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      searchParams.append(key, value);
    }
  });

  return searchParams;
}

function buildAbsoluteApiUrl(path: string, searchParams?: URLSearchParams): string {
  const query = searchParams?.toString();
  const fullPath = `${path}${query ? `?${query}` : ''}`;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(fullPath, window.location.origin).toString();
  }

  return fullPath;
}

function getActivitiesFromResponse(payload: unknown): ActivityRow[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { activities?: ActivityRow[] };
    activities?: ActivityRow[];
  };

  return normalized.data?.activities ?? normalized.activities ?? [];
}

export function getClassesFromResponse(payload: unknown): ClassOption[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { classes?: ClassOption[] };
    classes?: ClassOption[];
  };

  return normalized.data?.classes ?? normalized.classes ?? [];
}

export function getActivityTypesFromResponse(payload: unknown): ActivityTypeOption[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    activityTypes?: ActivityTypeOption[];
    activity_types?: ActivityTypeOption[];
    types?: ActivityTypeOption[];
  };

  return normalized.activityTypes ?? normalized.activity_types ?? normalized.types ?? [];
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const normalized = payload as {
    error?: string;
    message?: string;
  };

  return normalized.error ?? normalized.message ?? fallback;
}

export default function ParticipationReportAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeOption[]>([]);
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [reportError, setReportError] = useState('');

  const fetchReportData = useCallback(async (nextFilters: ReportFilters) => {
    setLoading(true);

    try {
      const searchParams = buildSearchParams(nextFilters);
      const response = await fetch(buildAbsoluteApiUrl('/api/reports/participation', searchParams));
      const data = await response.json();

      if (response.ok) {
        setReportError('');
        setRows(getActivitiesFromResponse(data));
      } else {
        setRows([]);
        setReportError(getErrorMessage(data, 'Không thể tải báo cáo tham gia.'));
      }
    } catch (error) {
      console.error('Fetch participation report error:', error);
      setRows([]);
      setReportError('Không thể tải báo cáo tham gia.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    setOptionsLoading(true);

    try {
      const [classesResponse, activityTypesResponse] = await Promise.all([
        fetch(buildAbsoluteApiUrl('/api/classes')),
        fetch(buildAbsoluteApiUrl('/api/activity-types')),
      ]);

      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        setClasses(getClassesFromResponse(classesData));
      }

      if (activityTypesResponse.ok) {
        const activityTypesData = await activityTypesResponse.json();
        setActivityTypes(getActivityTypesFromResponse(activityTypesData));
      }
    } catch (error) {
      console.error('Fetch filter options error:', error);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    await Promise.all([fetchFilterOptions(), fetchReportData(DEFAULT_FILTERS)]);
  }, [fetchFilterOptions, fetchReportData]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void loadInitialData();
    }
  }, [authLoading, loadInitialData, router, user]);

  const handleExport = () => {
    const searchParams = buildSearchParams(filters);
    searchParams.append('export', 'csv');
    window.location.href = `/api/reports/participation?${searchParams.toString()}`;
  };

  if (authLoading || loading || optionsLoading) {
    return <ActivitySkeleton count={5} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Báo cáo tham gia hoạt động</h1>
        <div className="flex gap-3">
          <button
            onClick={() => void fetchReportData(filters)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Lọc dữ liệu
          </button>
          <button
            onClick={handleExport}
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Xuất CSV
          </button>
        </div>
      </div>

      {reportError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {reportError}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-white p-4 shadow md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Từ ngày</label>
          <input
            type="date"
            value={filters.start}
            onChange={(event) => setFilters({ ...filters, start: event.target.value })}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Đến ngày</label>
          <input
            type="date"
            value={filters.end}
            onChange={(event) => setFilters({ ...filters, end: event.target.value })}
            className="w-full rounded border p-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Lớp</label>
          <select
            value={filters.class_id}
            onChange={(event) => setFilters({ ...filters, class_id: event.target.value })}
            className="w-full rounded border p-2"
          >
            <option value="">Tất cả lớp</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={String(classItem.id)}>
                {classItem.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Loại hoạt động</label>
          <select
            value={filters.activity_type_id}
            onChange={(event) => setFilters({ ...filters, activity_type_id: event.target.value })}
            className="w-full rounded border p-2"
          >
            <option value="">Tất cả loại</option>
            {activityTypes.map((activityType) => (
              <option key={activityType.id} value={String(activityType.id)}>
                {activityType.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-600">ID</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">Tiêu đề</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">Ngày</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">Địa điểm</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">Số đăng ký</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">Đã điểm danh</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">Tỷ lệ (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row) => {
              const rate = calculateAttendanceRate(
                row.attended_count,
                row.participant_count
              ).toFixed(1);

              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">{row.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 font-medium">{row.title}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                    {formatDate(row.date_time, 'datetime')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">{row.location}</td>
                  <td className="whitespace-nowrap px-6 py-4 font-bold text-blue-600">
                    {row.participant_count}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-bold text-green-600">
                    {row.attended_count}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">{rate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && !reportError && (
          <div className="p-6">
            <EmptyState
              title="Không tìm thấy dữ liệu"
              message="Hiện chưa có hoạt động nào trong danh sách này."
            />
          </div>
        )}
      </div>
    </div>
  );
}

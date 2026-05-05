'use client';

import React from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
        setReportError(getErrorMessage(data, 'Khong the tai bao cao tham gia.'));
      }
    } catch (error) {
      console.error('Fetch participation report error:', error);
      setRows([]);
      setReportError('Khong the tai bao cao tham gia.');
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

  const totals = useMemo(() => {
    const totalRegistrations = rows.reduce((sum, row) => sum + row.participant_count, 0);
    const totalAttended = rows.reduce((sum, row) => sum + row.attended_count, 0);
    const averageRate =
      rows.length > 0
        ? rows.reduce(
            (sum, row) => sum + Number(calculateAttendanceRate(row.attended_count, row.participant_count)),
            0
          ) / rows.length
        : 0;

    return {
      totalActivities: rows.length,
      totalRegistrations,
      totalAttended,
      averageRate,
    };
  }, [rows]);

  if (authLoading || loading || optionsLoading) {
    return <ActivitySkeleton count={5} />;
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
              Participation report
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              Bao cao tham gia hoat dong
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Theo doi mat bang dang ky va co mat theo hoat dong de phat hien lop, chu de hoac khung
              thoi gian dang co ty le tham gia bat thuong.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchReportData(filters)}
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

        {reportError ? (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {reportError}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-cyan-800">Hoat dong trong bao cao</div>
            <div className="mt-3 text-3xl font-semibold text-cyan-950">{totals.totalActivities}</div>
          </article>
          <article className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-blue-800">Tong dang ky</div>
            <div className="mt-3 text-3xl font-semibold text-blue-950">{totals.totalRegistrations}</div>
          </article>
          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-800">Tong co mat</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-950">{totals.totalAttended}</div>
          </article>
          <article className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-800">Ti le tham gia TB</div>
            <div className="mt-3 text-3xl font-semibold text-violet-950">
              {totals.averageRate.toFixed(1)}%
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="block text-sm font-medium text-slate-700">
            Tu ngay
            <input
              type="date"
              value={filters.start}
              onChange={(event) => setFilters({ ...filters, start: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Den ngay
            <input
              type="date"
              value={filters.end}
              onChange={(event) => setFilters({ ...filters, end: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Lop
            <select
              value={filters.class_id}
              onChange={(event) => setFilters({ ...filters, class_id: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            >
              <option value="">Tat ca lop</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={String(classItem.id)}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Loai hoat dong
            <select
              value={filters.activity_type_id}
              onChange={(event) => setFilters({ ...filters, activity_type_id: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            >
              <option value="">Tat ca loai</option>
              {activityTypes.map((activityType) => (
                <option key={activityType.id} value={String(activityType.id)}>
                  {activityType.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchReportData(filters)}
            className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
          >
            Loc du lieu
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              void fetchReportData(DEFAULT_FILTERS);
            }}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Dat lai
          </button>
        </div>
      </section>

      {rows.length === 0 && !reportError ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <EmptyState
            title="Khong tim thay du lieu"
            message="Khong co hoat dong nao khop voi bo loc hien tai."
          />
        </section>
      ) : (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:hidden">
            {rows.map((row) => {
              const rate = calculateAttendanceRate(row.attended_count, row.participant_count).toFixed(1);

              return (
                <article key={row.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-slate-950">{row.title}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {formatDate(row.date_time, 'datetime')}
                      </div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cyan-700 shadow-sm">
                      #{row.id}
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-600">{row.location}</div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                      Dang ky
                      <div className="mt-1 font-semibold text-blue-700">{row.participant_count}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                      Co mat
                      <div className="mt-1 font-semibold text-emerald-700">{row.attended_count}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                      Ti le
                      <div className="mt-1 font-semibold text-violet-700">{rate}%</div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-600">ID</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-600">Tieu de</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-600">Ngay</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-600">Dia diem</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-600">So dang ky</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-600">Da diem danh</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-600">Ti le (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => {
                  const rate = calculateAttendanceRate(row.attended_count, row.participant_count).toFixed(1);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4">{row.id}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium">{row.title}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                        {formatDate(row.date_time, 'datetime')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">{row.location}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-blue-700">
                        {row.participant_count}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-emerald-700">
                        {row.attended_count}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">{rate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

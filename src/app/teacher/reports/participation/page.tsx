'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Activity, ArrowLeft, Download, Filter, Search } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { resolveDownloadFilename } from '@/lib/download-filename';
import { formatVietnamDateTime, parseVietnamDate, toVietnamFileTimestamp } from '@/lib/timezone';

interface ClassOption {
  id: number;
  name: string;
}

interface ActivityTypeOption {
  id: number;
  name: string;
}

interface ParticipationRecord {
  activity_id: number;
  activity_name: string;
  student_id: number;
  student_name: string;
  class_name: string;
  activity_type: string;
  date: string;
  score: number;
  status: 'participated' | 'attended' | 'not_participated';
}

interface ParticipationSummary {
  student_id: number;
  student_name: string;
  student_code: string;
  class_name: string;
  total_activities: number;
  participated_count: number;
  participation_rate: number;
  total_score: number;
  avg_score: number;
}

type ParticipationSortKey = 'date' | 'student' | 'score' | 'activity';
type SortDirection = 'asc' | 'desc';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getClassesFromResponse(payload: unknown): ClassOption[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { classes?: ClassOption[] };
    classes?: ClassOption[];
  };

  if (Array.isArray(normalized.data?.classes)) {
    return normalized.data.classes;
  }

  if (Array.isArray(normalized.classes)) {
    return normalized.classes;
  }

  return [];
}

function getParticipationData(payload: unknown): {
  records: ParticipationRecord[];
  summary: ParticipationSummary[];
} {
  if (!payload || typeof payload !== 'object') {
    return { records: [], summary: [] };
  }

  const normalized = payload as {
    data?: {
      records?: ParticipationRecord[];
      summary?: ParticipationSummary[];
    };
    records?: ParticipationRecord[];
    summary?: ParticipationSummary[];
  };

  return {
    records: normalized.data?.records ?? normalized.records ?? [],
    summary: normalized.data?.summary ?? normalized.summary ?? [],
  };
}

function getActivityTypeNames(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    activityTypes?: ActivityTypeOption[];
    activity_types?: ActivityTypeOption[];
    types?: ActivityTypeOption[];
  };

  const activityTypes =
    normalized.activityTypes ?? normalized.activity_types ?? normalized.types ?? [];

  return activityTypes
    .map((type) => type?.name?.trim())
    .filter((name): name is string => Boolean(name));
}

function getStatusBadge(status: ParticipationRecord['status']) {
  switch (status) {
    case 'participated':
      return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">Tham gia</span>;
    case 'attended':
      return <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">Co mat</span>;
    case 'not_participated':
      return <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">Khong tham gia</span>;
    default:
      return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{status}</span>;
  }
}

export default function ParticipationReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ParticipationRecord[]>([]);
  const [summary, setSummary] = useState<ParticipationSummary[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ParticipationRecord[]>([]);
  const [viewMode, setViewMode] = useState<'summary' | 'details'>('summary');
  const [filters, setFilters] = useState({
    classId: '',
    activityType: '',
    status: '',
    dateStart: '',
    dateEnd: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<ParticipationSortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [classesRes, recordsRes, typesRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/teacher/reports/participation'),
        fetch('/api/activity-types'),
      ]);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(getClassesFromResponse(classesData));
      }

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        const normalized = getParticipationData(recordsData);
        setRecords(normalized.records);
        setSummary(normalized.summary);
        setFilteredRecords(normalized.records);
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setActivityTypes(getActivityTypeNames(typesData));
      }
    } catch (error: unknown) {
      console.error('Error fetching participation report:', error);
      toast.error(getErrorMessage(error, 'Khong the tai du lieu'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      toast.error('Chi giang vien moi co quyen xem bao cao');
      router.push('/teacher/dashboard');
      return;
    }

    if (user) {
      void fetchData();
    }
  }, [authLoading, fetchData, router, user]);

  const applyFilters = useCallback(() => {
    let next = [...records];

    if (filters.classId) {
      next = next.filter((record) => record.class_name === filters.classId);
    }

    if (filters.activityType) {
      next = next.filter((record) => record.activity_type === filters.activityType);
    }

    if (filters.status) {
      next = next.filter((record) => record.status === filters.status);
    }

    if (filters.dateStart) {
      const startDate = parseVietnamDate(`${filters.dateStart}T00:00`);
      if (startDate) {
        next = next.filter(
          (record) => (parseVietnamDate(record.date)?.getTime() ?? Number.NEGATIVE_INFINITY) >= startDate.getTime()
        );
      }
    }

    if (filters.dateEnd) {
      const endDate = parseVietnamDate(`${filters.dateEnd}T23:59:59`);
      if (endDate) {
        next = next.filter(
          (record) => (parseVietnamDate(record.date)?.getTime() ?? Number.POSITIVE_INFINITY) <= endDate.getTime()
        );
      }
    }

    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      next = next.filter(
        (record) =>
          record.student_name.toLowerCase().includes(normalizedSearch) ||
          record.activity_name.toLowerCase().includes(normalizedSearch)
      );
    }

    next.sort((left, right) => {
      let leftValue: string | number = '';
      let rightValue: string | number = '';

      if (sortBy === 'date') {
        leftValue = parseVietnamDate(left.date)?.getTime() ?? 0;
        rightValue = parseVietnamDate(right.date)?.getTime() ?? 0;
      } else if (sortBy === 'student') {
        leftValue = left.student_name;
        rightValue = right.student_name;
      } else if (sortBy === 'score') {
        leftValue = left.score;
        rightValue = right.score;
      } else if (sortBy === 'activity') {
        leftValue = left.activity_name;
        rightValue = right.activity_name;
      }

      if (sortOrder === 'asc') {
        return leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;
      }

      return leftValue < rightValue ? 1 : leftValue > rightValue ? -1 : 0;
    });

    setFilteredRecords(next);
  }, [filters, records, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/teacher/reports/participation/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        let errorMessage = 'Khong the xuat bao cao';
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        response.headers?.get?.('Content-Disposition') ?? null,
        `participation-report-${toVietnamFileTimestamp(new Date())}.pdf`
      );
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success('Da xuat bao cao thanh cong');
    } catch (error) {
      console.error('Error exporting participation report:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the xuat bao cao');
    }
  };

  const stats = useMemo(
    () => ({
      total: records.length,
      participated: records.filter((record) => record.status === 'participated').length,
      attended: records.filter((record) => record.status === 'attended').length,
      notParticipated: records.filter((record) => record.status === 'not_participated').length,
    }),
    [records]
  );

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lai
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
                <Activity className="h-3.5 w-3.5" />
                Bao cao tham gia
              </div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Bao cao tham gia hoat dong</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Theo doi ty le tham gia, co mat va diem so tich luy cua hoc vien theo lop, loai
                hoat dong va tung luot tham gia.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-800"
            >
              <Download className="h-4 w-4" />
              Xuat PDF
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Tong luot tham gia</div>
              <div className="mt-2 text-3xl font-bold text-cyan-700">{stats.total}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Da tham gia</div>
              <div className="mt-2 text-3xl font-bold text-emerald-600">{stats.participated}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Co mat</div>
              <div className="mt-2 text-3xl font-bold text-sky-600">{stats.attended}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Khong tham gia</div>
              <div className="mt-2 text-3xl font-bold text-rose-600">{stats.notParticipated}</div>
            </div>
          </div>

          <div className="content-card p-3">
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'summary', label: 'Tom tat' },
                { id: 'details', label: 'Chi tiet' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setViewMode(option.id as typeof viewMode)}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    viewMode === option.id
                      ? 'bg-cyan-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'summary' ? (
            summary.length === 0 ? (
              <div className="content-card p-12 text-center">
                <Activity className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                <p className="text-lg font-medium text-slate-700">Chua co du lieu tong hop</p>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {summary.map((item) => (
                  <article key={item.student_id} className="content-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">{item.student_name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.student_code} · {item.class_name}
                        </p>
                      </div>
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
                        {item.participation_rate.toFixed(1)}%
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-4">
                      <div className="rounded-2xl bg-slate-100 px-3 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-600">Tong HD</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{item.total_activities}</div>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                        <div className="text-xs uppercase tracking-wide text-emerald-700">Tham gia</div>
                        <div className="mt-1 text-lg font-semibold text-emerald-900">{item.participated_count}</div>
                      </div>
                      <div className="rounded-2xl bg-sky-50 px-3 py-3">
                        <div className="text-xs uppercase tracking-wide text-sky-700">Tong diem</div>
                        <div className="mt-1 text-lg font-semibold text-sky-900">{item.total_score.toFixed(1)}</div>
                      </div>
                      <div className="rounded-2xl bg-violet-50 px-3 py-3">
                        <div className="text-xs uppercase tracking-wide text-violet-700">TB diem</div>
                        <div className="mt-1 text-lg font-semibold text-violet-900">{item.avg_score.toFixed(1)}</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <>
              <div className="content-card p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="block text-sm font-medium text-slate-700">
                    <Search className="mr-1 inline h-4 w-4" />
                    Tim kiem
                    <input
                      type="text"
                      placeholder="Ten hoc vien hoac hoat dong..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    <Filter className="mr-1 inline h-4 w-4" />
                    Lop
                    <select
                      value={filters.classId}
                      onChange={(event) => setFilters({ ...filters, classId: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Tat ca lop</option>
                      {classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.name}>
                          {classItem.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Loai hoat dong
                    <select
                      value={filters.activityType}
                      onChange={(event) =>
                        setFilters({ ...filters, activityType: event.target.value })
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Tat ca loai</option>
                      {activityTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Trang thai
                    <select
                      value={filters.status}
                      onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Tat ca trang thai</option>
                      <option value="participated">Tham gia</option>
                      <option value="attended">Co mat</option>
                      <option value="not_participated">Khong tham gia</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Tu ngay
                    <input
                      type="date"
                      value={filters.dateStart}
                      onChange={(event) => setFilters({ ...filters, dateStart: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Den ngay
                    <input
                      type="date"
                      value={filters.dateEnd}
                      onChange={(event) => setFilters({ ...filters, dateEnd: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="content-card p-12 text-center">
                  <Activity className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                  <p className="text-lg font-medium text-slate-700">Khong co du lieu tham gia</p>
                </div>
              ) : (
                <div className="grid gap-4 xl:hidden">
                  {filteredRecords.map((record) => (
                    <article key={`${record.activity_id}-${record.student_id}`} className="content-card p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950">{record.student_name}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {record.class_name} · {record.activity_name}
                          </p>
                        </div>
                        {getStatusBadge(record.status)}
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-slate-600">
                        <div>Loai: {record.activity_type}</div>
                        <div>Ngay: {formatVietnamDateTime(record.date, 'date')}</div>
                        <div>Diem: {record.score.toFixed(1)}</div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {filteredRecords.length > 0 ? (
                <div className="content-card hidden overflow-hidden xl:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1040px]">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th
                            onClick={() => {
                              setSortOrder((current) => (sortBy === 'student' && current === 'asc' ? 'desc' : 'asc'));
                              setSortBy('student');
                            }}
                            className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                          >
                            Hoc vien {sortBy === 'student' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Lop</th>
                          <th
                            onClick={() => {
                              setSortOrder((current) => (sortBy === 'activity' && current === 'asc' ? 'desc' : 'asc'));
                              setSortBy('activity');
                            }}
                            className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                          >
                            Hoat dong {sortBy === 'activity' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Loai</th>
                          <th
                            onClick={() => {
                              setSortOrder((current) => (sortBy === 'date' && current === 'asc' ? 'desc' : 'asc'));
                              setSortBy('date');
                            }}
                            className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                          >
                            Ngay {sortBy === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Trang thai</th>
                          <th
                            onClick={() => {
                              setSortOrder((current) => (sortBy === 'score' && current === 'asc' ? 'desc' : 'asc'));
                              setSortBy('score');
                            }}
                            className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                          >
                            Diem {sortBy === 'score' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredRecords.map((record) => (
                          <tr key={`${record.activity_id}-${record.student_id}`} className="transition-colors hover:bg-slate-50">
                            <td className="px-4 py-4 text-sm font-medium text-slate-900">{record.student_name}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{record.class_name}</td>
                            <td className="px-4 py-4 text-sm font-medium text-cyan-700">{record.activity_name}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{record.activity_type}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{formatVietnamDateTime(record.date, 'date')}</td>
                            <td className="px-4 py-4">{getStatusBadge(record.status)}</td>
                            <td className="px-4 py-4 text-sm font-semibold text-cyan-700">{record.score.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  TrendingUp,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toVietnamDateStamp } from '@/lib/timezone';

interface RankingRecord {
  rank: number;
  student_id: number;
  student_name: string;
  student_email: string;
  class_name: string;
  total_points: number;
  activity_count: number;
  award_count: number;
  avg_points: number;
}

interface RankingsResponse {
  rankings?: RankingRecord[];
  data?: {
    rankings?: RankingRecord[];
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters?: {
    class_id: number | null;
    org_level_id: number | null;
    date_from: string | null;
    date_to: string | null;
    sort_by: string;
  };
  message?: string;
  error?: string;
}

type FiltersState = {
  class_id: string;
  org_level_id: string;
  date_from: string;
  date_to: string;
  limit: string;
  sort_by: string;
};

const INITIAL_FILTERS: FiltersState = {
  class_id: '',
  org_level_id: '',
  date_from: '',
  date_to: '',
  limit: '25',
  sort_by: 'total_points',
};

function parseRankingRows(payload: RankingsResponse | null): RankingRecord[] {
  const source = payload?.rankings || payload?.data?.rankings || [];
  return Array.isArray(source) ? source : [];
}

function parseClassesPayload(payload: any): Array<{ id: number; name: string }> {
  const source = payload?.classes || payload?.data?.classes || [];
  return Array.isArray(source) ? source : [];
}

function parseOrgLevelsPayload(payload: any): Array<{ id: number; name: string }> {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.levels)) return payload.levels;
  return [];
}

function downloadRows(filename: string, rows: string, type: string) {
  const blob = new Blob(['\uFEFF' + rows], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ScoreboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rankings, setRankings] = useState<RankingRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [orgLevels, setOrgLevels] = useState<Array<{ id: number; name: string }>>([]);
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void Promise.all([fetchRankings(1), fetchFiltersData()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, router, user]);

  async function fetchRankings(page = 1) {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: String(page),
        limit: filters.limit,
        sort_by: filters.sort_by,
      });

      if (filters.class_id) params.set('class_id', filters.class_id);
      if (filters.org_level_id) params.set('org_level_id', filters.org_level_id);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);

      const response = await fetch(`/api/admin/rankings?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as RankingsResponse | null;

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai bang diem tong hop');
      }

      setRankings(parseRankingRows(payload));
      setPagination(payload?.pagination || { page, limit: Number(filters.limit), total: 0, pages: 1 });
    } catch (fetchError) {
      console.error('Fetch admin rankings error:', fetchError);
      setRankings([]);
      setPagination({ page, limit: Number(filters.limit), total: 0, pages: 1 });
      setError(
        fetchError instanceof Error ? fetchError.message : 'Khong the tai bang diem tong hop'
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchFiltersData() {
    try {
      const [classesResponse, levelsResponse] = await Promise.all([
        fetch('/api/admin/classes?limit=200'),
        fetch('/api/admin/organization-levels'),
      ]);

      const [classesPayload, levelsPayload] = await Promise.all([
        classesResponse.json().catch(() => null),
        levelsResponse.json().catch(() => null),
      ]);

      if (classesResponse.ok) {
        setClasses(parseClassesPayload(classesPayload));
      }
      if (levelsResponse.ok) {
        setOrgLevels(parseOrgLevelsPayload(levelsPayload));
      }
    } catch (fetchError) {
      console.error('Fetch ranking filters error:', fetchError);
    }
  }

  async function exportData(format: 'csv' | 'xlsx') {
    try {
      setExporting(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '10000',
        sort_by: filters.sort_by,
      });
      if (filters.class_id) params.set('class_id', filters.class_id);
      if (filters.org_level_id) params.set('org_level_id', filters.org_level_id);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);

      const response = await fetch(`/api/admin/rankings?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as RankingsResponse | null;

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the xuat bang xep hang');
      }

      const allRows = parseRankingRows(payload);
      if (allRows.length === 0) {
        toast.error('Khong co du lieu de xuat');
        return;
      }

      const headers = ['Hang', 'Hoc vien', 'Email', 'Lop', 'Tong diem', 'Hoat dong', 'Khen thuong', 'TB/HD'];
      const separator = format === 'csv' ? ',' : '\t';
      const rows = [
        headers.join(separator),
        ...allRows.map((row) =>
          [
            row.rank,
            row.student_name,
            row.student_email,
            row.class_name,
            row.total_points,
            row.activity_count,
            row.award_count,
            row.avg_points,
          ]
            .map((cell) => `"${cell}"`)
            .join(separator)
        ),
      ].join('\n');

      downloadRows(
        `scoreboard-${toVietnamDateStamp(new Date())}.${format}`,
        rows,
        format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel'
      );
      toast.success(format === 'csv' ? 'Da xuat CSV bang xep hang' : 'Da xuat Excel bang xep hang');
    } catch (exportError) {
      console.error('Export rankings error:', exportError);
      toast.error(exportError instanceof Error ? exportError.message : 'Khong the xuat bang xep hang');
    } finally {
      setExporting(false);
    }
  }

  const hasActiveFilters = useMemo(() => {
    return Boolean(filters.class_id || filters.org_level_id || filters.date_from || filters.date_to);
  }, [filters]);

  if (authLoading || (loading && rankings.length === 0 && !error)) {
    return <LoadingSpinner message="Dang tai bang xep hang chi tiet..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Scoreboard
              </div>
              <h1
                className="mt-3 text-3xl font-bold text-slate-900"
                data-testid="admin-scoreboard-heading"
              >
                Bang xep hang chi tiet
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Loc va doi soat xep hang hoc vien theo tong diem, so hoat dong, khen thuong va khoang thoi gian.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  showFilters
                    ? 'bg-blue-100 text-blue-700'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                Bo loc
              </button>

              <button
                type="button"
                disabled={exporting || rankings.length === 0}
                onClick={() => void exportData('csv')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>

              <button
                type="button"
                disabled={exporting || rankings.length === 0}
                onClick={() => void exportData('xlsx')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="text-sm font-semibold text-rose-700">Co loi khi tai scoreboard</div>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </section>
        ) : null}

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.sort_by}
                onChange={(event) => setFilters((current) => ({ ...current, sort_by: event.target.value }))}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                <option value="total_points">Tong diem</option>
                <option value="activity_count">So hoat dong</option>
                <option value="award_count">So khen thuong</option>
              </select>

              <select
                value={filters.limit}
                onChange={(event) => setFilters((current) => ({ ...current, limit: event.target.value }))}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                <option value="10">10 / trang</option>
                <option value="25">25 / trang</option>
                <option value="50">50 / trang</option>
                <option value="100">100 / trang</option>
              </select>
            </div>

            <div className="text-sm text-slate-500">
              Tong {pagination.total} hoc vien | Trang {pagination.page}/{pagination.pages}
            </div>
          </div>

          {showFilters ? (
            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Lop</span>
                  <select
                    value={filters.class_id}
                    onChange={(event) => setFilters((current) => ({ ...current, class_id: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  >
                    <option value="">Tat ca lop</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Cap to chuc</span>
                  <select
                    value={filters.org_level_id}
                    onChange={(event) => setFilters((current) => ({ ...current, org_level_id: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  >
                    <option value="">Tat ca cap</option>
                    {orgLevels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Tu ngay</span>
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Den ngay</span>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFilters(INITIAL_FILTERS);
                      void fetchRankings(1);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    <X className="h-4 w-4" />
                    Xoa bo loc
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    void fetchRankings(1);
                    setShowFilters(false);
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Ap dung
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {loading ? (
          <section className="page-surface rounded-[1.75rem] px-5 py-10 text-center sm:px-7">
            <div className="text-sm text-slate-500">Dang tai du lieu scoreboard...</div>
          </section>
        ) : rankings.length === 0 ? (
          <section className="page-surface rounded-[1.75rem] border-dashed px-5 py-10 text-center sm:px-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
              <TrendingUp className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Khong co du lieu xep hang</h2>
            <p className="mt-2 text-sm text-slate-600">
              Thu doi bo loc hoac mo rong khoang thoi gian de xem them ket qua.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 xl:hidden">
              {rankings.map((rank) => (
                <article key={rank.student_id} className="page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Hang #{rank.rank}
                      </div>
                      <Link
                        href={`/admin/students/${rank.student_id}`}
                        className="mt-2 block text-base font-semibold text-blue-700 hover:underline"
                      >
                        {rank.student_name}
                      </Link>
                      <div className="mt-1 text-sm text-slate-500">{rank.student_email}</div>
                      <div className="mt-1 text-xs text-slate-500">{rank.class_name}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-semibold text-blue-700">{rank.total_points}</div>
                      <div className="text-xs text-slate-500">diem</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">HD</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{rank.activity_count}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">KT</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{rank.award_count}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">TB/HD</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">{rank.avg_points}</div>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="page-surface hidden overflow-x-auto rounded-[1.75rem] border xl:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hang</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hoc vien</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Lop</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tong diem</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">HD</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">KT</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">TB/HD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rankings.map((rank) => (
                    <tr key={rank.student_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">#{rank.rank}</td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/students/${rank.student_id}`}
                          className="text-sm font-semibold text-blue-700 hover:underline"
                        >
                          {rank.student_name}
                        </Link>
                        <div className="mt-1 text-sm text-slate-500">{rank.student_email}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{rank.class_name}</td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-blue-700">{rank.total_points}</td>
                      <td className="px-5 py-4 text-right text-sm text-slate-600">{rank.activity_count}</td>
                      <td className="px-5 py-4 text-right text-sm text-slate-600">{rank.award_count}</td>
                      <td className="px-5 py-4 text-right text-sm text-slate-600">{rank.avg_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Dang hien thi {rankings.length} / {pagination.total} hoc vien
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => void fetchRankings(pagination.page - 1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Truoc
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => void fetchRankings(pagination.page + 1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

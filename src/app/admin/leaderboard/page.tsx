'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  Download,
  Medal,
  Settings2,
  Trophy,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toVietnamDateStamp } from '@/lib/timezone';

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  email: string;
  class_name: string | null;
  total_points: number;
  activities_count: number;
}

type ExportColumnState = {
  rank: boolean;
  name: boolean;
  email: boolean;
  class_name: boolean;
  total_points: boolean;
  activities_count: boolean;
};

const INITIAL_COLUMNS: ExportColumnState = {
  rank: true,
  name: true,
  email: true,
  class_name: true,
  total_points: true,
  activities_count: true,
};

function parseLeaderboardPayload(payload: any): LeaderboardEntry[] {
  const source = payload?.leaderboard || payload?.data?.leaderboard || [];
  return Array.isArray(source) ? source : [];
}

function SummaryCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string;
  meta?: string;
  tone: 'amber' | 'blue' | 'emerald';
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-700'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-blue-50 text-blue-700';

  return (
    <div className={`rounded-[1.5rem] px-4 py-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
      {meta ? <div className="mt-2 text-xs text-slate-500">{meta}</div> : null}
    </div>
  );
}

export default function AdminLeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportColumns, setExportColumns] = useState<ExportColumnState>(INITIAL_COLUMNS);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchLeaderboard(limit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, router, user, limit]);

  async function fetchLeaderboard(nextLimit: number) {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/admin/leaderboard?limit=${nextLimit}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai bang xep hang');
      }

      setLeaderboard(parseLeaderboardPayload(payload));
    } catch (fetchError) {
      console.error('Fetch admin leaderboard error:', fetchError);
      setLeaderboard([]);
      setError(fetchError instanceof Error ? fetchError.message : 'Khong the tai bang xep hang');
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const first = leaderboard[0] || null;
    const totalPoints = leaderboard.reduce((sum, entry) => sum + Number(entry.total_points || 0), 0);
    const avgPoints =
      leaderboard.length > 0 ? Math.round((totalPoints / leaderboard.length) * 10) / 10 : 0;

    return {
      topName: first?.name || 'Chua co du lieu',
      topPoints: first?.total_points || 0,
      avgPoints,
    };
  }, [leaderboard]);

  function exportData(format: 'csv' | 'xls') {
    if (leaderboard.length === 0) {
      toast.error('Khong co du lieu de xuat');
      return;
    }

    const columnMap: Record<keyof ExportColumnState, { label: string; getValue: (entry: LeaderboardEntry) => string | number }> =
      {
        rank: { label: 'Hang', getValue: (entry) => entry.rank },
        name: { label: 'Ho ten', getValue: (entry) => entry.name },
        email: { label: 'Email', getValue: (entry) => entry.email },
        class_name: { label: 'Lop', getValue: (entry) => entry.class_name || 'N/A' },
        total_points: { label: 'Tong diem', getValue: (entry) => entry.total_points },
        activities_count: { label: 'So hoat dong', getValue: (entry) => entry.activities_count },
      };

    const selectedColumns = (Object.keys(exportColumns) as Array<keyof ExportColumnState>).filter(
      (columnKey) => exportColumns[columnKey]
    );

    if (selectedColumns.length === 0) {
      toast.error('Chon it nhat mot cot de xuat');
      return;
    }

    const separator = format === 'csv' ? ',' : '\t';
    const rows = [
      selectedColumns.map((columnKey) => columnMap[columnKey].label).join(separator),
      ...leaderboard.map((entry) =>
        selectedColumns
          .map((columnKey) => `"${columnMap[columnKey].getValue(entry)}"`)
          .join(separator)
      ),
    ];

    const blob = new Blob(['\uFEFF' + rows.join('\n')], {
      type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leaderboard-top-${limit}-${toVietnamDateStamp(new Date())}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(format === 'csv' ? 'Da xuat leaderboard CSV' : 'Da xuat leaderboard Excel');
    setShowExportDialog(false);
  }

  if (authLoading || (loading && leaderboard.length === 0 && !error)) {
    return <LoadingSpinner message="Dang tai leaderboard..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Leaderboard
              </div>
              <h1
                className="mt-3 text-3xl font-bold text-slate-900"
                data-testid="admin-leaderboard-heading"
              >
                Bang xep hang tong hop
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Theo doi nhom hoc vien dan dau theo tong diem tich luy va so hoat dong tham gia.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
              </select>

              <button
                type="button"
                onClick={() => setShowExportDialog(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Xuat file
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="text-sm font-semibold text-rose-700">Co loi khi tai leaderboard</div>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Top 1 hien tai"
            value={stats.topName}
            meta={`${stats.topPoints} diem`}
            tone="amber"
          />
          <SummaryCard
            label="Tong hoc vien hien thi"
            value={String(leaderboard.length)}
            meta={`Dang xem top ${limit}`}
            tone="blue"
          />
          <SummaryCard
            label="Diem trung binh"
            value={String(stats.avgPoints)}
            meta="Tinh tren danh sach hien tai"
            tone="emerald"
          />
        </section>

        {leaderboard.length === 0 ? (
          <section className="page-surface rounded-[1.75rem] border-dashed px-5 py-10 text-center sm:px-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
              <Users className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Chua co du lieu xep hang</h2>
            <p className="mt-2 text-sm text-slate-600">
              Kiem tra score ledger hoac mo rong limit de xem them ket qua.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="grid gap-4 xl:hidden">
              {leaderboard.map((entry) => (
                <article
                  key={entry.user_id}
                  className={`page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7 ${
                    entry.rank <= 3 ? 'border-amber-200 bg-amber-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${
                          entry.rank === 1
                            ? 'bg-amber-400 text-white'
                            : entry.rank === 2
                              ? 'bg-slate-300 text-white'
                              : entry.rank === 3
                                ? 'bg-orange-400 text-white'
                                : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {entry.rank === 1 ? (
                          <Trophy className="h-5 w-5" />
                        ) : entry.rank === 2 ? (
                          <Medal className="h-5 w-5" />
                        ) : entry.rank === 3 ? (
                          <Award className="h-5 w-5" />
                        ) : (
                          `#${entry.rank}`
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-900">{entry.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{entry.email}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {entry.class_name || 'Chua gan lop'} | {entry.activities_count} hoat dong
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-semibold text-blue-700">{entry.total_points}</div>
                      <div className="text-xs text-slate-500">diem</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="page-surface hidden overflow-x-auto rounded-[1.75rem] border xl:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Hang
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Hoc vien
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lop
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tong diem
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Hoat dong
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {leaderboard.map((entry) => (
                    <tr key={entry.user_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">#{entry.rank}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-slate-900">{entry.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{entry.email}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {entry.class_name || 'Chua gan lop'}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-blue-700">
                        {entry.total_points}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-slate-600">
                        {entry.activities_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {showExportDialog ? (
          <div
            className="app-modal-backdrop p-4"
            onClick={() => setShowExportDialog(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-leaderboard-export-title"
              className="app-modal-panel app-modal-panel-scroll w-full max-w-lg p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-cyan-600" />
                <h3 id="admin-leaderboard-export-title" className="text-xl font-semibold text-slate-900">
                  Xuat leaderboard
                </h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Chon cac cot can xuat cho top {limit} hoc vien dang hien thi.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['rank', 'Hang'],
                  ['name', 'Ho ten'],
                  ['email', 'Email'],
                  ['class_name', 'Lop'],
                  ['total_points', 'Tong diem'],
                  ['activities_count', 'So hoat dong'],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={exportColumns[key as keyof ExportColumnState]}
                      onChange={(event) =>
                        setExportColumns((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowExportDialog(false)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Huy
                </button>
                <button
                  type="button"
                  onClick={() => exportData('csv')}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportData('xls')}
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Excel
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

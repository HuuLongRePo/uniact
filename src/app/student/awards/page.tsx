'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import StudentScoreFlowNav from '@/components/student/StudentScoreFlowNav';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/formatters';

interface Award {
  id: number;
  award_type_name: string;
  award_type_description: string;
  reason: string;
  awarded_at: string;
  awarded_by_name: string;
}

interface AwardSummary {
  award_type_name: string;
  total_awards: number;
  first_awarded_at: string;
  last_awarded_at: string;
}

interface AwardsResponse {
  awards: Award[];
  summary: AwardSummary[];
}

type Filters = {
  type: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = {
  type: '',
  from: '',
  to: '',
};

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-600 dark:bg-slate-800/60">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{message}</h3>
      {hint ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{hint}</p> : null}
    </div>
  );
}

export default function StudentAwardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [data, setData] = useState<AwardsResponse>({ awards: [], summary: [] });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchAwards();
    }
  }, [authLoading, router, user]);

  async function fetchAwards(nextFilters: Filters = filters) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (nextFilters.type.trim()) params.set('type', nextFilters.type.trim());
      if (nextFilters.from) params.set('from', nextFilters.from);
      if (nextFilters.to) params.set('to', nextFilters.to);

      const query = params.toString();
      const response = await fetch(query ? `/api/student/awards?${query}` : '/api/student/awards');
      const payload = await response.json();
      const normalized = payload?.data || payload;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải danh sách khen thưởng');
      }

      setData({
        awards: normalized?.awards || [],
        summary: normalized?.summary || [],
      });
    } catch (error) {
      console.error('Fetch awards error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Không thể tải danh sách khen thưởng'
      );
      setData({ awards: [], summary: [] });
    } finally {
      setLoading(false);
    }
  }

  const totalAwards = data.awards.length;
  const uniqueAwardTypes = data.summary.length;
  const latestAwardDate = useMemo(
    () => (data.awards.length > 0 ? formatDate(data.awards[0].awarded_at, 'date') : 'Chưa có'),
    [data.awards]
  );

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                Hồ sơ ghi nhận
              </div>
              <h1 data-testid="awards-heading" className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
                Khen thưởng của tôi
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Tổng hợp các quyết định khen thưởng đã ghi nhận cho học viên, kèm mốc thời gian và
                người phê duyệt.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[22rem]">
              <Link
                href="/student/awards/history"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-amber-200 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-500/40 dark:hover:text-amber-200 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-slate-900"
              >
                Xem lịch sử
              </Link>
              <Link
                href="/student/awards/upcoming"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-amber-200 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-500/40 dark:hover:text-amber-200 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-slate-900"
              >
                Mốc tiếp theo
              </Link>
            </div>
          </div>
        </section>

        <StudentDailyQuickActions />
        <StudentScoreFlowNav />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.75rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm dark:border-amber-500/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
              Tổng số khen thưởng
            </div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{totalAwards}</div>
          </div>
          <div className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-500/40 dark:bg-slate-900/70">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
              Loại khen thưởng
            </div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{uniqueAwardTypes}</div>
          </div>
          <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-2 dark:border-emerald-500/40 dark:bg-slate-900/70">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
              Lần ghi nhận gần nhất
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{latestAwardDate}</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Dữ liệu này đồng bộ với lịch sử khen thưởng trong hệ thống.
            </p>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bộ lọc nhanh</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Lọc theo tên loại khen thưởng hoặc khoảng thời gian được trao.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                void fetchAwards(EMPTY_FILTERS);
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Xóa bộ lọc
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Tên loại khen thưởng
              </span>
              <input
                type="text"
                value={filters.type}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, type: event.target.value }))
                }
                placeholder="Ví dụ: Sinh viên xuất sắc"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Từ ngày</span>
              <input
                type="date"
                value={filters.from}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, from: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Đến ngày</span>
              <input
                type="date"
                value={filters.to}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, to: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void fetchAwards(filters)}
                className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:bg-amber-600 dark:hover:bg-amber-500 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-slate-900"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.55fr)]">
          <div className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tổng hợp theo loại</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Tổng hợp này được trình bày bằng thẻ để dễ đọc và dùng ổn định trên điện thoại.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {data.summary.length === 0 ? (
                <EmptyState
                  message="Chưa có nhóm khen thưởng nào"
                  hint="Sau khi có quyết định khen thưởng, hệ thống sẽ hiển thị tổng hợp tại đây."
                />
              ) : (
                data.summary.map((summary) => (
                  <article
                    key={`${summary.award_type_name}-${summary.first_awarded_at}`}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {summary.award_type_name}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          Từ {formatDate(summary.first_awarded_at, 'date')} đến{' '}
                          {formatDate(summary.last_awarded_at, 'date')}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-amber-50 px-4 py-2 text-right dark:bg-amber-500/10">
                        <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                          Số lần
                        </div>
                        <div className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
                          {summary.total_awards}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Danh sách chi tiết</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Mỗi mục gồm tên khen thưởng, thời gian và người phê duyệt để học viên dễ đối chiếu.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {data.awards.length === 0 ? (
                <EmptyState
                  message="Chưa có khen thưởng nào"
                  hint="Khi có quyết định mới, danh sách sẽ hiện ngay tại màn này."
                />
              ) : (
                data.awards.map((award) => (
                  <article
                    key={award.id}
                    className="rounded-[1.5rem] border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-200">
                            Khen thưởng
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(award.awarded_at, 'date')}
                          </span>
                        </div>

                        <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
                          {award.award_type_name}
                        </h3>

                        {award.award_type_description ? (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            {award.award_type_description}
                          </p>
                        ) : null}

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Lý do
                            </div>
                            <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                              {award.reason || 'Không có ghi chú'}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Người phê duyệt
                            </div>
                            <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                              {award.awarded_by_name || 'Hệ thống'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

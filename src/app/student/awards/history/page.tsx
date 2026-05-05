'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import StudentScoreFlowNav from '@/components/student/StudentScoreFlowNav';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

interface AwardRecord {
  id: number;
  awardName: string;
  awardedAt: string;
  points: number;
  reason: string;
  activityTitle?: string | null;
}

type AwardHistoryPayload = {
  awards: AwardRecord[];
  totalPoints: number;
};

function EmptyState() {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-600 dark:bg-slate-800/60">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Chưa có lịch sử khen thưởng</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Khi học viên được ghi nhận, lịch sử sẽ hiện tại đây cùng số điểm cộng tương ứng.
      </p>
    </div>
  );
}

export default function StudentAwardHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState<AwardRecord[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchAwardHistory();
    }
  }, [authLoading, router, user]);

  async function fetchAwardHistory() {
    try {
      setLoading(true);
      const response = await fetch('/api/student/awards/history');
      const payload = await response.json();
      const normalized = payload?.data || payload;

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải lịch sử khen thưởng');
      }

      const resolved = normalized as AwardHistoryPayload;
      setAwards(resolved?.awards || []);
      setTotalPoints(Number(resolved?.totalPoints || 0));
    } catch (error) {
      console.error('Fetch award history error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Không thể tải lịch sử khen thưởng'
      );
      setAwards([]);
      setTotalPoints(0);
    } finally {
      setLoading(false);
    }
  }

  const latestAwardDate = useMemo(
    () => (awards.length > 0 ? formatVietnamDateTime(awards[0].awardedAt, 'date') : 'Chưa có'),
    [awards]
  );

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                Lịch sử đã ghi nhận
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">Lịch sử khen thưởng</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Theo dõi các lần được ghi nhận kèm điểm cộng, lý do và mốc thời gian phát sinh.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[18rem]">
              <Link
                href="/student/awards"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                Về trang khen thưởng
              </Link>
              <Link
                href="/student/dashboard"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </section>

        <StudentDailyQuickActions />
        <StudentScoreFlowNav />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[1.75rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm dark:border-amber-500/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
              Tổng lần được ghi nhận
            </div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{awards.length}</div>
          </div>
          <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-500/40 dark:bg-slate-900/70">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
              Tổng điểm cộng từ khen thưởng
            </div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{totalPoints}</div>
          </div>
          <div className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1 dark:border-blue-500/40 dark:bg-slate-900/70">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
              Lần gần nhất
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{latestAwardDate}</div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dòng thời gian</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Các bản ghi được sắp xếp mới nhất lên trước để dễ đối chiếu trên điện thoại.
              </p>
            </div>
          </div>

          <div className="mt-6">
            {awards.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-4">
                {awards.map((award) => (
                  <article
                    key={award.id}
                    className="relative rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                            Khen thưởng
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatVietnamDateTime(award.awardedAt, 'date')}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">{award.awardName}</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          {award.reason || 'Không có ghi chú'}
                        </p>
                        {award.activityTitle ? (
                          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                            Hoạt động liên quan: {award.activityTitle}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center sm:min-w-[8rem] dark:bg-emerald-500/10">
                        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                          Điểm cộng
                        </div>
                        <div className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">+{award.points}</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import StudentScoreFlowNav from '@/components/student/StudentScoreFlowNav';
import { useAuth } from '@/contexts/AuthContext';

interface UpcomingAward {
  type: string;
  points_needed: number;
  current_points: number;
  progress: number;
  description: string;
}

export default function UpcomingAwardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState<UpcomingAward[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchUpcomingAwards();
    }
  }, [authLoading, router, user]);

  async function fetchUpcomingAwards() {
    try {
      setLoading(true);
      const response = await fetch('/api/student/awards/upcoming');
      const payload = await response.json();
      const normalized = payload?.data || payload;

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải các mốc khen thưởng');
      }

      setAwards(normalized?.awards || []);
    } catch (error) {
      console.error('Fetch upcoming awards error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Không thể tải các mốc khen thưởng'
      );
      setAwards([]);
    } finally {
      setLoading(false);
    }
  }

  const nextMilestone = useMemo(() => awards[0] || null, [awards]);

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                Mục tiêu tiếp theo
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">Mốc khen thưởng sắp đạt</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Các mốc này được tính từ tổng điểm cuối cùng trong score ledger, cùng nguồn với
                bảng điểm và bảng xếp hạng.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[20rem]">
              <Link
                href="/student/points"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                Xem chi tiết điểm
              </Link>
              <Link
                href="/student/awards"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                Về trang khen thưởng
              </Link>
            </div>
          </div>
        </section>

        <StudentDailyQuickActions />
        <StudentScoreFlowNav />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-sm dark:border-blue-500/40 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
              Số mốc còn lại
            </div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{awards.length}</div>
          </div>
          <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-500/40 dark:bg-slate-900/70">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
              Mốc gần nhất
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {nextMilestone?.type || 'Đã vượt hết mốc'}
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-amber-100 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1 dark:border-amber-500/40 dark:bg-slate-900/70">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
              Còn cần thêm
            </div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">
              {nextMilestone
                ? Math.max(0, nextMilestone.points_needed - nextMilestone.current_points)
                : 0}
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tiến độ theo từng mốc</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Các thanh tiến độ đã được tối ưu để đọc rõ trên điện thoại, không còn phụ thuộc vào
              bảng rộng.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {awards.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-600 dark:bg-slate-800/60">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Không còn mốc nào đang chờ</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Học viên đã chạm hoặc vượt các mốc hiện có trong hệ thống.
                </p>
              </div>
            ) : (
              awards.map((award) => {
                const remaining = Math.max(0, award.points_needed - award.current_points);
                return (
                  <article
                    key={`${award.type}-${award.points_needed}`}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                            Đang theo dõi
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{award.progress}% hoàn thành</span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">{award.type}</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{award.description}</p>

                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                            <span>Điểm hiện tại</span>
                            <span>
                              {award.current_points} / {award.points_needed}
                            </span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, award.progress))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center sm:min-w-[8rem] dark:bg-amber-500/10">
                        <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                          Còn thiếu
                        </div>
                        <div className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{remaining}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">điểm nữa</div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

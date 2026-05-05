'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import StudentScoreFlowNav from '@/components/student/StudentScoreFlowNav';
import { toast } from '@/lib/toast';

interface ScoreboardStudent {
  id: number;
  name: string;
  class_id?: number | null;
  class_name?: string | null;
  total_score: number;
  activities_count: number;
}

interface ScoreboardMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface RankingEntry {
  rank: number;
  student_id: number;
  student_name: string;
  class_name: string;
  total_points: number;
  total_activities: number;
  is_current_user: boolean;
}

interface ScoreboardResponse {
  students?: ScoreboardStudent[];
  meta?: ScoreboardMeta;
}

export default function StudentRankingPage() {
  const { user, loading: authLoading } = useAuth();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState<ScoreboardMeta>({
    total: 0,
    page: 1,
    per_page: 20,
    total_pages: 1,
  });

  useEffect(() => {
    if (!authLoading && user?.role === 'student') {
      void fetchRankings();
    }
  }, [user, authLoading, currentPage]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: '20',
        order: 'desc',
      });

      const res = await fetch(`/api/scoreboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Không thể tải bảng xếp hạng');
      }

      const data = (await res.json()) as ScoreboardResponse;
      const students = data.students || [];
      const resolvedMeta = data.meta || {
        total: students.length,
        page: currentPage,
        per_page: 20,
        total_pages: 1,
      };

      setMeta(resolvedMeta);
      setRankings(
        students.map((entry, index) => ({
          rank: (resolvedMeta.page - 1) * resolvedMeta.per_page + index + 1,
          student_id: entry.id,
          student_name: entry.name,
          class_name: entry.class_name || 'Chưa có lớp',
          total_points: Number(entry.total_score || 0),
          total_activities: Number(entry.activities_count || 0),
          is_current_user: user?.id === entry.id,
        }))
      );
    } catch (error) {
      console.error('Error fetching rankings:', error);
      toast.error('Không thể tải bảng xếp hạng');
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  const currentUserEntry = useMemo(
    () => rankings.find((entry) => entry.is_current_user) ?? null,
    [rankings]
  );
  const classScopeLabel = currentUserEntry?.class_name || rankings[0]?.class_name || 'Chưa có lớp';

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!user || user.role !== 'student') {
    return null;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <h1 data-testid="ranking-heading" className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Bảng xếp hạng
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Học viên chỉ xem bảng xếp hạng trong lớp của mình. Thứ hạng được tính theo tổng điểm
            tích lũy hiện có.
          </p>
        </div>

        <StudentDailyQuickActions />
        <StudentScoreFlowNav />

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-5 shadow-sm dark:border-blue-500/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Lớp hiện tại</div>
            <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {classScopeLabel}
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Trang {meta.page}/{Math.max(1, meta.total_pages)} · {meta.total} học viên
            </p>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm dark:border-amber-500/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30">
            <div className="text-sm font-medium text-amber-700 dark:text-amber-300">Thứ hạng của bạn</div>
            {currentUserEntry ? (
              <>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">#{currentUserEntry.rank}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {currentUserEntry.total_points} điểm · {currentUserEntry.total_activities} hoạt động
                </div>
              </>
            ) : (
              <div className="mt-2 min-h-[3.75rem] text-sm text-slate-600 dark:text-slate-300">
                Trang hiện tại chưa có tên của bạn. Thứ hạng chỉ hiển thị khi bạn nằm trong danh
                sách của trang đang xem.
              </div>
            )}
          </div>
        </div>

        {rankings.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-base text-slate-600 dark:text-slate-300">Chưa có dữ liệu xếp hạng.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {rankings.map((entry) => (
                <div
                  key={entry.student_id}
                  className={`rounded-3xl border p-4 shadow-sm ${
                    entry.is_current_user
                      ? 'border-blue-300 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-500/10'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Hạng #{entry.rank}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {entry.student_name}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.class_name}</div>
                    </div>
                    {entry.is_current_user && (
                      <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white dark:bg-blue-500 dark:text-slate-950">
                        Bạn
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-slate-800/90">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Tổng điểm</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {entry.total_points}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-3 py-3 dark:bg-slate-800/90">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Hoạt động</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {entry.total_activities}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-900 text-left text-sm text-white">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Hạng</th>
                      <th className="px-5 py-4 font-semibold">Học viên</th>
                      <th className="px-5 py-4 font-semibold">Lớp</th>
                      <th className="px-5 py-4 text-center font-semibold">Tổng điểm</th>
                      <th className="px-5 py-4 text-center font-semibold">Hoạt động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700 dark:divide-slate-700 dark:text-slate-300">
                    {rankings.map((entry) => (
                      <tr
                        key={entry.student_id}
                        className={entry.is_current_user ? 'bg-blue-50/70 dark:bg-blue-500/10' : 'bg-white dark:bg-slate-900'}
                      >
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">#{entry.rank}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{entry.student_name}</span>
                            {entry.is_current_user && (
                              <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white dark:bg-blue-500 dark:text-slate-950">
                                Bạn
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">{entry.class_name}</td>
                        <td className="px-5 py-4 text-center font-semibold text-slate-900 dark:text-slate-100">
                          {entry.total_points}
                        </td>
                        <td className="px-5 py-4 text-center">{entry.total_activities}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={meta.page <= 1}
                className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900 sm:w-auto"
              >
                Trang trước
              </button>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Trang {meta.page}/{Math.max(1, meta.total_pages)}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(meta.total_pages || 1, prev + 1))}
                disabled={meta.page >= Math.max(1, meta.total_pages)}
                className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900 sm:w-auto"
              >
                Trang sau
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

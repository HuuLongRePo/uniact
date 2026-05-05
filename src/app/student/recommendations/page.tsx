'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, Sparkles, Target } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

interface RecommendationActivity {
  id: number;
  title: string;
  date_time: string;
  location: string | null;
  activity_type_name: string | null;
  match_reason?: string;
  reason?: string;
}

export default function RecommendationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<RecommendationActivity[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchRecommendations();
    }
  }, [authLoading, router, user]);

  async function fetchRecommendations() {
    try {
      setLoading(true);
      const response = await fetch('/api/student/recommendations');
      const payload = await response.json();
      setActivities(
        payload?.recommendations ||
          payload?.items ||
          payload?.data?.recommendations ||
          payload?.data?.items ||
          []
      );
    } catch (error) {
      console.error('Fetch recommendations error:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                Gợi ý cá nhân hóa
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">Gợi ý hoạt động</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Các hoạt động được đề xuất dựa trên lịch sử tham gia, nhóm loại hoạt động và mức độ
                phù hợp với học viên.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-violet-100 bg-violet-50 p-4 dark:border-violet-500/40 dark:bg-violet-500/10 lg:w-[16rem]">
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-200">
                Số gợi ý hiện có
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{activities.length}</div>
            </div>
          </div>
        </section>

        <StudentDailyQuickActions />

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {activities.length === 0 ? (
            <div className="page-surface col-span-full rounded-[1.75rem] px-5 py-12 text-center sm:px-7">
              <Target className="mx-auto h-14 w-14 text-violet-400 dark:text-violet-300" />
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">Chưa có gợi ý nào</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Sau khi học viên tham gia thêm hoạt động, hệ thống sẽ đề xuất sát hơn.
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <article
                key={activity.id}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-violet-500/50"
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Phù hợp với bạn
                </div>

                <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">{activity.title}</h2>

                <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>{formatVietnamDateTime(activity.date_time, 'date')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>{activity.location || 'TBA'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span>{activity.activity_type_name || 'Không rõ loại'}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.25rem] border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200">
                  {activity.match_reason || activity.reason || 'Phù hợp với lịch sử và mục tiêu của bạn.'}
                </div>

                <Link
                  href={`/student/activities/${activity.id}`}
                  className="mt-5 block w-full rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                >
                  Xem hoạt động
                </Link>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

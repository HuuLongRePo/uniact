'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Clock, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';

interface StudentStats {
  registeredActivities: number;
  attendedActivities: number;
  totalScore: number;
  recentScore: number;
  pendingActivities: number;
  notifications: number;
  rank: number | null;
  totalStudents: number | null;
}

interface UpcomingActivity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string | null;
  activity_type: string | null;
}

interface RecentScore {
  activity_title: string;
  score: number;
  created_at: string;
}

interface DashboardNotification {
  title: string;
  message: string;
  created_at: string;
}

interface RecommendationItem {
  id: number;
  title: string;
  description: string;
  date_time: string;
  activity_type_name: string | null;
  base_points: number;
  reason?: string;
  is_preferred_type?: boolean;
}

interface ActivityTypeBreakdownItem {
  name: string;
  count: number;
}

interface MonthlyTrendItem {
  month: number | string;
  year: number | string;
  count: number;
}

const DEFAULT_STATS: StudentStats = {
  registeredActivities: 0,
  attendedActivities: 0,
  totalScore: 0,
  recentScore: 0,
  pendingActivities: 0,
  notifications: 0,
  rank: null,
  totalStudents: null,
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export default function StudentDashboardPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StudentStats>(DEFAULT_STATS);
  const [upcomingActivities, setUpcomingActivities] = useState<UpcomingActivity[]>([]);
  const [recentScores, setRecentScores] = useState<RecentScore[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [activityTypeBreakdown, setActivityTypeBreakdown] = useState<ActivityTypeBreakdownItem[]>(
    []
  );
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      void fetchDashboardData();
    }
  }, [currentUser, loading, router]);

  async function fetchDashboardData() {
    try {
      const [statsRes, activitiesRes, scoresRes, notifRes, breakdownRes, recsRes] =
        await Promise.all([
          fetch('/api/student/statistics'),
          fetch('/api/activities?limit=20'),
          fetch('/api/student/scores?limit=5'),
          fetch('/api/notifications?limit=5'),
          fetch('/api/student/activity-breakdown'),
          fetch('/api/student/recommendations'),
        ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.statistics || statsData.data?.statistics || DEFAULT_STATS);
      }

      if (activitiesRes.ok) {
        const actData = await activitiesRes.json();
        const rawActivities = (actData.activities || actData.data?.activities || []) as UpcomingActivity[];
        const upcoming = rawActivities
          .filter((activity) => {
            const activityDate = new Date(activity.date_time);
            return !Number.isNaN(activityDate.getTime()) && activityDate > new Date();
          })
          .sort((left, right) => new Date(left.date_time).getTime() - new Date(right.date_time).getTime())
          .slice(0, 5);
        setUpcomingActivities(upcoming);
      }

      if (scoresRes.ok) {
        const scoresData = await scoresRes.json();
        setRecentScores((scoresData.scores || scoresData.data?.scores || []) as RecentScore[]);
      }

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(
          (notifData.notifications || notifData.data?.notifications || []) as DashboardNotification[]
        );
      }

      if (breakdownRes.ok) {
        const breakdownData = await breakdownRes.json();
        setActivityTypeBreakdown(
          (breakdownData.breakdown || breakdownData.data?.breakdown || []) as ActivityTypeBreakdownItem[]
        );
        setMonthlyTrend(
          (breakdownData.monthly || breakdownData.data?.monthly || []) as MonthlyTrendItem[]
        );
      }

      if (recsRes.ok) {
        const recsData = await recsRes.json();
        setRecommendations(
          (recsData.recommendations ||
            recsData.items ||
            recsData.data?.recommendations ||
            recsData.data?.items ||
            []) as RecommendationItem[]
        );
      }
    } catch (error) {
      console.error('Student dashboard fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const scoreTarget = 100;
  const scoreProgress = useMemo(
    () => Math.min((Number(stats.totalScore || 0) / scoreTarget) * 100, 100),
    [stats.totalScore]
  );

  if (loading || isLoading) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[12rem] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="text-base font-medium text-slate-600 dark:text-slate-300">
              Đang tải bảng điều khiển...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">Chào mừng, {currentUser?.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-emerald-50 sm:text-base">
                Theo dõi nhanh hoạt động đã đăng ký, điểm rèn luyện, thông báo mới và các đề xuất
                phù hợp với tiến độ của bạn.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-100">Thứ hạng hiện tại</div>
              <div className="mt-1 text-2xl font-bold">
                {stats.rank && stats.totalStudents ? `#${stats.rank}/${stats.totalStudents}` : 'Đang cập nhật'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Đã đăng ký</div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.registeredActivities}</div>
            <Link href="/student/my-activities" className="mt-4 inline-block text-sm font-semibold text-blue-600 dark:text-blue-300">
              Xem hoạt động của tôi
            </Link>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Đã tham gia</div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.attendedActivities}</div>
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">Đang duy trì mức độ tham gia ổn định.</div>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm dark:border-amber-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-amber-700 dark:text-amber-300">Tổng điểm</div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.totalScore}</div>
            <Link href="/student/points" className="mt-4 inline-block text-sm font-semibold text-amber-700 dark:text-amber-300">
              Xem chi tiết điểm
            </Link>
          </div>

          <div className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Thông báo mới</div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.notifications}</div>
            <Link
              href="/student/notifications"
              className="mt-4 inline-block text-sm font-semibold text-purple-700 dark:text-purple-300"
            >
              Xem thông báo
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Mục tiêu điểm</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Bạn đang có {stats.totalScore}/{scoreTarget} điểm. Còn lại {Math.max(scoreTarget - stats.totalScore, 0)} điểm để đạt mốc hiện tại.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{Math.round(scoreProgress)}%</div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Tiến độ</div>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={scoreProgress} />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Hành động nhanh</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Link
              href="/student/check-in"
              className="rounded-3xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm font-semibold text-cyan-900 transition hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/20"
            >
              Quét QR điểm danh
            </Link>
            <Link
              href="/student/activities"
              className="rounded-3xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-900 transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
            >
              Khám phá hoạt động
            </Link>
            <Link
              href="/student/my-activities"
              className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
            >
              Hoạt động đã đăng ký
            </Link>
            <Link
              href="/student/scores"
              className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-900 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
            >
              Bảng điểm
            </Link>
            <Link
              href="/student/notifications"
              className="rounded-3xl border border-violet-200 bg-violet-50 px-4 py-4 text-sm font-semibold text-violet-900 transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20"
            >
              Thông báo
            </Link>
            <Link
              href="/student/profile"
              className="rounded-3xl border border-purple-200 bg-purple-50 px-4 py-4 text-sm font-semibold text-purple-900 transition hover:border-purple-300 hover:bg-purple-100 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-200 dark:hover:bg-purple-500/20"
            >
              Hồ sơ cá nhân
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Hoạt động sắp tới</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Danh sách các hoạt động gần nhất mà bạn có thể tham gia.</p>
                </div>
                <Link href="/student/activities" className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                  Xem tất cả
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {upcomingActivities.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    Chưa có hoạt động sắp tới.
                  </div>
                ) : (
                  upcomingActivities.map((activity) => (
                    <div key={activity.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{activity.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{activity.description}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>{formatDate(activity.date_time)}</span>
                            <span>{activity.location || 'Chưa có địa điểm'}</span>
                            <span>{activity.activity_type || 'Hoạt động'}</span>
                          </div>
                        </div>
                        <Link
                          href={`/student/activities/${activity.id}`}
                          className="shrink-0 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 dark:border-blue-500/40 dark:bg-slate-900 dark:text-blue-200"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gợi ý cho bạn</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Hoạt động được đề xuất dựa trên lịch sử tham gia của bạn.</p>
                </div>
                <Link href="/student/recommendations" className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                  Trang đề xuất
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {recommendations.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600 md:col-span-2 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    Chưa có gợi ý hoạt động phù hợp lúc này.
                  </div>
                ) : (
                  recommendations.slice(0, 4).map((activity) => (
                    <Link
                      key={activity.id}
                      href={`/student/activities/${activity.id}`}
                      className="rounded-3xl border border-indigo-200 bg-indigo-50/60 p-4 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                          {activity.title}
                        </h3>
                        {activity.is_preferred_type && (
                          <span className="rounded-full bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white">
                            Phù hợp
                          </span>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{activity.description}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatDate(activity.date_time)}</span>
                        <span>{activity.activity_type_name || 'Hoạt động'}</span>
                        <span>+{activity.base_points} điểm</span>
                      </div>
                      {activity.reason && (
                        <div className="mt-3 text-xs font-medium text-indigo-700 dark:text-indigo-200">{activity.reason}</div>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Điểm gần đây</h2>
              </div>
              <div className="mt-4 space-y-3">
                {recentScores.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    Chưa có bản ghi điểm nào.
                  </div>
                ) : (
                  recentScores.map((score, index) => (
                    <div key={`${score.activity_title}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {score.activity_title}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(score.created_at)}</div>
                        </div>
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-300">{score.score}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/student/scores"
                className="mt-4 block rounded-full bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Xem bảng điểm đầy đủ
              </Link>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Thông báo gần đây</h2>
              </div>
              <div className="mt-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    Không có thông báo mới.
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <div key={`${notification.title}-${index}`} className="rounded-3xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-500/40 dark:bg-orange-500/10">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.title}</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.message}</div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDate(notification.created_at)}</div>
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/student/notifications"
                className="mt-4 block rounded-full border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                Xem tất cả thông báo
              </Link>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Phân tích nhanh</h2>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Loại hoạt động đã tham gia</div>
                  <div className="space-y-3">
                    {activityTypeBreakdown.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">Chưa có dữ liệu phân loại.</div>
                    ) : (
                      activityTypeBreakdown.slice(0, 4).map((item, index) => {
                        const percentage =
                          stats.attendedActivities > 0 ? (item.count / stats.attendedActivities) * 100 : 0;
                        return (
                          <div key={`${item.name}-${index}`}>
                            <div className="mb-1 flex justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                              <span className="truncate">{item.name}</span>
                              <span>{item.count}</span>
                            </div>
                            <ProgressBar value={percentage} />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Xu hướng 6 tháng</div>
                  <div className="space-y-3">
                    {monthlyTrend.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">Chưa có dữ liệu xu hướng.</div>
                    ) : (
                      monthlyTrend.slice(-4).map((item, index) => (
                        <div key={`${item.month}-${item.year}-${index}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-800/60">
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            Tháng {Number(item.month)}/{item.year}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{item.count} hoạt động</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-200">
                  <div className="font-semibold">Điểm danh QR</div>
                  <div className="mt-1">
                    Nếu sắp đến giờ học hoặc sự kiện, vào trang điểm danh để quét QR và thực hiện
                    đúng quy trình.
                  </div>
                  <Link href="/student/check-in" className="mt-3 inline-block font-semibold text-cyan-800 dark:text-cyan-200">
                    Mở trang điểm danh QR
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

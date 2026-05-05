'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, Lightbulb, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';

interface StudentStatisticsResponse {
  statistics?: {
    registeredActivities: number;
    attendedActivities: number;
    totalScore: number;
  };
}

interface UpcomingAward {
  type: string;
  points_needed: number;
  current_points: number;
  progress: number;
  description: string;
}

interface HistoryItem {
  attended: number;
  date_time: string;
}

interface StudentTipsStats {
  currentPoints: number;
  nextAwardThreshold: number | null;
  nextAwardName: string | null;
  activitiesThisMonth: number;
  attendanceRate: number;
}

interface Tip {
  id: string;
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
}

const DEFAULT_STATS: StudentTipsStats = {
  currentPoints: 0,
  nextAwardThreshold: null,
  nextAwardName: null,
  activitiesThisMonth: 0,
  attendanceRate: 0,
};

export default function AchievementTipsPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<StudentTipsStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.role === 'student') {
      void fetchStats();
    }
  }, [user, authLoading]);

  async function fetchStats() {
    try {
      setLoading(true);

      const [statisticsRes, upcomingAwardsRes, historyRes] = await Promise.all([
        fetch('/api/student/statistics'),
        fetch('/api/student/awards/upcoming'),
        fetch('/api/student/history'),
      ]);

      const statisticsJson = (statisticsRes.ok
        ? ((await statisticsRes.json()) as StudentStatisticsResponse)
        : {}) as StudentStatisticsResponse;
      const upcomingAwardsJson = upcomingAwardsRes.ok ? await upcomingAwardsRes.json() : {};
      const historyJson = historyRes.ok ? await historyRes.json() : {};

      const statistics = statisticsJson.statistics || {
        registeredActivities: 0,
        attendedActivities: 0,
        totalScore: 0,
      };
      const upcomingAwards = (upcomingAwardsJson.awards ||
        upcomingAwardsJson.data?.awards ||
        []) as UpcomingAward[];
      const history = (historyJson.data?.history || historyJson.history || []) as HistoryItem[];

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const activitiesThisMonth = history.filter((item) => {
        if (item.attended !== 1) return false;
        const activityDate = new Date(item.date_time);
        return (
          !Number.isNaN(activityDate.getTime()) &&
          activityDate.getMonth() === currentMonth &&
          activityDate.getFullYear() === currentYear
        );
      }).length;

      const nextAward = upcomingAwards[0] || null;
      const attendanceRate =
        statistics.registeredActivities > 0
          ? (statistics.attendedActivities / statistics.registeredActivities) * 100
          : 0;

      setStats({
        currentPoints: statistics.totalScore || 0,
        nextAwardThreshold: nextAward?.points_needed || null,
        nextAwardName: nextAward?.type || null,
        activitiesThisMonth,
        attendanceRate,
      });
    } catch (error) {
      console.error('Fetch stats error:', error);
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  }

  const tips = useMemo<Tip[]>(
    () => [
      {
        id: '1',
        icon: '🎯',
        title: 'Đặt mục tiêu điểm rõ ràng',
        description: stats.nextAwardName
          ? `Bạn đang cách ${Math.max(0, (stats.nextAwardThreshold || 0) - stats.currentPoints)} điểm để đạt mốc "${stats.nextAwardName}".`
          : 'Theo dõi tổng điểm hiện tại và chọn mốc khen thưởng tiếp theo để hướng tới.',
        actionLabel: 'Xem giải thưởng sắp đạt',
        actionUrl: '/student/awards/upcoming',
      },
      {
        id: '2',
        icon: '🗓️',
        title: 'Đăng ký hoạt động sớm',
        description:
          'Đăng ký sớm giúp bạn chủ động lịch học, tránh hết chỗ và không bỏ lỡ hạn điểm danh.',
        actionLabel: 'Khám phá hoạt động',
        actionUrl: '/student/activities',
      },
      {
        id: '3',
        icon: '✅',
        title: 'Giữ tỷ lệ tham gia ổn định',
        description: `Tỷ lệ tham gia hiện tại của bạn là ${stats.attendanceRate.toFixed(1)}%. Duy trì mức cao để không mất điểm vì vắng mặt.`,
        actionLabel: 'Xem hoạt động của tôi',
        actionUrl: '/student/my-activities',
      },
      {
        id: '4',
        icon: '🏆',
        title: 'Theo dõi tổng điểm đúng màn hình',
        description:
          'Tổng điểm tích lũy và các hệ số điểm được tổng hợp đầy đủ trong màn hình điểm rèn luyện.',
        actionLabel: 'Mở điểm rèn luyện',
        actionUrl: '/student/points',
      },
      {
        id: '5',
        icon: '📊',
        title: 'Tăng nhịp độ theo tháng',
        description: `Tháng này bạn đã tham gia ${stats.activitiesThisMonth} hoạt động. Duy trì đều trong tháng sẽ dễ đạt mốc điểm hơn.`,
        actionLabel: 'Xem lịch sử tham gia',
        actionUrl: '/student/history',
      },
      {
        id: '6',
        icon: '🔔',
        title: 'Không bỏ lỡ thông báo',
        description:
          'Theo dõi thông báo và cảnh báo để không trễ hạn đăng ký, điểm danh hoặc cập nhật điểm.',
        actionLabel: 'Mở thông báo',
        actionUrl: '/student/notifications',
      },
    ],
    [stats]
  );

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!user || user.role !== 'student') {
    return null;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
              <Lightbulb className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Mẹo thành tích</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Gợi ý nhanh để học viên theo dõi điểm, mốc khen thưởng và tận dụng tốt các hoạt
                động phù hợp.
              </p>
            </div>
          </div>
        </div>

        <StudentDailyQuickActions />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-5 shadow-sm dark:border-blue-500/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <TrendingUp className="h-4 w-4" />
              Tổng điểm hiện tại
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.currentPoints}</div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5 shadow-sm dark:border-emerald-500/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Target className="h-4 w-4" />
              Mốc kế tiếp
            </div>
            <div className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {stats.nextAwardName || 'Chưa có mốc tiếp theo'}
            </div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {stats.nextAwardThreshold ? `${stats.nextAwardThreshold} điểm` : 'Đang cập nhật'}
            </div>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm dark:border-violet-500/40 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30">
            <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
              <Award className="h-4 w-4" />
              Tỷ lệ tham gia
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.attendanceRate.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {tips.map((tip) => (
            <div key={tip.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{tip.icon}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{tip.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{tip.description}</p>
                  <Link
                    href={tip.actionUrl}
                    className="mt-4 inline-block rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-slate-300/60"
                  >
                    {tip.actionLabel}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

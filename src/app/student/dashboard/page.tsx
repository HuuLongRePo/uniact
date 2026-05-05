'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Clock, Trophy, BookOpen, AlertCircle } from 'lucide-react';

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

interface AchievementProgress {
  current: number;
  target: number;
  percentage: number;
}

interface ActivityTypeBreakdownItem {
  name: string;
  count: number;
}

interface MonthlyTrendItem {
  month: number;
  year: number;
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

export default function StudentDashboardPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StudentStats>(DEFAULT_STATS);
  const [upcomingActivities, setUpcomingActivities] = useState<UpcomingActivity[]>([]);
  const [recentScores, setRecentScores] = useState<RecentScore[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress>({
    current: 0,
    target: 100,
    percentage: 0,
  });
  const [activityTypeBreakdown, setActivityTypeBreakdown] = useState<ActivityTypeBreakdownItem[]>(
    []
  );
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendItem[]>([]);

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (!currentUser) return;

    void fetchDashboardData();
  }, [currentUser, loading, router]);

  const fetchDashboardData = async () => {
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
        setStats(statsData.statistics || DEFAULT_STATS);
        setAchievementProgress({
          current: statsData.statistics?.totalScore || 0,
          target: 100,
          percentage: Math.min(((statsData.statistics?.totalScore || 0) / 100) * 100, 100),
        });
      }

      if (activitiesRes.ok) {
        const actData = await activitiesRes.json();
        const upcoming = ((actData.activities || []) as UpcomingActivity[])
          .filter((activity) => {
            const activityDate = new Date(activity.date_time);
            return !Number.isNaN(activityDate.getTime()) && activityDate > new Date();
          })
          .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
          .slice(0, 5);
        setUpcomingActivities(upcoming);
      }

      if (scoresRes.ok) {
        const scoresData = await scoresRes.json();
        setRecentScores((scoresData.scores || []) as RecentScore[]);
      }

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications((notifData.notifications || []) as DashboardNotification[]);
      }

      if (breakdownRes.ok) {
        const breakdownData = await breakdownRes.json();
        setActivityTypeBreakdown((breakdownData.breakdown || []) as ActivityTypeBreakdownItem[]);
        setMonthlyTrend((breakdownData.monthly || []) as MonthlyTrendItem[]);
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
      console.error('Lỗi tải dữ liệu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold mb-2">Chào mừng, {currentUser?.name}! 🎉</h1>
          <p className="text-green-50 text-lg">
            Bảng điều khiển cá nhân - Quản lý hoạt động và điểm của bạn
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Registered Activities */}
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-blue-600">{stats.registeredActivities}</div>
                <div className="text-gray-600 text-sm mt-1">Hoạt động đã đăng ký</div>
              </div>
              <div className="text-5xl opacity-30">📋</div>
            </div>
            <Link
              href="/student/activities"
              className="mt-4 block text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Xem chi tiết →
            </Link>
          </div>

          {/* Attended Activities */}
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-green-600">{stats.attendedActivities}</div>
                <div className="text-gray-600 text-sm mt-1">Hoạt động tham gia</div>
              </div>
              <div className="text-5xl opacity-30">✅</div>
            </div>
            <div className="mt-4 flex items-center text-green-600 text-sm font-medium">
              <Clock className="w-4 h-4 mr-1" />
              Tham gia thường xuyên
            </div>
          </div>

          {/* Total Score */}
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-yellow-600">{stats.totalScore}</div>
                <div className="text-gray-600 text-sm mt-1">Tổng điểm</div>
                {stats.rank !== null && stats.totalStudents !== null && (
                  <div className="text-xs text-gray-500 mt-1">
                    🏅 Xếp hạng: #{stats.rank} / {stats.totalStudents}
                  </div>
                )}
              </div>
              <div className="text-5xl opacity-30">🏆</div>
            </div>
            <Link
              href="/student/scores"
              className="mt-4 block text-yellow-600 hover:text-yellow-700 text-sm font-medium"
            >
              Xem bảng điểm →
            </Link>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-purple-600">{stats.notifications}</div>
                <div className="text-gray-600 text-sm mt-1">Thông báo mới</div>
              </div>
              <div className="text-5xl opacity-30">🔔</div>
            </div>
            <Link
              href="/student/notifications"
              className="mt-4 block text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              Xem tất cả →
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            ⚡ Hành động nhanh
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/student/activities"
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg hover:shadow-md hover:border-blue-400 transition-all text-center group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔍</div>
              <p className="font-semibold text-blue-900 text-sm">Khám phá hoạt động</p>
            </Link>

            <Link
              href="/student/activities?tab=registered"
              className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg hover:shadow-md hover:border-green-400 transition-all text-center group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📋</div>
              <p className="font-semibold text-green-900 text-sm">Hoạt động đã đăng ký</p>
            </Link>

            <Link
              href="/student/scores"
              className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg hover:shadow-md hover:border-yellow-400 transition-all text-center group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🏆</div>
              <p className="font-semibold text-yellow-900 text-sm">Bảng điểm</p>
            </Link>

            <Link
              href="/student/profile/edit"
              className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg hover:shadow-md hover:border-purple-400 transition-all text-center group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">👤</div>
              <p className="font-semibold text-purple-900 text-sm">Hồ sơ cá nhân</p>
            </Link>
          </div>
        </div>

        {/* Recommendations Widget */}
        {recommendations.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-sm border-2 border-indigo-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                Gợi ý dành cho bạn
              </h2>
              <Link
                href="/student/activities"
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Xem thêm →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.slice(0, 3).map((activity) => (
                <Link
                  key={activity.id}
                  href={`/student/activities/${activity.id}`}
                  className="bg-white rounded-lg p-4 border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors text-sm line-clamp-2 flex-1">
                      {activity.title}
                    </h3>
                    {activity.is_preferred_type && (
                      <span
                        className="ml-2 inline-block w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1"
                        title="Phù hợp với sở thích"
                      ></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{activity.description}</p>
                  <div className="flex gap-2 text-xs text-gray-500 mb-2">
                    <span>📅 {formatDate(activity.date_time)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                      {activity.activity_type_name}
                    </span>
                    <span className="text-yellow-600 font-bold text-sm">
                      +{activity.base_points} điểm
                    </span>
                  </div>
                  {activity.reason && (
                    <div className="mt-2 text-xs text-indigo-600 font-medium">
                      💡 {activity.reason}
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {recommendations.length > 3 && (
              <div className="mt-4 text-center">
                <Link
                  href="/student/activities"
                  className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                >
                  Xem tất cả {recommendations.length} gợi ý
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Achievement Progress */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Mục tiêu điểm tín chỉ
            </h2>
            <span className="text-sm font-medium text-gray-600">
              {stats.totalScore} / {achievementProgress.target}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-4 transition-all duration-500"
              style={{ width: `${achievementProgress.percentage}%` }}
            />
          </div>

          <div className="mt-4 flex gap-4">
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">Tiến độ</div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(achievementProgress.percentage)}%
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">Còn lại</div>
              <div className="text-2xl font-bold text-blue-600">
                {achievementProgress.target - stats.totalScore} điểm
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600 mb-1">Trạng thái</div>
              <div
                className={`text-2xl font-bold ${stats.totalScore >= 70 ? 'text-green-600' : 'text-orange-600'}`}
              >
                {stats.totalScore >= 70 ? '✓ Đạt' : '⚠ Chưa đạt'}
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Upcoming Activities */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Hoạt động sắp tới
                </h2>
                <Link
                  href="/student/activities"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Xem tất cả
                </Link>
              </div>

              {upcomingActivities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-4xl mb-2">📅</div>
                  <p className="text-gray-500">Không có hoạt động sắp tới</p>
                  <Link
                    href="/student/activities"
                    className="text-blue-600 hover:text-blue-700 mt-2 inline-block text-sm font-medium"
                  >
                    Khám phá hoạt động →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {activity.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                          <div className="flex gap-4 mt-3 text-xs text-gray-500">
                            <span>📅 {formatDate(activity.date_time)}</span>
                            <span>📍 {activity.location}</span>
                          </div>
                        </div>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium ml-4 flex-shrink-0">
                          {activity.activity_type || 'Hoạt động'}
                        </span>
                      </div>
                      <Link
                        href={`/student/activities/${activity.id}`}
                        className="mt-3 block text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Xem chi tiết →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Scores */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  Điểm gần đây
                </h2>
              </div>

              {recentScores.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-3xl mb-2">📊</div>
                  <p className="text-gray-500 text-sm">Chưa có điểm</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentScores.map((score, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {score.activity_title}
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            score.score >= 70
                              ? 'text-green-600'
                              : score.score >= 50
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {score.score}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(score.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/student/scores"
                className="mt-6 block text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Xem bảng điểm đầy đủ
              </Link>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Thông báo gần đây
            </h2>
            <Link
              href="/student/notifications"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Xem tất cả
            </Link>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Không có thông báo mới</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif, idx) => (
                <div key={idx} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">🔔</span>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{notif.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-2">{formatDate(notif.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Type Breakdown */}
        {activityTypeBreakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                📊 Phân loại hoạt động
              </h2>
              <div className="space-y-4">
                {activityTypeBreakdown.map((type, idx) => {
                  const percentage = (type.count / stats.attendedActivities) * 100 || 0;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">{type.name}</span>
                        <span className="text-gray-600">
                          {type.count} hoạt động ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                📈 Xu hướng tham gia
              </h2>
              {monthlyTrend.length > 0 ? (
                <div className="space-y-4">
                  {monthlyTrend.slice(-6).map((month, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">
                          Tháng {month.month}/{month.year}
                        </span>
                        <span className="text-gray-600">{month.count} hoạt động</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all"
                          style={{ width: `${Math.min((month.count / 10) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Chưa có dữ liệu xu hướng</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

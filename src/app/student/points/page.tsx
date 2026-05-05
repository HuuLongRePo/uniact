'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import StudentScoreFlowNav from '@/components/student/StudentScoreFlowNav';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

type TabKey = 'activities' | 'types' | 'levels' | 'achievements' | 'awards';

interface PointsByActivityItem {
  id: number;
  title: string;
  date_time: string;
  activity_type: string | null;
  organization_level: string | null;
  achievement_level: string | null;
  base_points: number | null;
  type_multiplier: number | null;
  level_multiplier: number | null;
  achievement_multiplier: number | null;
  subtotal: number | null;
  bonus_points: number | null;
  penalty_points: number | null;
  total_points: number | null;
}

interface PointsByTypeItem {
  type_name: string | null;
  type_multiplier: number | null;
  activity_count: number;
  total_points: number;
  avg_points: number;
}

interface PointsByLevelItem {
  level_name: string | null;
  level_multiplier: number | null;
  activity_count: number;
  total_points: number;
  avg_points: number;
}

interface PointsByAchievementItem {
  achievement_level: string | null;
  activity_count: number;
  total_points: number;
  avg_points: number;
}

interface AwardItem {
  id: number;
  award_type: string | null;
  bonus_points: number;
  reason: string | null;
  approved_at: string | null;
  activity_title: string | null;
  approved_by_name: string | null;
}

interface PointsSummary {
  total_base_points: number;
  total_after_multipliers: number;
  total_bonus: number;
  total_penalty: number;
  grand_total: number;
  total_award_points: number;
  total_adjustment_points?: number;
  final_total: number;
}

interface PointsBreakdown {
  byActivity: PointsByActivityItem[];
  byType: PointsByTypeItem[];
  byLevel: PointsByLevelItem[];
  byAchievement: PointsByAchievementItem[];
  awards: AwardItem[];
  summary: PointsSummary;
}

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: 'activities', label: 'Theo hoạt động' },
  { key: 'types', label: 'Theo loại' },
  { key: 'levels', label: 'Theo cấp độ' },
  { key: 'achievements', label: 'Theo thành tích' },
  { key: 'awards', label: 'Thưởng và cộng điểm' },
];

function formatPoints(value: number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function getAchievementLabel(value: string | null) {
  switch (value) {
    case 'excellent':
      return 'Xuất sắc';
    case 'good':
      return 'Tốt';
    case 'participated':
      return 'Tham gia';
    default:
      return value || 'Chưa xếp loại';
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
      {message}
    </div>
  );
}

export default function StudentPointsBreakdownPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PointsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('activities');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchBreakdown();
    }
  }, [user, authLoading, router]);

  async function fetchBreakdown() {
    try {
      setLoading(true);
      const res = await fetch('/api/student/points-breakdown');
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || json?.message || 'Không thể tải chi tiết điểm rèn luyện');
      }

      setData((json?.data || json) as PointsBreakdown);
    } catch (error) {
      console.error('Error fetching breakdown:', error);
      toast.error(
        error instanceof Error ? error.message : 'Không thể tải chi tiết điểm rèn luyện'
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            Không thể tải dữ liệu
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Chi tiết điểm rèn luyện</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Theo dõi từng lớp điểm từ hoạt động, hệ số, thưởng, phạt và tổng điểm cuối cùng đang
            được hệ thống ghi nhận.
          </p>
        </div>

        <StudentDailyQuickActions />
        <StudentScoreFlowNav />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm dark:border-emerald-900/50 dark:from-emerald-500/10 dark:via-slate-900 dark:to-teal-500/10 xl:col-span-2">
            <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Tổng điểm cuối cùng</div>
            <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">
              {formatPoints(data.summary.final_total)}
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Tổng cộng: {formatPoints(data.summary.grand_total)} · Thưởng thêm:{' '}
              {formatPoints(data.summary.total_award_points)}
            </div>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Tổng điểm cơ bản</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatPoints(data.summary.total_base_points)}
            </div>
          </div>

          <div className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm dark:border-purple-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Sau hệ số nhân</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatPoints(data.summary.total_after_multipliers)}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm dark:border-amber-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-amber-700 dark:text-amber-300">Cộng / trừ</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              +{formatPoints(data.summary.total_bonus)} / -{formatPoints(data.summary.total_penalty)}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-6">
            <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
              {TAB_ITEMS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={activeTab === tab.key}
                  className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900 ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'activities' && (
              <div className="space-y-4">
                {data.byActivity.length === 0 ? (
                  <EmptyState message="Chưa có hoạt động nào được tính điểm." />
                ) : (
                  data.byActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{activity.title}</h2>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {formatDate(activity.date_time, 'date')} · {activity.activity_type || '-'} ·{' '}
                            {activity.organization_level || '-'}
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">
                            {formatPoints(activity.total_points)}
                          </div>
                          <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {getAchievementLabel(activity.achievement_level)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800/70 dark:text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Công thức</div>
                          <div className="mt-1 font-semibold">
                            {activity.base_points || 0} x {activity.type_multiplier || 0} x{' '}
                            {activity.level_multiplier || 0} x {activity.achievement_multiplier || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tạm tính</div>
                          <div className="mt-1 font-semibold">{formatPoints(activity.subtotal)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Cộng thêm</div>
                          <div className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">
                            +{formatPoints(activity.bonus_points)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Khấu trừ</div>
                          <div className="mt-1 font-semibold text-rose-700 dark:text-rose-300">
                            -{formatPoints(activity.penalty_points)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'types' && (
              <div className="grid gap-4 md:grid-cols-2">
                {data.byType.length === 0 ? (
                  <EmptyState message="Chưa có nhóm điểm theo loại hoạt động." />
                ) : (
                  data.byType.map((type, index) => (
                    <div
                      key={`${type.type_name || 'unknown'}-${index}`}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Loại hoạt động</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {type.type_name || 'Chưa gán loại'}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Hoạt động</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{type.activity_count}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Hệ số</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            x{formatPoints(type.type_multiplier)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tổng điểm</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {formatPoints(type.total_points)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Trung bình / hoạt động</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {formatPoints(type.avg_points)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'levels' && (
              <div className="grid gap-4 md:grid-cols-2">
                {data.byLevel.length === 0 ? (
                  <EmptyState message="Chưa có nhóm điểm theo cấp tổ chức." />
                ) : (
                  data.byLevel.map((level, index) => (
                    <div
                      key={`${level.level_name || 'unknown'}-${index}`}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Cấp tổ chức</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {level.level_name || 'Chưa gán cấp'}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Hoạt động</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{level.activity_count}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Hệ số</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            x{formatPoints(level.level_multiplier)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tổng điểm</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {formatPoints(level.total_points)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Trung bình / hoạt động</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {formatPoints(level.avg_points)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="grid gap-4 md:grid-cols-2">
                {data.byAchievement.length === 0 ? (
                  <EmptyState message="Chưa có nhóm điểm theo thành tích." />
                ) : (
                  data.byAchievement.map((achievement, index) => (
                    <div
                      key={`${achievement.achievement_level || 'unknown'}-${index}`}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Thành tích</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {getAchievementLabel(achievement.achievement_level)}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Hoạt động</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {achievement.activity_count}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tổng điểm</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {formatPoints(achievement.total_points)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Trung bình / hoạt động</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {formatPoints(achievement.avg_points)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'awards' && (
              <div className="space-y-4">
                {data.awards.length === 0 ? (
                  <EmptyState message="Chưa có quyết định thưởng hoặc cộng điểm nào." />
                ) : (
                  data.awards.map((award) => (
                    <div
                      key={award.id}
                      className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-medium text-amber-700 dark:text-amber-300">Thưởng / cộng điểm</div>
                          <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                            {award.award_type || 'Cộng điểm khác'}
                          </div>
                          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            {award.activity_title ? `${award.activity_title} · ` : ''}
                            {award.reason || 'Không có ghi chú'}
                          </div>
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Phê duyệt:{' '}
                            {award.approved_at ? formatDate(award.approved_at, 'date') : '-'} ·{' '}
                            {award.approved_by_name || 'Không rõ người duyệt'}
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                          +{formatPoints(award.bonus_points)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import StudentScoreFlowNav from '@/components/student/StudentScoreFlowNav';
import { toast } from '@/lib/toast';
import { formatDate } from '@/lib/formatters';
import { toVietnamDateStamp } from '@/lib/timezone';

interface ScoreRecord {
  participation_id: number;
  activity_title: string;
  activity_type_name: string | null;
  organization_level_name: string | null;
  achievement_level: string | null;
  award_type: string | null;
  base_points: number;
  type_multiplier: number;
  level_multiplier: number;
  achievement_multiplier: number;
  subtotal: number;
  bonus_points: number;
  penalty_points: number;
  total_points: number;
  formula: string;
  calculated_at: string;
  evaluated_at: string | null;
}

interface Summary {
  total_activities: number;
  total_points: number;
  final_total?: number;
  activity_points?: number;
  award_points?: number;
  adjustment_points?: number;
  average_points: number;
  excellent_count: number;
  good_count: number;
  participated_count: number;
}

function formatPoints(value: number | null | undefined) {
  const numberValue = Number(value || 0);
  return numberValue.toFixed(2);
}

function getAchievementMeta(level: string | null) {
  switch (level) {
    case 'excellent':
      return {
        label: 'Xuất sắc',
        className:
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
      };
    case 'good':
      return {
        label: 'Tốt',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
      };
    case 'participated':
      return { label: 'Tham gia', className: 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-100' };
    default:
      return { label: 'Chưa xếp loại', className: 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-100' };
  }
}

export default function StudentScoresPage() {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedScore, setSelectedScore] = useState<ScoreRecord | null>(null);

  useEffect(() => {
    void fetchScores();
  }, []);

  async function fetchScores() {
    try {
      const res = await fetch('/api/student/scores');
      if (!res.ok) {
        throw new Error('Không thể tải bảng điểm');
      }

      const data = await res.json();
      const resolvedScores = (data.data?.scores || data.scores || []) as ScoreRecord[];
      const resolvedSummary = (data.data?.summary || data.summary || null) as Summary | null;

      setScores(resolvedScores);
      setSummary(resolvedSummary);
    } catch (error) {
      console.error('Error fetching scores:', error);
      toast.error('Không thể tải bảng điểm');
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    if (scores.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const headers = [
      'STT',
      'Hoạt động',
      'Loại hoạt động',
      'Cấp tổ chức',
      'Đánh giá',
      'Điểm cơ bản',
      'Hệ số loại',
      'Hệ số cấp',
      'Hệ số thành tích',
      'Tạm tính',
      'Điểm cộng',
      'Điểm trừ',
      'Tổng điểm',
      'Ngày đánh giá',
    ].join(',');

    const rows = scores.map((score, index) =>
      [
        index + 1,
        `"${score.activity_title}"`,
        score.activity_type_name || '',
        score.organization_level_name || '',
        score.achievement_level || '',
        score.base_points,
        score.type_multiplier,
        score.level_multiplier,
        score.achievement_multiplier,
        formatPoints(score.subtotal),
        score.bonus_points,
        score.penalty_points,
        formatPoints(score.total_points),
        score.evaluated_at ? formatDate(score.evaluated_at, 'date') : '',
      ].join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `bang-diem-${toVietnamDateStamp(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Đã xuất tệp CSV');
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-6xl">
          <div className="flex min-h-[12rem] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const finalTotal = Number(summary?.final_total ?? summary?.total_points ?? 0);
  const activityPoints = Number(summary?.activity_points ?? 0);
  const awardPoints = Number(summary?.award_points ?? 0);
  const adjustmentPoints = Number(summary?.adjustment_points ?? 0);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 data-testid="scores-heading" className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Bảng điểm của tôi
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Theo dõi tổng điểm cuối cùng và lịch sử tính điểm theo từng hoạt động đã được
                đánh giá.
              </p>
            </div>
            <Button
              onClick={exportToCSV}
              variant="success"
              className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-emerald-300 dark:focus-visible:ring-offset-slate-900 sm:w-auto"
            >
              Xuất CSV
            </Button>
          </div>
        </div>

        <StudentDailyQuickActions />
        <StudentScoreFlowNav />

        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm dark:border-emerald-500/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 xl:col-span-2">
              <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Tổng điểm cuối cùng</div>
              <div className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">{formatPoints(finalTotal)}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {summary.total_activities} hoạt động đã được tính điểm
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Điểm hoạt động</div>
              <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {formatPoints(activityPoints)}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm dark:border-amber-900/50 dark:bg-slate-900">
              <div className="text-sm font-medium text-amber-700 dark:text-amber-300">Thưởng</div>
              <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {formatPoints(awardPoints)}
              </div>
            </div>

            <div className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm dark:border-rose-900/50 dark:bg-slate-900">
              <div className="text-sm font-medium text-rose-700 dark:text-rose-300">Điều chỉnh</div>
              <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {formatPoints(adjustmentPoints)}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Điểm trung bình / hoạt động</div>
              <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {formatPoints(summary.average_points)}
              </div>
            </div>
          </div>
        )}

        {summary && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Xuất sắc</div>
              <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{summary.excellent_count}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Tốt</div>
              <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{summary.good_count}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Tham gia</div>
              <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {summary.participated_count}
              </div>
            </div>
          </div>
        )}

        {scores.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-base text-slate-600 dark:text-slate-300">Chưa có bản ghi điểm nào.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {scores.map((score) => {
                const achievement = getAchievementMeta(score.achievement_level);
                return (
                  <div
                    key={score.participation_id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {score.activity_title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {score.activity_type_name || 'Không rõ loại'}
                          <span className="mx-1 text-slate-400 dark:text-slate-500">•</span>
                          {score.organization_level_name || 'Không rõ cấp'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">
                          {formatPoints(score.total_points)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {score.evaluated_at ? formatDate(score.evaluated_at, 'date') : '-'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${achievement.className}`}
                      >
                        {achievement.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tạm tính</div>
                        <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                          {formatPoints(score.subtotal)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Cộng / trừ</div>
                        <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                          +{score.bonus_points} / -{score.penalty_points}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedScore(score)}
                      className="mt-4 w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:border-blue-400 dark:hover:bg-blue-500/20 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900"
                    >
                      Xem công thức
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-900 text-left text-sm text-white">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Hoạt động</th>
                      <th className="px-5 py-4 font-semibold">Loại / cấp</th>
                      <th className="px-5 py-4 font-semibold">Đánh giá</th>
                      <th className="px-5 py-4 text-right font-semibold">Tổng điểm</th>
                      <th className="px-5 py-4 font-semibold">Ngày đánh giá</th>
                      <th className="px-5 py-4 text-right font-semibold">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700 dark:divide-slate-700 dark:text-slate-300">
                    {scores.map((score) => {
                      const achievement = getAchievementMeta(score.achievement_level);
                      return (
                        <tr key={score.participation_id} className="bg-white dark:bg-slate-900">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{score.activity_title}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div>{score.activity_type_name || 'Không rõ loại'}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {score.organization_level_name || 'Không rõ cấp'}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${achievement.className}`}
                            >
                              {achievement.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-300">
                            {formatPoints(score.total_points)}
                          </td>
                          <td className="px-5 py-4">
                            {score.evaluated_at ? formatDate(score.evaluated_at, 'date') : '-'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedScore(score)}
                              className="font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:text-blue-300 dark:hover:text-blue-200 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900"
                            >
                              Xem công thức
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedScore && (
        <div
          className="app-modal-backdrop px-4 py-6"
          onClick={() => setSelectedScore(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-score-detail-dialog-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-2xl p-5 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="student-score-detail-dialog-title" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Chi tiết tính điểm
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selectedScore.activity_title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScore(null)}
                className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-900"
              >
                Đóng
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Công thức</div>
                <div className="mt-2 rounded-2xl bg-white p-4 font-mono text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {selectedScore.formula}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Cấu thành điểm</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <div>Điểm cơ bản: {selectedScore.base_points}</div>
                    <div>Hệ số loại: x{selectedScore.type_multiplier}</div>
                    <div>Hệ số cấp: x{selectedScore.level_multiplier}</div>
                    <div>Hệ số thành tích: x{selectedScore.achievement_multiplier}</div>
                    <div>Tạm tính: {formatPoints(selectedScore.subtotal)}</div>
                    <div className="text-emerald-700 dark:text-emerald-300">Cộng thêm: +{selectedScore.bonus_points}</div>
                    <div className="text-rose-700 dark:text-rose-300">Khấu trừ: -{selectedScore.penalty_points}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Kết quả</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <div>
                      Tổng điểm: <span className="font-semibold">{formatPoints(selectedScore.total_points)}</span>
                    </div>
                    <div>Loại hoạt động: {selectedScore.activity_type_name || '-'}</div>
                    <div>Cấp tổ chức: {selectedScore.organization_level_name || '-'}</div>
                    <div>Ngày tính: {formatDate(selectedScore.calculated_at)}</div>
                    <div>
                      Ngày đánh giá:{' '}
                      {selectedScore.evaluated_at ? formatDate(selectedScore.evaluated_at) : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

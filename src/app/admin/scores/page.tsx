'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Award,
  Download,
  Edit2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldPlus,
  Trophy,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatVietnamDateTime } from '@/lib/timezone';

interface StudentScore {
  user_id: number;
  name: string;
  email: string;
  class_id: number | null;
  class_name: string | null;
  total_points: number;
  activities_count: number;
  participated_count: number;
  excellent_count: number;
  good_count: number;
  average_count: number;
  awards_count: number;
  award_points: number;
  adjustment_points: number;
  bonus_adjustment_points: number;
  penalty_points: number;
  rank: number;
}

interface ScoresSummary {
  total_students: number;
  average_points: number;
  total_award_points: number;
  total_bonus_adjustment_points: number;
  total_penalty_points: number;
  adjusted_students_count: number;
  penalized_students_count: number;
  rewarded_students_count: number;
}

interface RecentAdjustment {
  id: number;
  student_id: number;
  student_name: string;
  class_name: string | null;
  points: number;
  source: string;
  calculated_at: string;
  adjustment_type: 'bonus' | 'penalty';
  reason: string;
}

interface ScoresInsights {
  top_penalty_students: StudentScore[];
  top_bonus_students: StudentScore[];
  recent_adjustments: RecentAdjustment[];
}

interface ClassOption {
  id: number;
  name: string;
}

const EMPTY_SUMMARY: ScoresSummary = {
  total_students: 0,
  average_points: 0,
  total_award_points: 0,
  total_bonus_adjustment_points: 0,
  total_penalty_points: 0,
  adjusted_students_count: 0,
  penalized_students_count: 0,
  rewarded_students_count: 0,
};

const EMPTY_INSIGHTS: ScoresInsights = {
  top_penalty_students: [],
  top_bonus_students: [],
  recent_adjustments: [],
};

function buildScoresExportUrl(searchTerm: string, classFilter: string, minPoints: string) {
  const params = new URLSearchParams();
  if (searchTerm.trim()) params.set('search', searchTerm.trim());
  if (classFilter && classFilter !== 'all') params.set('class_id', classFilter);
  if (minPoints.trim()) params.set('min_points', minPoints.trim());
  params.set('export', 'csv');
  return `/api/admin/scores?${params.toString()}`;
}

function getClassOptions(payload: unknown): ClassOption[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as {
    classes?: ClassOption[];
    data?: { classes?: ClassOption[] };
  };
  return record.classes ?? record.data?.classes ?? [];
}

function getScoresPayload(payload: unknown): {
  scores: StudentScore[];
  summary: ScoresSummary;
  insights: ScoresInsights;
} {
  if (!payload || typeof payload !== 'object') {
    return { scores: [], summary: EMPTY_SUMMARY, insights: EMPTY_INSIGHTS };
  }

  const record = payload as {
    scores?: StudentScore[];
    summary?: ScoresSummary;
    insights?: ScoresInsights;
    data?: {
      scores?: StudentScore[];
      summary?: ScoresSummary;
      insights?: ScoresInsights;
    };
  };

  return {
    scores: record.scores ?? record.data?.scores ?? [],
    summary: record.summary ?? record.data?.summary ?? EMPTY_SUMMARY,
    insights: record.insights ?? record.data?.insights ?? EMPTY_INSIGHTS,
  };
}

function getUpdatedCount(payload: unknown): number {
  if (!payload || typeof payload !== 'object') return 0;
  const record = payload as { updated?: number; data?: { updated?: number } };
  return Number(record.updated ?? record.data?.updated ?? 0);
}

function formatAdjustmentLabel(adjustment: RecentAdjustment) {
  const prefix = adjustment.adjustment_type === 'bonus' ? '+' : '-';
  return `${prefix}${Math.abs(Number(adjustment.points || 0))}`;
}

export default function AdminStudentScoresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [summary, setSummary] = useState<ScoresSummary>(EMPTY_SUMMARY);
  const [insights, setInsights] = useState<ScoresInsights>(EMPTY_INSIGHTS);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [minPoints, setMinPoints] = useState('');
  const [recalculateOpen, setRecalculateOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      void fetchData();
    }
  }, [authLoading, router, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scoresRes, classesRes] = await Promise.all([
        fetch('/api/admin/scores'),
        fetch('/api/admin/classes?limit=200'),
      ]);

      if (!scoresRes.ok) {
        throw new Error('Khong the tai bang diem he thong');
      }

      const scoresPayload = getScoresPayload(await scoresRes.json());
      setScores(Array.isArray(scoresPayload.scores) ? scoresPayload.scores : []);
      setSummary(scoresPayload.summary ?? EMPTY_SUMMARY);
      setInsights(scoresPayload.insights ?? EMPTY_INSIGHTS);

      if (classesRes.ok) {
        const classesPayload = getClassOptions(await classesRes.json());
        setClasses(Array.isArray(classesPayload) ? classesPayload : []);
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error('Admin scores page error:', error);
      toast.error('Khong the tai bang diem he thong');
    } finally {
      setLoading(false);
    }
  };

  const filteredScores = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const min = Number(minPoints);

    return scores.filter((score) => {
      if (
        term &&
        !score.name.toLowerCase().includes(term) &&
        !score.email.toLowerCase().includes(term)
      ) {
        return false;
      }

      if (classFilter !== 'all' && String(score.class_id ?? '') !== classFilter) {
        return false;
      }

      if (minPoints.trim() && Number.isFinite(min) && score.total_points < min) {
        return false;
      }

      return true;
    });
  }, [classFilter, minPoints, scores, searchTerm]);

  const filteredStats = useMemo(
    () => ({
      averagePoints:
        filteredScores.length > 0
          ? filteredScores.reduce((sum, score) => sum + Number(score.total_points || 0), 0) /
            filteredScores.length
          : 0,
      totalBonusAdjustments: filteredScores.reduce(
        (sum, score) => sum + Number(score.bonus_adjustment_points || 0),
        0
      ),
      totalPenaltyPoints: filteredScores.reduce(
        (sum, score) => sum + Number(score.penalty_points || 0),
        0
      ),
      penalizedStudents: filteredScores.filter((score) => Number(score.penalty_points || 0) > 0)
        .length,
    }),
    [filteredScores]
  );

  const handleRecalculate = async () => {
    try {
      const response = await fetch('/api/admin/scores/recalculate', {
        method: 'POST',
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Tinh lai diem that bai'
        );
      }

      const updated = getUpdatedCount(payload);
      toast.success(
        updated > 0 ? `Da tinh lai diem cho ${updated} sinh vien` : 'Da tinh lai bang diem he thong'
      );
      setRecalculateOpen(false);
      void fetchData();
    } catch (error) {
      console.error('Recalculate scores error:', error);
      toast.error('Tinh lai diem that bai');
    }
  };

  const handleExport = () => {
    const anchor = document.createElement('a');
    anchor.href = buildScoresExportUrl(searchTerm, classFilter, minPoints);
    anchor.download = '';
    anchor.click();
    toast.success('Da yeu cau xuat CSV bang diem');
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai bang diem..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                href="/admin/dashboard"
                className="rounded-xl border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Scores operations
                </div>
                <h1
                  className="mt-3 text-3xl font-bold text-slate-900"
                  data-testid="admin-scores-heading"
                >
                  Bang diem toan he thong
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Theo doi tong diem, dieu chinh cong tru va cac hoc vien can kiem tra lai truoc
                  khi chot ky.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setRecalculateOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                <RefreshCw className="h-4 w-4" />
                Tinh lai diem
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Xuat CSV
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <article className="rounded-[1.5rem] bg-blue-50 px-4 py-4 text-blue-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Tong sinh vien</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  {summary.total_students}
                </div>
              </div>
              <Trophy className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-emerald-50 px-4 py-4 text-emerald-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Diem trung binh</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  {filteredStats.averagePoints.toFixed(1)}
                </div>
              </div>
              <Award className="h-8 w-8" />
            </div>
          </article>
          <article
            className="rounded-[1.5rem] bg-cyan-50 px-4 py-4 text-cyan-700"
            data-testid="scores-bonus-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">
                  Dieu chinh cong
                </div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  {filteredStats.totalBonusAdjustments}
                </div>
              </div>
              <ShieldPlus className="h-8 w-8" />
            </div>
          </article>
          <article
            className="rounded-[1.5rem] bg-rose-50 px-4 py-4 text-rose-700"
            data-testid="scores-penalty-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Dieu chinh tru</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  {filteredStats.totalPenaltyPoints}
                </div>
              </div>
              <ShieldAlert className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-amber-50 px-4 py-4 text-amber-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">
                  Hoc vien bi tru diem
                </div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  {filteredStats.penalizedStudents}
                </div>
              </div>
              <ShieldAlert className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-violet-50 px-4 py-4 text-violet-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">
                  Sinh vien co dieu chinh
                </div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  {summary.adjusted_students_count}
                </div>
              </div>
              <RefreshCw className="h-8 w-8" />
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <article
            className="page-surface rounded-[1.75rem] border border-rose-200 px-5 py-5 sm:px-7"
            data-testid="scores-penalty-hotspots"
          >
            <h2 className="text-lg font-semibold text-slate-900">Hotspot bi tru diem</h2>
            <p className="mt-1 text-sm text-slate-600">
              Nhom hoc vien co tong diem tru cao nhat de admin doi soat lai adjustment history.
            </p>
            <div className="mt-4 space-y-3">
              {insights.top_penalty_students.length === 0 ? (
                <div className="rounded-2xl bg-rose-50 px-4 py-4 text-sm text-rose-800">
                  Chua co hoc vien nao bi tru diem trong danh sach hien tai.
                </div>
              ) : (
                insights.top_penalty_students.map((student) => (
                  <div key={student.user_id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-900">{student.name}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {student.class_name || 'Chua gan lop'}
                        </div>
                      </div>
                      <div className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">
                        -{student.penalty_points}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article
            className="page-surface rounded-[1.75rem] border border-emerald-200 px-5 py-5 sm:px-7"
            data-testid="scores-adjustment-log"
          >
            <h2 className="text-lg font-semibold text-slate-900">Dieu chinh gan day</h2>
            <p className="mt-1 text-sm text-slate-600">
              Nhat ky cong tru diem moi nhat de admin soat nhanh ly do va thoi diem cap nhat.
            </p>
            <div className="mt-4 space-y-3">
              {insights.recent_adjustments.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  Chua co dieu chinh diem gan day.
                </div>
              ) : (
                insights.recent_adjustments.map((adjustment) => (
                  <div key={adjustment.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{adjustment.student_name}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {adjustment.class_name || 'Chua gan lop'}
                        </div>
                        <div className="mt-2 text-sm text-slate-700">
                          {adjustment.reason || 'Khong ghi ly do'}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {formatVietnamDateTime(adjustment.calculated_at)}
                        </div>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          adjustment.adjustment_type === 'bonus'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {formatAdjustmentLabel(adjustment)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="inline-flex items-center gap-2">
                <Search className="h-4 w-4" />
                Tim kiem
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Ten hoac email"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Lop</span>
              <select
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">Tat ca lop</option>
                {classes.map((classOption) => (
                  <option key={classOption.id} value={String(classOption.id)}>
                    {classOption.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Diem toi thieu</span>
              <input
                type="number"
                value={minPoints}
                onChange={(event) => setMinPoints(event.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <div className="flex flex-col justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setClassFilter('all');
                  setMinPoints('');
                }}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Xoa bo loc
              </button>
              <div className="text-xs text-slate-500">
                Dang hien thi {filteredScores.length} / {scores.length} hoc vien
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 xl:hidden">
            {filteredScores.length === 0 ? (
              <div className="page-surface rounded-[1.75rem] px-5 py-8 text-center text-sm text-slate-500 sm:px-7">
                Khong co hoc vien nao khop bo loc hien tai.
              </div>
            ) : (
              filteredScores.map((score) => (
                <article key={score.user_id} className="page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Hang #{score.rank}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">{score.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{score.email}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {score.class_name || 'Chua gan lop'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-blue-700">{score.total_points}</div>
                      <div className="text-xs text-slate-500">diem</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Thuong</div>
                      <div className="mt-1 font-semibold text-emerald-700">{score.award_points}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Cong them</div>
                      <div className="mt-1 font-semibold text-cyan-700">
                        {score.bonus_adjustment_points}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Tru diem</div>
                      <div className="mt-1 font-semibold text-rose-700">{score.penalty_points}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Hoat dong</div>
                      <div className="mt-1 font-semibold text-slate-900">{score.activities_count}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/scores/${score.user_id}/adjust`)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    <Edit2 className="h-4 w-4" />
                    Dieu chinh
                  </button>
                </article>
              ))
            )}
          </div>

          <div className="page-surface hidden overflow-x-auto rounded-[1.75rem] border xl:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Hang
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Hoc vien
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Lop
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tong diem
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thuong
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cong them
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tru diem
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Hoat dong
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thao tac
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredScores.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-500">
                      Khong co hoc vien nao khop bo loc hien tai.
                    </td>
                  </tr>
                ) : (
                  filteredScores.map((score) => (
                    <tr key={score.user_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">#{score.rank}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-slate-900">{score.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{score.email}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{score.class_name || 'Chua gan lop'}</td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-blue-700">
                        {score.total_points}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-700">
                        {score.award_points}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-cyan-700">
                        {score.bonus_adjustment_points}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-rose-700">
                        {score.penalty_points}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-slate-600">{score.activities_count}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/scores/${score.user_id}/adjust`)}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                          Dieu chinh
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <ConfirmDialog
          isOpen={recalculateOpen}
          title="Tinh lai bang diem"
          message="He thong se quet lai du lieu diem cho toan bo hoc vien. Ban chi nen chay buoc nay khi can doi soat sau mot dot cap nhat lon."
          confirmText="Tinh lai ngay"
          cancelText="Bo qua"
          variant="warning"
          onCancel={() => setRecalculateOpen(false)}
          onConfirm={handleRecalculate}
        />
      </div>
    </div>
  );
}

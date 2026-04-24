'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Award,
  Download,
  Edit2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldPlus,
  Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatVietnamDateTime } from '@/lib/timezone';

interface StudentScore {
  user_id: number;
  name: string;
  email: string;
  class_id: number | null;
  class_name: string | null;
  total_points: number;
  activities_count: number;
  excellent_count: number;
  good_count: number;
  average_count: number;
  participated_count: number;
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

interface ScoresInsights {
  top_penalty_students: StudentScore[];
  top_bonus_students: StudentScore[];
  recent_adjustments: Array<{
    id: number;
    student_id: number;
    student_name: string;
    class_name: string | null;
    points: number;
    source: string;
    calculated_at: string;
    adjustment_type: 'bonus' | 'penalty';
    reason: string;
  }>;
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

function getClassesFromResponse(payload: unknown): ClassOption[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as {
    data?: { classes?: ClassOption[] };
    classes?: ClassOption[];
  };
  return record.data?.classes ?? record.classes ?? [];
}

export default function AdminStudentScoresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isRecalculateConfirmOpen, setIsRecalculateConfirmOpen] = useState(false);
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [filteredScores, setFilteredScores] = useState<StudentScore[]>([]);
  const [summary, setSummary] = useState<ScoresSummary>(EMPTY_SUMMARY);
  const [insights, setInsights] = useState<ScoresInsights>(EMPTY_INSIGHTS);

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [minPoints, setMinPoints] = useState<string>('');

  const [classes, setClasses] = useState<ClassOption[]>([]);

  const filterScores = useEffectEventCompat(() => {
    let filtered = [...scores];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
      );
    }

    if (classFilter && classFilter !== 'all') {
      filtered = filtered.filter((s) => s.class_id?.toString() === classFilter);
    }

    if (minPoints) {
      const min = parseFloat(minPoints);
      if (!isNaN(min)) {
        filtered = filtered.filter((s) => s.total_points >= min);
      }
    }

    setFilteredScores(filtered);
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      void fetchData();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    filterScores();
  }, [scores, searchTerm, classFilter, minPoints, filterScores]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scoresRes, classesRes] = await Promise.all([
        fetch('/api/admin/scores'),
        fetch('/api/classes'),
      ]);

      if (!scoresRes.ok) throw new Error('Không thể tải điểm số');

      const scoresData = await scoresRes.json();
      setScores(scoresData.scores || scoresData.data?.scores || []);
      setSummary(scoresData.summary || scoresData.data?.summary || EMPTY_SUMMARY);
      setInsights(scoresData.insights || scoresData.data?.insights || EMPTY_INSIGHTS);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(getClassesFromResponse(classesData));
      }
    } catch (_error) {
      toast.error('Không thể tải dữ liệu điểm');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      const res = await fetch('/api/admin/scores/recalculate', {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Recalculation failed');

      const data = await res.json();
      toast.success(`Đã tính lại điểm cho ${data.updated} sinh viên`);
      void fetchData();
    } catch (_error) {
      toast.error('Tính lại điểm thất bại');
    }
  };

  const handleExport = () => {
    const url = buildScoresExportUrl(searchTerm, classFilter, minPoints);
    window.location.href = url;
    toast.success('Đang chuẩn bị file CSV...');
  };

  const filteredStats = useMemo(
    () => ({
      averagePoints:
        filteredScores.length > 0
          ? filteredScores.reduce((sum, score) => sum + score.total_points, 0) /
            filteredScores.length
          : 0,
      totalBonusAdjustments: filteredScores.reduce(
        (sum, score) => sum + score.bonus_adjustment_points,
        0
      ),
      totalPenaltyPoints: filteredScores.reduce((sum, score) => sum + score.penalty_points, 0),
      penalizedStudents: filteredScores.filter((score) => score.penalty_points > 0).length,
    }),
    [filteredScores]
  );

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Bảng Điểm Sinh Viên</h1>
          <p className="mt-2 text-gray-600">
            Quản lý điểm rèn luyện, theo dõi điều chỉnh thưởng/phạt và phát hiện các hotspot cần can
            thiệp.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng sinh viên</p>
                <p className="mt-1 text-3xl font-bold text-blue-600">{summary.total_students}</p>
              </div>
              <Trophy className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Điểm trung bình</p>
                <p className="mt-1 text-3xl font-bold text-green-600">
                  {filteredStats.averagePoints.toFixed(1)}
                </p>
              </div>
              <Award className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg" data-testid="scores-bonus-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Điều chỉnh cộng</p>
                <p className="mt-1 text-3xl font-bold text-emerald-600">
                  {filteredStats.totalBonusAdjustments}
                </p>
              </div>
              <ShieldPlus className="h-12 w-12 text-emerald-600 opacity-20" />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg" data-testid="scores-penalty-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Điều chỉnh trừ</p>
                <p className="mt-1 text-3xl font-bold text-red-600">
                  {filteredStats.totalPenaltyPoints}
                </p>
              </div>
              <ShieldAlert className="h-12 w-12 text-red-600 opacity-20" />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sinh viên bị trừ điểm</p>
                <p className="mt-1 text-3xl font-bold text-orange-600">
                  {filteredStats.penalizedStudents}
                </p>
              </div>
              <ShieldAlert className="h-12 w-12 text-orange-600 opacity-20" />
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sinh viên có điều chỉnh</p>
                <p className="mt-1 text-3xl font-bold text-purple-600">
                  {summary.adjusted_students_count}
                </p>
              </div>
              <RefreshCw className="h-12 w-12 text-purple-600 opacity-20" />
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm"
            data-testid="scores-penalty-hotspots"
          >
            <h2 className="text-lg font-semibold text-red-900">Hotspot bị trừ điểm</h2>
            <p className="mt-1 text-sm text-red-800">
              Những sinh viên có tổng điểm bị trừ cao nhất từ adjustment history.
            </p>
            <div className="mt-4 space-y-3">
              {insights.top_penalty_students.length === 0 ? (
                <div className="rounded-lg bg-white/80 p-4 text-sm text-red-900">
                  Chưa có sinh viên nào bị trừ điểm trong hệ thống hiện tại.
                </div>
              ) : (
                insights.top_penalty_students.map((student) => (
                  <div key={student.user_id} className="rounded-lg bg-white/80 p-4">
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="mt-1 text-sm text-gray-500">
                      {student.class_name || 'Chưa có lớp'}
                    </div>
                    <div className="mt-2 text-sm text-red-800">
                      Tổng điểm trừ: <span className="font-semibold">{student.penalty_points}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
            data-testid="scores-adjustment-log"
          >
            <h2 className="text-lg font-semibold text-emerald-900">Điều chỉnh gần đây</h2>
            <p className="mt-1 text-sm text-emerald-800">
              Lịch sử cộng/trừ điểm gần nhất để đối chiếu reason và rà động thái bất thường.
            </p>
            <div className="mt-4 space-y-3">
              {insights.recent_adjustments.length === 0 ? (
                <div className="rounded-lg bg-white/80 p-4 text-sm text-emerald-900">
                  Chưa có điều chỉnh điểm gần đây.
                </div>
              ) : (
                insights.recent_adjustments.map((adjustment) => (
                  <div key={adjustment.id} className="rounded-lg bg-white/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900">{adjustment.student_name}</div>
                        <div className="text-sm text-gray-500">
                          {adjustment.class_name || 'Chưa có lớp'}
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          {adjustment.reason || 'Không ghi lý do'}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          adjustment.adjustment_type === 'bonus'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {adjustment.adjustment_type === 'bonus' ? '+' : '-'}
                        {Math.abs(adjustment.points)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {formatVietnamDateTime(adjustment.calculated_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                <Search className="mr-1 inline h-4 w-4" />
                Tìm kiếm
              </label>
              <input
                type="text"
                placeholder="Tên hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Lớp</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả lớp</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Điểm tối thiểu</label>
              <input
                type="number"
                placeholder="0"
                value={minPoints}
                onChange={(e) => setMinPoints(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setClassFilter('all');
                  setMinPoints('');
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsRecalculateConfirmOpen(true)}
              className="flex items-center rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tính lại điểm
            </button>
            <button
              onClick={handleExport}
              className="flex items-center rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Hạng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Sinh viên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Lớp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Tổng điểm
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Điểm thưởng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Điều chỉnh cộng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Điều chỉnh trừ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Hoạt động
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Giải thưởng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredScores.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredScores.map((score) => (
                    <tr key={score.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                            score.rank === 1
                              ? 'bg-yellow-100 text-yellow-700'
                              : score.rank === 2
                                ? 'bg-gray-100 text-gray-700'
                                : score.rank === 3
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {score.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{score.name}</div>
                        <div className="text-sm text-gray-500">{score.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{score.class_name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="text-lg font-bold text-blue-600">
                          {score.total_points}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-emerald-700">
                        {score.award_points}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-emerald-700">
                        {score.bonus_adjustment_points}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-red-700">
                        {score.penalty_points}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{score.activities_count}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                          {score.awards_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/admin/scores/${score.user_id}/adjust`)}
                          className="flex items-center text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="mr-1 h-4 w-4" />
                          Điều chỉnh
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <p className="text-sm text-gray-600">
              Hiển thị {filteredScores.length} / {scores.length} sinh viên
            </p>
          </div>
        </div>

        <ConfirmDialog
          isOpen={isRecalculateConfirmOpen}
          title="Tính lại điểm toàn bộ sinh viên"
          message="Bạn có chắc chắn muốn tính lại điểm cho tất cả sinh viên không? Quá trình này có thể mất vài phút."
          confirmText="Tính lại điểm"
          cancelText="Hủy"
          variant="warning"
          onCancel={() => setIsRecalculateConfirmOpen(false)}
          onConfirm={async () => {
            await handleRecalculate();
            setIsRecalculateConfirmOpen(false);
          }}
        />
      </div>
    </div>
  );
}

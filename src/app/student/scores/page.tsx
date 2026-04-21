'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';

interface ScoreRecord {
  participation_id: number;
  activity_title: string;
  activity_type_name: string;
  organization_level_name: string;
  achievement_level: string;
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
  average_points: number;
  excellent_count: number;
  good_count: number;
  participated_count: number;
}

export default function StudentScoresPage() {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedScore, setSelectedScore] = useState<ScoreRecord | null>(null);

  useEffect(() => {
    fetchScores();
  }, []);

  async function fetchScores() {
    try {
      const res = await fetch('/api/student/scores');
      if (!res.ok) throw new Error('Không thể tải điểm số');

      const data = await res.json();
      const resolvedScores = data.data?.scores || data.scores || [];
      const resolvedSummary = data.data?.summary || data.summary || null;

      setScores(resolvedScores);
      setSummary(resolvedSummary);
    } catch (error) {
      console.error('Error fetching scores:', error);
      toast.error('Không thể tải điểm số');
    } finally {
      setLoading(false);
    }
  }

  const getAchievementBadge = (level: string) => {
    const styles = {
      excellent: 'bg-purple-100 text-purple-800',
      good: 'bg-blue-100 text-blue-800',
      participated: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      excellent: 'Xuất sắc',
      good: 'Tốt',
      participated: 'Tham gia',
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${styles[level as keyof typeof styles]}`}
      >
        {labels[level as keyof typeof labels]}
      </span>
    );
  };

  const getAwardBadge = (awardType: string | null) => {
    if (!awardType) return null;

    const labels: Record<string, string> = {
      first_prize: 'Giải Nhất',
      second_prize: 'Giải Nhì',
      third_prize: 'Giải Ba',
      consolation: 'Khuyến khích',
      special: 'Đặc biệt',
    };

    return (
      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium ml-2">
        🏆 {labels[awardType] || awardType}
      </span>
    );
  };

  const exportToCSV = () => {
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
      'Giải thưởng',
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
        score.activity_type_name,
        score.organization_level_name,
        score.achievement_level,
        score.award_type || '',
        score.base_points,
        score.type_multiplier,
        score.level_multiplier,
        score.achievement_multiplier,
        score.subtotal.toFixed(2),
        score.bonus_points,
        score.penalty_points,
        score.total_points.toFixed(2),
        score.evaluated_at ? new Date(score.evaluated_at).toLocaleDateString('vi-VN') : '',
      ].join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bang-diem-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Đã xuất file CSV thành công!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 data-testid="scores-heading" className="text-3xl font-bold">
            Bảng điểm của tôi
          </h1>
          <p className="text-gray-600 mt-2">Chi tiết điểm rèn luyện từ các hoạt động ngoại khóa</p>
        </div>
        <Button onClick={exportToCSV} variant="success">
          Xuất CSV
        </Button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow p-4">
            <p className="text-sm opacity-90">Tổng hoạt động</p>
            <p className="text-3xl font-bold">{summary.total_activities}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow p-4">
            <p className="text-sm opacity-90">Tổng điểm</p>
            <p className="text-3xl font-bold">{summary.total_points.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow p-4">
            <p className="text-sm opacity-90">Xuất sắc</p>
            <p className="text-3xl font-bold">{summary.excellent_count}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-lg shadow p-4">
            <p className="text-sm opacity-90">Tốt</p>
            <p className="text-3xl font-bold">{summary.good_count}</p>
          </div>
          <div className="bg-gradient-to-br from-gray-400 to-gray-500 text-white rounded-lg shadow p-4">
            <p className="text-sm opacity-90">Tham gia</p>
            <p className="text-3xl font-bold">{summary.participated_count}</p>
          </div>
        </div>
      )}

      {/* Scores Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hoạt động
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại / Cấp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đánh giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Điểm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày đánh giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scores.map((score, index) => (
                <tr key={score.participation_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-medium">{score.activity_title}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{score.activity_type_name}</div>
                    <div className="text-xs text-gray-500">{score.organization_level_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getAchievementBadge(score.achievement_level)}
                    {getAwardBadge(score.award_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-bold text-green-600">
                      {score.total_points.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {score.evaluated_at
                      ? new Date(score.evaluated_at).toLocaleDateString('vi-VN')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedScore(score)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      📊 Xem
                    </button>
                  </td>
                </tr>
              ))}

              {scores.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Chưa có điểm số nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Detail Modal */}
      {selectedScore && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedScore(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Chi tiết tính điểm</h2>
              <button
                onClick={() => setSelectedScore(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Activity Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Hoạt động</h3>
                <p className="text-lg font-medium">{selectedScore.activity_title}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {selectedScore.activity_type_name}
                  </span>
                  <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded">
                    {selectedScore.organization_level_name}
                  </span>
                </div>
              </div>

              {/* Formula Breakdown */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">🧮 Công thức tính điểm</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p className="font-mono">{selectedScore.formula}</p>

                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <p className="mb-1">
                      <span className="font-medium">Điểm cơ bản:</span> {selectedScore.base_points}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">Hệ số loại hoạt động:</span> ×
                      {selectedScore.type_multiplier}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">Hệ số cấp tổ chức:</span> ×
                      {selectedScore.level_multiplier}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">Hệ số thành tích:</span> ×
                      {selectedScore.achievement_multiplier}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">Tạm tính:</span>{' '}
                      {selectedScore.subtotal.toFixed(2)} điểm
                    </p>
                    {selectedScore.bonus_points > 0 && (
                      <p className="mb-1 text-green-700">
                        <span className="font-medium">Điểm cộng:</span> +
                        {selectedScore.bonus_points} điểm
                      </p>
                    )}
                    {selectedScore.penalty_points > 0 && (
                      <p className="mb-1 text-red-700">
                        <span className="font-medium">Điểm trừ:</span> -
                        {selectedScore.penalty_points} điểm
                      </p>
                    )}
                  </div>

                  <div className="border-t border-blue-300 pt-2 mt-2">
                    <p className="text-lg font-bold text-blue-900">
                      Tổng điểm: {selectedScore.total_points.toFixed(2)} điểm
                    </p>
                  </div>
                </div>
              </div>

              {/* Achievement & Award */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">Đánh giá</h3>
                  {getAchievementBadge(selectedScore.achievement_level)}
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">Giải thưởng</h3>
                  {selectedScore.award_type ? (
                    getAwardBadge(selectedScore.award_type)
                  ) : (
                    <span className="text-gray-500 text-sm">Không có</span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500 text-center">
                Tính toán lúc: {new Date(selectedScore.calculated_at).toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setSelectedScore(null)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

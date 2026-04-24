'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from '@/lib/toast';
import { formatVietnamDateTime } from '@/lib/timezone';

interface Participation {
  id: number;
  student_id: number;
  student_name: string;
  activity_id: number;
  activity_title: string;
  activity_type_id: number;
  activity_type_name: string;
  organization_level_id: number;
  organization_level_name: string;
  achievement_level: string | null;
  feedback: string | null;
  award_type: string | null;
  evaluated_at: string | null;
  evaluator_name: string | null;
}

interface AchievementMultiplier {
  achievement_level: string;
  multiplier: number;
  description: string;
}

interface AwardBonus {
  award_type: string;
  bonus_points: number;
  description: string;
}

interface PointPreview {
  basePoints: number;
  typeMultiplier: number;
  levelMultiplier: number;
  achievementMultiplier: number;
  subtotal: number;
  bonusPoints: number;
  penaltyPoints: number;
  totalPoints: number;
  formula: string;
}

export default function EvaluateParticipationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [achievements, setAchievements] = useState<AchievementMultiplier[]>([]);
  const [awards, setAwards] = useState<AwardBonus[]>([]);
  const [pointPreview, setPointPreview] = useState<PointPreview | null>(null);

  // Form state
  const [achievementLevel, setAchievementLevel] = useState('');
  const [awardType, setAwardType] = useState('');
  const [bonusPoints, setBonusPoints] = useState(0);
  const [penaltyPoints, setPenaltyPoints] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (achievementLevel && participation) {
      fetchPointPreview();
    }
  }, [achievementLevel, awardType, bonusPoints, penaltyPoints]);

  async function fetchData() {
    try {
      const [partRes, achRes, awardRes] = await Promise.all([
        fetch(`/api/participations/${id}/evaluate`),
        fetch('/api/admin/scoring-config'),
        fetch('/api/admin/scoring-config'),
      ]);

      if (!partRes.ok) throw new Error('Không thể tải thông tin tham gia');

      const partData = await partRes.json();
      setParticipation(partData.data);

      // Pre-fill if already evaluated
      if (partData.data.achievement_level) {
        setAchievementLevel(partData.data.achievement_level);
        setAwardType(partData.data.award_type || '');
        setFeedback(partData.data.feedback || '');
      }

      if (achRes.ok) {
        const achData = await achRes.json();
        setAchievements(achData.data.achievements || []);
      }

      if (awardRes.ok) {
        const awardData = await awardRes.json();
        setAwards(awardData.data.awards || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải thông tin tham gia');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPointPreview() {
    try {
      const res = await fetch(`/api/participations/${params.id}/calculate-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          achievementLevel,
          awardType: awardType || null,
          bonusPoints,
          penaltyPoints,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPointPreview(data.data);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!achievementLevel) {
      toast.error('Vui lòng chọn mức đánh giá');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/participations/${params.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          achievementLevel,
          awardType: awardType || null,
          bonusPoints,
          penaltyPoints,
          feedback,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to evaluate');
      }

      const data = await res.json();
      toast.success(
        `Đánh giá thành công! Học viên nhận ${data.data.points.totalPoints.toFixed(2)} điểm`
      );
      router.push(`/teacher/attendance/${participation?.activity_id}`);
    } catch (error: any) {
      console.error('Error evaluating:', error);
      toast.error(error.message || 'Không thể đánh giá');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!participation) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Không tìm thấy thông tin tham gia</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-blue-600 hover:underline mb-2">
          ← Quay lại
        </button>
        <h1 className="text-3xl font-bold">Đánh giá thành tích</h1>
      </div>

      {/* Student & Activity Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Thông tin</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Học viên</p>
            <p className="font-semibold">{participation.student_name}</p>
          </div>
          <div>
            <p className="text-gray-600">Hoạt động</p>
            <p className="font-semibold">{participation.activity_title}</p>
          </div>
          <div>
            <p className="text-gray-600">Loại hoạt động</p>
            <p className="font-semibold">{participation.activity_type_name}</p>
          </div>
          <div>
            <p className="text-gray-600">Cấp tổ chức</p>
            <p className="font-semibold">{participation.organization_level_name}</p>
          </div>
        </div>

        {participation.evaluated_at && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ Đã đánh giá lúc {formatVietnamDateTime(participation.evaluated_at)}
              bởi {participation.evaluator_name || 'N/A'}
            </p>
          </div>
        )}
      </div>

      {/* Evaluation Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Đánh giá</h2>

        {/* Achievement Level */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mức đánh giá <span className="text-red-500">*</span>
          </label>
          <select
            value={achievementLevel}
            onChange={(e) => setAchievementLevel(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">-- Chọn mức đánh giá --</option>
            {achievements.map((ach) => (
              <option key={ach.achievement_level} value={ach.achievement_level}>
                {ach.description} (×{ach.multiplier})
              </option>
            ))}
          </select>
        </div>

        {/* Award Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Giải thưởng (nếu có)
          </label>
          <select
            value={awardType}
            onChange={(e) => setAwardType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Không có giải --</option>
            {awards.map((award) => (
              <option key={award.award_type} value={award.award_type}>
                {award.description} (+{award.bonus_points} điểm)
              </option>
            ))}
          </select>
        </div>

        {/* Bonus/Penalty Points */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Điểm cộng thêm</label>
            <input
              type="number"
              value={bonusPoints}
              onChange={(e) => setBonusPoints(parseFloat(e.target.value) || 0)}
              step="0.1"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Điểm trừ</label>
            <input
              type="number"
              value={penaltyPoints}
              onChange={(e) => setPenaltyPoints(parseFloat(e.target.value) || 0)}
              step="0.1"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Feedback */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Nhận xét</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập nhận xét về học viên..."
          />
        </div>

        {/* Point Preview */}
        {pointPreview && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">🧮 Dự tính điểm</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>Công thức: {pointPreview.formula}</p>
              <p>
                = ({pointPreview.basePoints} × {pointPreview.typeMultiplier} ×{' '}
                {pointPreview.levelMultiplier} × {pointPreview.achievementMultiplier})
                {pointPreview.bonusPoints > 0 && ` + ${pointPreview.bonusPoints}`}
                {pointPreview.penaltyPoints > 0 && ` - ${pointPreview.penaltyPoints}`}
              </p>
              <p className="text-lg font-bold text-blue-900">
                = {pointPreview.totalPoints.toFixed(2)} điểm
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving || !achievementLevel}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {saving
            ? 'Đang lưu...'
            : participation.evaluated_at
              ? 'Cập nhật đánh giá'
              : 'Lưu đánh giá'}
        </button>
      </form>
    </div>
  );
}

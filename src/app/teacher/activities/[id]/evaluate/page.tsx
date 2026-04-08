'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import AchievementEvaluation from '@/components/AchievementEvaluation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AchievementLevel, ACHIEVEMENT_MULTIPLIERS } from '@/lib/scoring';

interface Participant {
  id: number;
  student_id: number;
  student_name: string;
  student_code: string;
  class_name: string;
  attended: number;
  achievement_level: string | null;
  feedback: string | null;
}

interface Activity {
  id: number;
  title: string;
}

interface EvaluationForm {
  participation_id: number;
  achievement_level: AchievementLevel;
  award_type: string;
  feedback: string;
}

type PendingEvaluationAction =
  | { type: 'apply-all'; field: 'achievement_level' | 'award_type'; value: string }
  | { type: 'submit'; count: number }
  | null;

export default function TeacherEvaluatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [evaluations, setEvaluations] = useState<Map<number, EvaluationForm>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingEvaluationAction>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.push('/login');
      return;
    }
    if (user) fetchData();
  }, [user, authLoading, router, activityId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const activityRes = await fetch(`/api/activities/${activityId}`);
      const activityJson = await activityRes.json();
      if (activityJson.success) {
        const raw = activityJson.activity ?? activityJson.data?.activity ?? activityJson.data;
        const resolved = raw?.activity ?? raw;
        if (resolved) setActivity(resolved);
      }

      const participantsRes = await fetch(`/api/teacher/activities/${activityId}/participants`);
      const participantsJson = await participantsRes.json();
      if (participantsJson.success) {
        const attendedParticipants = participantsJson.data.filter(
          (p: Participant) => p.attended === 1
        );
        setParticipants(attendedParticipants);

        // Initialize evaluations with existing data
        const initialEvals = new Map<number, EvaluationForm>();
        attendedParticipants.forEach((p: Participant) => {
          initialEvals.set(p.id, {
            participation_id: p.id,
            achievement_level: (p.achievement_level as AchievementLevel) || 'participated',
            award_type: '',
            feedback: p.feedback || '',
          });
        });
        setEvaluations(initialEvals);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEvaluation = (
    participationId: number,
    field: keyof EvaluationForm,
    value: string
  ) => {
    setEvaluations((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(participationId);
      if (current) {
        newMap.set(participationId, { ...current, [field]: value });
      }
      return newMap;
    });
  };

  const applyToAll = (field: 'achievement_level' | 'award_type', value: string) => {
    setEvaluations((prev) => {
      const newMap = new Map(prev);
      participants.forEach((p) => {
        const current = newMap.get(p.id);
        if (current) {
          newMap.set(p.id, { ...current, [field]: value });
        }
      });
      return newMap;
    });
  };

  const handleSubmit = async () => {
    const evaluationList = Array.from(evaluations.values());

    if (evaluationList.length === 0) {
      toast.error('Không có sinh viên nào để đánh giá');
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`/api/teacher/activities/${activityId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluations: evaluationList }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success('Đánh giá thành công!');
        router.push(`/teacher/activities/${activityId}/participants`);
      } else {
        toast.error('Lỗi: ' + json.error);
      }
    } catch (error) {
      console.error('Error submitting evaluations:', error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const requestApplyToAll = (field: 'achievement_level' | 'award_type', value: string) => {
    setPendingAction({ type: 'apply-all', field, value });
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'apply-all') {
      applyToAll(pendingAction.field, pendingAction.value);
    } else {
      await handleSubmit();
    }

    setPendingAction(null);
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!activity) {
    return <div className="p-6">Không tìm thấy hoạt động</div>;
  }

  const confirmConfig =
    pendingAction?.type === 'apply-all'
      ? {
          title: 'Áp dụng hàng loạt',
          message: `Bạn có chắc chắn muốn áp dụng "${pendingAction.value}" cho tất cả ${participants.length} sinh viên trong danh sách đánh giá này?`,
          confirmText: 'Áp dụng',
          variant: 'warning' as const,
        }
      : {
          title: 'Lưu đánh giá hàng loạt',
          message: `Bạn có chắc chắn muốn lưu đánh giá cho ${pendingAction?.count ?? 0} sinh viên?`,
          confirmText: 'Lưu đánh giá',
          variant: 'info' as const,
        };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link
          href={`/teacher/activities/${activityId}/participants`}
          className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          ← Quay lại danh sách
        </Link>
        <h1 className="text-3xl font-bold">📝 Đánh Giá Hàng Loạt</h1>
        <p className="text-gray-600 mt-2">{activity.title}</p>
      </div>

      {participants.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Chưa có sinh viên nào đã tham gia
        </div>
      ) : (
        <>
          {/* Bulk Actions */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="font-bold mb-3">⚡ Áp dụng hàng loạt</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mức thành tích
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    id="bulk-achievement"
                  >
                    <option value="">-- Chọn --</option>
                    <option value="xuat_sac">Xuất sắc</option>
                    <option value="tot">Tốt</option>
                    <option value="tham_gia">Tham gia</option>
                  </select>
                  <button
                    onClick={() => {
                      const select = document.getElementById(
                        'bulk-achievement'
                      ) as HTMLSelectElement;
                      if (select.value) requestApplyToAll('achievement_level', select.value);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại giải thưởng
                </label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    id="bulk-award"
                  >
                    <option value="">-- Không --</option>
                    <option value="Giải Nhất">Giải Nhất</option>
                    <option value="Giải Nhì">Giải Nhì</option>
                    <option value="Giải Ba">Giải Ba</option>
                    <option value="Giải Khuyến Khích">Giải Khuyến Khích</option>
                  </select>
                  <button
                    onClick={() => {
                      const select = document.getElementById('bulk-award') as HTMLSelectElement;
                      requestApplyToAll('award_type', select.value);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluation Grid */}
          <div className="space-y-6 mb-6">
            {participants.map((p, idx) => {
              const eval_ = evaluations.get(p.id);
              if (!eval_) return null;

              const achievementLevel =
                (eval_.achievement_level as AchievementLevel) || 'participated';
              const basePoints = 10;
              const estimatedScore = Math.round(
                basePoints * ACHIEVEMENT_MULTIPLIERS[achievementLevel]
              );

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-sm text-gray-500">#{idx + 1}</div>
                      <div className="font-semibold text-lg">{p.student_name}</div>
                      <div className="text-sm text-gray-600">
                        {p.student_code} • {p.class_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Dự kiến điểm</div>
                      <div className="text-2xl font-bold text-blue-600">{estimatedScore}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Achievement Level Selection */}
                    <div className="md:col-span-1">
                      <AchievementEvaluation
                        value={achievementLevel}
                        onChange={(level) => updateEvaluation(p.id, 'achievement_level', level)}
                        basePoints={basePoints}
                        showScore={true}
                      />
                    </div>

                    {/* Award and Feedback */}
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🏆 Giải thưởng (tùy chọn)
                        </label>
                        <select
                          value={eval_.award_type}
                          onChange={(e) => updateEvaluation(p.id, 'award_type', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">-- Không có giải --</option>
                          <option value="Giải Nhất">🥇 Giải Nhất</option>
                          <option value="Giải Nhì">🥈 Giải Nhì</option>
                          <option value="Giải Ba">🥉 Giải Ba</option>
                          <option value="Giải Khuyến Khích">⭐ Giải Khuyến Khích</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          💬 Nhận xét
                        </label>
                        <textarea
                          value={eval_.feedback}
                          onChange={(e) => updateEvaluation(p.id, 'feedback', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nhập nhận xét chi tiết về hiệu suất của học viên..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Link
              href={`/teacher/activities/${activityId}/participants`}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Hủy
            </Link>
            <button
              onClick={() => {
                const count = Array.from(evaluations.values()).length;
                if (count === 0) {
                  toast.error('Không có sinh viên nào để đánh giá');
                  return;
                }

                setPendingAction({ type: 'submit', count });
              }}
              disabled={submitting}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang lưu...' : `💾 Lưu đánh giá (${participants.length} SV)`}
            </button>
          </div>
          <ConfirmDialog
            isOpen={pendingAction !== null}
            title={confirmConfig.title}
            message={confirmConfig.message}
            confirmText={confirmConfig.confirmText}
            cancelText="Hủy"
            variant={confirmConfig.variant}
            onCancel={() => setPendingAction(null)}
            onConfirm={confirmPendingAction}
          />
        </>
      )}
    </div>
  );
}

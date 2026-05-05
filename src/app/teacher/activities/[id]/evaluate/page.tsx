'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  GraduationCap,
  Save,
  Sparkles,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import AchievementEvaluation from '@/components/AchievementEvaluation';
import toast from 'react-hot-toast';
import { ACHIEVEMENT_MULTIPLIERS, type AchievementLevel } from '@/lib/scoring';

type Participant = {
  id: number;
  student_id: number;
  student_name: string;
  student_code: string;
  class_name: string;
  attended: number;
  achievement_level: string | null;
  feedback: string | null;
};

type Activity = {
  id: number;
  title: string;
};

type EvaluationForm = {
  participation_id: number;
  achievement_level: AchievementLevel;
  award_type: string;
  feedback: string;
};

type PendingEvaluationAction =
  | { type: 'apply-all'; field: 'achievement_level' | 'award_type'; value: string }
  | { type: 'submit'; count: number }
  | null;

const AWARD_OPTIONS = [
  { value: '', label: 'Khong co giai' },
  { value: 'Giai Nhat', label: 'Giai Nhat' },
  { value: 'Giai Nhi', label: 'Giai Nhi' },
  { value: 'Giai Ba', label: 'Giai Ba' },
  { value: 'Giai Khuyen Khich', label: 'Giai Khuyen Khich' },
] as const;

export default function TeacherBulkEvaluatePage() {
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
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'teacher' && user.role !== 'admin') {
      toast.error('Chi giang vien moi co quyen danh gia thanh tich');
      router.push('/teacher/dashboard');
      return;
    }

    if (user && activityId) {
      void fetchData();
    }
  }, [activityId, authLoading, router, user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const activityRes = await fetch(`/api/activities/${activityId}`);
      const activityJson = await activityRes.json().catch(() => null);
      if (!activityRes.ok) {
        throw new Error(activityJson?.error || activityJson?.message || 'Khong the tai hoat dong');
      }

      setActivity(activityJson?.activity ?? activityJson?.data?.activity ?? activityJson?.data ?? activityJson);

      const participantsRes = await fetch(`/api/teacher/activities/${activityId}/participants`);
      const participantsJson = await participantsRes.json().catch(() => null);
      if (!participantsRes.ok) {
        throw new Error(participantsJson?.error || participantsJson?.message || 'Khong the tai roster danh gia');
      }

      const participantList = participantsJson?.data ?? participantsJson ?? [];
      const attendedParticipants = (participantList as Participant[]).filter(
        (participant) => participant.attended === 1
      );

      setParticipants(attendedParticipants);

      const nextEvaluations = new Map<number, EvaluationForm>();
      attendedParticipants.forEach((participant) => {
        nextEvaluations.set(participant.id, {
          participation_id: participant.id,
          achievement_level:
            (participant.achievement_level as AchievementLevel | null) || 'participated',
          award_type: '',
          feedback: participant.feedback || '',
        });
      });
      setEvaluations(nextEvaluations);
    } catch (error: unknown) {
      console.error('Error loading evaluation roster:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai du lieu danh gia');
      setActivity(null);
    } finally {
      setLoading(false);
    }
  };

  const updateEvaluation = (
    participationId: number,
    field: keyof EvaluationForm,
    value: string | AchievementLevel
  ) => {
    setEvaluations((prev) => {
      const next = new Map(prev);
      const current = next.get(participationId);
      if (current) {
        next.set(participationId, { ...current, [field]: value });
      }
      return next;
    });
  };

  const applyToAll = (field: 'achievement_level' | 'award_type', value: string) => {
    setEvaluations((prev) => {
      const next = new Map(prev);
      participants.forEach((participant) => {
        const current = next.get(participant.id);
        if (current) {
          next.set(participant.id, { ...current, [field]: value });
        }
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    const evaluationList = Array.from(evaluations.values());
    if (evaluationList.length === 0) {
      toast.error('Khong co hoc vien nao de danh gia');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/teacher/activities/${activityId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluations: evaluationList }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || json?.message || 'Khong the luu danh gia');
      }

      toast.success(json?.message || 'Da luu danh gia thanh cong');
      router.push(`/teacher/activities/${activityId}/participants`);
    } catch (error: unknown) {
      console.error('Error submitting evaluations:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the luu danh gia');
    } finally {
      setSubmitting(false);
    }
  };

  const requestApplyToAll = (field: 'achievement_level' | 'award_type', value: string) => {
    if (!value) {
      toast.error('Vui long chon gia tri truoc khi ap dung hang loat');
      return;
    }

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
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-6xl p-6">
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 text-rose-900">
            Khong tim thay hoat dong de danh gia.
          </div>
        </div>
      </div>
    );
  }

  const confirmConfig =
    pendingAction?.type === 'apply-all'
      ? {
          title: 'Ap dung hang loat',
          message: `Ban co chac chan muon ap dung "${pendingAction.value}" cho toan bo ${participants.length} hoc vien du dieu kien danh gia?`,
          confirmText: 'Ap dung',
          variant: 'warning' as const,
        }
      : {
          title: 'Luu danh gia hang loat',
          message: `Ban co chac chan muon luu danh gia cho ${pendingAction?.count ?? 0} hoc vien?`,
          confirmText: 'Luu danh gia',
          variant: 'info' as const,
        };

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href={`/teacher/activities/${activityId}/participants`}
                className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lai danh sach nguoi tham gia
              </Link>

              <div className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                Batch evaluation
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Danh gia hang loat</h1>
              <p className="mt-2 text-sm text-slate-600">
                Danh gia thanh tich cho hoc vien da diem danh va dong bo diem ngay trong mot luot.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <span>{activity.title}</span>
                <span>{participants.length} hoc vien du dieu kien</span>
              </div>
            </div>

            <button
              onClick={() => {
                const count = Array.from(evaluations.values()).length;
                if (count === 0) {
                  toast.error('Khong co hoc vien nao de danh gia');
                  return;
                }
                setPendingAction({ type: 'submit', count });
              }}
              disabled={submitting || participants.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Dang luu...' : `Luu danh gia (${participants.length})`}
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="page-surface rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Roster du dieu kien</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{participants.length}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Mac dinh diem</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">10</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Loai thao tac</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">Batch</div>
          </div>
        </section>

        {participants.length === 0 ? (
          <section className="page-surface rounded-[1.75rem] px-5 py-10 text-center text-sm text-slate-500 sm:px-7">
            Chua co hoc vien nao da diem danh de mo khoa danh gia.
          </section>
        ) : (
          <>
            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Sparkles className="h-4 w-4" />
                    Ap dung nhanh muc thanh tich
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <select
                      id="bulk-achievement"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Chon muc danh gia</option>
                      <option value="excellent">Xuat sac</option>
                      <option value="good">Tot</option>
                      <option value="participated">Tham gia</option>
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById('bulk-achievement') as HTMLSelectElement | null;
                        requestApplyToAll('achievement_level', select?.value || '');
                      }}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Ap dung cho tat ca
                    </button>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Award className="h-4 w-4" />
                    Ap dung nhanh loai giai
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <select
                      id="bulk-award"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {AWARD_OPTIONS.map((option) => (
                        <option key={option.value || 'none'} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById('bulk-award') as HTMLSelectElement | null;
                        requestApplyToAll('award_type', select?.value || '');
                      }}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Ap dung cho tat ca
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              {participants.map((participant, index) => {
                const evaluation = evaluations.get(participant.id);
                if (!evaluation) return null;

                const achievementLevel = evaluation.achievement_level || 'participated';
                const estimatedScore = Math.round(10 * ACHIEVEMENT_MULTIPLIERS[achievementLevel]);

                return (
                  <article
                    key={participant.id}
                    className="page-surface rounded-[1.75rem] border border-slate-200 px-5 py-6 sm:px-7"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="max-w-xl">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Hoc vien #{index + 1}
                        </div>
                        <div className="mt-2 text-xl font-bold text-slate-900">{participant.student_name}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {participant.student_code ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                              {participant.student_code}
                            </span>
                          ) : null}
                          {participant.class_name ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                              {participant.class_name}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                            Da diem danh
                          </span>
                          {participant.achievement_level ? (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-semibold text-violet-700">
                              Da co danh gia truoc
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                          Diem du kien
                        </div>
                        <div className="mt-2 text-3xl font-bold text-slate-900">{estimatedScore}</div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <GraduationCap className="h-4 w-4" />
                          Muc danh gia
                        </div>
                        <AchievementEvaluation
                          value={achievementLevel}
                          onChange={(level) => updateEvaluation(participant.id, 'achievement_level', level)}
                          basePoints={10}
                          showScore={true}
                        />
                      </div>

                      <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Loai giai</span>
                          <select
                            value={evaluation.award_type}
                            onChange={(event) =>
                              updateEvaluation(participant.id, 'award_type', event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          >
                            {AWARD_OPTIONS.map((option) => (
                              <option key={option.value || 'none'} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Nhan xet</span>
                          <textarea
                            rows={4}
                            value={evaluation.feedback}
                            onChange={(event) =>
                              updateEvaluation(participant.id, 'feedback', event.target.value)
                            }
                            placeholder="Ghi nhanh nhan xet hoac luu y cho hoc vien nay"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </label>

                        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          He so hien tai:{' '}
                          <span className="font-semibold text-slate-900">
                            {ACHIEVEMENT_MULTIPLIERS[achievementLevel]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText="Huy"
        variant={confirmConfig.variant}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}

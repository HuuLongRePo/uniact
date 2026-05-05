'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  GraduationCap,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/lib/toast';
import { formatDate } from '@/lib/formatters';
import { resolveDownloadFilename } from '@/lib/download-filename';
import { toVietnamDateStamp } from '@/lib/timezone';

interface Participation {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  attendance_status: 'registered' | 'attended' | 'absent';
  achievement_level?: 'excellent' | 'good' | 'participated' | null;
  evaluated_at?: string;
  points?: number;
}

interface Activity {
  id: number;
  title: string;
  date_time: string;
  location: string;
  status: string;
}

type ClassQuickAddTarget = { id: number; name: string } | null;
type AchievementLevel = 'excellent' | 'good' | 'participated' | null;

function getAttendanceBadge(status: Participation['attendance_status']) {
  if (status === 'attended') return 'bg-emerald-100 text-emerald-700';
  if (status === 'absent') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

function getAttendanceLabel(status: Participation['attendance_status']) {
  if (status === 'attended') return 'Da diem danh';
  if (status === 'absent') return 'Vang mat';
  return 'Da dang ky';
}

function getAchievementLabel(level: AchievementLevel) {
  if (level === 'excellent') return 'Xuat sac';
  if (level === 'good') return 'Tot';
  if (level === 'participated') return 'Tham gia';
  return 'Chua danh gia';
}

export default function ParticipantsPage() {
  const params = useParams();
  const activityId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [achievements, setAchievements] = useState<Record<number, AchievementLevel>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [classToAdd, setClassToAdd] = useState<ClassQuickAddTarget>(null);
  const [showBulkRemoveDialog, setShowBulkRemoveDialog] = useState(false);

  useEffect(() => {
    if (activityId) {
      void fetchData();
    }
  }, [activityId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const activityRes = await fetch(`/api/activities/${activityId}`);
      if (!activityRes.ok) throw new Error('Khong the tai hoat dong');
      const activityData = await activityRes.json();
      setActivity(activityData?.activity ?? activityData?.data?.activity ?? activityData);

      const participationsRes = await fetch(`/api/activities/${activityId}/participants`);
      if (!participationsRes.ok) throw new Error('Khong the tai danh sach nguoi tham gia');
      const participationsData = await participationsRes.json();
      const participationList =
        participationsData?.participations ?? participationsData?.data?.participations ?? [];
      setParticipations(participationList);

      const existingAchievements: Record<number, AchievementLevel> = {};
      participationList.forEach((participation: Participation) => {
        if (participation.achievement_level) {
          existingAchievements[participation.id] = participation.achievement_level;
        }
      });
      setAchievements(existingAchievements);

      const classesRes = await fetch('/api/classes');
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData?.classes ?? classesData?.data?.classes ?? []);
      }
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai du lieu');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (participationId: number) => {
    const achievement = achievements[participationId];
    if (!achievement) {
      toast.error('Vui long chon muc do danh gia');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/participations/${participationId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievement_level: achievement }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || error?.message || 'Khong the danh gia');
      }

      const data = await res.json();
      toast.success(data.message || 'Da danh gia thanh cong');
      await fetchData();
    } catch (error: unknown) {
      console.error('Error evaluating:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi danh gia');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkEvaluate = async () => {
    const toEvaluate = participations.filter(
      (participation) =>
        participation.attendance_status === 'attended' &&
        achievements[participation.id] &&
        !participation.evaluated_at
    );

    if (toEvaluate.length === 0) {
      toast.error('Khong co hoc vien nao can danh gia');
      return;
    }

    try {
      setSaving(true);
      let successCount = 0;

      for (const participation of toEvaluate) {
        const res = await fetch(`/api/participations/${participation.id}/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievement_level: achievements[participation.id] }),
        });

        if (res.ok) successCount++;
      }

      toast.success(`Da danh gia ${successCount}/${toEvaluate.length} hoc vien`);
      await fetchData();
    } catch (error) {
      console.error('Error bulk evaluating:', error);
      toast.error('Loi khi danh gia hang loat');
    } finally {
      setSaving(false);
    }
  };

  const handleAddByClass = async (classId: number) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/activities/${activityId}/participants/add-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId }),
      });

      if (!res.ok) throw new Error('Khong the them lop');
      const data = await res.json();
      toast.success(`Da them ${data.added_count || 0} hoc vien`);
      await fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Khong the them lop');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedIds.size === 0) {
      toast.error('Vui long chon it nhat mot hoc vien');
      return;
    }

    try {
      setSaving(true);
      const studentIds = Array.from(selectedIds)
        .map((participationId) => {
          const participation = participations.find((item) => item.id === participationId);
          return participation?.student_id;
        })
        .filter(Boolean);

      const res = await fetch(`/api/activities/${activityId}/participants/bulk-remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: studentIds }),
      });

      if (!res.ok) throw new Error('Khong the xoa hoc vien');
      const data = await res.json();
      toast.success(`Da xoa ${data.removed_count || 0} hoc vien`);
      setSelectedIds(new Set());
      setShowBulkRemoveDialog(false);
      await fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Khong the xoa');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}/participants/export`);
      if (!res.ok) throw new Error('Xuat du lieu that bai');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        res.headers.get('Content-Disposition'),
        `participants-${activityId}-${toVietnamDateStamp(new Date())}.csv`
      );
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success('Da xuat file thanh cong');
    } catch (_error) {
      toast.error('Khong the xuat file');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === participations.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(participations.map((participation) => participation.id)));
  };

  const handleToggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-6xl p-6 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          <p className="mt-2 text-gray-600">Dang tai du lieu...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-6xl p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">Khong tim thay hoat dong</p>
          </div>
        </div>
      </div>
    );
  }

  const attendedCount = participations.filter((item) => item.attendance_status === 'attended').length;
  const evaluatedCount = participations.filter((item) => item.evaluated_at).length;

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <Link
            href={`/teacher/activities/${activityId}`}
            className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lai hub hoat dong
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Participant operations
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Nguoi tham gia va danh gia</h1>
              <p className="mt-2 text-sm text-slate-600">
                Theo doi roster, them nhanh theo lop, cap nhat danh gia va xuat danh sach phuc vu van hanh.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <span>{activity.title}</span>
                <span>{formatDate(activity.date_time)}</span>
                <span>{activity.location}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                Xuat CSV
              </button>
              <button
                onClick={handleBulkEvaluate}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Luu danh gia
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="page-surface rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong roster</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{participations.length}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Da diem danh</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{attendedCount}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Da danh gia</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{evaluatedCount}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Da chon</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{selectedIds.size}</div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Them nhanh theo lop hoc</h2>
              <p className="mt-1 text-sm text-slate-600">
                Chon mot lop de them ca roster vao hoat dong dang van hanh.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setClassToAdd({ id: cls.id, name: cls.name })}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {cls.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {selectedIds.size > 0 ? (
          <section className="page-surface rounded-[1.5rem] border border-blue-200 bg-blue-50 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-blue-800">
                Da chon {selectedIds.size} hoc vien
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowBulkRemoveDialog(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Xoa khoi hoat dong
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Bo chon
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Roster chi tiet</h2>
              <p className="mt-1 text-sm text-slate-600">
                Danh gia hoc vien da diem danh va quan ly roster theo tung nguoi.
              </p>
            </div>
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Users className="h-4 w-4" />
              {selectedIds.size === participations.length && participations.length > 0
                ? 'Bo chon tat ca'
                : 'Chon tat ca'}
            </button>
          </div>

          {participations.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Chua co hoc vien dang ky.
            </div>
          ) : (
            <div className="space-y-4">
              {participations.map((participation) => (
                <div
                  key={participation.id}
                  className={`rounded-[1.5rem] border p-4 transition ${
                    selectedIds.has(participation.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(participation.id)}
                        onChange={() => handleToggleSelect(participation.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                      <div>
                        <div className="text-base font-semibold text-slate-900">
                          {participation.student_name}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">{participation.student_email}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span
                            className={`rounded-full px-3 py-1 font-semibold ${getAttendanceBadge(participation.attendance_status)}`}
                          >
                            {getAttendanceLabel(participation.attendance_status)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            {getAchievementLabel(achievements[participation.id] || participation.achievement_level || null)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            {participation.points != null ? `${participation.points} diem` : 'Chua co diem'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-xl space-y-3">
                      {participation.attendance_status === 'attended' ? (
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <select
                            value={achievements[participation.id] || ''}
                            onChange={(event) => {
                              const value = event.target.value as
                                | 'excellent'
                                | 'good'
                                | 'participated'
                                | '';
                              setAchievements((prev) => ({
                                ...prev,
                                [participation.id]: value || null,
                              }));
                            }}
                            disabled={saving || !!participation.evaluated_at}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            <option value="">Chon muc do</option>
                            <option value="excellent">Xuat sac</option>
                            <option value="good">Tot</option>
                            <option value="participated">Tham gia</option>
                          </select>

                          <button
                            onClick={() => void handleEvaluate(participation.id)}
                            disabled={saving || !achievements[participation.id] || !!participation.evaluated_at}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <GraduationCap className="h-4 w-4" />
                            {participation.evaluated_at ? 'Da danh gia' : 'Danh gia'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">
                          Hoc vien chua du dieu kien danh gia vi chua co trang thai attended.
                        </div>
                      )}

                      {participation.evaluated_at ? (
                        <div className="text-xs font-medium text-emerald-700">
                          Da khoa danh gia cho hoc vien nay.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <ConfirmDialog
          isOpen={classToAdd !== null}
          title="Them nhanh theo lop"
          message={
            classToAdd
              ? `Ban co chac chan muon them toan bo hoc vien cua lop "${classToAdd.name}" vao hoat dong nay?`
              : ''
          }
          confirmText="Them ca lop"
          cancelText="Huy"
          variant="warning"
          onCancel={() => setClassToAdd(null)}
          onConfirm={async () => {
            if (!classToAdd) return;
            await handleAddByClass(classToAdd.id);
            setClassToAdd(null);
          }}
        />

        <ConfirmDialog
          isOpen={showBulkRemoveDialog}
          title="Xoa hoc vien khoi hoat dong"
          message={`Ban co chac chan muon xoa ${selectedIds.size} hoc vien da chon khoi hoat dong nay?`}
          confirmText="Xoa khoi hoat dong"
          cancelText="Huy"
          variant="danger"
          onCancel={() => setShowBulkRemoveDialog(false)}
          onConfirm={async () => {
            await handleBulkRemove();
          }}
        />
      </div>
    </div>
  );
}

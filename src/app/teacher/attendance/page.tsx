'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  QrCode,
  ScanFace,
  ShieldCheck,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatDate } from '@/lib/formatters';

interface Activity {
  id: number;
  title: string;
  date_time: string;
  location: string;
  status: string;
}

interface Student {
  id: number;
  user_id: number;
  name: string;
  email: string;
  registration_status: string;
  attendance_status: string | null;
  achievement_level?: 'excellent' | 'good' | 'participated' | null;
}

type AchievementLevel = 'excellent' | 'good' | 'participated' | null;

const QUICK_LINKS = [
  {
    href: '/teacher/qr',
    title: 'Diem danh QR',
    description: 'Mo session QR, chieu projector va theo doi luot check-in theo thoi gian thuc.',
    icon: QrCode,
    tone: 'blue',
  },
  {
    href: '/teacher/attendance/face',
    title: 'Face attendance',
    description: 'Tao candidate preview, kiem tra liveness va gui verify cho hoc vien.',
    icon: ScanFace,
    tone: 'emerald',
  },
  {
    href: '/teacher/attendance/policy',
    title: 'Attendance policy',
    description: 'Xem policy, fallback QR va pilot face attendance truoc khi van hanh.',
    icon: ShieldCheck,
    tone: 'amber',
  },
] as const;

function getQuickLinkTone(tone: (typeof QUICK_LINKS)[number]['tone']) {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'amber':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    default:
      return 'border-blue-200 bg-blue-50 text-blue-800';
  }
}

function getActivityStatusLabel(status: string) {
  if (status === 'ongoing' || status === 'published') return 'Dang dien ra';
  if (status === 'completed') return 'Da ket thuc';
  return status;
}

function getActivityStatusTone(status: string) {
  if (status === 'ongoing' || status === 'published') return 'bg-emerald-100 text-emerald-700';
  if (status === 'completed') return 'bg-slate-100 text-slate-700';
  return 'bg-blue-100 text-blue-700';
}

function getAchievementLabel(level: AchievementLevel) {
  switch (level) {
    case 'excellent':
      return 'Xuat sac';
    case 'good':
      return 'Tot';
    case 'participated':
      return 'Tham gia';
    default:
      return 'Chua danh gia';
  }
}

export default function TeacherManualAttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [achievements, setAchievements] = useState<Record<number, AchievementLevel>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchActivities();
    }
  }, [authLoading, router, user]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/activities?scope=operational&status=ongoing,completed');
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Khong the tai danh sach hoat dong');
      }
      setActivities(data?.activities || data?.data?.activities || []);
    } catch (error) {
      console.error('Fetch activities error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai danh sach hoat dong');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (activityId: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance/manual?activity_id=${activityId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Khong the tai danh sach hoc vien');
      }

      const resolvedStudents = data?.students || data?.data?.students || [];
      setStudents(resolvedStudents);

      const attended = resolvedStudents
        .filter((student: Student) => student.attendance_status === 'attended')
        .map((student: Student) => student.user_id);
      setSelectedStudents(attended);

      const existingAchievements: Record<number, AchievementLevel> = {};
      resolvedStudents.forEach((student: Student) => {
        if (student.achievement_level) {
          existingAchievements[student.user_id] = student.achievement_level;
        }
      });
      setAchievements(existingAchievements);
    } catch (error) {
      console.error('Fetch students error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai danh sach hoc vien');
      setStudents([]);
      setSelectedStudents([]);
      setAchievements({});
    } finally {
      setLoading(false);
    }
  };

  const handleActivityChange = (activityId: number) => {
    setSelectedActivityId(activityId);
    setStudents([]);
    setSelectedStudents([]);
    setAchievements({});
    void fetchStudents(activityId);
  };

  const handleToggleStudent = (userId: number) => {
    setSelectedStudents((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
      return;
    }
    setSelectedStudents(students.map((student) => student.user_id));
  };

  const handleSubmit = async () => {
    if (!selectedActivityId) {
      toast.error('Vui long chon hoat dong');
      return;
    }
    if (selectedStudents.length === 0) {
      toast.error('Vui long chon it nhat 1 hoc vien');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: selectedActivityId,
          student_ids: selectedStudents,
          achievements,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Diem danh that bai');
      }

      toast.success(data?.message || 'Da luu diem danh thanh cong');
      await fetchStudents(selectedActivityId);
    } catch (error) {
      console.error('Submit attendance error:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi luu diem danh');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId) || null,
    [activities, selectedActivityId]
  );

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Attendance control center
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Dieu phoi diem danh</h1>
              <p className="mt-2 text-sm text-slate-600">
                Chon hoat dong dang van hanh, theo doi hoc vien da co mat va dung manual fallback
                khi QR hoac face attendance can xu ly bo sung.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[30rem]">
              <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Hoat dong
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{activities.length}</div>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Dang chon
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {selectedActivity ? students.length : 0}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Da danh dau
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {selectedStudents.length}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`page-surface rounded-[1.5rem] border px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-md ${getQuickLinkTone(item.tone)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{item.title}</div>
                    <p className="mt-2 text-sm opacity-90">{item.description}</p>
                  </div>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
                  Mo trang
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.1fr)]">
          <div className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Danh sach hoat dong</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Chon mot hoat dong dang van hanh de tai roster manual attendance.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {activities.length} muc
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {activities.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => handleActivityChange(activity.id)}
                  className={`w-full rounded-[1.25rem] border p-4 text-left transition ${
                    selectedActivityId === activity.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{activity.title}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(activity.date_time)}
                        </span>
                        <span>{activity.location}</span>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getActivityStatusTone(activity.status)}`}
                    >
                      {getActivityStatusLabel(activity.status)}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {activities.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Chua co hoat dong operational nao de diem danh.
              </div>
            ) : null}
          </div>

          <div className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-6">
            {!selectedActivity ? (
              <div className="flex min-h-[26rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
                <ClipboardCheck className="h-12 w-12 text-slate-400" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">Chon hoat dong</h2>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Chon mot hoat dong o cot ben trai de tai danh sach hoc vien, danh dau co mat va
                  luu fallback manual attendance.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" />
                    <div>
                      <div className="text-sm font-semibold text-amber-900">
                        Khi nao dung manual fallback
                      </div>
                      <p className="mt-1 text-sm text-amber-800">
                        Uu tien QR hoac face attendance. Chi dung man nay khi can xu ly hoc vien bi
                        sot, camera gap van de hoac can chot bo sung sau buoi.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedActivity.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDate(selectedActivity.date_time)} · {selectedActivity.location}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Users className="h-4 w-4" />
                    {selectedStudents.length === students.length && students.length > 0
                      ? 'Bo chon tat ca'
                      : 'Chon tat ca'}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tong hoc vien
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">{students.length}</div>
                  </div>
                  <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Da chon
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {selectedStudents.length}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-blue-200 bg-blue-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Da co mat san
                    </div>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {students.filter((student) => student.attendance_status === 'attended').length}
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">Roster manual fallback</div>
                    <p className="mt-1 text-sm text-slate-600">
                      Danh dau hoc vien co mat va chon muc danh gia diem neu can.
                    </p>
                  </div>

                  <div className="max-h-[28rem] space-y-3 overflow-y-auto px-4 py-4">
                    {students.map((student) => {
                      const isSelected = selectedStudents.includes(student.user_id);
                      const isAttended = student.attendance_status === 'attended';

                      return (
                        <div
                          key={student.user_id}
                          className={`rounded-[1.25rem] border p-4 transition ${
                            isSelected
                              ? 'border-emerald-300 bg-emerald-50'
                              : isAttended
                                ? 'border-emerald-200 bg-emerald-50/60'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <label className="flex min-w-0 items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudent(student.user_id)}
                                className="mt-1 h-4 w-4 rounded border-slate-300"
                              />
                              <div className="min-w-0">
                                <div className="truncate font-medium text-slate-900">
                                  {student.name}
                                </div>
                                <div className="truncate text-sm text-slate-600">{student.email}</div>
                              </div>
                            </label>

                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <select
                                value={achievements[student.user_id] || ''}
                                onChange={(event) => {
                                  const value = event.target.value as
                                    | 'excellent'
                                    | 'good'
                                    | 'participated'
                                    | '';
                                  setAchievements((prev) => ({
                                    ...prev,
                                    [student.user_id]: value || null,
                                  }));
                                }}
                                disabled={!isSelected}
                                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                              >
                                <option value="">Chua danh gia</option>
                                <option value="excellent">Xuat sac</option>
                                <option value="good">Tot</option>
                                <option value="participated">Tham gia</option>
                              </select>

                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                  isAttended
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isAttended ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Da co mat
                                  </>
                                ) : (
                                  'Chua diem danh'
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-slate-500">
                            Muc danh gia hien tai: {getAchievementLabel(achievements[student.user_id] || null)}
                          </div>
                        </div>
                      );
                    })}

                    {students.length === 0 ? (
                      <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                        Khong co hoc vien dang ky hoat dong nay.
                      </div>
                    ) : null}
                  </div>
                </div>

                {students.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || selectedStudents.length === 0}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    {submitting
                      ? 'Dang luu diem danh...'
                      : `Luu manual attendance (${selectedStudents.length})`}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

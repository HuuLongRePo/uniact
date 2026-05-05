'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Medal,
  NotebookPen,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatVietnamDateTime, formatVietnamWithOptions, parseVietnamDate } from '@/lib/timezone';

interface StudentProfile {
  id: number;
  name: string;
  email: string;
  class_name: string;
  major?: string;
  academic_year?: string;
  stats: {
    total_activities: number;
    attended_count: number;
    cancelled_count?: number;
    total_points: number;
    class_rank: number;
    awards_count: number;
  };
}

interface Activity {
  id: number;
  title: string;
  date_time: string;
  location?: string;
  activity_type?: string;
  org_level?: string;
  attendance_status: string;
  points: number;
}

interface Award {
  id: number;
  award_type: string;
  reason: string;
  awarded_date: string;
  awarded_by_name: string;
}

interface MonthStat {
  month: string;
  activity_count: number;
  attended_count: number;
  points_earned: number;
}

interface Note {
  id: number;
  content: string;
  created_at: string;
  created_by_name: string;
}

type TabId = 'overview' | 'attendance' | 'scores' | 'timeline' | 'notes';

const tabs: Array<{ id: TabId; label: string; icon: typeof Sparkles }> = [
  { id: 'overview', label: 'Tong quan', icon: Sparkles },
  { id: 'attendance', label: 'Diem danh', icon: CalendarDays },
  { id: 'scores', label: 'Diem so', icon: Trophy },
  { id: 'timeline', label: 'Timeline', icon: Medal },
  { id: 'notes', label: 'Ghi chu', icon: NotebookPen },
];

function statusBadge(status: string) {
  switch (status) {
    case 'attended':
      return { label: 'Co mat', className: 'bg-emerald-100 text-emerald-800' };
    case 'registered':
      return { label: 'Da dang ky', className: 'bg-cyan-100 text-cyan-800' };
    case 'absent':
      return { label: 'Vang', className: 'bg-rose-100 text-rose-800' };
    default:
      return { label: 'Khac', className: 'bg-slate-100 text-slate-700' };
  }
}

export default function StudentProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthStat[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'teacher'))) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchProfile();
    }
  }, [authLoading, id, user?.id, user?.role]);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (
      nextTab === 'overview' ||
      nextTab === 'attendance' ||
      nextTab === 'scores' ||
      nextTab === 'timeline' ||
      nextTab === 'notes'
    ) {
      setActiveTab(nextTab);
      return;
    }

    setActiveTab('overview');
  }, [searchParams]);

  async function fetchProfile() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`/api/students/${id}/profile`);
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai ho so hoc vien');
      }

      const raw = payload?.data ?? payload;
      const nextStudent = raw?.student || null;
      if (!nextStudent) {
        throw new Error('Khong tim thay ho so hoc vien');
      }

      setStudent(nextStudent);
      setActivities(Array.isArray(raw?.activities) ? raw.activities : []);
      setAwards(Array.isArray(raw?.awards) ? raw.awards : []);
      setMonthlyStats(Array.isArray(raw?.monthlyStats) ? raw.monthlyStats : []);
      setNotes(Array.isArray(raw?.notes) ? raw.notes : []);
    } catch (fetchError) {
      console.error('Teacher student profile fetch error:', fetchError);
      setStudent(null);
      setActivities([]);
      setAwards([]);
      setMonthlyStats([]);
      setNotes([]);
      const message =
        fetchError instanceof Error ? fetchError.message : 'Khong the tai ho so hoc vien';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;

    try {
      setSavingNote(true);

      const res = await fetch(`/api/students/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the them ghi chu');
      }

      setNewNote('');
      await fetchProfile();
    } catch (noteError) {
      console.error('Add note error:', noteError);
      toast.error(noteError instanceof Error ? noteError.message : 'Khong the them ghi chu');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId: number) {
    try {
      const res = await fetch(`/api/students/${id}/notes?noteId=${noteId}`, {
        method: 'DELETE',
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the xoa ghi chu');
      }

      await fetchProfile();
    } catch (noteError) {
      console.error('Delete note error:', noteError);
      toast.error(noteError instanceof Error ? noteError.message : 'Khong the xoa ghi chu');
    }
  }

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai ho so hoc vien..." />;
  }

  if (!student) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h1 className="text-2xl font-semibold">Ho so hoc vien tam thoi chua san sang</h1>
          <p className="mt-2 text-sm text-rose-800">
            {error || 'Khong the tai du lieu cho hoc vien nay.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100"
            >
              Quay lai
            </button>
            <button
              type="button"
              onClick={() => void fetchProfile()}
              className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Thu tai lai
            </button>
          </div>
        </div>
      </div>
    );
  }

  const attendanceRate =
    student.stats.total_activities > 0
      ? ((student.stats.attended_count / student.stats.total_activities) * 100).toFixed(1)
      : '0.0';
  const averageScore =
    student.stats.attended_count > 0
      ? (student.stats.total_points / student.stats.attended_count).toFixed(1)
      : '0.0';

  const timeline = [
    ...activities.map((activity) => ({
      id: `activity-${activity.id}`,
      date: activity.date_time,
      type: 'activity' as const,
      title: activity.title,
      subtitle: [activity.activity_type, activity.org_level].filter(Boolean).join(' • '),
      status: activity.attendance_status,
      points: activity.points,
    })),
    ...awards.map((award) => ({
      id: `award-${award.id}`,
      date: award.awarded_date,
      type: 'award' as const,
      title: award.award_type,
      subtitle: award.reason,
      awardedBy: award.awarded_by_name,
    })),
  ].sort(
    (left, right) =>
      (parseVietnamDate(right.date)?.getTime() ?? 0) - (parseVietnamDate(left.date)?.getTime() ?? 0)
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lai
        </button>

        <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-100 text-cyan-800">
              <UserRound className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-950">{student.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{student.email}</p>
              <p className="mt-2 text-sm text-slate-600">
                Lop {student.class_name || '-'}
                {student.major ? ` • ${student.major}` : ''}
                {student.academic_year ? ` • K${student.academic_year}` : ''}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-center xl:min-w-[180px]">
            <div className="text-sm text-slate-500">Xep hang trong lop</div>
            <div className="mt-2 text-4xl font-semibold text-cyan-700">#{student.stats.class_rank}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-cyan-800">Tong diem</div>
            <div className="mt-3 text-3xl font-semibold text-cyan-950">{student.stats.total_points}</div>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-800">Tong hoat dong</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-950">
              {student.stats.total_activities}
            </div>
          </div>
          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-800">Ty le diem danh</div>
            <div className="mt-3 text-3xl font-semibold text-violet-950">{attendanceRate}%</div>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-800">So lan duoc khen thuong</div>
            <div className="mt-3 text-3xl font-semibold text-amber-950">{student.stats.awards_count}</div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium whitespace-nowrap ${
                  active
                    ? 'bg-cyan-700 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === 'notes' ? ` (${notes.length})` : ''}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-cyan-700" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Tong quan 6 thang gan day</h2>
                  <p className="text-sm text-slate-500">
                    Nhin nhanh tan suat tham gia va diem tich luy theo thang.
                  </p>
                </div>
              </div>

              {monthlyStats.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  Chua co du lieu thong ke theo thang.
                </div>
              ) : (
                monthlyStats.map((item) => {
                  const rate =
                    item.activity_count > 0 ? (item.attended_count / item.activity_count) * 100 : 0;
                  return (
                    <div key={item.month} className="rounded-3xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-base font-semibold text-slate-900">{item.month}</div>
                        <div className="text-sm text-slate-500">
                          {item.activity_count} HD • {item.attended_count} diem danh • {item.points_earned} diem
                        </div>
                      </div>
                      <div className="mt-4 h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-cyan-600"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-cyan-700" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Lich su diem danh</h2>
                  <p className="text-sm text-slate-500">
                    Theo doi cac activity ma hoc vien da co mat, dang ky hoac vang.
                  </p>
                </div>
              </div>

              {activities.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  Chua co du lieu diem danh.
                </div>
              ) : (
                activities.map((activity) => {
                  const badge = statusBadge(activity.attendance_status);

                  return (
                    <div key={activity.id} className="rounded-3xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{activity.title}</div>
                          <div className="mt-1 text-sm text-slate-500">
                            {formatVietnamDateTime(activity.date_time)} • {activity.activity_type || 'Khac'}
                          </div>
                          {activity.location && (
                            <div className="mt-1 text-sm text-slate-500">{activity.location}</div>
                          )}
                        </div>
                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'scores' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-cyan-700" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Phan tich diem so</h2>
                  <p className="text-sm text-slate-500">
                    Xem tong diem, diem trung binh va cac activity dong gop nhieu diem nhat.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
                  <div className="text-sm font-medium text-cyan-800">Tong diem</div>
                  <div className="mt-3 text-3xl font-semibold text-cyan-950">{student.stats.total_points}</div>
                </div>
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                  <div className="text-sm font-medium text-emerald-800">Diem TB moi lan co mat</div>
                  <div className="mt-3 text-3xl font-semibold text-emerald-950">{averageScore}</div>
                </div>
                <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
                  <div className="text-sm font-medium text-violet-800">Xep hang trong lop</div>
                  <div className="mt-3 text-3xl font-semibold text-violet-950">#{student.stats.class_rank}</div>
                </div>
              </div>

              <div className="space-y-3">
                {activities.filter((activity) => Number(activity.points) > 0).length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                    Chua co diem tu activity nao.
                  </div>
                ) : (
                  activities
                    .filter((activity) => Number(activity.points) > 0)
                    .sort((left, right) => Number(right.points) - Number(left.points))
                    .map((activity) => (
                      <div key={activity.id} className="rounded-3xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-base font-semibold text-slate-900">{activity.title}</div>
                            <div className="mt-1 text-sm text-slate-500">
                              {formatVietnamDateTime(activity.date_time, 'date')}
                              {activity.org_level ? ` • ${activity.org_level}` : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-semibold text-cyan-700">+{activity.points}</div>
                            <div className="text-xs text-slate-500">diem</div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Medal className="h-5 w-5 text-cyan-700" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Timeline hoat dong</h2>
                  <p className="text-sm text-slate-500">
                    Gop activity va khen thuong de nhin duoc toan canh.
                  </p>
                </div>
              </div>

              {timeline.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  Chua co su kien nao trong timeline.
                </div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex gap-4">
                      <div
                        className={`mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
                          event.type === 'activity'
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {event.type === 'activity' ? (
                          <CalendarDays className="h-5 w-5" />
                        ) : (
                          <Trophy className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 rounded-3xl border border-slate-200 p-4">
                        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                          {formatVietnamWithOptions(event.date, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="mt-2 text-base font-semibold text-slate-900">{event.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{event.subtitle}</div>
                        {event.type === 'activity' ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                statusBadge(event.status).className
                              }`}
                            >
                              {statusBadge(event.status).label}
                            </span>
                            {event.points > 0 && (
                              <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
                                +{event.points} diem
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-slate-500">
                            Nguoi cap: {event.awardedBy || 'Khong ro'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-cyan-700" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Ghi chu noi bo</h2>
                  <p className="text-sm text-slate-500">
                    Luu y follow-up, canh bao va nhan xet teacher theo tung hoc vien.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-4">
                <label className="block text-sm font-medium text-slate-700">
                  Them ghi chu moi
                  <textarea
                    value={newNote}
                    onChange={(event) => setNewNote(event.target.value)}
                    placeholder="Nhap noi dung can luu y ve hoc vien..."
                    className="mt-2 h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleAddNote()}
                  disabled={savingNote || !newNote.trim()}
                  className="mt-4 rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingNote ? 'Dang luu...' : 'Them ghi chu'}
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  Chua co ghi chu nao.
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                            {note.content}
                          </div>
                          <div className="mt-3 text-xs text-slate-500">
                            {note.created_by_name} • {formatVietnamDateTime(note.created_at)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNoteToDelete(note)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Xoa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={noteToDelete !== null}
        title="Xoa ghi chu"
        message={
          noteToDelete
            ? `Ban co chac muon xoa ghi chu do "${noteToDelete.created_by_name}" tao?`
            : ''
        }
        confirmText="Xoa ghi chu"
        cancelText="Huy"
        variant="danger"
        onCancel={() => setNoteToDelete(null)}
        onConfirm={async () => {
          if (!noteToDelete) return;
          await handleDeleteNote(noteToDelete.id);
          setNoteToDelete(null);
        }}
      />
    </div>
  );
}

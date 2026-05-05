'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Activity, ArrowLeft, Award, ClipboardList, PencilLine, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

type StudentProfileResponse = {
  success?: boolean;
  data?: {
    student?: StudentRecord;
    activities?: ActivityRecord[];
    awards?: AwardRecord[];
    monthlyStats?: MonthlyRecord[];
    notes?: NoteRecord[];
  };
  error?: string;
};

type StudentRecord = {
  id: number;
  name: string;
  email: string;
  class_id: number | null;
  class_name: string | null;
  created_at: string;
  stats?: {
    total_activities: number;
    attended_count: number;
    total_points: number;
    class_rank: number;
    awards_count: number;
  };
};

type ActivityRecord = {
  id: number;
  title: string;
  date_time: string;
  location: string | null;
  activity_type: string | null;
  org_level: string | null;
  attendance_status: string | null;
  points: number | null;
  bonus_points: number | null;
  penalty_points: number | null;
};

type AwardRecord = {
  id: number;
  award_type: string | null;
  reason: string | null;
  awarded_date: string | null;
  awarded_by_name: string | null;
};

type MonthlyRecord = {
  month: string;
  activity_count: number;
  attended_count: number;
  points_earned: number;
};

type NoteRecord = {
  id: number;
  content: string;
  created_at: string;
  created_by_name: string | null;
};

function parseStudentProfilePayload(payload: StudentProfileResponse) {
  const data = payload?.data || {};

  return {
    student: data.student || null,
    activities: Array.isArray(data.activities) ? data.activities : [],
    awards: Array.isArray(data.awards) ? data.awards : [],
    monthlyStats: Array.isArray(data.monthlyStats) ? data.monthlyStats : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
  };
}

function scoreForActivity(activity: ActivityRecord) {
  return Number(activity.points || 0) + Number(activity.bonus_points || 0) - Number(activity.penalty_points || 0);
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose';
}) {
  const toneMap: Record<typeof tone, string> = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    violet: 'border-violet-200 bg-violet-50 text-violet-950',
    rose: 'border-rose-200 bg-rose-50 text-rose-950',
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneMap[tone]}`}>
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-slate-800">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold">{value}</div>
    </div>
  );
}

export default function AdminStudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const studentId = useMemo(() => {
    const parsed = Number.parseInt(params.id || '', 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [params.id]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<ReturnType<typeof parseStudentProfilePayload> | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user?.id, user?.role]);

  const fetchProfile = useCallback(async () => {
    if (!studentId) return;

    try {
      setIsLoading(true);
      setLoadError(null);

      const res = await fetch(`/api/students/${studentId}/profile`);
      const payload = (await res.json().catch(() => null)) as StudentProfileResponse | null;

      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || 'Khong the tai ho so hoc vien');
      }

      setData(parseStudentProfilePayload(payload));
    } catch (error) {
      console.error('Fetch student profile error:', error);
      const message = error instanceof Error ? error.message : 'Khong the tai ho so hoc vien';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    if (!studentId) {
      toast.error('ID hoc vien khong hop le');
      router.push('/admin/users?tab=student');
      return;
    }

    void fetchProfile();
  }, [fetchProfile, router, studentId, user?.id, user?.role]);

  if (authLoading || isLoading) {
    return <LoadingSpinner message="Dang tai ho so hoc vien..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!data?.student) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-2xl font-semibold text-slate-950">Khong tim thay hoc vien</div>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          {loadError || 'Ho so hoc vien nay khong ton tai hoac khong con du lieu chi tiet.'}
        </p>
        <Link
          href="/admin/users?tab=student"
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lai hoc vien
        </Link>
      </div>
    );
  }

  const student = data.student;
  const stats = student.stats;
  const activities = data.activities;
  const awards = data.awards;
  const monthlyStats = data.monthlyStats;
  const notes = data.notes;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/admin/users?tab=student"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lai danh sach hoc vien
            </Link>
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Student profile
            </p>
            <h1 data-testid="admin-student-detail-heading" className="mt-3 text-3xl font-semibold text-slate-950">
              {student.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Theo doi hoat dong, diem tich luy, khen thuong va ghi chu van hanh cua hoc vien.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push(`/admin/users/${student.id}`)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Users className="h-4 w-4" />
              Mo tai khoan
            </button>
            <button
              type="button"
              onClick={() => router.push(`/admin/scores/${student.id}/adjust`)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
            >
              <PencilLine className="h-4 w-4" />
              Dieu chinh diem
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Tong hoat dong" value={String(stats?.total_activities || 0)} icon={<Activity className="h-5 w-5" />} tone="cyan" />
          <MetricCard label="Da co mat" value={String(stats?.attended_count || 0)} icon={<ClipboardList className="h-5 w-5" />} tone="emerald" />
          <MetricCard label="Tong diem" value={String(stats?.total_points || 0)} icon={<Award className="h-5 w-5" />} tone="amber" />
          <MetricCard label="Hang trong lop" value={stats?.class_rank ? `#${stats.class_rank}` : '-'} icon={<Users className="h-5 w-5" />} tone="violet" />
          <MetricCard label="So award" value={String(stats?.awards_count || 0)} icon={<Award className="h-5 w-5" />} tone="rose" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Thong tin hoc vien</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoRow label="Ho va ten" value={student.name} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Lop hoc" value={student.class_name || '-'} />
              <InfoRow
                label="Ngay tao tai khoan"
                value={student.created_at ? formatVietnamDateTime(student.created_at, 'date') : '-'}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Lich su tham gia hoat dong</h2>
            {activities.length === 0 ? (
              <EmptyPanel message="Chua co lich su hoat dong de hien thi." />
            ) : (
              <>
                <div className="mt-5 grid gap-4 lg:hidden">
                  {activities.map((activity) => (
                    <article key={activity.id} className="rounded-3xl border border-slate-200 p-4">
                      <div className="text-base font-semibold text-slate-950">{activity.title}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {activity.date_time ? formatVietnamDateTime(activity.date_time) : '-'}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activity.activity_type && (
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                            {activity.activity_type}
                          </span>
                        )}
                        {activity.org_level && (
                          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
                            {activity.org_level}
                          </span>
                        )}
                        {activity.attendance_status && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {activity.attendance_status}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 text-sm text-slate-600">{activity.location || 'Khong co dia diem'}</div>
                      <div className="mt-4 text-sm font-semibold text-cyan-800">
                        Tong diem: {scoreForActivity(activity)}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-5 hidden overflow-x-auto lg:block">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Hoat dong</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Thoi gian</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Trang thai</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Tong diem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {activities.map((activity) => (
                        <tr key={activity.id}>
                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-950">{activity.title}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {[activity.activity_type, activity.org_level].filter(Boolean).join(' - ') || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {activity.date_time ? formatVietnamDateTime(activity.date_time) : '-'}
                          </td>
                          <td className="px-4 py-4 text-slate-600">{activity.attendance_status || '-'}</td>
                          <td className="px-4 py-4 text-right font-semibold text-cyan-800">
                            {scoreForActivity(activity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Khen thuong</h2>
            {awards.length === 0 ? (
              <EmptyPanel message="Chua co khen thuong duoc ghi nhan." />
            ) : (
              <div className="mt-5 space-y-3">
                {awards.map((award) => (
                  <article key={award.id} className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <div className="font-medium text-slate-950">{award.award_type || 'Ban ghi khen thuong'}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">{award.reason || 'Khong co ly do bo sung.'}</div>
                    <div className="mt-3 text-xs text-slate-500">
                      {award.awarded_date ? formatVietnamDateTime(award.awarded_date, 'date') : '-'}
                      {award.awarded_by_name ? ` - ${award.awarded_by_name}` : ''}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Thong ke 6 thang</h2>
            {monthlyStats.length === 0 ? (
              <EmptyPanel message="Chua co thong ke gan day." />
            ) : (
              <div className="mt-5 space-y-3">
                {monthlyStats.map((item) => (
                  <article key={item.month} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-950">{item.month}</div>
                      <div className="text-sm font-semibold text-cyan-800">{item.points_earned} diem</div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <MiniMetric label="Hoat dong" value={String(item.activity_count)} />
                      <MiniMetric label="Co mat" value={String(item.attended_count)} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Ghi chu noi bo</h2>
            {notes.length === 0 ? (
              <EmptyPanel message="Chua co ghi chu noi bo nao." />
            ) : (
              <div className="mt-5 space-y-3">
                {notes.map((note) => (
                  <article key={note.id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="text-sm leading-6 text-slate-700">{note.content}</div>
                    <div className="mt-3 text-xs text-slate-500">
                      {formatVietnamDateTime(note.created_at)}
                      {note.created_by_name ? ` - ${note.created_by_name}` : ''}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-500">
      {message}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-950">{value}</div>
    </div>
  );
}

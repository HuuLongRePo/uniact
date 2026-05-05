'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  LineChart,
  QrCode,
  RefreshCcw,
  School,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatDate } from '@/lib/formatters';

interface Summary {
  total_activities: number;
  pending_activities: number;
  published_activities: number;
  total_participants: number;
  total_attended: number;
}

interface DashboardData {
  summary: Summary;
  activitiesByMonth: Array<{ month: string; count: number; participants: number }>;
  activitiesByType: Array<{
    type_name: string;
    type_color: string;
    count: number;
    avg_participants: number;
  }>;
  participationByClass: Array<{
    class_name: string;
    total_students: number;
    active_students: number;
    participation_rate: number;
  }>;
  recentActivities: Array<{
    id: number;
    title: string;
    date_time: string;
    status: string;
    participant_count: number;
    attended_count: number;
  }>;
  topStudents: Array<{
    student_id: number;
    student_name: string;
    class_name: string;
    total_points: number;
    activities_count: number;
  }>;
}

const quickLinks = [
  {
    href: '/teacher/activities',
    label: 'Hoat dong',
    description: 'Tao, sua va theo doi tien do duyet.',
    icon: CalendarClock,
  },
  {
    href: '/teacher/attendance',
    label: 'Diem danh',
    description: 'Mo nhanh QR, face va manual fallback.',
    icon: CheckCircle2,
  },
  {
    href: '/teacher/classes',
    label: 'Lop hoc',
    description: 'Xem roster, xuat CSV va cap nhat hoc vien.',
    icon: School,
  },
  {
    href: '/teacher/notifications/broadcast',
    label: 'Thong bao',
    description: 'Gui broadcast va kiem tra lich su gui.',
    icon: Bell,
  },
];

function normalizeDashboardPayload(payload: any): DashboardData | null {
  const raw = payload?.data ?? payload;
  if (!raw?.summary) return null;

  return {
    summary: {
      total_activities: Number(raw.summary.total_activities ?? 0),
      pending_activities: Number(raw.summary.pending_activities ?? 0),
      published_activities: Number(raw.summary.published_activities ?? 0),
      total_participants: Number(raw.summary.total_participants ?? 0),
      total_attended: Number(raw.summary.total_attended ?? 0),
    },
    activitiesByMonth: Array.isArray(raw.activitiesByMonth) ? raw.activitiesByMonth : [],
    activitiesByType: Array.isArray(raw.activitiesByType) ? raw.activitiesByType : [],
    participationByClass: Array.isArray(raw.participationByClass) ? raw.participationByClass : [],
    recentActivities: Array.isArray(raw.recentActivities) ? raw.recentActivities : [],
    topStudents: Array.isArray(raw.topStudents) ? raw.topStudents : [],
  };
}

function statusMeta(status: string) {
  switch (status) {
    case 'published':
      return {
        label: 'Da phat hanh',
        className: 'bg-emerald-100 text-emerald-800',
      };
    case 'pending':
      return {
        label: 'Dang cho duyet',
        className: 'bg-amber-100 text-amber-800',
      };
    case 'completed':
      return {
        label: 'Da ket thuc',
        className: 'bg-slate-100 text-slate-700',
      };
    default:
      return {
        label: 'Nhap',
        className: 'bg-slate-100 text-slate-700',
      };
  }
}

function StatCard({
  title,
  value,
  accent,
  testId,
}: {
  title: string;
  value: number;
  accent: string;
  testId?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-testid={testId}>
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className={`mt-3 text-3xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchDashboard();
    }
  }, [authLoading, user?.id, user?.role]);

  async function fetchDashboard() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/teacher/dashboard-stats');
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai tong quan teacher');
      }

      const normalized = normalizeDashboardPayload(payload);
      if (!normalized) {
        throw new Error('Khong doc duoc du lieu tong quan teacher');
      }

      setData(normalized);
    } catch (fetchError) {
      console.error('Teacher dashboard fetch error:', fetchError);
      setData(null);
      setError(
        fetchError instanceof Error ? fetchError.message : 'Khong the tai tong quan teacher'
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai tong quan teacher..." />;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <h1 className="text-2xl font-semibold">Tong quan teacher tam thoi chua san sang</h1>
          <p className="mt-2 text-sm text-rose-800">
            {error || 'Khong co du lieu de hien thi. Thu tai lai sau.'}
          </p>
          <button
            type="button"
            onClick={() => void fetchDashboard()}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            <RefreshCcw className="h-4 w-4" />
            Tai lai
          </button>
        </div>
      </div>
    );
  }

  const maxMonth = Math.max(...data.activitiesByMonth.map((item) => item.count), 1);
  const maxType = Math.max(...data.activitiesByType.map((item) => item.count), 1);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Teacher daily ops
            </p>
            <h1
              className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl"
              data-testid="dashboard-heading"
            >
              Tong quan teacher
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Tap trung vao nhung viec can xu ly ngay: hoat dong dang cho duyet, diem danh, roster
              lop va hoc vien can theo doi.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchDashboard()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Lam moi
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-300 hover:bg-cyan-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-cyan-700" />
                </div>
                <div className="mt-4 text-base font-semibold text-slate-900">{item.label}</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Tong hoat dong"
          value={data.summary.total_activities}
          accent="text-slate-950"
          testId="stat-total-activities"
        />
        <StatCard
          title="Dang cho duyet"
          value={data.summary.pending_activities}
          accent="text-amber-600"
          testId="stat-pending-activities"
        />
        <StatCard
          title="Da phat hanh"
          value={data.summary.published_activities}
          accent="text-emerald-600"
          testId="stat-published-activities"
        />
        <StatCard
          title="Luot dang ky"
          value={data.summary.total_participants}
          accent="text-cyan-600"
          testId="stat-total-participants"
        />
        <StatCard
          title="Da diem danh"
          value={data.summary.total_attended}
          accent="text-violet-600"
        />
      </section>

      <section
        className="rounded-[2rem] border border-cyan-200 bg-cyan-50 p-6 shadow-sm"
        data-testid="attendance-policy-cta"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              <ShieldCheck className="h-4 w-4" />
              Attendance control
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">
              Dieu phoi diem danh theo policy
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Xem activity nao nen uu tien QR, activity nao du dieu kien face attendance, va khi
              nao can fallback sang manual de tranh tac nghen tai lop.
            </p>
          </div>
          <Link
            href="/teacher/attendance/policy"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
          >
            <ClipboardList className="h-4 w-4" />
            Mo attendance policy
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <LineChart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Nhip hoat dong gan day</h2>
              <p className="text-sm text-slate-500">Theo thang va theo loai hoat dong.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">Theo thang</div>
              <div className="mt-4 space-y-4">
                {data.activitiesByMonth.length === 0 && (
                  <p className="text-sm text-slate-500">Chua co du lieu theo thang.</p>
                )}
                {data.activitiesByMonth.map((item) => (
                  <div key={item.month}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">{item.month}</span>
                      <span className="text-slate-500">
                        {item.count} hoat dong • {item.participants} dang ky
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-cyan-600"
                        style={{ width: `${(item.count / maxMonth) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">Theo loai hoat dong</div>
              <div className="mt-4 space-y-4">
                {data.activitiesByType.length === 0 && (
                  <p className="text-sm text-slate-500">Chua co du lieu theo loai.</p>
                )}
                {data.activitiesByType.map((item) => (
                  <div key={item.type_name}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">{item.type_name}</span>
                      <span className="text-slate-500">
                        {item.count} • TB {item.avg_participants.toFixed(1)} SV
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(item.count / maxType) * 100}%`,
                          backgroundColor: item.type_color || '#0891b2',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Phu song theo lop</h2>
              <p className="text-sm text-slate-500">
                Lop nao dang tham gia tot, lop nao can goi nhac.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {data.participationByClass.length === 0 && (
              <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Chua co du lieu lop de phan tich.
              </p>
            )}
            {data.participationByClass.map((item) => (
              <div key={item.class_name} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{item.class_name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {item.active_students}/{item.total_students} hoc vien dang tham gia
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {item.participation_rate.toFixed(1)}%
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${item.participation_rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Hoat dong can xu ly gan</h2>
              <p className="text-sm text-slate-500">Mo thang activity de vao QR, roster va file.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {data.recentActivities.length === 0 && (
              <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Chua co hoat dong gan day.
              </p>
            )}
            {data.recentActivities.map((activity) => {
              const meta = statusMeta(activity.status);

              return (
                <Link
                  key={activity.id}
                  href={`/teacher/activities/${activity.id}`}
                  className="block rounded-3xl border border-slate-200 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/40"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{activity.title}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {formatDate(activity.date_time, 'date')}
                      </div>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      Dang ky: <span className="font-semibold">{activity.participant_count}</span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      Diem danh: <span className="font-semibold">{activity.attended_count}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Hoc vien noi bat</h2>
              <p className="text-sm text-slate-500">
                Nhom hoc vien dang co tong diem va tan suat tham gia tot.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {data.topStudents.length === 0 && (
              <p className="rounded-3xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Chua co du lieu hoc vien noi bat.
              </p>
            )}
            {data.topStudents.map((student, index) => (
              <div
                key={student.student_id}
                className="flex items-center gap-4 rounded-3xl border border-slate-200 p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-base font-semibold text-amber-800">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-slate-900">
                    {student.student_name}
                  </div>
                  <div className="text-sm text-slate-500">{student.class_name}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-emerald-600">
                    {student.total_points} diem
                  </div>
                  <div className="text-sm text-slate-500">{student.activities_count} HD</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

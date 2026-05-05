'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminStats, useReportData } from '@/lib/domain-hooks';

export interface ActivityMonth {
  month: string;
  total: number;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  total_points: number;
}

export interface ClassParticipation {
  id: number;
  name: string;
  activities_participated: number;
  distinct_students: number;
}

export interface PopularActivity {
  id: number;
  title: string;
  participant_count: number;
}

interface HealthData {
  database: {
    size_mb: string;
    table_count: number;
  };
  activities: {
    draft: number;
    published: number;
    completed: number;
    cancelled: number;
    new_24h: number;
  };
  participations: {
    total: number;
    registered: number;
    attended: number;
    absent: number;
    new_24h: number;
  };
  attendance?: {
    total: number;
    attended: number;
    absent: number;
    new_24h: number;
    rate: number;
  };
  users: {
    new_24h: number;
  };
  system: {
    uptime_hours: number;
    node_version: string;
    memory: {
      heap_used_mb: string;
      heap_total_mb: string;
    };
  };
  top_activities?: PopularActivity[];
}

interface DashboardReportData {
  stats: {
    total_students: number;
    total_activities: number;
  };
  activities_by_month?: ActivityMonth[];
  top_students?: Student[];
  participation_by_class?: ClassParticipation[];
  popular_activities?: PopularActivity[];
}

interface AttendancePolicyOverview {
  version: string;
  selectionMode: string;
  qrFallbackPreset: string;
  configuredPilotActivities: number;
  eligiblePilotActivities: number;
  totalScannedActivities: number;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'cyan' | 'emerald' | 'amber' | 'violet';
}) {
  const toneClass = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    violet: 'border-violet-200 bg-violet-50 text-violet-950',
  }[tone];

  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      <div className="mt-2 text-sm opacity-80">{hint}</div>
    </article>
  );
}

function ProgressList({
  items,
  emptyText,
  unitLabel,
  tone,
}: {
  items: Array<{ id: string | number; label: string; value: number; helper?: string }>;
  emptyText: string;
  unitLabel: string;
  tone: 'cyan' | 'emerald' | 'violet' | 'amber';
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const barClass = {
    cyan: 'bg-cyan-600',
    emerald: 'bg-emerald-600',
    violet: 'bg-violet-600',
    amber: 'bg-amber-500',
  }[tone];

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-900">{item.label}</div>
              {item.helper ? <div className="mt-1 text-slate-500">{item.helper}</div> : null}
            </div>
            <div className="shrink-0 font-semibold text-slate-900">
              {formatCompactNumber(item.value)} {unitLabel}
            </div>
          </div>
          <div className="mt-3 h-3 rounded-full bg-white">
            <div
              className={`h-full rounded-full ${barClass}`}
              style={{ width: `${Math.max((item.value / maxValue) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [attendancePolicyOverview, setAttendancePolicyOverview] =
    useState<AttendancePolicyOverview | null>(null);

  const { data, loading: statsLoading, refetch: refetchStats } = useAdminStats();
  const {
    data: dashboardData,
    loading: dashLoading,
    refetch: refetchDash,
  } = useReportData('dashboard');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    let cancelled = false;

    const loadAttendancePolicyOverview = async () => {
      try {
        const [configRes, activitiesRes] = await Promise.all([
          fetch('/api/system-config?category=attendance'),
          fetch('/api/teacher/attendance/pilot-activities'),
        ]);

        if (!configRes.ok || !activitiesRes.ok) {
          return;
        }

        const configBody = await configRes.json();
        const configRows = configBody?.configs || configBody?.data?.configs || [];
        const configMap = new Map<string, string>(
          configRows.map((row: any) => [
            String(row?.config_key || ''),
            String(row?.config_value || ''),
          ])
        );

        let configuredPilotActivities = 0;
        try {
          const selectedIds = JSON.parse(
            configMap.get('attendance_face_pilot_activity_ids') || '[]'
          );
          if (Array.isArray(selectedIds)) {
            configuredPilotActivities = selectedIds.filter((id) =>
              Number.isInteger(Number(id))
            ).length;
          }
        } catch {
          configuredPilotActivities = 0;
        }

        const activitiesBody = await activitiesRes.json();
        const activities = activitiesBody?.data?.activities || activitiesBody?.activities || [];
        const eligiblePilotActivities = activities.filter(
          (item: any) => item?.policy_summary?.eligible
        ).length;

        if (!cancelled) {
          setAttendancePolicyOverview({
            version: configMap.get('attendance_policy_version') || 'pilot-v1',
            selectionMode:
              configMap.get('attendance_face_pilot_selection_mode') || 'selected_or_heuristic',
            qrFallbackPreset: configMap.get('attendance_qr_fallback_preset') || 'pilot-default',
            configuredPilotActivities,
            eligiblePilotActivities,
            totalScannedActivities: activities.length,
          });
        }
      } catch (error) {
        console.error('Load attendance policy overview error:', error);
      }
    };

    void loadAttendancePolicyOverview();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const loading = authLoading || statsLoading || dashLoading;
  const healthData = data as HealthData | null;
  const reportData = dashboardData as DashboardReportData | null;

  const attendanceTotal = toNumber(
    healthData?.attendance?.total ?? healthData?.participations?.total ?? 0
  );
  const attendedCount = toNumber(
    healthData?.attendance?.attended ?? healthData?.participations?.attended ?? 0
  );
  const attendanceRate =
    attendanceTotal > 0
      ? toNumber(
          healthData?.attendance?.rate ??
            Math.round((attendedCount / Math.max(attendanceTotal, 1)) * 100)
        )
      : 0;

  const participationBreakdown = [
    {
      id: 'attended',
      label: 'Da tham gia',
      value: toNumber(healthData?.participations?.attended || 0),
      helper: 'Hoc vien da check-in thanh cong',
    },
    {
      id: 'registered',
      label: 'Da dang ky',
      value: toNumber(healthData?.participations?.registered || 0),
      helper: 'Cho den buoc co mat',
    },
    {
      id: 'absent',
      label: 'Vang mat',
      value: toNumber(healthData?.participations?.absent || 0),
      helper: 'Can doi soat de cong tru hoac nhac nho',
    },
  ];

  const activityStatusData = [
    { id: 'draft', label: 'Ban nhap', value: toNumber(healthData?.activities?.draft || 0) },
    {
      id: 'published',
      label: 'Dang mo',
      value: toNumber(healthData?.activities?.published || 0),
    },
    {
      id: 'completed',
      label: 'Da hoan tat',
      value: toNumber(healthData?.activities?.completed || 0),
    },
    {
      id: 'cancelled',
      label: 'Da huy',
      value: toNumber(healthData?.activities?.cancelled || 0),
    },
  ];

  const quickActions = [
    {
      href: '/admin/activities',
      title: 'Quan ly hoat dong',
      desc: 'Theo doi workflow hoat dong va xu ly cac ban ghi sap den han.',
    },
    {
      href: '/admin/approvals',
      title: 'Phe duyet',
      desc: 'Mo nhanh hang doi phe duyet de giai phong nghen van hanh.',
    },
    {
      href: '/admin/attendance',
      title: 'Doi soat diem danh',
      desc: 'Kiem tra ban ghi QR, khuon mat va can thiep thu cong neu can.',
    },
    {
      href: '/admin/reports',
      title: 'Bao cao',
      desc: 'Tong hop report, thong ke va du lieu phuc vu quyet dinh.',
    },
  ];

  const topStudentRows = reportData?.top_students || [];
  const monthlyActivities = reportData?.activities_by_month || [];
  const participationByClass = reportData?.participation_by_class || [];
  const popularActivities = reportData?.popular_activities || healthData?.top_activities || [];

  const systemSummary = useMemo(
    () => [
      {
        label: 'Dung luong CSDL',
        value: `${healthData?.database?.size_mb || '0'} MB`,
        hint: `${formatCompactNumber(toNumber(healthData?.database?.table_count || 0))} bang du lieu`,
        tone: 'cyan' as const,
      },
      {
        label: 'Thoi gian van hanh',
        value: `${toNumber(healthData?.system?.uptime_hours || 0).toFixed(1)}h`,
        hint: `Node ${healthData?.system?.node_version || 'unknown'}`,
        tone: 'emerald' as const,
      },
      {
        label: 'Bo nho dang dung',
        value: `${healthData?.system?.memory?.heap_used_mb || '0'} MB`,
        hint: `Tren tong ${healthData?.system?.memory?.heap_total_mb || '0'} MB heap`,
        tone: 'violet' as const,
      },
      {
        label: 'Ti le diem danh',
        value: `${attendanceRate}%`,
        hint: `${formatCompactNumber(attendedCount)}/${formatCompactNumber(attendanceTotal)} ban ghi`,
        tone: 'amber' as const,
      },
    ],
    [attendanceRate, attendanceTotal, attendedCount, healthData]
  );

  if (loading) {
    return <ActivitySkeleton count={5} />;
  }

  if (!healthData && !reportData) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="Khong tim thay du lieu tong quan"
          message="He thong chua tra ve du lieu dashboard de admin ra quyet dinh."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Admin operations
            </p>
            <h1 data-testid="dashboard-heading" className="mt-3 text-3xl font-semibold text-slate-950">
              Tong quan admin
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Dashboard nay tong hop suc khoe he thong, nhiet do van hanh va cac nhanh dieu
              huong can can thi truoc trong ngay.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                refetchStats();
                refetchDash();
              }}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tai lai dashboard
            </button>
            <Link
              href="/admin/system-config/attendance-policy"
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              Mo chinh sach diem danh
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {systemSummary.map((item) => (
            <MetricCard
              key={item.label}
              label={item.label}
              value={item.value}
              hint={item.hint}
              tone={item.tone}
            />
          ))}
        </div>
      </section>

      {attendancePolicyOverview ? (
        <section
          className="rounded-[2rem] border border-cyan-200 bg-cyan-50 p-6 shadow-sm"
          data-testid="admin-attendance-policy-overview"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
                Attendance policy rollout
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-cyan-950">
                Nhanh tinh hinh QR fallback va face pilot
              </h2>
              <p className="mt-2 text-sm leading-6 text-cyan-900">
                Theo doi preset dang ap dung, so hoat dong da dua vao pilot va muc do bao phu
                cua danh sach co the bat nhan dien khuon mat.
              </p>
            </div>
            <Link
              href="/admin/system-config/attendance-policy"
              className="inline-flex items-center justify-center rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              Vao trang chinh sach
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Policy version"
              value={attendancePolicyOverview.version}
              hint={`Selection mode: ${attendancePolicyOverview.selectionMode}`}
              tone="cyan"
            />
            <MetricCard
              label="QR fallback preset"
              value={attendancePolicyOverview.qrFallbackPreset}
              hint="Dung cho cac tinh huong fallback khi QR/face can bo sung"
              tone="emerald"
            />
            <MetricCard
              label="Pilot da cau hinh"
              value={formatCompactNumber(attendancePolicyOverview.configuredPilotActivities)}
              hint="So hoat dong da duoc chon vao face pilot"
              tone="violet"
            />
            <MetricCard
              label="Eligible / scanned"
              value={`${attendancePolicyOverview.eligiblePilotActivities}/${attendancePolicyOverview.totalScannedActivities}`}
              hint="Phan tram bao phu cua tap hoat dong duoc quet"
              tone="amber"
            />
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Nghiep vu can xu ly nhanh</h2>
              <p className="mt-1 text-sm text-slate-500">
                Cac cua vao chinh de admin thao tac hang ngay.
              </p>
            </div>
            <Link
              href="/admin/settings"
              className="text-sm font-medium text-cyan-700 hover:text-cyan-800"
            >
              Cai dat he thong
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {quickActions.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-cyan-200 hover:bg-cyan-50"
              >
                <div className="text-base font-semibold text-slate-950">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Nhiet do 24 gio qua</h2>
          <p className="mt-1 text-sm text-slate-500">
            Nhan nhanh luong thay doi moi de biet khu nao dang tang tai.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Nguoi dung moi"
              value={formatCompactNumber(toNumber(healthData?.users?.new_24h || 0))}
              hint="Tai khoan moi trong 24 gio qua"
              tone="cyan"
            />
            <MetricCard
              label="Hoat dong moi"
              value={formatCompactNumber(toNumber(healthData?.activities?.new_24h || 0))}
              hint="Hoat dong vua duoc tao gan day"
              tone="emerald"
            />
            <MetricCard
              label="Dang ky moi"
              value={formatCompactNumber(toNumber(healthData?.participations?.new_24h || 0))}
              hint="Luot dang ky phat sinh"
              tone="violet"
            />
            <MetricCard
              label="Diem danh moi"
              value={formatCompactNumber(toNumber(healthData?.attendance?.new_24h || 0))}
              hint="Ban ghi diem danh phat sinh"
              tone="amber"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Trang thai tham gia</h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo doi can doi giua dang ky, tham gia that va vang mat.
          </p>
          <div className="mt-5">
            <ProgressList
              items={participationBreakdown.map((item) => ({
                id: item.id,
                label: item.label,
                value: item.value,
                helper: item.helper,
              }))}
              emptyText="Chua co du lieu tham gia."
              unitLabel="luot"
              tone="emerald"
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Trang thai hoat dong</h2>
          <p className="mt-1 text-sm text-slate-500">
            Giup admin nhin ro khoi luong hoat dong dang mo va backlog can dong.
          </p>
          <div className="mt-5">
            <ProgressList
              items={activityStatusData.map((item) => ({
                id: item.id,
                label: item.label,
                value: item.value,
              }))}
              emptyText="Chua co du lieu trang thai hoat dong."
              unitLabel="hoat dong"
              tone="cyan"
            />
          </div>
        </div>
      </section>

      {reportData ? (
        <>
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Snapshot bao cao</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tong hop nhanh cac chi so can xem truoc khi mo report chi tiet.
                </p>
              </div>
              <Link
                href="/admin/reports"
                className="text-sm font-medium text-cyan-700 hover:text-cyan-800"
              >
                Mo trung tam bao cao
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Tong hoc vien"
                value={formatCompactNumber(toNumber(reportData.stats?.total_students || 0))}
                hint="Hoc vien hien co trong he thong"
                tone="cyan"
              />
              <MetricCard
                label="Hoat dong da cong bo"
                value={formatCompactNumber(toNumber(reportData.stats?.total_activities || 0))}
                hint="Hoat dong published hoac completed"
                tone="emerald"
              />
              <MetricCard
                label="Diem cao nhat"
                value={formatCompactNumber(toNumber(reportData.top_students?.[0]?.total_points || 0))}
                hint={reportData.top_students?.[0]?.name || 'Chua co hoc vien dan dau'}
                tone="violet"
              />
              <MetricCard
                label="Hoat dong hot nhat"
                value={formatCompactNumber(
                  toNumber(reportData.popular_activities?.[0]?.participant_count || 0)
                )}
                hint={reportData.popular_activities?.[0]?.title || 'Chua co hoat dong noi bat'}
                tone="amber"
              />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Hoat dong theo thang</h2>
              <p className="mt-1 text-sm text-slate-500">
                Nhin xu huong van hanh trong cac thang gan day.
              </p>
              <div className="mt-5">
                <ProgressList
                  items={monthlyActivities.map((item) => ({
                    id: item.month,
                    label: item.month,
                    value: toNumber(item.total),
                  }))}
                  emptyText="Chua co du lieu hoat dong theo thang."
                  unitLabel="hoat dong"
                  tone="cyan"
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Lop dang tham gia manh</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ra quyet dinh nhac lop yeu va nhan dien lop dang duy tri tot.
              </p>
              <div className="mt-5">
                <ProgressList
                  items={participationByClass.map((item) => ({
                    id: item.id,
                    label: item.name,
                    value: toNumber(item.activities_participated),
                    helper: `${formatCompactNumber(toNumber(item.distinct_students))} hoc vien da tham gia`,
                  }))}
                  emptyText="Chua co du lieu theo lop."
                  unitLabel="HD"
                  tone="emerald"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Hoat dong duoc quan tam nhieu</h2>
              <p className="mt-1 text-sm text-slate-500">
                Danh sach nay giup uu tien close-out va nhan dien chu de hot.
              </p>
              <div className="mt-5">
                <ProgressList
                  items={popularActivities.map((item) => ({
                    id: item.id,
                    label: item.title,
                    value: toNumber(item.participant_count),
                  }))}
                  emptyText="Chua co du lieu hoat dong noi bat."
                  unitLabel="nguoi"
                  tone="violet"
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Top hoc vien theo diem</h2>
              <p className="mt-1 text-sm text-slate-500">
                Theo doi nhom hoc vien dan dau de doi soat scoreboard va khen thuong.
              </p>

              {topStudentRows.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Chua co du lieu hoc vien dan dau.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {topStudentRows.map((student, index) => (
                    <article
                      key={student.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-500">Hang #{index + 1}</div>
                          <div className="mt-1 truncate text-base font-semibold text-slate-950">
                            {student.name}
                          </div>
                          <div className="mt-1 truncate text-sm text-slate-500">{student.email}</div>
                        </div>
                        <div className="shrink-0 rounded-2xl bg-violet-100 px-3 py-2 text-right">
                          <div className="text-xs font-medium uppercase tracking-wide text-violet-700">
                            Tong diem
                          </div>
                          <div className="mt-1 text-lg font-semibold text-violet-950">
                            {formatCompactNumber(toNumber(student.total_points))}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

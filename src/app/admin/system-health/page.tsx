'use client';

import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  HardDrive,
  RefreshCw,
  ScanFace,
  Server,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatVietnamDateTime } from '@/lib/timezone';

interface HealthData {
  biometric_readiness?: {
    runtime_enabled: boolean;
    runtime_mode?: string;
    model_loading_ready?: boolean;
    model_loading_status?: string;
    embedding_detection_ready?: boolean;
    liveness_check_ready?: boolean;
    liveness_status?: string;
    face_matching_engine?: string;
    face_liveness_engine?: string;
    face_distance_threshold?: number;
    embedding_encryption_scheme?: string;
    embedding_retention_days?: number;
    retention_cleanup_enabled?: boolean;
    production_policy_ready?: boolean;
    enrollment_flow_ready: boolean;
    embedding_storage_ready: boolean;
    training_route_ready: boolean;
    face_attendance_route_ready: boolean;
    total_students: number;
    students_ready_for_face_attendance: number;
    blockers: string[];
    recommended_next_batch: string;
  } | null;
  database: {
    size_mb: string;
    table_count: number;
  };
  users: {
    total: number;
    students: number;
    teachers: number;
    admins: number;
    new_24h: number;
  };
  activities: {
    total: number;
    planned: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    new_24h: number;
  };
  participations: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    new_24h: number;
  };
  attendance: {
    total: number;
    attended: number;
    absent: number;
    new_24h: number;
    rate: string;
  };
  classes: {
    total: number;
  };
  awards: {
    total: number;
  };
  system: {
    uptime_hours: number;
    memory: {
      heap_used_mb: string;
      heap_total_mb: string;
    };
    node_version: string;
    platform: string;
  };
  top_activities: Array<{
    title: string;
    status: string;
    participation_count: number;
  }>;
  recent_errors: Array<{
    action: string;
    details: string;
    created_at: string;
  }>;
  timestamp: string;
}

function StatCard({
  label,
  value,
  meta,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  meta?: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className={`mt-3 text-2xl font-semibold ${accent}`}>{value}</div>
          {meta ? <div className="mt-2 text-xs text-slate-500">{meta}</div> : null}
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'rose'
          ? 'bg-rose-50 text-rose-700'
          : tone === 'blue'
            ? 'bg-blue-50 text-blue-700'
            : 'bg-slate-100 text-slate-700';

  return (
    <div className={`rounded-2xl px-4 py-3 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ReadinessItem({
  label,
  ready,
  detail,
}: {
  label: string;
  ready: boolean;
  detail: string;
}) {
  return (
    <div
      className={`rounded-[1.25rem] border p-4 ${
        ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {ready ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        )}
        {label}
      </div>
      <p className="mt-2 text-sm text-slate-700">{detail}</p>
    </div>
  );
}

export default function SystemHealthPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchHealth();
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      void fetchHealth();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  async function fetchHealth() {
    try {
      setLoading(true);
      setError('');

      const [healthRes, readinessRes] = await Promise.all([
        fetch('/api/admin/system-health'),
        fetch('/api/admin/biometrics/readiness'),
      ]);

      const healthPayload = await healthRes.json().catch(() => null);
      const readinessPayload = await readinessRes.json().catch(() => null);

      if (!healthRes.ok) {
        throw new Error(
          healthPayload?.error || healthPayload?.message || 'Khong the tai tinh trang he thong'
        );
      }

      setData({
        ...(healthPayload as HealthData),
        biometric_readiness: readinessRes.ok
          ? readinessPayload?.data?.readiness || readinessPayload?.readiness || null
          : null,
      });
    } catch (fetchError) {
      console.error('Fetch system health error:', fetchError);
      setError(
        fetchError instanceof Error ? fetchError.message : 'Khong the tai tinh trang he thong'
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || (loading && !data)) {
    return <LoadingSpinner message="Dang tai tinh trang he thong..." />;
  }

  if (!data) {
    return (
      <div className="page-shell">
        <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-6 sm:px-7">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
            <ShieldAlert className="h-4 w-4" />
            Khong the tai tinh trang he thong
          </div>
          <p className="mt-2 text-sm text-rose-800">{error || 'Khong co du lieu de hien thi.'}</p>
        </section>
      </div>
    );
  }

  const biometric = data.biometric_readiness;
  const biometricChecks = biometric
    ? [
        {
          label: 'Runtime',
          ready: !!biometric.runtime_enabled,
          detail: biometric.runtime_enabled
            ? 'Runtime nhan dien khuon mat da bat.'
            : 'Runtime nhan dien khuon mat dang tat.',
        },
        {
          label: 'Model loading',
          ready: !!biometric.model_loading_ready,
          detail: biometric.model_loading_status || 'pending',
        },
        {
          label: 'Liveness',
          ready: !!biometric.liveness_check_ready,
          detail: biometric.liveness_status || 'runtime_unavailable',
        },
        {
          label: 'Enrollment flow',
          ready: !!biometric.enrollment_flow_ready,
          detail: biometric.enrollment_flow_ready
            ? 'Da san sang cho enrollment.'
            : 'Chua du dieu kien enrollment.',
        },
        {
          label: 'Training route',
          ready: !!biometric.training_route_ready,
          detail: biometric.training_route_ready
            ? 'Route training da san sang.'
            : 'Route training chua san sang.',
        },
        {
          label: 'Face attendance route',
          ready: !!biometric.face_attendance_route_ready,
          detail: biometric.face_attendance_route_ready
            ? 'Route face attendance da mo.'
            : 'Route face attendance chua mo.',
        },
      ]
    : [];

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                System health
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Tinh trang he thong</h1>
              <p className="mt-2 text-sm text-slate-600">
                Theo doi suc khoe runtime, database, attendance va readiness cua luong sinh trac hoc
                truoc khi rollout production.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(event) => setAutoRefresh(event.target.checked)}
                />
                Tu dong lam moi 10 giay
              </label>
              <button
                type="button"
                onClick={() => void fetchHealth()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                Lam moi
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4" />
              Co canh bao khi tai du lieu
            </div>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Database"
            value={`${data.database.size_mb} MB`}
            meta={`${data.database.table_count} bang`}
            icon={Database}
            accent="text-slate-950"
          />
          <StatCard
            label="Uptime"
            value={`${data.system.uptime_hours.toFixed(1)}h`}
            meta={data.system.platform}
            icon={Server}
            accent="text-emerald-600"
          />
          <StatCard
            label="Heap used"
            value={`${data.system.memory.heap_used_mb} MB`}
            meta={`/ ${data.system.memory.heap_total_mb} MB`}
            icon={HardDrive}
            accent="text-violet-600"
          />
          <StatCard
            label="Node.js"
            value={data.system.node_version}
            meta={`Cap nhat ${formatVietnamDateTime(data.timestamp, 'time')}`}
            icon={Gauge}
            accent="text-cyan-600"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <div className="flex items-center gap-2 text-slate-900">
                <Users className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Van hanh tong quan</h2>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Nguoi dung ({data.users.total})
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniStat label="Hoc vien" value={String(data.users.students)} tone="blue" />
                    <MiniStat label="Giang vien" value={String(data.users.teachers)} tone="emerald" />
                    <MiniStat label="Quan tri" value={String(data.users.admins)} tone="slate" />
                    <MiniStat label="Moi 24h" value={`+${data.users.new_24h}`} tone="amber" />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Hoat dong ({data.activities.total})
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniStat label="Planned" value={String(data.activities.planned)} tone="slate" />
                    <MiniStat label="Ongoing" value={String(data.activities.ongoing)} tone="emerald" />
                    <MiniStat label="Completed" value={String(data.activities.completed)} tone="blue" />
                    <MiniStat label="Cancelled" value={String(data.activities.cancelled)} tone="rose" />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Diem danh ({data.attendance.total})
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniStat label="Attended" value={String(data.attendance.attended)} tone="emerald" />
                    <MiniStat label="Absent" value={String(data.attendance.absent)} tone="rose" />
                    <MiniStat label="Rate" value={`${data.attendance.rate}%`} tone="blue" />
                    <MiniStat label="Moi 24h" value={`+${data.attendance.new_24h}`} tone="amber" />
                  </div>
                </div>
              </div>
            </section>

            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <div className="flex items-center gap-2 text-slate-900">
                <Activity className="h-5 w-5 text-violet-600" />
                <h2 className="text-xl font-semibold">Tham gia va diem nong</h2>
              </div>
              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Participations ({data.participations.total})
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniStat label="Pending" value={String(data.participations.pending)} tone="amber" />
                    <MiniStat label="Approved" value={String(data.participations.approved)} tone="emerald" />
                    <MiniStat label="Rejected" value={String(data.participations.rejected)} tone="rose" />
                    <MiniStat label="Moi 24h" value={`+${data.participations.new_24h}`} tone="blue" />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Lop va khen thuong</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniStat label="Lop hoc" value={String(data.classes.total)} tone="blue" />
                    <MiniStat label="Khen thuong" value={String(data.awards.total)} tone="amber" />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Top activities</div>
                  <div className="mt-4 space-y-3">
                    {data.top_activities.length === 0 ? (
                      <p className="text-sm text-slate-500">Chua co activity nao noi bat.</p>
                    ) : (
                      data.top_activities.slice(0, 5).map((activity, index) => (
                        <div
                          key={`${activity.title}-${index}`}
                          className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                              {index + 1}. {activity.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{activity.status}</div>
                          </div>
                          <div className="text-sm font-semibold text-blue-700">
                            {activity.participation_count}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Recent errors</div>
                  <div className="mt-4 space-y-3">
                    {data.recent_errors.length === 0 ? (
                      <p className="text-sm text-slate-500">Khong co loi gan day.</p>
                    ) : (
                      data.recent_errors.map((errorItem, index) => (
                        <div
                          key={`${errorItem.action}-${index}`}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"
                        >
                          <div className="text-sm font-semibold text-rose-800">
                            {errorItem.action}
                          </div>
                          <div className="mt-1 text-sm text-rose-700">{errorItem.details}</div>
                          <div className="mt-2 text-xs text-rose-500">
                            {formatVietnamDateTime(errorItem.created_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section
              className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7"
              data-testid="admin-biometric-readiness"
            >
              <div className="flex items-center gap-2 text-slate-900">
                <ScanFace className="h-5 w-5 text-cyan-600" />
                <h2 className="text-xl font-semibold">Biometric readiness</h2>
              </div>

              {!biometric ? (
                <p className="mt-4 text-sm text-slate-500">
                  Chua tai duoc readiness cua he thong sinh trac hoc.
                </p>
              ) : (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {biometricChecks.map((item) => (
                      <ReadinessItem
                        key={item.label}
                        label={item.label}
                        ready={item.ready}
                        detail={item.detail}
                      />
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <MiniStat
                      label="Students ready"
                      value={`${biometric.students_ready_for_face_attendance}/${biometric.total_students}`}
                      tone="blue"
                    />
                    <MiniStat
                      label="Runtime mode"
                      value={biometric.runtime_mode || 'unknown'}
                      tone="slate"
                    />
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      Runtime detail
                    </div>
                    <div className="mt-2 text-sm text-amber-900">
                      Matching: {biometric.face_matching_engine || 'n/a'} | Liveness:{' '}
                      {biometric.face_liveness_engine || 'n/a'} | Retention:{' '}
                      {biometric.embedding_retention_days ?? 'n/a'} ngay
                    </div>
                    <div className="mt-4 font-semibold text-amber-900">Blockers hien tai</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                      {biometric.blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                    <div className="mt-4 text-xs text-amber-900">
                      Next batch: {biometric.recommended_next_batch}
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

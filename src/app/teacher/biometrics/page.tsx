'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  QrCode,
  ScanFace,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { getFaceRuntimeCapability } from '@/lib/biometrics/runtime-capability';

type ReadinessItem = {
  label: string;
  ok: boolean;
  detail: string;
};

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'emerald' | 'amber';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-blue-200 bg-blue-50 text-blue-700';

  return (
    <div className={`rounded-[1.5rem] border p-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function buildReadinessItems() {
  const capability = getFaceRuntimeCapability();

  const modelStatusMessage =
    capability.model_loading_status === 'ready'
      ? 'Model da san sang cho runtime.'
      : capability.model_loading_status === 'failed'
        ? 'Model loading loi. Can kiem tra runtime va build model.'
        : capability.model_loading_status === 'loading'
          ? 'Model dang duoc nap. Thu lai sau khi runtime on dinh.'
          : 'Model chua duoc nap trong phien nay.';

  const items: ReadinessItem[] = [
    {
      label: 'Runtime',
      ok: capability.runtime_enabled,
      detail: capability.runtime_enabled
        ? 'Runtime nhan dien khuon mat da duoc bat.'
        : 'Runtime nhan dien khuon mat dang tat.',
    },
    {
      label: 'Model loading',
      ok: capability.model_loading_ready,
      detail: modelStatusMessage,
    },
    {
      label: 'Embedding detection',
      ok: capability.embedding_detection_ready,
      detail: capability.embedding_detection_ready
        ? 'Da du dieu kien tao candidate embedding production.'
        : 'Chua mo production cho candidate embedding.',
    },
    {
      label: 'Liveness check',
      ok: capability.liveness_check_ready,
      detail: capability.liveness_check_ready
        ? 'Da du dieu kien dung liveness check production.'
        : 'Liveness check production chua san sang.',
    },
    {
      label: 'Attendance API',
      ok: capability.attendance_api_accepting_runtime_verification,
      detail: capability.attendance_api_accepting_runtime_verification
        ? 'API attendance dang nhan runtime verification.'
        : 'API attendance chua nhan runtime verification production.',
    },
  ];

  return { capability, items };
}

const quickActions: QuickAction[] = [
  {
    href: '/teacher/attendance/policy',
    label: 'Attendance policy',
    description: 'Xac dinh activity nao du dieu kien face pilot va khi nao can fallback.',
    icon: SlidersHorizontal,
  },
  {
    href: '/teacher/attendance/face',
    label: 'Face attendance',
    description: 'Van hanh luong preview, liveness, roster va submit face attendance.',
    icon: ScanFace,
  },
  {
    href: '/teacher/qr',
    label: 'QR diem danh',
    description: 'Mo fallback QR khi runtime khuon mat chua san sang hoac lop dong.',
    icon: QrCode,
  },
  {
    href: '/teacher/students',
    label: 'Hoc vien',
    description: 'Theo doi hoc vien, roster va xu ly truong hop can goi ten bo sung.',
    icon: Users,
  },
];

export default function TeacherBiometricsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.push('/login');
    }
  }, [authLoading, router, user]);

  if (authLoading) {
    return <LoadingSpinner message="Dang tai hub sinh trac hoc..." />;
  }

  if (!user || user.role !== 'teacher') {
    return <LoadingSpinner message="Dang chuyen huong..." />;
  }

  const { capability, items } = buildReadinessItems();
  const readyCount = items.filter((item) => item.ok).length;
  const blockerCount = items.length - readyCount;
  const rolloutState =
    blockerCount === 0
      ? 'Co the mo pilot'
      : blockerCount <= 2
        ? 'Can closeout mot vai blocker'
        : 'Nen uu tien QR va manual fallback';

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                Teacher biometric hub
              </div>
              <h1
                className="mt-3 text-3xl font-bold text-slate-900"
                data-testid="teacher-biometrics-heading"
              >
                Sinh trac hoc cho giang vien
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Teacher dung trang nay de kiem tra readiness cua runtime khuon mat, chot luong
                van hanh va mo dung man policy, face attendance, QR fallback hoac roster hoc vien.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[30rem]">
              <SummaryCard label="Runtime mode" value={capability.mode} tone="blue" />
              <SummaryCard label="Ready checks" value={`${readyCount}/${items.length}`} tone="emerald" />
              <SummaryCard label="Rollout" value={rolloutState} tone="amber" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)]">
          <div className="space-y-6">
            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <div className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="h-5 w-5 text-violet-600" />
                <h2 className="text-xl font-semibold">Readiness hien tai</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Trang teacher nay chi phuc vu van hanh va readiness. Quy trinh enrollment/training
                tung hoc vien van thuoc luong quan tri.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[1.35rem] border p-4 ${
                      item.ok
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {item.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      )}
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <div className="flex items-center gap-2 text-slate-900">
                <Clock3 className="h-5 w-5 text-cyan-600" />
                <h2 className="text-xl font-semibold">Trinh tu van hanh de xuat</h2>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <span className="font-semibold text-slate-900">1. Chot attendance policy:</span>{' '}
                  xem activity nao nen uu tien QR, activity nao co the bat face pilot va nguong
                  fallback.
                </li>
                <li className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <span className="font-semibold text-slate-900">2. Tai roster va preview:</span>{' '}
                  vao man face attendance de load roster, tao candidate preview va kiem tra liveness.
                </li>
                <li className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <span className="font-semibold text-slate-900">3. Fallback khi can:</span>{' '}
                  neu runtime hoac camera khong on dinh, chuyen sang QR diem danh ngay tai lop.
                </li>
                <li className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <span className="font-semibold text-slate-900">4. Doi chieu roster:</span>{' '}
                  quay lai danh sach hoc vien de xu ly cac truong hop bo sot hoac can goi ten.
                </li>
              </ol>
            </section>
          </div>

          <div className="space-y-6">
            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <div className="flex items-center gap-2 text-slate-900">
                <ScanFace className="h-5 w-5 text-violet-600" />
                <h2 className="text-xl font-semibold">Mo dung man dung viec</h2>
              </div>
              <div className="mt-5 space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group block rounded-[1.35rem] border border-slate-200 bg-white p-4 transition hover:border-violet-300 hover:bg-violet-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{action.label}</div>
                            <p className="mt-1 text-sm text-slate-600">{action.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 flex-none text-slate-400 transition group-hover:translate-x-1 group-hover:text-violet-700" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section
              className={`page-surface rounded-[1.75rem] px-5 py-6 sm:px-7 ${
                blockerCount === 0
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                {blockerCount === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                Ket luan van hanh
              </div>
              <p className="mt-3 text-sm text-slate-700">
                {blockerCount === 0
                  ? 'Runtime da du dieu kien mo pilot. Teacher co the uu tien face attendance cho cac lop duoc policy cho phep.'
                  : 'Con blocker o runtime. Khi day la lop dong hoac camera khong on dinh, uu tien QR/manual fallback de tranh nghen tai lop.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/teacher/attendance/face"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Mo face attendance
                </Link>
                <Link
                  href="/teacher/qr"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Mo QR fallback
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}

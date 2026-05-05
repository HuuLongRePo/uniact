'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  History,
  Pencil,
  QrCode,
  ScanFace,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

type Activity = {
  id: number;
  title: string;
  description?: string | null;
  date_time?: string;
  location?: string | null;
  status?: string;
  approval_status?: string;
  registration_deadline?: string | null;
  max_participants?: number | null;
  participant_count?: number | null;
  available_slots?: number | null;
  teacher_name?: string | null;
  activity_type?: string | null;
  organization_level?: string | null;
  base_points?: number | null;
  qr_enabled?: boolean | number | null;
  class_names?: string[];
  classes?: Array<{
    id: number;
    name: string | null;
    participation_mode?: string | null;
  }>;
};

const ACTIONS = [
  {
    key: 'participants',
    title: 'Nguoi tham gia',
    description: 'Xem roster, them nhanh theo lop, danh gia va xuat danh sach.',
    href: (id: number) => `/teacher/activities/${id}/participants`,
    icon: Users,
    tone: 'blue',
  },
  {
    key: 'bulk-attendance',
    title: 'Diem danh nhanh',
    description: 'Danh dau co mat, vang, muon hoac co phep cho tung hoc vien.',
    href: (id: number) => `/teacher/activities/${id}/attendance/bulk`,
    icon: ClipboardCheck,
    tone: 'emerald',
  },
  {
    key: 'attendance-history',
    title: 'Lich su diem danh',
    description: 'Theo doi log diem danh, trang thai va xuat file tong hop.',
    href: (id: number) => `/teacher/activities/${id}/attendance/history`,
    icon: History,
    tone: 'amber',
  },
  {
    key: 'qr-sessions',
    title: 'Phien QR',
    description: 'Tao va quan ly session QR cho hoat dong hien tai.',
    href: (id: number) => `/teacher/activities/${id}/qr-sessions`,
    icon: QrCode,
    tone: 'violet',
  },
  {
    key: 'files',
    title: 'Tai lieu',
    description: 'Quan ly tep dinh kem, tai lieu va noi dung van hanh lien quan.',
    href: (id: number) => `/teacher/activities/${id}/files`,
    icon: FileText,
    tone: 'slate',
  },
  {
    key: 'edit',
    title: 'Chinh sua',
    description: 'Cap nhat thong tin hoat dong, lich trinh va noi dung trien khai.',
    href: (id: number) => `/teacher/activities/${id}/edit`,
    icon: Pencil,
    tone: 'rose',
  },
  {
    key: 'evaluate',
    title: 'Danh gia',
    description: 'Di nhanh sang man danh gia ket qua cho hoc vien da tham gia.',
    href: (id: number) => `/teacher/activities/${id}/evaluate`,
    icon: ScanFace,
    tone: 'cyan',
  },
] as const;

function getToneClasses(tone: (typeof ACTIONS)[number]['tone']) {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'amber':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'violet':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'rose':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    case 'cyan':
      return 'border-cyan-200 bg-cyan-50 text-cyan-800';
    case 'slate':
      return 'border-slate-200 bg-slate-50 text-slate-800';
    default:
      return 'border-blue-200 bg-blue-50 text-blue-800';
  }
}

function getStatusLabel(status?: string) {
  if (!status) return 'Chua ro';
  if (status === 'published' || status === 'ongoing') return 'Dang van hanh';
  if (status === 'completed') return 'Da hoan thanh';
  if (status === 'cancelled') return 'Da huy';
  if (status === 'draft') return 'Nhap';
  return status;
}

function getApprovalLabel(status?: string) {
  if (!status) return 'Chua ro';
  if (status === 'approved') return 'Da duyet';
  if (status === 'pending') return 'Cho duyet';
  if (status === 'rejected') return 'Tu choi';
  return status;
}

function formatLimit(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'Khong gioi han';
  }
  return String(value);
}

export default function TeacherActivityOverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'teacher' && user.role !== 'admin') {
      toast.error('Chi giang vien moi co quyen truy cap trang nay');
      router.push('/teacher/dashboard');
      return;
    }

    if (user && id) {
      void fetchActivity();
    }
  }, [authLoading, id, router, user]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/activities/${id}`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(data?.error || data?.message || 'Khong the tai thong tin hoat dong');
        setActivity(null);
        return;
      }

      setActivity(data?.activity || data?.data?.activity || data);
    } catch (error) {
      console.error(error);
      toast.error('Loi khi tai du lieu');
      setActivity(null);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!activity) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center text-blue-600 hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lai
          </button>
          <div className="page-surface rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6">
            <div className="text-lg font-semibold text-rose-900">Khong tim thay hoat dong</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lai
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                Tong quan hoat dong
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">{activity.title}</h1>
              {activity.description ? (
                <p className="mt-2 text-sm text-slate-600">{activity.description}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                {activity.date_time ? <span>Thoi gian: {formatDate(activity.date_time)}</span> : null}
                {activity.location ? <span>Dia diem: {activity.location}</span> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[24rem]">
              <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50 p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Trang thai
                </div>
                <div className="mt-2 text-xl font-bold text-slate-900">
                  {getStatusLabel(activity.status)}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-violet-100 bg-violet-50 p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                  Phe duyet
                </div>
                <div className="mt-2 text-xl font-bold text-slate-900">
                  {getApprovalLabel(activity.approval_status)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Loai hoat dong
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {activity.activity_type || 'Chua phan loai'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cap to chuc
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {activity.organization_level || 'Chua xac dinh'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Diem co ban
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {activity.base_points ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                So luong toi da
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {formatLimit(activity.max_participants)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Da dang ky
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {activity.participant_count ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Con trong
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {activity.available_slots === null ? 'Khong gioi han' : (activity.available_slots ?? 0)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Han dang ky
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {activity.registration_deadline ? formatDate(activity.registration_deadline) : 'Khong dat han'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Diem danh QR
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {Boolean(activity.qr_enabled) ? 'Bat' : 'Tat'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Giang vien phu trach
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {activity.teacher_name || 'Chua xac dinh'}
              </div>
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.5rem] border border-slate-200 px-5 py-5">
          <h2 className="text-lg font-semibold text-slate-900">Pham vi lop ap dung</h2>
          {!activity.classes || activity.classes.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              Hoat dong mo cho tat ca lop hoc vien. Khong gioi han theo lop cu the.
            </p>
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="text-sm font-semibold text-blue-900">Lop bat buoc</div>
                <div className="mt-2 text-sm text-blue-800">
                  {activity.classes
                    .filter((item) => (item.participation_mode || 'mandatory') === 'mandatory')
                    .map((item) => item.name || `Lop #${item.id}`)
                    .join(', ') || 'Khong co'}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-sm font-semibold text-emerald-900">Lop duoc dang ky</div>
                <div className="mt-2 text-sm text-emerald-800">
                  {activity.classes
                    .filter((item) => item.participation_mode === 'voluntary')
                    .map((item) => item.name || `Lop #${item.id}`)
                    .join(', ') || 'Khong co'}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="page-surface rounded-[1.5rem] border border-slate-200 px-5 py-5">
          <h2 className="text-lg font-semibold text-slate-900">Chuc nang lien quan</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cac thao tac chuyen sang module khac duoc dua thanh nut de truy cap nhanh.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.key}
                href={action.href(activity.id)}
                className={`rounded-xl border px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-sm ${getToneClasses(action.tone)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{action.title}</div>
                    <p className="mt-2 text-sm opacity-90">{action.description}</p>
                  </div>
                  <Icon className="h-6 w-6 shrink-0" />
                </div>
              </Link>
            );
          })}
          </div>
        </section>
      </div>
    </div>
  );
}

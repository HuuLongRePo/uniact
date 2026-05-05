'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Activity, ArrowLeft, Award, KeyRound, Mail, MapPin, PencilLine, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';
import { getRoleBadgeClass, getRoleLabel } from '../roles';

type PendingUserAction = 'reset-password' | 'toggle-status' | 'delete-user';

type UserStats = {
  total_participations?: number | null;
  attended?: number | null;
};

type UserRecentActivity = {
  id: number;
  title: string;
  date_time?: string | null;
  status?: string | null;
  attendance_status?: string | null;
};

type UserAward = {
  id: number;
  award_type_id?: number | null;
  awarded_at?: string | null;
  reason?: string | null;
};

type UserDetail = {
  id: number;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  role: string;
  avatar_url?: string | null;
  student_code?: string | null;
  phone?: string | null;
  teacher_rank?: string | null;
  academic_title?: string | null;
  academic_degree?: string | null;
  teaching_class_id?: number | null;
  teaching_class_name?: string | null;
  class_id?: number | null;
  class_name?: string | null;
  created_at?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  citizen_id?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  address_detail?: string | null;
  address?: string | null;
  code?: string | null;
  is_active?: number | boolean | null;
  stats?: UserStats;
  recentActivities?: UserRecentActivity[];
  awards?: UserAward[];
};

function parseUserPayload(payload: any): UserDetail | null {
  const record = payload?.data?.user || payload?.user || payload?.data || null;
  if (!record || typeof record !== 'object') return null;

  return {
    ...(record as UserDetail),
    stats: record.stats && typeof record.stats === 'object' ? (record.stats as UserStats) : {},
    recentActivities: Array.isArray(record.recentActivities)
      ? (record.recentActivities as UserRecentActivity[])
      : [],
    awards: Array.isArray(record.awards) ? (record.awards as UserAward[]) : [],
  };
}

function toInitial(name?: string | null) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

function getUserDisplayName(user: UserDetail) {
  return user.full_name || user.email || `User #${user.id}`;
}

function getGenderLabel(gender?: string | null) {
  if (gender === 'male') return 'Nam';
  if (gender === 'female') return 'Nu';
  if (gender === 'other') return 'Khac';
  return '-';
}

export default function UserDetailPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null);

  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, currentUser?.id, currentUser?.role, router]);

  const fetchUserDetail = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setLoadError(null);

      const res = await fetch(`/api/admin/users/${userId}`);
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai thong tin tai khoan');
      }

      const parsed = parseUserPayload(payload);
      if (!parsed) {
        throw new Error('Khong tim thay tai khoan');
      }

      setUser(parsed);
    } catch (error) {
      console.error('Fetch user detail error:', error);
      const message = error instanceof Error ? error.message : 'Khong the tai thong tin tai khoan';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;
    void fetchUserDetail();
  }, [currentUser?.id, currentUser?.role, fetchUserDetail]);

  const metrics = useMemo(() => {
    const participations = Number(user?.stats?.total_participations || 0);
    const attended = Number(user?.stats?.attended || 0);
    const awards = user?.awards?.length || 0;
    const recentItems = user?.recentActivities?.length || 0;

    return {
      participations,
      attended,
      awards,
      recentItems,
    };
  }, [user?.awards?.length, user?.recentActivities?.length, user?.stats?.attended, user?.stats?.total_participations]);

  const isActive = Boolean(Number(user?.is_active ?? 0));

  const performResetPassword = async () => {
    if (!userId) return;

    const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: 'POST' });
    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(payload?.error || payload?.message || 'Khong the dat lai mat khau');
    }

    const temporaryPassword =
      payload?.data?.new_password || payload?.new_password || payload?.data?.temporaryPassword;

    toast.success(payload?.message || 'Da dat lai mat khau');
    if (temporaryPassword) {
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(String(temporaryPassword)).catch(() => undefined);
      }
      toast.success(`Mat khau tam thoi: ${temporaryPassword}`, { duration: 10000 });
    }
  };

  const performToggleStatus = async () => {
    if (!userId) return;

    const res = await fetch(`/api/admin/users/${userId}/toggle-status`, { method: 'POST' });
    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(payload?.error || payload?.message || 'Khong the cap nhat trang thai tai khoan');
    }

    toast.success(payload?.message || 'Da cap nhat trang thai tai khoan');
    await fetchUserDetail();
  };

  const performDelete = async () => {
    if (!userId) return;

    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(payload?.error || payload?.message || 'Khong the vo hieu hoa tai khoan');
    }

    toast.success(payload?.message || 'Da vo hieu hoa tai khoan');
    router.push('/admin/users');
  };

  const confirmAction = async () => {
    try {
      if (pendingAction === 'reset-password') {
        await performResetPassword();
      } else if (pendingAction === 'toggle-status') {
        await performToggleStatus();
      } else if (pendingAction === 'delete-user') {
        await performDelete();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Khong the thuc hien thao tac');
    } finally {
      setPendingAction(null);
    }
  };

  const confirmConfig =
    pendingAction === 'reset-password'
      ? {
          title: 'Dat lai mat khau',
          message: `Tao mat khau tam thoi moi cho ${getUserDisplayName(user || { id: 0, role: 'student' })}?`,
          confirmText: 'Dat lai',
          variant: 'warning' as const,
        }
      : pendingAction === 'toggle-status'
        ? {
            title: isActive ? 'Vo hieu hoa tai khoan' : 'Kich hoat tai khoan',
            message: `Ban co chac muon ${isActive ? 'vo hieu hoa' : 'kich hoat'} tai khoan ${getUserDisplayName(user || { id: 0, role: 'student' })}?`,
            confirmText: isActive ? 'Vo hieu hoa' : 'Kich hoat',
            variant: 'warning' as const,
          }
        : {
            title: 'Vo hieu hoa tai khoan',
            message: `Tai khoan ${getUserDisplayName(user || { id: 0, role: 'student' })} se bi vo hieu hoa khoi he thong van hanh.`,
            confirmText: 'Xac nhan',
            variant: 'danger' as const,
          };

  if (authLoading || isLoading) {
    return <LoadingSpinner message="Dang tai chi tiet tai khoan..." />;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-2xl font-semibold text-slate-950">Khong tim thay tai khoan</div>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          {loadError || 'Tai khoan nay khong ton tai hoac khong con du lieu chi tiet.'}
        </p>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lai danh sach tai khoan
        </Link>
      </div>
    );
  }

  const addressLine =
    [user.address_detail || user.address, user.ward, user.district, user.province]
      .filter(Boolean)
      .join(', ') || '-';

  const assignmentLabel =
    user.role === 'teacher'
      ? user.teaching_class_name || 'Chua gan lop phu trach'
      : user.class_name || 'Chua gan lop hoc';

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lai danh sach tai khoan
            </Link>
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Identity detail
            </p>
            <h1 data-testid="admin-user-detail-heading" className="mt-3 text-3xl font-semibold text-slate-950">
              {getUserDisplayName(user)}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Admin co the doi soat quyen, lich su tham gia va thao tac van hanh tai khoan ngay tai mot page detail.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/admin/users/${user.id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <PencilLine className="h-4 w-4" />
              Chinh sua
            </Link>
            {user.role === 'student' && (
              <Link
                href={`/admin/students/${user.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
              >
                <Users className="h-4 w-4" />
                Mo ho so hoc vien
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-3xl font-semibold text-white">
              {toInitial(user.full_name)}
            </div>
            <div className="mt-4 text-2xl font-semibold text-slate-950">{getUserDisplayName(user)}</div>
            <div className="mt-1 text-sm text-slate-500">{user.email || '-'}</div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(user.role)}`}>
                {getRoleLabel(user.role)}
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {isActive ? 'Dang hoat dong' : 'Da vo hieu hoa'}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <ActionButton
              icon={<ShieldCheck className="h-4 w-4" />}
              label={isActive ? 'Vo hieu hoa tai khoan' : 'Kich hoat tai khoan'}
              onClick={() => setPendingAction('toggle-status')}
              tone={isActive ? 'warning' : 'success'}
            />
            <ActionButton
              icon={<KeyRound className="h-4 w-4" />}
              label="Dat lai mat khau"
              onClick={() => setPendingAction('reset-password')}
              tone="neutral"
            />
            <ActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Vo hieu hoa tai khoan nay"
              onClick={() => setPendingAction('delete-user')}
              tone="danger"
            />
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Gan lop / phu trach</div>
            <div className="mt-2 text-sm font-medium text-slate-900">{assignmentLabel}</div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Tong tham gia" value={String(metrics.participations)} icon={<Activity className="h-5 w-5" />} tone="cyan" />
            <MetricCard label="Da diem danh" value={String(metrics.attended)} icon={<ShieldCheck className="h-5 w-5" />} tone="emerald" />
            <MetricCard label="Award records" value={String(metrics.awards)} icon={<Award className="h-5 w-5" />} tone="amber" />
            <MetricCard label="Item gan day" value={String(metrics.recentItems)} icon={<UserCog className="h-5 w-5" />} tone="violet" />
          </div>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Thong tin co ban</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoRow label="Email" value={user.email || '-'} />
              <InfoRow label="Username" value={user.username || '-'} />
              <InfoRow label="Ma tai khoan" value={user.student_code || user.code || '-'} />
              <InfoRow label="So dien thoai" value={user.phone || '-'} />
              <InfoRow label="Gioi tinh" value={getGenderLabel(user.gender)} />
              <InfoRow
                label="Ngay sinh"
                value={user.date_of_birth ? formatVietnamDateTime(user.date_of_birth, 'date') : '-'}
              />
              <InfoRow label="CCCD / dinh danh" value={user.citizen_id || '-'} />
              <InfoRow
                label="Ngay tao tai khoan"
                value={user.created_at ? formatVietnamDateTime(user.created_at, 'date') : '-'}
              />
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                <MapPin className="h-4 w-4" />
                Dia chi
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-700">{addressLine}</div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Ngu canh vai tro</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoRow label="Vai tro" value={getRoleLabel(user.role)} />
              <InfoRow label="Trang thai" value={isActive ? 'Dang hoat dong' : 'Da vo hieu hoa'} />
              <InfoRow label="Lop / don vi lien quan" value={assignmentLabel} />
              <InfoRow label="Hoc ham / chuc danh" value={user.academic_title || user.teacher_rank || '-'} />
              <InfoRow label="Hoc vi" value={user.academic_degree || '-'} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Hoat dong gan day</h2>
            {user.recentActivities && user.recentActivities.length > 0 ? (
              <div className="mt-5 space-y-3">
                {user.recentActivities.map((activity) => (
                  <article key={activity.id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="font-medium text-slate-950">{activity.title}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {activity.date_time ? formatVietnamDateTime(activity.date_time) : '-'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activity.attendance_status && (
                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                            {activity.attendance_status}
                          </span>
                        )}
                        {activity.status && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {activity.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-500">
                Chua co lich su hoat dong gan day.
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Award records</h2>
            {user.awards && user.awards.length > 0 ? (
              <div className="mt-5 space-y-3">
                {user.awards.map((award) => (
                  <article key={award.id} className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <div className="font-medium text-slate-950">
                      {award.award_type_id ? `Loai thuong #${award.award_type_id}` : 'Ban ghi khen thuong'}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">{award.reason || 'Khong co ghi chu ly do.'}</div>
                    <div className="mt-3 text-xs text-slate-500">
                      {award.awarded_at ? formatVietnamDateTime(award.awarded_at, 'date') : '-'}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-500">
                Chua co award record nao gan voi tai khoan nay.
              </div>
            )}
          </section>
        </div>
      </section>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText="Huy"
        variant={confirmConfig.variant}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: 'neutral' | 'warning' | 'danger' | 'success';
}) {
  const toneMap: Record<typeof tone, string> = {
    neutral: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
    danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${toneMap[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
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
  tone: 'cyan' | 'emerald' | 'amber' | 'violet';
}) {
  const toneMap: Record<typeof tone, string> = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
    violet: 'border-violet-200 bg-violet-50 text-violet-950',
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

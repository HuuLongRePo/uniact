'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  avatar_url?: string | null;
  class_id?: number | null;
  class_name?: string | null;
  activity_count: number;
  total_points: number;
  created_at: string;
  gender?: string | null;
  date_of_birth?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  address_detail?: string | null;
}

type ProfileFormState = {
  name: string;
  email: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_PASSWORD_FORM: PasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function resolveGenderLabel(value: string | null | undefined) {
  if (!value) return 'Chưa cập nhật';
  if (value === 'male' || value === 'nam') return 'Nam';
  if (value === 'female' || value === 'nu') return 'Nữ';
  return value;
}

function resolveAddress(profile: UserProfile) {
  return [profile.address_detail, profile.ward, profile.district, profile.province]
    .filter(Boolean)
    .join(', ');
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'blue' | 'emerald' | 'amber';
}) {
  const toneClasses =
    tone === 'emerald'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
      : tone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
        : 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200';

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${toneClasses}`}>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [formData, setFormData] = useState<ProfileFormState>({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(EMPTY_PASSWORD_FORM);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchProfile();
    }
  }, [authLoading, router, user]);

  async function fetchProfile() {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');
      const payload = await response.json();
      const resolvedProfile = payload?.data?.user || payload?.user;

      if (!response.ok || !resolvedProfile) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải hồ sơ');
      }

      setProfile(resolvedProfile as UserProfile);
      setFormData({
        name: resolvedProfile.name || '',
        email: resolvedProfile.email || '',
      });
    } catch (error) {
      console.error('Fetch profile error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải hồ sơ');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể cập nhật hồ sơ');
      }

      toast.success('Đã cập nhật hồ sơ');
      setEditing(false);
      await fetchProfile();
    } catch (error) {
      console.error('Save profile error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) return;

    if (passwordForm.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể đổi mật khẩu');
      }

      toast.success('Đã đổi mật khẩu');
      setShowPasswordDialog(false);
      setPasswordForm(EMPTY_PASSWORD_FORM);
    } catch (error) {
      console.error('Change password error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể đổi mật khẩu');
    } finally {
      setChangingPassword(false);
    }
  }

  const address = useMemo(() => (profile ? resolveAddress(profile) : ''), [profile]);

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return (
      <div className="page-shell">
        <section className="page-surface rounded-[1.75rem] px-5 py-8 text-center sm:px-7">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hồ sơ cá nhân</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Không thể tải thông tin tài khoản lúc này.</p>
          <button
            type="button"
            onClick={() => void fetchProfile()}
            className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Thử tải lại
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 via-cyan-50 to-emerald-50 text-3xl font-bold text-slate-700 shadow-sm dark:from-blue-950/50 dark:via-slate-900 dark:to-emerald-950/40 dark:text-slate-100">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="h-full w-full rounded-3xl object-cover"
                  />
                ) : (
                  profile.name.slice(0, 2).toUpperCase()
                )}
              </div>

              <div>
                <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                  Tài khoản học viên
                </div>
                <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">Hồ sơ cá nhân</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Theo dõi thông tin tài khoản, lớp học và tổng điểm đang được hệ thống ghi nhận.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{profile.email}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                    Lớp: {profile.class_name || 'Chưa xếp lớp'}
                  </span>
                </div>
              </div>
            </div>

            <StudentDailyQuickActions includeDevices className="lg:w-[28rem]" />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tổng điểm cuối cùng" value={profile.total_points || 0} tone="emerald" />
          <StatCard label="Hoạt động đã tham gia" value={profile.activity_count || 0} tone="blue" />
          <StatCard
            label="Ngày tham gia"
            value={formatVietnamDateTime(profile.created_at, 'date')}
            tone="amber"
          />
          <StatCard label="Lớp hiện tại" value={profile.class_name || 'Chưa có'} tone="blue" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Thông tin cơ bản</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Cập nhật tên và email đang dùng cho học viên.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditing((current) => {
                    const next = !current;
                    if (!next) {
                      setFormData({ name: profile.name, email: profile.email });
                    }
                    return next;
                  });
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  editing
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {editing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
              </button>
            </div>

            {!editing ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Họ và tên
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{profile.name}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Email
                  </div>
                  <div className="mt-2 break-all text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {profile.email}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Giới tính
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {resolveGenderLabel(profile.gender)}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Ngày sinh
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {profile.date_of_birth
                      ? formatVietnamDateTime(profile.date_of_birth, 'date')
                      : 'Chưa cập nhật'}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Họ và tên</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, email: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                    required
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFormData({ name: profile.name, email: profile.email });
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Hoàn tác
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="space-y-6">
            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Thông tin hệ thống</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Các thông tin này được đồng bộ từ tài khoản và lớp học hiện tại.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswordDialog(true)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Đổi mật khẩu
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Lớp học
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {profile.class_name || 'Chưa xếp lớp'}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Địa chỉ
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {address || 'Chưa cập nhật'}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Ngày tạo tài khoản
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatVietnamDateTime(profile.created_at, 'date')}
                  </div>
                </div>
              </div>
            </section>

            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Lưu ý sử dụng</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p>Nếu thay đổi email, hãy dùng email đăng nhập chính xác để nhận thông báo.</p>
                <p>
                  Tổng điểm trong hồ sơ được đồng bộ từ score ledger, cùng nguồn với bảng điểm và
                  bảng xếp hạng.
                </p>
                <p>Nếu thông tin lớp học sai, cần cập nhật ở phía quản trị dữ liệu hoặc cố vấn.</p>
              </div>
            </section>
          </div>
        </section>
      </div>

      {showPasswordDialog && (
        <div
          className="app-modal-backdrop px-4 py-6"
          onClick={() => {
            setShowPasswordDialog(false);
            setPasswordForm(EMPTY_PASSWORD_FORM);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-password-dialog-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-lg p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="student-password-dialog-title" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Đổi mật khẩu
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Mật khẩu mới phải có ít nhất 6 ký tự và được lưu cho tài khoản hiện tại.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordForm(EMPTY_PASSWORD_FORM);
                }}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Mật khẩu hiện tại
                </span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Mật khẩu mới</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                  minLength={6}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nhập lại mật khẩu mới
                </span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                  minLength={6}
                  required
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setPasswordForm(EMPTY_PASSWORD_FORM);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 disabled:dark:bg-slate-700 disabled:dark:text-slate-300"
                >
                  {changingPassword ? 'Đang đổi mật khẩu...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

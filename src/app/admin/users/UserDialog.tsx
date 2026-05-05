'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { User } from './types';
import { ROLE_OPTIONS } from './roles';

type ClassOption = {
  id: number;
  name: string;
  grade?: string | number | null;
};

type UserDialogFormData = {
  email: string;
  username: string;
  full_name: string;
  password: string;
  phone: string;
  role: string;
  student_code: string;
  class_id: string;
  teaching_class_id: string;
  teacher_rank: string;
  academic_title: string;
  academic_degree: string;
  gender: string;
  date_of_birth: string;
};

type UserDialogPayload = Omit<
  UserDialogFormData,
  'student_code' | 'class_id' | 'teaching_class_id'
> & {
  student_code: string | null;
  class_id: number | null;
  teaching_class_id: number | null;
};

interface UserDialogProps {
  isOpen: boolean;
  user: User | null;
  initialRole?: string;
  onClose: () => void;
  onSave: (userData: UserDialogPayload) => Promise<void>;
  loading: boolean;
}

function initialForm(role = 'student'): UserDialogFormData {
  return {
    email: '',
    username: '',
    full_name: '',
    password: '',
    phone: '',
    role,
    student_code: '',
    class_id: '',
    teaching_class_id: '',
    teacher_rank: '',
    academic_title: '',
    academic_degree: '',
    gender: '',
    date_of_birth: '',
  };
}

export default function UserDialog({
  isOpen,
  user,
  initialRole,
  onClose,
  onSave,
  loading,
}: UserDialogProps) {
  const [formData, setFormData] = useState<UserDialogFormData>(initialForm(initialRole || 'student'));
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const dialogTitleId = 'admin-user-dialog-title';

  useEffect(() => {
    if (!isOpen) return;

    if (user) {
      setFormData({
        email: user.email || '',
        username: user.username || '',
        full_name: user.full_name || '',
        password: '',
        phone: user.phone || '',
        role: user.role || 'student',
        student_code: user.student_code || '',
        class_id: user.class_id ? String(user.class_id) : '',
        teaching_class_id: user.teaching_class_id ? String(user.teaching_class_id) : '',
        teacher_rank: user.teacher_rank || '',
        academic_title: user.academic_title || '',
        academic_degree: user.academic_degree || '',
        gender: user.gender || '',
        date_of_birth: user.date_of_birth || '',
      });
    } else {
      setFormData(initialForm(initialRole || 'student'));
    }

    void fetchClasses();

    if (user?.id) {
      void fetchUserDetails(user.id);
    }
  }, [initialRole, isOpen, user]);

  async function fetchUserDetails(userId: number) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      const resolvedUser = (data?.user ?? data?.data?.user ?? data?.data ?? null) as
        | Partial<User>
        | null;
      if (!data?.success || !resolvedUser) return;

      setFormData((prev) => ({
        ...prev,
        email: resolvedUser.email ?? prev.email,
        username: resolvedUser.username ?? prev.username,
        full_name: resolvedUser.full_name ?? prev.full_name,
        role: resolvedUser.role ?? prev.role,
        phone: resolvedUser.phone ?? prev.phone,
        gender: resolvedUser.gender ?? prev.gender,
        date_of_birth: resolvedUser.date_of_birth ?? prev.date_of_birth,
        student_code: resolvedUser.student_code ?? prev.student_code,
        class_id: resolvedUser.class_id != null ? String(resolvedUser.class_id) : '',
        teaching_class_id:
          resolvedUser.teaching_class_id != null ? String(resolvedUser.teaching_class_id) : '',
        teacher_rank: resolvedUser.teacher_rank ?? '',
        academic_title: resolvedUser.academic_title ?? '',
        academic_degree: resolvedUser.academic_degree ?? '',
      }));
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  }

  async function fetchClasses() {
    try {
      const params = new URLSearchParams({ page: '1', limit: '1000' });
      const res = await fetch(`/api/admin/classes?${params}`);
      const data = await res.json().catch(() => ({}));
      const classData = data?.classes ?? data?.data?.classes ?? data?.data;
      if (data?.success && Array.isArray(classData)) {
        setClasses(classData as ClassOption[]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }

  async function handleResetPassword() {
    if (!user) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.data?.new_password) {
        const newPassword = data.data.new_password;
        toast.success(`Mat khau moi: ${newPassword}`, { duration: 10000 });
        try {
          await navigator?.clipboard?.writeText?.(newPassword);
          toast.success('Da copy mat khau vao clipboard');
        } catch {}
      } else {
        toast.error(data.error || 'Khong the reset mat khau');
      }
    } catch (_error) {
      toast.error('Loi khi reset mat khau');
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const normalizeIntOrNull = (value: string | number | null | undefined) => {
      if (value === '' || value === null || value === undefined) return null;
      const numberValue = parseInt(String(value), 10);
      return Number.isFinite(numberValue) ? numberValue : null;
    };

    await onSave({
      ...formData,
      student_code: formData.role === 'student' ? formData.student_code || null : null,
      class_id: normalizeIntOrNull(formData.class_id),
      teaching_class_id: normalizeIntOrNull(formData.teaching_class_id),
    });
  }

  const isRoleLocked = Boolean(initialRole) && !user;
  const needsClassSelection = formData.role === 'student' || formData.role === 'class_manager';

  return (
    <div className="app-modal-backdrop px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        className="app-modal-panel app-modal-panel-scroll w-full max-w-3xl p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={dialogTitleId} className="text-2xl font-semibold text-slate-950">
              {user ? 'Cap nhat tai khoan' : 'Tao tai khoan moi'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Dien thong tin co ban va scope hoc tap hoac giang day.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Dong
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Vai tro
              <select
                value={formData.role}
                onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                required
                disabled={isRoleLocked}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Ten dang nhap
              <input
                type="text"
                value={formData.username}
                onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Ho ten
              <input
                type="text"
                value={formData.full_name}
                onChange={(event) => setFormData({ ...formData, full_name: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                required
              />
            </label>
          </div>

          {!user && (
            <label className="block text-sm font-medium text-slate-700">
              Mat khau
              <input
                type="password"
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                required
                placeholder="Toi thieu 6 ky tu"
              />
            </label>
          )}

          {user && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-amber-900">Reset mat khau</div>
                  <p className="mt-1 text-sm text-amber-800">
                    Tao mat khau ngau nhien moi cho tai khoan nay.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleResetPassword()}
                  className="rounded-2xl bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
                >
                  Reset mat khau
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              So dien thoai
              <input
                type="tel"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                placeholder="0123456789"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Gioi tinh
              <select
                value={formData.gender}
                onChange={(event) => setFormData({ ...formData, gender: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
              >
                <option value="">Chua chon</option>
                <option value="nam">Nam</option>
                <option value="nu">Nu</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Ngay sinh
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(event) => setFormData({ ...formData, date_of_birth: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
              />
            </label>

            {formData.role === 'student' && user ? (
              <label className="block text-sm font-medium text-slate-700">
                Ma hoc vien
                <input
                  type="text"
                  value={formData.student_code}
                  onChange={(event) => setFormData({ ...formData, student_code: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  placeholder="He thong co the tu sinh"
                />
              </label>
            ) : (
              <div />
            )}
          </div>

          {(needsClassSelection || formData.role === 'teacher') && (
            <div className="grid gap-4 md:grid-cols-2">
              {needsClassSelection ? (
                <label className="block text-sm font-medium text-slate-700">
                  Lop
                  <select
                    value={formData.class_id}
                    onChange={(event) => setFormData({ ...formData, class_id: event.target.value })}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  >
                    <option value="">Chua gan lop</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.grade || '-'})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div />
              )}

              {formData.role === 'teacher' ? (
                <label className="block text-sm font-medium text-slate-700">
                  Lop phu trach
                  <select
                    value={formData.teaching_class_id}
                    onChange={(event) =>
                      setFormData({ ...formData, teaching_class_id: event.target.value })
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  >
                    <option value="">Chua gan lop phu trach</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.grade || '-'})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          )}

          {formData.role === 'teacher' && (
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700">
                Ngach giang day
                <input
                  type="text"
                  value={formData.teacher_rank}
                  onChange={(event) => setFormData({ ...formData, teacher_rank: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Hoc ham
                <input
                  type="text"
                  value={formData.academic_title}
                  onChange={(event) =>
                    setFormData({ ...formData, academic_title: event.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Hoc vi
                <input
                  type="text"
                  value={formData.academic_degree}
                  onChange={(event) =>
                    setFormData({ ...formData, academic_degree: event.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                />
              </label>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Huy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Dang luu...' : user ? 'Luu thay doi' : 'Tao tai khoan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, School2, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_OPTIONS, getRoleLabel } from '../../roles';
import { User } from '../../types';

type ClassOption = {
  id: number;
  name: string;
  grade?: string | number | null;
};

type UserEditFormData = {
  username: string;
  full_name: string;
  email: string;
  role: string;
  class_id: number | null;
  teaching_class_id: number | null;
  phone: string;
  gender: string;
  date_of_birth: string;
  citizen_id: string;
  province: string;
  district: string;
  ward: string;
  address_detail: string;
  address: string;
  teacher_rank: string;
  academic_title: string;
  academic_degree: string;
};

function normalizeGender(value?: string | null) {
  if (!value) return '';
  const normalized = value.toLowerCase();
  if (normalized === 'male' || normalized === 'nam') return 'male';
  if (normalized === 'female' || normalized === 'nu' || normalized === 'nữ') return 'female';
  if (normalized === 'other' || normalized === 'khac') return 'other';
  return value;
}

function parseUserPayload(payload: any): User | null {
  const record = payload?.data?.user || payload?.user || payload?.data || null;
  return record && typeof record === 'object' ? (record as User) : null;
}

function parseClassesPayload(payload: any) {
  const classList = payload?.data?.classes || payload?.classes || payload?.data || [];
  return Array.isArray(classList) ? (classList as ClassOption[]) : [];
}

function createInitialForm(userData?: User | null): UserEditFormData {
  return {
    username: userData?.username ?? '',
    full_name: userData?.full_name ?? '',
    email: userData?.email ?? '',
    role: userData?.role ?? 'student',
    class_id: userData?.class_id ?? null,
    teaching_class_id: userData?.teaching_class_id ?? null,
    phone: userData?.phone ?? '',
    gender: normalizeGender(userData?.gender),
    date_of_birth: userData?.date_of_birth ?? '',
    citizen_id: userData?.citizen_id ?? '',
    province: userData?.province ?? '',
    district: userData?.district ?? '',
    ward: userData?.ward ?? '',
    address_detail: userData?.address_detail ?? '',
    address: userData?.address ?? '',
    teacher_rank: userData?.teacher_rank ?? '',
    academic_title: userData?.academic_title ?? '',
    academic_degree: userData?.academic_degree ?? '',
  };
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export default function UserEditPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserEditFormData>(createInitialForm(null));
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, currentUser?.id, currentUser?.role, router]);

  const fetchPageData = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const [userRes, classRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}`),
        fetch('/api/admin/classes?page=1&limit=1000'),
      ]);

      const userPayload = await userRes.json().catch(() => null);
      if (!userRes.ok) {
        throw new Error(userPayload?.error || userPayload?.message || 'Khong the tai tai khoan');
      }

      const parsedUser = parseUserPayload(userPayload);
      if (!parsedUser) {
        throw new Error('Khong tim thay tai khoan can chinh sua');
      }

      setUser(parsedUser);
      setFormData(createInitialForm(parsedUser));

      if (classRes.ok) {
        const classPayload = await classRes.json().catch(() => null);
        setClasses(parseClassesPayload(classPayload));
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error('Fetch edit user page error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai form chinh sua');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;
    void fetchPageData();
  }, [currentUser?.id, currentUser?.role, fetchPageData]);

  const needsClassSelection = useMemo(
    () => formData.role === 'student' || formData.role === 'class_manager',
    [formData.role]
  );

  const isTeacher = formData.role === 'teacher';

  function updateField<K extends keyof UserEditFormData>(field: K, value: UserEditFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!formData.username.trim() || !formData.full_name.trim() || !formData.email.trim()) {
      toast.error('Vui long dien day du username, ho ten va email.');
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        ...formData,
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        gender: formData.gender || null,
        date_of_birth: formData.date_of_birth || null,
        citizen_id: formData.citizen_id.trim() || null,
        province: formData.province.trim() || null,
        district: formData.district.trim() || null,
        ward: formData.ward.trim() || null,
        address_detail: formData.address_detail.trim() || null,
        address: formData.address.trim() || null,
        teacher_rank: isTeacher ? formData.teacher_rank.trim() || null : null,
        academic_title: isTeacher ? formData.academic_title.trim() || null : null,
        academic_degree: isTeacher ? formData.academic_degree.trim() || null : null,
        class_id: needsClassSelection ? formData.class_id : null,
        teaching_class_id: isTeacher ? formData.teaching_class_id : null,
      };

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const responsePayload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(responsePayload?.error || responsePayload?.message || 'Khong the cap nhat tai khoan');
      }

      toast.success(responsePayload?.message || 'Da cap nhat tai khoan');
      router.push(`/admin/users/${userId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Khong the cap nhat tai khoan');
    } finally {
      setIsSaving(false);
    }
  }

  if (authLoading || isLoading) {
    return <LoadingSpinner message="Dang tai form chinh sua tai khoan..." />;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-2xl font-semibold text-slate-950">Khong tim thay tai khoan</div>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          Tai khoan nay khong ton tai hoac du lieu can chinh sua khong con kha dung.
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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              href={`/admin/users/${userId}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lai chi tiet tai khoan
            </Link>
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Identity edit
            </p>
            <h1 data-testid="admin-user-edit-heading" className="mt-3 text-3xl font-semibold text-slate-950">
              Chinh sua tai khoan
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Dieu chinh scope hoc tap, phan cong giang day va thong tin ca nhan ma khong roi khoi shell admin moi.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoCard label="Tai khoan" value={user.email} />
            <InfoCard label="Vai tro hien tai" value={getRoleLabel(user.role)} />
            <InfoCard label="Trang thai" value={user.is_active ? 'Dang hoat dong' : 'Da vo hieu hoa'} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
                <UserRound className="h-4 w-4" />
                Scope tai khoan
              </div>
              <p className="mt-2 text-sm leading-6 text-cyan-800">
                Chon dung vai tro, lop hoc va thong tin lien quan de cac flow student, teacher, admin khong bi lech quyen.
              </p>
            </div>
            <div className="rounded-3xl border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                <School2 className="h-4 w-4" />
                Roster & assignment
              </div>
              <p className="mt-2 text-sm leading-6 text-violet-800">
                Hoc vien va co van hoc tap can gan lop. Giang vien co the them lop phu trach ngay trong form nay.
              </p>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                <ShieldCheck className="h-4 w-4" />
                Kiem soat thay doi
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Luu xong he thong ghi audit log va dong bo trang thai voi cac route detail, list va dashboard.
              </p>
            </div>
          </div>
        </aside>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-8">
            <section>
              <h2 className="text-lg font-semibold text-slate-950">Thong tin co ban</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Ten dang nhap" required>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(event) => updateField('username', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="Ho va ten" required>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(event) => updateField('full_name', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="Email" required>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="So dien thoai">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-950">Vai tro va pham vi</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Vai tro" required>
                  <select
                    value={formData.role}
                    onChange={(event) => updateField('role', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {needsClassSelection ? (
                  <Field label="Lop hoc">
                    <select
                      value={formData.class_id ?? ''}
                      onChange={(event) =>
                        updateField('class_id', event.target.value ? Number(event.target.value) : null)
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                    >
                      <option value="">Chua gan lop</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.grade || '-'})
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div />
                )}

                {isTeacher && (
                  <>
                    <Field label="Lop phu trach">
                      <select
                        value={formData.teaching_class_id ?? ''}
                        onChange={(event) =>
                          updateField(
                            'teaching_class_id',
                            event.target.value ? Number(event.target.value) : null
                          )
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
                    </Field>

                    <Field label="Ngach / cap giang day">
                      <input
                        type="text"
                        value={formData.teacher_rank}
                        onChange={(event) => updateField('teacher_rank', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                      />
                    </Field>

                    <Field label="Hoc ham">
                      <input
                        type="text"
                        value={formData.academic_title}
                        onChange={(event) => updateField('academic_title', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                      />
                    </Field>

                    <Field label="Hoc vi">
                      <input
                        type="text"
                        value={formData.academic_degree}
                        onChange={(event) => updateField('academic_degree', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                      />
                    </Field>
                  </>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-950">Thong tin ca nhan</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Gioi tinh">
                  <select
                    value={formData.gender}
                    onChange={(event) => updateField('gender', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  >
                    <option value="">Chua chon</option>
                    <option value="male">Nam</option>
                    <option value="female">Nu</option>
                    <option value="other">Khac</option>
                  </select>
                </Field>

                <Field label="Ngay sinh">
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(event) => updateField('date_of_birth', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="CCCD / Dinh danh">
                  <input
                    type="text"
                    value={formData.citizen_id}
                    onChange={(event) => updateField('citizen_id', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="Tinh / thanh">
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(event) => updateField('province', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="Quan / huyen">
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(event) => updateField('district', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="Phuong / xa">
                  <input
                    type="text"
                    value={formData.ward}
                    onChange={(event) => updateField('ward', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="Dia chi chi tiet">
                  <input
                    type="text"
                    value={formData.address_detail}
                    onChange={(event) => updateField('address_detail', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="Dia chi tong hop" fullWidth>
                  <textarea
                    value={formData.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <Link
                href={`/admin/users/${userId}`}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Huy
              </Link>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void handleSave()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSaving ? 'Dang luu thay doi...' : 'Luu thay doi'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  required = false,
  fullWidth = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${fullWidth ? 'md:col-span-2' : ''}`}>
      {label}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
      {children}
    </label>
  );
}

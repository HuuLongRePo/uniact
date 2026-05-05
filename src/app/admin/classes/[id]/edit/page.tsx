'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, School2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

type Teacher = {
  id: number;
  name: string;
  email: string;
};

type TeacherApiUser = {
  id: number;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type ClassDetail = {
  id: number;
  name: string;
  grade: string;
  teacher_id?: number | null;
  teacher_name?: string | null;
  description?: string | null;
  student_count?: number | null;
};

function parseClassPayload(payload: any): ClassDetail | null {
  const record = payload?.data?.class || payload?.class || payload?.data || null;
  return record && typeof record === 'object' ? (record as ClassDetail) : null;
}

function parseTeachersPayload(payload: any) {
  const list = payload?.data?.users || payload?.users || payload?.data || [];
  return Array.isArray(list)
    ? (list as TeacherApiUser[]).map((teacher) => ({
        id: teacher.id,
        name: teacher.full_name || teacher.name || `Teacher #${teacher.id}`,
        email: teacher.email || '',
      }))
    : [];
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export default function EditClassPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    description: '',
    teacher_id: '',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user?.id, user?.role]);

  const fetchData = useCallback(async () => {
    if (!classId) return;

    try {
      setLoading(true);
      const [classRes, teachersRes] = await Promise.all([
        fetch(`/api/admin/classes/${classId}`),
        fetch('/api/admin/users?role=teacher&page=1&limit=1000'),
      ]);

      const classPayload = await classRes.json().catch(() => null);
      if (!classRes.ok) {
        throw new Error(classPayload?.error || classPayload?.message || 'Khong tim thay lop hoc');
      }

      const parsedClass = parseClassPayload(classPayload);
      if (!parsedClass) {
        throw new Error('Khong tim thay lop hoc');
      }

      setClassData(parsedClass);
      setFormData({
        name: parsedClass.name || '',
        grade: parsedClass.grade || '',
        teacher_id: parsedClass.teacher_id ? String(parsedClass.teacher_id) : '',
        description: parsedClass.description || '',
      });

      if (teachersRes.ok) {
        const teacherPayload = await teachersRes.json().catch(() => null);
        setTeachers(parseTeachersPayload(teacherPayload));
      } else {
        setTeachers([]);
      }
    } catch (error) {
      console.error('Fetch class edit page error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai form chinh sua lop hoc');
      setClassData(null);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    void fetchData();
  }, [fetchData, user?.id, user?.role]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!formData.name.trim() || !formData.grade.trim()) {
      toast.error('Vui long nhap day du ten lop va khoi / khoa.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          grade: formData.grade.trim(),
          description: formData.description.trim() || null,
          teacher_id: formData.teacher_id ? parseInt(formData.teacher_id, 10) : null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Khong the cap nhat lop hoc');
      }

      toast.success(data?.message || 'Da cap nhat lop hoc');
      router.push(`/admin/classes/${classId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Khong the cap nhat lop hoc');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai form chinh sua lop hoc..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!classData) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-2xl font-semibold text-slate-950">Khong tim thay lop hoc</div>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          Lop hoc nay khong ton tai hoac du lieu chinh sua khong con kha dung.
        </p>
        <Link
          href="/admin/classes"
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lai danh sach lop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              href={`/admin/classes/${classId}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lai chi tiet lop
            </Link>
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Class edit
            </p>
            <h1 data-testid="admin-class-edit-heading" className="mt-3 text-3xl font-semibold text-slate-950">
              Chinh sua lop hoc
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Cap nhat ten lop, khoi, GVCN va mo ta de thong tin roster, detail va list giu dong bo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoCard label="Ten lop hien tai" value={classData.name} />
            <InfoCard label="Khoi / khoa" value={classData.grade || '-'} />
            <InfoCard
              label="GVCN"
              value={classData.teacher_name || (classData.teacher_id ? `Teacher #${classData.teacher_id}` : 'Chua gan')}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
                <School2 className="h-4 w-4" />
                Class identity
              </div>
              <p className="mt-2 text-sm leading-6 text-cyan-800">
                Ten lop va khoi / khoa can on dinh de dashboard, roster va report khong bi lech thong tin.
              </p>
            </div>
            <div className="rounded-3xl border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                <Users className="h-4 w-4" />
                Homeroom ownership
              </div>
              <p className="mt-2 text-sm leading-6 text-violet-800">
                Chon GVCN dung de teacher shell, class management va student detail co du diem tuong ung.
              </p>
            </div>
          </div>
        </aside>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-6">
            <section>
              <h2 className="text-lg font-semibold text-slate-950">Cap nhat thong tin lop</h2>
              <div className="mt-5 grid gap-4">
                <Field label="Ten lop" required>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="Khoi / khoa" required>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(event) => setFormData((prev) => ({ ...prev, grade: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>

                <Field label="Giang vien chu nhiem">
                  <select
                    value={formData.teacher_id}
                    onChange={(event) => setFormData((prev) => ({ ...prev, teacher_id: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  >
                    <option value="">Chua gan giang vien</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.email})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Mo ta / ghi chu van hanh">
                  <textarea
                    value={formData.description}
                    onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                    rows={5}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </Field>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <Link
                href={`/admin/classes/${classId}`}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Huy
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? 'Dang luu thay doi...' : 'Luu thay doi'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
      {children}
    </label>
  );
}

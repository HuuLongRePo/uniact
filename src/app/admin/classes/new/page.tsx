'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

type TeacherApiUser = {
  id: number;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type TeacherOption = {
  id: number;
  name: string;
  email: string;
};

export default function NewClassPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    void fetchTeachers();
  }, [user?.id, user?.role]);

  async function fetchTeachers() {
    try {
      const res = await fetch('/api/admin/users?role=teacher&page=1&limit=1000');
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai danh sach giang vien');
      }

      const teacherList = payload?.users || payload?.data?.users || payload?.data || [];
      const normalized = Array.isArray(teacherList) ? (teacherList as TeacherApiUser[]) : [];
      setTeachers(
        normalized.map((teacher) => ({
          id: teacher.id,
          name: teacher.full_name || teacher.name || `Teacher #${teacher.id}`,
          email: teacher.email || '',
        }))
      );
    } catch (error) {
      console.error('Fetch teachers error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai danh sach giang vien');
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const name = formData.name.trim();
    const grade = formData.grade.trim();
    const description = formData.description.trim();

    if (!name) {
      toast.error('Vui long nhap ten lop.');
      return;
    }

    if (!grade) {
      toast.error('Vui long nhap khoi lop hoac khoa.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          grade,
          description: description || undefined,
          teacher_id: formData.teacher_id ? Number(formData.teacher_id) : null,
        }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tao lop hoc');
      }

      toast.success(payload?.message || 'Da tao lop hoc moi');
      router.push('/admin/classes');
    } catch (error) {
      console.error('Create class error:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi tao lop hoc');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || isBootstrapping) {
    return <LoadingSpinner message="Dang khoi tao form tao lop hoc..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={() => router.push('/admin/classes')}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lai danh sach lop
        </button>

        <div className="mt-5 max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
            New class intake
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Tao lop hoc moi</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Khai bao ten lop, khoa va GVCN ngay tu dau de dashboard, roster va cac luong diem danh
            su dung thong tin dong nhat.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Ten lop
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="VD: CNTT K66A"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Khoi / khoa
              <input
                type="text"
                value={formData.grade}
                onChange={(event) => setFormData((prev) => ({ ...prev, grade: event.target.value }))}
                placeholder="VD: K66"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                required
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Giang vien chu nhiem
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
            <p className="mt-2 text-xs text-slate-500">
              Co the bo trong neu ban muon gan GVCN sau tai man danh sach lop.
            </p>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Mo ta
            <textarea
              value={formData.description}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={5}
              placeholder="Thong tin bo sung cho lop hoc nay."
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
          </label>

          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
            <div className="text-sm font-semibold text-cyan-950">Checklist truoc khi tao lop</div>
            <ul className="mt-3 space-y-2 text-sm text-cyan-900">
              <li>Ten lop nen theo dung quy uoc hien hanh cua khoa.</li>
              <li>Khoi / khoa can dung de score flow va roster tim dung nhom hoc vien.</li>
              <li>Neu da biet GVCN, nen gan ngay de teacher hub co du thong tin.</li>
            </ul>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push('/admin/classes')}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Huy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              {isSubmitting ? 'Dang tao lop...' : 'Tao lop hoc'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

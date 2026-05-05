'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, RefreshCw, School2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDebounce } from '@/lib/debounce-hooks';
import { resolveDownloadFilename } from '@/lib/download-filename';
import { toVietnamDateStamp } from '@/lib/timezone';
import AssignTeacherDialog from './AssignTeacherDialog';
import ClassDialog from './ClassDialog';
import ClassFilters from './ClassFilters';
import ClassTable from './ClassTable';
import ClassViewDialog from './ClassViewDialog';
import { Class, Teacher } from './types';

type TeacherApiUser = {
  id: number;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

function parseClassesPayload(payload: any) {
  const classList = payload?.classes || payload?.data?.classes || payload?.data || [];
  const pagination = payload?.pagination || payload?.data?.pagination || {};

  return {
    classes: Array.isArray(classList) ? (classList as Class[]) : [],
    totalPages: Number(pagination?.totalPages || 1),
    total: Number(pagination?.total || 0),
  };
}

export default function AdminClassesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClasses, setTotalClasses] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [viewClass, setViewClass] = useState<Class | null>(null);
  const [editClass, setEditClass] = useState<Class | null>(null);
  const [deleteClass, setDeleteClass] = useState<Class | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const debouncedGrade = useDebounce(gradeFilter, 400);
  const effectiveSearch = debouncedSearch.trim();
  const effectiveGrade = debouncedGrade.trim();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user?.id, user?.role]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    void fetchTeachers();
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (effectiveSearch.length === 1 || effectiveGrade.length === 1) return;
    void fetchClasses();
  }, [effectiveGrade, effectiveSearch, page, teacherFilter, user?.id, user?.role]);

  const displayedStudents = useMemo(
    () => classes.reduce((sum, item) => sum + Number(item.student_count || 0), 0),
    [classes]
  );
  const assignedHomeroomCount = useMemo(
    () => classes.filter((item) => item.teacher_id).length,
    [classes]
  );

  async function fetchClasses() {
    try {
      setIsListLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: '30',
      });

      if (effectiveSearch.length >= 2) params.set('search', effectiveSearch);
      if (effectiveGrade.length >= 2) params.set('grade', effectiveGrade);
      if (teacherFilter !== '') params.set('teacher_id', String(teacherFilter));

      const res = await fetch(`/api/admin/classes?${params.toString()}`);
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai danh sach lop hoc');
      }

      const parsed = parseClassesPayload(payload);
      setClasses(parsed.classes);
      setTotalPages(parsed.totalPages);
      setTotalClasses(parsed.total || parsed.classes.length);
    } catch (error) {
      console.error('Fetch classes error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai danh sach lop hoc');
      setClasses([]);
      setTotalPages(1);
      setTotalClasses(0);
    } finally {
      setIsListLoading(false);
    }
  }

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
    }
  }

  async function refreshAll() {
    await Promise.all([fetchClasses(), fetchTeachers()]);
  }

  async function handleAssignTeacher() {
    if (!selectedClass || !selectedTeacherId) {
      toast.error('Vui long chon giang vien truoc khi gan GVCN.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/classes/${selectedClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: selectedTeacherId }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the gan GVCN');
      }

      toast.success(payload?.message || 'Da gan GVCN cho lop hoc');
      setSelectedClass(null);
      setSelectedTeacherId(null);
      await fetchClasses();
    } catch (error) {
      console.error('Assign teacher error:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi gan GVCN');
    }
  }

  async function performDelete(classId: number) {
    try {
      const res = await fetch(`/api/admin/classes/${classId}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the xoa lop hoc');
      }

      toast.success(payload?.message || 'Da xoa lop hoc');
      await fetchClasses();
    } catch (error) {
      console.error('Delete class error:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi xoa lop hoc');
    }
  }

  async function handleExport(classId: number, className: string) {
    try {
      toast.loading('Dang xuat danh sach lop...', { duration: 900 });

      const res = await fetch(`/api/classes/${classId}/export`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || payload?.message || 'Khong the xuat danh sach lop');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        res.headers?.get?.('Content-Disposition') ?? null,
        `danh-sach-${className.replace(/\s+/g, '-').toLowerCase()}-${toVietnamDateStamp(new Date())}.csv`
      );
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);

      toast.success('Da xuat danh sach lop hoc');
    } catch (error) {
      console.error('Export class error:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi xuat danh sach lop');
    }
  }

  async function handleCreateClass(classData: {
    name: string;
    grade: string;
    description?: string;
    teacher_id?: number | null;
  }) {
    try {
      setIsSavingClass(true);

      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tao lop hoc');
      }

      toast.success(payload?.message || 'Da tao lop hoc moi');
      setShowCreateForm(false);
      await fetchClasses();
    } catch (error) {
      console.error('Create class error:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi tao lop hoc');
    } finally {
      setIsSavingClass(false);
    }
  }

  async function handleEditClass(classData: {
    name: string;
    grade: string;
    description?: string;
    teacher_id?: number | null;
  }) {
    if (!editClass) return;

    try {
      setIsSavingClass(true);

      const res = await fetch(`/api/admin/classes/${editClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the cap nhat lop hoc');
      }

      toast.success(payload?.message || 'Da cap nhat lop hoc');
      setShowEditForm(false);
      setEditClass(null);
      await fetchClasses();
    } catch (error) {
      console.error('Update class error:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi cap nhat lop hoc');
    } finally {
      setIsSavingClass(false);
    }
  }

  if (authLoading) {
    return <LoadingSpinner message="Dang tai khu quan ly lop hoc..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Class operations
            </p>
            <h1 data-testid="classes-heading" className="mt-3 text-3xl font-semibold text-slate-950">
              Quan ly lop hoc
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Admin co the tao lop, gan GVCN, theo doi si so va dieu huong nhanh sang roster hoc
              vien ngay tai mot man hinh.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refreshAll()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Tai lai
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-cyan-800">Tong lop trong bo loc</div>
            <div className="mt-3 text-3xl font-semibold text-cyan-950">{totalClasses}</div>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-800">Hoc vien dang hien thi</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-950">{displayedStudents}</div>
          </div>
          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-800">Lop da gan GVCN</div>
            <div className="mt-3 text-3xl font-semibold text-violet-950">{assignedHomeroomCount}</div>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-800">Giang vien san sang</div>
            <div className="mt-3 text-3xl font-semibold text-amber-950">{teachers.length}</div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <School2 className="h-4 w-4 text-cyan-700" />
              Dieu phoi roster
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Mo danh sach hoc vien cua tung lop de kiem tra si so va cap nhat thanh vien.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <GraduationCap className="h-4 w-4 text-violet-700" />
              Quan ly GVCN
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Gan hoac doi GVCN ngay trong bang lop, khong can chuyen qua man hinh khac.
            </p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="h-4 w-4 text-emerald-700" />
              Xuat va doi soat
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Xuat roster CSV va theo doi nhanh lop nao dang can bo sung giao vien chu nhiem.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ClassFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            gradeFilter={gradeFilter}
            onGradeFilterChange={(value) => {
              setGradeFilter(value);
              setPage(1);
            }}
            teacherFilter={teacherFilter}
            onTeacherFilterChange={(value) => {
              setTeacherFilter(value);
              setPage(1);
            }}
            teachers={teachers}
            onCreateNew={() => setShowCreateForm(true)}
          />
        </div>

        <div className="mt-4">
          <ClassTable
            classes={classes}
            loading={isListLoading}
            onView={setViewClass}
            onViewStudents={(classId) => router.push(`/admin/classes/${classId}/students`)}
            onExport={handleExport}
            onAssignTeacher={(cls) => {
              setSelectedClass(cls);
              setSelectedTeacherId(cls.teacher_id || null);
            }}
            onEdit={(cls) => {
              setEditClass(cls);
              setShowEditForm(true);
            }}
            onDelete={setDeleteClass}
          />
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang truoc
            </button>
            <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        )}

        <div className="mt-6 text-sm text-slate-500">
          Dang hien thi {classes.length} lop trong trang nay.
        </div>
      </section>

      <ClassDialog
        isOpen={showCreateForm}
        mode="create"
        teachers={teachers}
        loading={isSavingClass}
        onClose={() => setShowCreateForm(false)}
        onSave={handleCreateClass}
      />

      <ClassDialog
        isOpen={showEditForm}
        mode="edit"
        initialClass={editClass}
        teachers={teachers}
        loading={isSavingClass}
        onClose={() => {
          setShowEditForm(false);
          setEditClass(null);
        }}
        onSave={handleEditClass}
      />

      <ClassViewDialog isOpen={!!viewClass} cls={viewClass} onClose={() => setViewClass(null)} />

      <AssignTeacherDialog
        selectedClass={selectedClass}
        teachers={teachers}
        selectedTeacherId={selectedTeacherId}
        onTeacherSelect={setSelectedTeacherId}
        onConfirm={() => void handleAssignTeacher()}
        onCancel={() => {
          setSelectedClass(null);
          setSelectedTeacherId(null);
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteClass}
        title="Xoa lop hoc"
        message={
          deleteClass
            ? `Ban co chac muon xoa lop ${deleteClass.name}? He thong se giu nhat quan cac du lieu lien quan.`
            : ''
        }
        confirmText="Xoa lop"
        cancelText="Huy"
        variant="danger"
        onConfirm={async () => {
          if (!deleteClass) return;
          await performDelete(deleteClass.id);
          setDeleteClass(null);
        }}
        onCancel={() => setDeleteClass(null)}
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toVietnamDateStamp } from '@/lib/timezone';

interface ClassItem {
  id: number;
  name: string;
  studentCount: number;
  grade: string;
  isHomeroomClass?: boolean;
  teacherClassRole?: string;
  canEdit?: boolean;
}

interface Student {
  id: number;
  name: string;
  email: string;
  totalPoints: number;
  attendedActivities: number;
}

type StudentToRemove = Pick<Student, 'id' | 'name' | 'email'> | null;

function normalizeClass(raw: any): ClassItem {
  const id = Number(raw?.id);
  const studentCount = Number(raw?.studentCount ?? raw?.student_count ?? 0);
  const isHomeroomClass = Boolean(raw?.isHomeroomClass ?? raw?.is_homeroom_class ?? false);
  const teacherClassRole = String(
    raw?.teacherClassRole ?? raw?.teacher_class_role ?? (isHomeroomClass ? 'primary' : 'none')
  );

  return {
    id,
    name: String(raw?.name ?? ''),
    grade: String(raw?.grade ?? ''),
    studentCount: Number.isFinite(studentCount) ? studentCount : 0,
    isHomeroomClass,
    teacherClassRole,
    canEdit: Boolean(
      raw?.canEdit ?? raw?.can_edit ?? (isHomeroomClass || teacherClassRole === 'admin')
    ),
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default function TeacherClassManagementPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [studentToRemove, setStudentToRemove] = useState<StudentToRemove>(null);

  useEffect(() => {
    void fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      void fetchStudents(selectedClass);
      return;
    }
    setStudents([]);
  }, [selectedClass]);

  useEffect(() => {
    const selected = classes.find((item) => item.id === selectedClass);
    if (selected && !selected.canEdit) {
      setShowAddDialog(false);
      setShowBulkDialog(false);
      setStudentToRemove(null);
    }
  }, [classes, selectedClass]);

  async function fetchClasses() {
    try {
      setLoading(true);

      const res = await fetch('/api/teacher/classes');
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai danh sach lop');
      }

      const rawClasses = Array.isArray(payload?.classes)
        ? payload.classes
        : Array.isArray(payload?.data?.classes)
          ? payload.data.classes
          : [];

      const normalized = rawClasses
        .map(normalizeClass)
        .filter((item) => Number.isInteger(item.id) && item.id > 0);

      setClasses(normalized);
      setSelectedClass((current) => {
        if (current && normalized.some((item) => item.id === current)) {
          return current;
        }
        return normalized[0]?.id ?? null;
      });
    } catch (error) {
      console.error('Teacher classes fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai danh sach lop');
      setClasses([]);
      setSelectedClass(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudents(classId: number) {
    try {
      setStudentsLoading(true);

      const res = await fetch(`/api/teacher/classes/${classId}/students`);
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai danh sach hoc vien');
      }

      const nextStudents = Array.isArray(payload?.students)
        ? payload.students
        : Array.isArray(payload?.data?.students)
          ? payload.data.students
          : [];

      setStudents(nextStudents);
    } catch (error) {
      console.error('Teacher class students fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai danh sach hoc vien');
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }

  async function handleAddStudent() {
    if (!studentEmail.trim() || !selectedClass) return;

    const selected = classes.find((item) => item.id === selectedClass);
    if (!selected?.canEdit) {
      toast.error('Ban chi duoc sua roster cua lop chu nhiem.');
      return;
    }

    try {
      const res = await fetch(`/api/teacher/classes/${selectedClass}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail.trim() }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Them hoc vien that bai');
      }

      toast.success(payload?.message || 'Them hoc vien thanh cong');
      setStudentEmail('');
      setShowAddDialog(false);
      await fetchStudents(selectedClass);
    } catch (error) {
      console.error('Add student error:', error);
      toast.error(error instanceof Error ? error.message : 'Them hoc vien that bai');
    }
  }

  async function handleBulkAdd() {
    if (!bulkEmails.trim() || !selectedClass) return;

    const selected = classes.find((item) => item.id === selectedClass);
    if (!selected?.canEdit) {
      toast.error('Ban chi duoc sua roster cua lop chu nhiem.');
      return;
    }

    const emails = bulkEmails
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      toast.error('Vui long nhap it nhat mot email.');
      return;
    }

    try {
      const res = await fetch(`/api/teacher/classes/${selectedClass}/students/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Them hang loat that bai');
      }

      const added = Number(payload?.added ?? payload?.data?.added ?? emails.length);
      toast.success(`Da them ${added} hoc vien vao lop.`);
      setBulkEmails('');
      setShowBulkDialog(false);
      await fetchStudents(selectedClass);
    } catch (error) {
      console.error('Bulk add students error:', error);
      toast.error(error instanceof Error ? error.message : 'Them hang loat that bai');
    }
  }

  async function handleRemoveStudent(studentId: number) {
    if (!selectedClass) return;

    const selected = classes.find((item) => item.id === selectedClass);
    if (!selected?.canEdit) {
      toast.error('Ban chi duoc sua roster cua lop chu nhiem.');
      return;
    }

    try {
      const res = await fetch(`/api/teacher/classes/${selectedClass}/students/${studentId}`, {
        method: 'DELETE',
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Xoa hoc vien that bai');
      }

      toast.success(payload?.message || 'Da xoa hoc vien khoi lop');
      await fetchStudents(selectedClass);
    } catch (error) {
      console.error('Remove student error:', error);
      toast.error(error instanceof Error ? error.message : 'Xoa hoc vien that bai');
    }
  }

  function exportToCSV() {
    if (students.length === 0) {
      toast.error('Khong co du lieu de xuat.');
      return;
    }

    const className = classes.find((item) => item.id === selectedClass)?.name || 'class';
    const headers = ['STT', 'Ho ten', 'Email', 'Tong diem', 'So hoat dong'];
    const rows = students.map((student, index) => [
      index + 1,
      student.name,
      student.email,
      student.totalPoints,
      student.attendedActivities,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `danh-sach-${className}-${toVietnamDateStamp(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Da xuat CSV thanh cong.');
  }

  const currentClass = classes.find((item) => item.id === selectedClass) || null;
  const canEditCurrentClass = Boolean(currentClass?.canEdit);
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner message="Dang tai danh sach lop..." />;
  }

  if (classes.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
        <EmptyState
          icon={AlertCircle}
          title="Chua co lop hoc"
          description="Ban chua duoc phan cong quan ly lop nao."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Roster control
            </p>
            <h1
              data-testid="classes-heading"
              className="mt-3 flex items-center gap-3 text-3xl font-semibold text-slate-950"
            >
              <Users className="h-8 w-8 text-cyan-700" />
              Quan ly lop hoc
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Chon lop de xem roster, kiem tra muc do tham gia va cap nhat hoc vien khi can.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchClasses()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Users className="h-4 w-4" />
            Tai lai lop
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((item) => {
            const selected = item.id === selectedClass;
            const editable = Boolean(item.canEdit);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedClass(item.id)}
                className={`rounded-3xl border p-4 text-left transition ${
                  selected
                    ? 'border-cyan-300 bg-cyan-50 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{item.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.grade || 'Khong ro khoi'}</div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      editable
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {editable ? 'Chu nhiem' : 'Tro giang'}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                  <span>{item.studentCount} hoc vien</span>
                  <span>{editable ? 'Duoc chinh sua' : 'Chi xem'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {currentClass && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
              <div className="text-sm font-medium text-cyan-800">Si so hien tai</div>
              <div className="mt-3 text-3xl font-semibold text-cyan-950">{students.length}</div>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="text-sm font-medium text-emerald-800">Diem trung binh</div>
              <div className="mt-3 text-3xl font-semibold text-emerald-950">
                {average(students.map((student) => student.totalPoints)).toFixed(1)}
              </div>
            </div>
            <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
              <div className="text-sm font-medium text-violet-800">HD da tham gia TB</div>
              <div className="mt-3 text-3xl font-semibold text-violet-950">
                {average(students.map((student) => student.attendedActivities)).toFixed(1)}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-950">{currentClass.name}</div>
                <p className="mt-1 text-sm text-slate-500">
                  {canEditCurrentClass
                    ? 'Co the them, xoa va xuat roster cua lop chu nhiem.'
                    : 'Ban dang o che do chi xem vi day la lop tro giang.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canEditCurrentClass}
                  onClick={() => setShowAddDialog(true)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium ${
                    canEditCurrentClass
                      ? 'bg-cyan-700 text-white hover:bg-cyan-800'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Them hoc vien
                </button>
                <button
                  type="button"
                  disabled={!canEditCurrentClass}
                  onClick={() => setShowBulkDialog(true)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium ${
                    canEditCurrentClass
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'cursor-not-allowed bg-slate-200 text-slate-400'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Them hang loat
                </button>
                <button
                  type="button"
                  onClick={exportToCSV}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Xuat CSV
                </button>
              </div>
            </div>

            {!canEditCurrentClass && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Ban co the xem thong tin lop nay, nhung chi lop chu nhiem moi duoc thay doi roster.
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tim theo ten hoac email hoc vien..."
                  className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-cyan-300"
                />
              </div>
              <button
                type="button"
                onClick={() => selectedClass && void fetchStudents(selectedClass)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Lam moi roster
              </button>
            </div>

            <div className="mt-6">
              {studentsLoading ? (
                <LoadingSpinner message="Dang tai roster..." />
              ) : filteredStudents.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-12 text-center">
                  <div className="text-base font-medium text-slate-900">
                    {searchQuery ? 'Khong tim thay hoc vien phu hop' : 'Lop hien chua co hoc vien'}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {searchQuery
                      ? 'Thu xoa bo dieu kien tim kiem hoac chuyen sang lop khac.'
                      : 'Ban co the them hoc vien bang email hoac import hang loat.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 lg:hidden">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-3xl border border-slate-200 p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-slate-900">
                              {student.name}
                            </div>
                            <div className="mt-1 truncate text-sm text-slate-500">{student.email}</div>
                          </div>
                          {canEditCurrentClass && (
                            <button
                              type="button"
                              onClick={() =>
                                setStudentToRemove({
                                  id: student.id,
                                  name: student.name,
                                  email: student.email,
                                })
                              }
                              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Xoa
                            </button>
                          )}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                            Diem: <span className="font-semibold">{student.totalPoints}</span>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                            Hoat dong:{' '}
                            <span className="font-semibold">{student.attendedActivities}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            STT
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Hoc vien
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Tong diem
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            So hoat dong
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Thao tac
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredStudents.map((student, index) => (
                          <tr key={student.id} className="hover:bg-slate-50">
                            <td className="px-4 py-4 text-sm text-slate-500">{index + 1}</td>
                            <td className="px-4 py-4 text-sm font-medium text-slate-900">
                              {student.name}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">{student.email}</td>
                            <td className="px-4 py-4 text-sm font-semibold text-emerald-700">
                              {student.totalPoints}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">
                              {student.attendedActivities}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {canEditCurrentClass ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStudentToRemove({
                                      id: student.id,
                                      name: student.name,
                                      email: student.email,
                                    })
                                  }
                                  className="text-sm font-medium text-rose-700 hover:text-rose-800"
                                >
                                  Xoa
                                </button>
                              ) : (
                                <span className="text-sm text-slate-400">Chi xem</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>
        </>
      )}

      {showAddDialog && (
        <div className="app-modal-backdrop px-4" onClick={() => setShowAddDialog(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-class-add-student-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-md p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="teacher-class-add-student-title" className="text-xl font-semibold text-slate-950">
                  Them hoc vien vao lop
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Nhap email hoc vien de cap nhat roster ngay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                aria-label="Dong"
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-6 block text-sm font-medium text-slate-700">
              Email hoc vien
              <input
                type="email"
                value={studentEmail}
                onChange={(event) => setStudentEmail(event.target.value)}
                placeholder="student@example.com"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Huy
              </button>
              <button
                type="button"
                onClick={() => void handleAddStudent()}
                className="rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
              >
                Them hoc vien
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDialog && (
        <div className="app-modal-backdrop px-4" onClick={() => setShowBulkDialog(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-class-bulk-add-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="teacher-class-bulk-add-title" className="text-xl font-semibold text-slate-950">
                  Them roster hang loat
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Moi email mot dong. He thong se bo qua dong trung va dong rong.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkDialog(false)}
                aria-label="Dong"
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-6 block text-sm font-medium text-slate-700">
              Danh sach email
              <textarea
                value={bulkEmails}
                onChange={(event) => setBulkEmails(event.target.value)}
                rows={8}
                placeholder={'student1@example.com\nstudent2@example.com'}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowBulkDialog(false)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Huy
              </button>
              <button
                type="button"
                onClick={() => void handleBulkAdd()}
                className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Them tat ca
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={studentToRemove !== null}
        title="Xoa hoc vien khoi lop"
        message={
          studentToRemove
            ? `Ban co chac muon xoa "${studentToRemove.name}" khoi lop "${currentClass?.name || ''}"?`
            : ''
        }
        confirmText="Xoa hoc vien"
        cancelText="Huy"
        variant="danger"
        onCancel={() => setStudentToRemove(null)}
        onConfirm={async () => {
          if (!studentToRemove) return;
          await handleRemoveStudent(studentToRemove.id);
          setStudentToRemove(null);
        }}
      />
    </div>
  );
}

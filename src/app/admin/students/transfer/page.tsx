'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, CheckSquare, Loader2, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';

type Student = {
  id: number;
  name: string;
  email: string;
  student_code?: string | null;
  class_id?: number | null;
  class_name?: string | null;
  total_points?: number | null;
  activity_count?: number | null;
};

type ClassRecord = {
  id: number;
  name: string;
  grade?: string | null;
};

function parseStudentsPayload(payload: any): Student[] {
  const source = payload?.students || payload?.data?.students || [];
  return Array.isArray(source) ? source : [];
}

function parseClassesPayload(payload: any): ClassRecord[] {
  const source = payload?.classes || payload?.data?.classes || [];
  return Array.isArray(source) ? source : [];
}

export default function AdminStudentTransferPage() {
  const { user, loading: authLoading } = useAuth();
  const { push } = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sourceClassId, setSourceClassId] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      push('/login');
      return;
    }

    if (user) {
      void fetchClasses();
    }
  }, [authLoading, push, user]);

  useEffect(() => {
    setSelectedStudentIds([]);
    setTargetClassId('');

    if (!sourceClassId) {
      setStudents([]);
      return;
    }

    void fetchStudents(Number(sourceClassId));
  }, [sourceClassId]);

  async function fetchClasses() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/classes?page=1&limit=1000');
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai danh sach lop');
      }

      setClasses(parseClassesPayload(payload));
    } catch (error) {
      console.error('Fetch transfer classes error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai danh sach lop');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudents(classId: number) {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/students?page=1&limit=500&class_id=${classId}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai roster hoc vien');
      }

      setStudents(parseStudentsPayload(payload));
    } catch (error) {
      console.error('Fetch transfer students error:', error);
      setStudents([]);
      toast.error(error instanceof Error ? error.message : 'Khong the tai roster hoc vien');
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;

    return students.filter((student) =>
      [student.name, student.email, student.student_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [searchQuery, students]);

  const targetClassOptions = useMemo(
    () => classes.filter((item) => String(item.id) !== sourceClassId),
    [classes, sourceClassId]
  );

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedStudentIds.includes(student.id));

  const selectedStudents = students.filter((student) => selectedStudentIds.includes(student.id));
  const sourceClass = classes.find((item) => String(item.id) === sourceClassId) || null;
  const targetClass = classes.find((item) => String(item.id) === targetClassId) || null;

  function toggleStudent(studentId: number) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      setSelectedStudentIds((current) =>
        current.filter((id) => !filteredStudents.some((student) => student.id === id))
      );
      return;
    }

    const next = new Set(selectedStudentIds);
    filteredStudents.forEach((student) => next.add(student.id));
    setSelectedStudentIds(Array.from(next));
  }

  async function handleTransfer() {
    if (!targetClassId || selectedStudentIds.length === 0) {
      toast.error('Chon hoc vien va lop dich truoc khi tiep tuc');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/students/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          targetClassId: Number(targetClassId),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the chuyen lop hoc vien');
      }

      toast.success(payload?.message || `Da chuyen ${selectedStudentIds.length} hoc vien`);
      setShowConfirmDialog(false);
      setSelectedStudentIds([]);
      await fetchStudents(Number(sourceClassId));
    } catch (error) {
      console.error('Transfer students error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the chuyen lop hoc vien');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading && classes.length === 0 && !sourceClassId) {
    return <LoadingSpinner message="Dang tai cong cu chuyen lop..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                Student transfer
              </div>
              <h1
                className="mt-3 text-3xl font-bold text-slate-900"
                data-testid="admin-student-transfer-heading"
              >
                Dieu chuyen hoc vien giua cac lop
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Chon lop nguon, doi soat roster va chuyen hoc vien sang lop dich trong mot luong van hanh duy nhat.
              </p>
            </div>

            <button
              type="button"
              onClick={() => push('/admin/classes')}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ve quan ly lop
            </button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
          <div className="space-y-6">
            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <h2 className="text-lg font-semibold text-slate-900">1. Chon lop nguon va lop dich</h2>
              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Lop nguon</span>
                  <select
                    value={sourceClassId}
                    onChange={(event) => setSourceClassId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  >
                    <option value="">Chon lop nguon</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name} {classItem.grade ? `(${classItem.grade})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Lop dich</span>
                  <select
                    value={targetClassId}
                    onChange={(event) => setTargetClassId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                    disabled={!sourceClassId}
                  >
                    <option value="">Chon lop dich</option>
                    {targetClassOptions.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name} {classItem.grade ? `(${classItem.grade})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <h2 className="text-lg font-semibold text-slate-900">2. Preview dieu chuyen</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lop nguon</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {sourceClass?.name || 'Chua chon'}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lop dich</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {targetClass?.name || 'Chua chon'}
                  </div>
                </div>
                <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Hoc vien da chon
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {selectedStudentIds.length}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={!sourceClassId || !targetClassId || selectedStudentIds.length === 0 || submitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                Chuyen roster da chon
              </button>
            </section>
          </div>

          <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">3. Chon hoc vien can chuyen</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {sourceClassId
                    ? `Dang hien thi ${filteredStudents.length} / ${students.length} hoc vien trong lop nguon.`
                    : 'Chon lop nguon de tai roster.'}
                </p>
              </div>

              <button
                type="button"
                onClick={toggleAllFiltered}
                disabled={filteredStudents.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <CheckSquare className="h-4 w-4" />
                {allFilteredSelected ? 'Bo chon tat ca' : 'Chon tat ca'}
              </button>
            </div>

            <div className="mt-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Tim kiem roster</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Ten, email, ma hoc vien..."
                    className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-900"
                    disabled={!sourceClassId}
                  />
                </div>
              </label>
            </div>

            {!sourceClassId ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                Chon lop nguon de bat dau doi soat roster.
              </div>
            ) : loading ? (
              <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Dang tai roster...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                Khong co hoc vien phu hop voi bo loc hien tai.
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-4 xl:hidden">
                  {filteredStudents.map((student) => (
                    <label
                      key={student.id}
                      className="flex cursor-pointer items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        aria-label={`Chon hoc vien ${student.name}`}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">{student.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{student.email}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            {student.student_code || 'Khong co ma'}
                          </span>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                            {student.total_points || 0} diem
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-6 hidden overflow-x-auto xl:block">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Chon
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Hoc vien
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Ma
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Diem
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Hoat dong
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(student.id)}
                              onChange={() => toggleStudent(student.id)}
                              aria-label={`Chon hoc vien ${student.name}`}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-slate-900">{student.name}</div>
                            <div className="mt-1 text-sm text-slate-500">{student.email}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {student.student_code || 'Khong co ma'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">
                            {student.total_points || 0}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-slate-600">
                            {student.activity_count || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </section>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Xac nhan chuyen roster"
        message={`Ban sap chuyen ${selectedStudentIds.length} hoc vien tu ${
          sourceClass?.name || 'lop nguon'
        } sang ${targetClass?.name || 'lop dich'}.`}
        confirmText="Xac nhan chuyen"
        cancelText="Dong"
        variant="info"
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={handleTransfer}
      />
    </div>
  );
}

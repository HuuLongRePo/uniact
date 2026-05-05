'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, RefreshCw, Repeat2, ShieldAlert, UserMinus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/lib/debounce-hooks';
import { formatVietnamDateTime, toVietnamDateStamp } from '@/lib/timezone';
import StudentFilters from './StudentFilters';
import Stats from './Stats';
import StudentTable from './StudentTable';
import TransferDialog from './TransferDialog';
import { Class, Student, StudentSummary } from './types';

function parseClassPayload(payload: any): Class | null {
  const record = payload?.data?.class || payload?.class || payload?.data || null;
  return record && typeof record === 'object' ? (record as Class) : null;
}

function parseStudentsPayload(payload: any) {
  const students = payload?.data?.students || payload?.students || payload?.data || [];
  const classSummary = payload?.data?.classSummary || payload?.classSummary || null;
  const pagination = payload?.data?.pagination || payload?.pagination || {};

  return {
    students: Array.isArray(students) ? (students as Student[]) : [],
    classSummary:
      classSummary && typeof classSummary === 'object' ? (classSummary as StudentSummary) : null,
    totalPages: Number(pagination.totalPages || 1),
  };
}

function parseClassesPayload(payload: any) {
  const classes = payload?.data?.classes || payload?.classes || payload?.data || [];
  return Array.isArray(classes) ? (classes as Class[]) : [];
}

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function ClassStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [isClassLoading, setIsClassLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classSummary, setClassSummary] = useState<StudentSummary | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [targetClassId, setTargetClassId] = useState<number | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [studentToMove, setStudentToMove] = useState<Student | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [showBulkRemoveDialog, setShowBulkRemoveDialog] = useState(false);
  const [showBulkTransferDialog, setShowBulkTransferDialog] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const effectiveSearch = debouncedSearch.trim();
  const pageSize = 20;

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user?.id, user?.role]);

  const fetchClassInfo = useCallback(async () => {
    try {
      setIsClassLoading(true);
      const res = await fetch(`/api/admin/classes/${classId}`);
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai thong tin lop');
      }

      setClassInfo(parseClassPayload(payload));
    } catch (error) {
      console.error('Fetch class info error:', error);
      setClassInfo(null);
      toast.error(error instanceof Error ? error.message : 'Khong the tai thong tin lop');
    } finally {
      setIsClassLoading(false);
    }
  }, [classId]);

  const fetchStudents = useCallback(async () => {
    try {
      setIsListLoading(true);

      const query = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        class_id: classId,
      });

      if (effectiveSearch.length >= 2) {
        query.set('search', effectiveSearch);
      }

      const res = await fetch(`/api/admin/students?${query.toString()}`);
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai roster hoc vien');
      }

      const parsed = parseStudentsPayload(payload);
      setStudents(parsed.students);
      setClassSummary(parsed.classSummary);
      setTotalPages(parsed.totalPages);
      setSelectedStudents(new Set());
    } catch (error) {
      console.error('Fetch students error:', error);
      setStudents([]);
      setClassSummary(null);
      setTotalPages(1);
      toast.error(error instanceof Error ? error.message : 'Khong the tai roster hoc vien');
    } finally {
      setIsListLoading(false);
    }
  }, [classId, effectiveSearch, page]);

  const fetchAllClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/classes?page=1&limit=1000');
      const payload = await res.json().catch(() => null);
      if (!res.ok) return;

      setAllClasses(
        parseClassesPayload(payload).filter((item) => String(item.id) !== String(classId))
      );
    } catch (error) {
      console.error('Fetch all classes error:', error);
    }
  }, [classId]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    void fetchClassInfo();
  }, [fetchClassInfo, user?.id, user?.role]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (effectiveSearch.length === 1) return;
    void fetchStudents();
  }, [effectiveSearch, fetchStudents, user?.id, user?.role]);

  const totalSelected = selectedStudents.size;
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const classMeta = useMemo(() => {
    if (!classInfo) {
      return {
        className: `Lop #${classId}`,
        grade: '-',
        teacherName: 'Chua gan GVCN',
      };
    }

    const teacherName =
      classInfo.teachers && classInfo.teachers.length > 0
        ? classInfo.teachers.map((teacher) => teacher.name).join(', ')
        : classInfo.teacher_name || 'Chua gan GVCN';

    return {
      className: classInfo.name,
      grade: classInfo.grade || '-',
      teacherName,
    };
  }, [classId, classInfo]);

  function toggleSelectAll() {
    if (students.length === 0) return;
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
      return;
    }

    setSelectedStudents(new Set(students.map((student) => student.id)));
  }

  function toggleSelectStudent(studentId: number) {
    setSelectedStudents((current) => {
      const next = new Set(current);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }

  async function handleRemoveStudent(student: Student) {
    try {
      const res = await fetch(`/api/admin/classes/${classId}/students/${student.id}`, {
        method: 'DELETE',
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the xoa hoc vien khoi lop');
      }

      toast.success(payload?.message || `Da xoa ${student.name} khoi lop`);
      await fetchStudents();
    } catch (error) {
      console.error('Remove student error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the xoa hoc vien khoi lop');
    }
  }

  async function handleBulkRemove() {
    try {
      const ids = Array.from(selectedStudents);
      const results = await Promise.all(
        ids.map((studentId) =>
          fetch(`/api/admin/classes/${classId}/students/${studentId}`, { method: 'DELETE' })
        )
      );
      const successCount = results.filter((item) => item.ok).length;

      toast.success(`Da xoa ${successCount}/${ids.length} hoc vien khoi lop`);
      setShowBulkRemoveDialog(false);
      await fetchStudents();
    } catch (error) {
      console.error('Bulk remove students error:', error);
      toast.error('Khong the xoa hoc vien hang loat');
    }
  }

  async function handleMoveStudent() {
    if (!studentToMove || !targetClassId) {
      toast.error('Vui long chon lop dich');
      return;
    }

    try {
      const res = await fetch('/api/admin/students/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: [studentToMove.id],
          targetClassId,
        }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the chuyen lop');
      }

      toast.success(payload?.message || `Da chuyen ${studentToMove.name} sang lop moi`);
      setShowMoveDialog(false);
      setStudentToMove(null);
      setTargetClassId(null);
      await fetchStudents();
    } catch (error) {
      console.error('Move student error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the chuyen lop');
    }
  }

  async function handleBulkTransfer() {
    if (!targetClassId || totalSelected === 0) {
      toast.error('Vui long chon hoc vien va lop dich');
      return;
    }

    try {
      const res = await fetch('/api/admin/students/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          targetClassId,
        }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the chuyen lop hang loat');
      }

      toast.success(payload?.message || `Da chuyen ${totalSelected} hoc vien`);
      setShowBulkTransferDialog(false);
      setTargetClassId(null);
      await fetchStudents();
    } catch (error) {
      console.error('Bulk transfer students error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the chuyen lop hang loat');
    }
  }

  function handleExportSelected() {
    if (totalSelected === 0) {
      toast.error('Chua chon hoc vien nao');
      return;
    }

    const selectedData = students.filter((student) => selectedStudents.has(student.id));
    const csv = [
      ['ID', 'Ma hoc vien', 'Ho ten', 'Email', 'Hoat dong', 'Co mat', 'Tong diem', 'Ngay tao'].join(','),
      ...selectedData.map((student) =>
        [
          escapeCsvCell(student.id),
          escapeCsvCell(student.student_code || ''),
          escapeCsvCell(student.name),
          escapeCsvCell(student.email),
          escapeCsvCell(student.activity_count || 0),
          escapeCsvCell(student.attended_count || 0),
          escapeCsvCell(student.total_points || 0),
          escapeCsvCell(student.created_at ? formatVietnamDateTime(student.created_at, 'date') : '-'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `class-${classId}-students-${toVietnamDateStamp(new Date())}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success(`Da xuat ${totalSelected} hoc vien`);
  }

  if (authLoading) {
    return <LoadingSpinner message="Dang tai roster lop hoc..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
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
              Class roster
            </p>
            <h1 data-testid="admin-class-students-heading" className="mt-3 text-3xl font-semibold text-slate-950">
              Roster hoc vien
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Admin co the doi soat roster, xuat danh sach, chuyen lop va go hoc vien khoi lop ngay tai mot page van hanh.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void fetchClassInfo();
              void fetchStudents();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Tai lai
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-cyan-800">Lop hoc</div>
            <div className="mt-3 text-2xl font-semibold text-cyan-950">
              {isClassLoading ? 'Dang tai...' : classMeta.className}
            </div>
            <div className="mt-2 text-sm text-cyan-900">Khoi / khoa: {classMeta.grade}</div>
          </div>
          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-800">GVCN / phu trach</div>
            <div className="mt-3 text-lg font-semibold text-violet-950">{classMeta.teacherName}</div>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <ShieldAlert className="h-4 w-4" />
              Van hanh roster
            </div>
            <div className="mt-3 text-sm leading-6 text-amber-950">
              Tim hoc vien theo ten, email hoac ma. Chon nhieu hoc vien de chuyen lop hoac go khoi roster nhanh hon.
            </div>
          </div>
        </div>
      </section>

      {totalSelected > 0 && (
        <section className="rounded-[2rem] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-cyan-950">Da chon {totalSelected} hoc vien</div>
              <p className="mt-1 text-sm text-cyan-800">
                Ban co the xuat CSV, chuyen sang lop khac hoac go khoi roster hien tai.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExportSelected} variant="success" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                Xuat CSV
              </Button>
              <Button
                onClick={async () => {
                  await fetchAllClasses();
                  setShowBulkTransferDialog(true);
                }}
                size="sm"
                leftIcon={<Repeat2 className="h-4 w-4" />}
              >
                Chuyen lop
              </Button>
              <Button
                onClick={() => setShowBulkRemoveDialog(true)}
                variant="danger"
                size="sm"
                leftIcon={<UserMinus className="h-4 w-4" />}
              >
                Xoa khoi lop
              </Button>
            </div>
          </div>
        </section>
      )}

      <Stats summary={classSummary} />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <StudentFilters
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />

        <div className="mt-6">
          <StudentTable
            students={students}
            loading={isListLoading}
            page={page}
            pageSize={pageSize}
            selectedStudents={selectedStudents}
            onToggleSelectAll={toggleSelectAll}
            onToggleSelectStudent={toggleSelectStudent}
            onView={(student) => router.push(`/admin/students/${student.id}`)}
            onMove={async (student) => {
              setStudentToMove(student);
              setTargetClassId(null);
              await fetchAllClasses();
              setShowMoveDialog(true);
            }}
            onRemove={(student) => {
              setStudentToRemove(student);
              setShowRemoveDialog(true);
            }}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Dang hien thi {students.length} hoc vien trong trang {page}/{totalPages}.
          </div>
          <div className="flex items-center gap-2">
            <Button
              disabled={!canGoPrev || isListLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              variant="secondary"
              size="sm"
            >
              Trang truoc
            </Button>
            <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              {page}/{totalPages}
            </span>
            <Button
              disabled={!canGoNext || isListLoading}
              onClick={() => setPage((current) => current + 1)}
              variant="secondary"
              size="sm"
            >
              Trang sau
            </Button>
          </div>
        </div>
      </section>

      <TransferDialog
        isOpen={showMoveDialog}
        title="Chuyen hoc vien sang lop khac"
        subjectLabel={studentToMove ? `${studentToMove.name} (${studentToMove.email})` : ''}
        classes={allClasses}
        targetClassId={targetClassId}
        onTargetClassChange={setTargetClassId}
        onConfirm={handleMoveStudent}
        onCancel={() => {
          setShowMoveDialog(false);
          setStudentToMove(null);
          setTargetClassId(null);
        }}
      />

      <TransferDialog
        isOpen={showBulkTransferDialog}
        title="Chuyen hoc vien da chon"
        subjectLabel={`${totalSelected} hoc vien`}
        classes={allClasses}
        targetClassId={targetClassId}
        onTargetClassChange={setTargetClassId}
        onConfirm={handleBulkTransfer}
        onCancel={() => {
          setShowBulkTransferDialog(false);
          setTargetClassId(null);
        }}
        confirmText="Chuyen lop"
      />

      <ConfirmDialog
        isOpen={showRemoveDialog}
        title="Xoa hoc vien khoi lop"
        message={studentToRemove ? `Ban co chac muon go ${studentToRemove.name} khoi roster lop nay?` : ''}
        confirmText="Xoa khoi lop"
        cancelText="Huy"
        variant="danger"
        onConfirm={async () => {
          if (!studentToRemove) return;
          await handleRemoveStudent(studentToRemove);
          setShowRemoveDialog(false);
          setStudentToRemove(null);
        }}
        onCancel={() => {
          setShowRemoveDialog(false);
          setStudentToRemove(null);
        }}
      />

      <ConfirmDialog
        isOpen={showBulkRemoveDialog}
        title="Xoa hoc vien da chon"
        message={`Ban co chac muon go ${totalSelected} hoc vien khoi roster lop nay?`}
        confirmText="Xoa khoi lop"
        cancelText="Huy"
        variant="danger"
        onConfirm={handleBulkRemove}
        onCancel={() => setShowBulkRemoveDialog(false)}
      />
    </div>
  );
}

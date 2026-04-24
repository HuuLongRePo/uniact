'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import StudentTable from './StudentTable';
import Stats from './Stats';
import { Student, Class, StudentSummary } from './types';
import StudentFilters from './StudentFilters';
import { useDebounce } from '@/lib/debounce-hooks';
import TransferDialog from './TransferDialog';
import { toVietnamDateStamp } from '@/lib/timezone';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClassStudentsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const classId = resolvedParams.id;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [isClassLoading, setIsClassLoading] = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');

  const [isListLoading, setIsListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [classSummary, setClassSummary] = useState<StudentSummary | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const effectiveSearch = debouncedSearch.trim();

  // Bulk selection
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());

  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [studentToMove, setStudentToMove] = useState<Student | null>(null);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [targetClassId, setTargetClassId] = useState<number | null>(null);

  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);

  const [showBulkRemoveDialog, setShowBulkRemoveDialog] = useState(false);
  const [showBulkTransferDialog, setShowBulkTransferDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (!user) return;
    // Avoid loading for 1-character queries; wait for at least 2 chars.
    if (effectiveSearch.length === 1) return;

    void fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router, classId, effectiveSearch, page]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') return;
    fetchClassInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, classId]);

  const fetchClassInfo = async () => {
    try {
      setIsClassLoading(true);
      const res = await fetch(`/api/admin/classes/${classId}`);
      const data = await res.json();
      if (res.ok && data?.success) {
        setClassInfo(data.data || null);
      } else {
        setClassInfo(null);
        toast.error(data?.error || 'Không thể tải thông tin lớp');
      }
    } catch (error) {
      console.error('Fetch class info error:', error);
      setClassInfo(null);
      toast.error('Lỗi khi tải thông tin lớp');
    } finally {
      setIsClassLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setIsListLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        class_id: classId,
        ...(effectiveSearch.length >= 2 && { search: effectiveSearch }),
      });
      const response = await fetch(`/api/admin/students?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setStudents(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setClassSummary(data.classSummary || null);
        setSelectedStudents(new Set());
      } else {
        toast.error(data.error || 'Không thể tải danh sách học viên');
      }
    } catch (error) {
      console.error('Fetch students error:', error);
      toast.error('Lỗi khi tải danh sách học viên');
    } finally {
      setIsListLoading(false);
    }
  };

  const handleRemoveStudent = async (student: Student) => {
    try {
      const response = await fetch(`/api/admin/classes/${classId}/students/${student.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Đã xóa học viên khỏi lớp');
        fetchStudents();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Không thể xóa học viên');
      }
    } catch (error) {
      console.error('Remove student error:', error);
      toast.error('Lỗi khi xóa học viên');
    }
  };

  const handleBulkRemove = async () => {
    if (selectedStudents.size === 0) return;

    try {
      const ids = Array.from(selectedStudents);
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/admin/classes/${classId}/students/${id}`, { method: 'DELETE' }))
      );
      const successCount = results.filter((r) => r.ok).length;
      toast.success(`Đã xóa ${successCount}/${ids.length} học viên khỏi lớp`);
      setShowBulkRemoveDialog(false);
      fetchStudents();
    } catch (error) {
      console.error('Bulk remove error:', error);
      toast.error('Lỗi khi xóa hàng loạt');
    }
  };

  const fetchAllClasses = async () => {
    try {
      const response = await fetch('/api/admin/classes?page=1&limit=1000');
      const data = await response.json();

      if (response.ok) {
        const otherClasses = (data.data || []).filter(
          (c: Class) => String(c.id) !== String(classId)
        );
        setAllClasses(otherClasses);
      }
    } catch (error) {
      console.error('Fetch classes error:', error);
    }
  };

  const handleMoveStudent = async () => {
    if (!studentToMove || !targetClassId) {
      toast.error('Vui lòng chọn lớp đích');
      return;
    }

    try {
      const response = await fetch(`/api/admin/students/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: [studentToMove.id],
          targetClassId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Đã chuyển lớp thành công');
        fetchStudents();
        setShowMoveDialog(false);
        setStudentToMove(null);
        setTargetClassId(null);
      } else {
        toast.error(data.error || 'Không thể chuyển lớp');
      }
    } catch (error) {
      console.error('Move student error:', error);
      toast.error('Lỗi khi chuyển lớp');
    }
  };

  const handleBulkTransfer = async () => {
    if (!targetClassId || selectedStudents.size === 0) {
      toast.error('Vui lòng chọn học viên và lớp đích');
      return;
    }

    try {
      const res = await fetch(`/api/admin/students/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          targetClassId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Đã chuyển ${selectedStudents.size} học viên`);
        setShowBulkTransferDialog(false);
        setTargetClassId(null);
        fetchStudents();
      } else {
        toast.error(data.error || 'Không thể chuyển lớp');
      }
    } catch (error) {
      console.error('Bulk transfer error:', error);
      toast.error('Lỗi khi chuyển lớp hàng loạt');
    }
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map((s) => s.id)));
    }
  };

  const toggleSelectStudent = (studentId: number) => {
    const next = new Set(selectedStudents);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    setSelectedStudents(next);
  };

  const handleExportSelected = () => {
    if (selectedStudents.size === 0) {
      toast.error('Chưa chọn học viên nào');
      return;
    }

    const selectedData = students.filter((s) => selectedStudents.has(s.id));
    const headers = ['ID', 'Họ tên', 'Email', 'Điểm', 'Ngày tạo'].join(',');
    const rows = selectedData.map((s) => {
      const values = [
        s.id,
        `"${(s.name ?? '').replaceAll('"', '""')}"`,
        s.email ?? '',
        s.total_points ?? 0,
        s.created_at ?? '',
      ];
      return values.join(',');
    });

    const csv = ['\ufeff' + headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `class-${classId}-students-export-${toVietnamDateStamp(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Đã xuất ${selectedStudents.size} học viên`);
  };

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;
  const pageSize = 20;
  const paginationLabel = useMemo(() => {
    // Keep list UI minimal; stats above already show whole-class totals.
    return '';
  }, []);

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 mb-2">
            ← Quay lại
          </button>
          <h1 className="text-3xl font-bold">Danh sách học viên lớp</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        {isClassLoading ? (
          <div className="text-sm text-gray-600">Đang tải thông tin lớp...</div>
        ) : classInfo ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-gray-600">Lớp:</span>{' '}
              <span className="font-medium text-gray-900">{classInfo.name}</span>
            </div>
            <div>
              <span className="text-gray-600">Khối/Lớp:</span>{' '}
              <span className="font-medium text-gray-900">{classInfo.grade || '-'}</span>
            </div>
            <div>
              <span className="text-gray-600">GVCN:</span>{' '}
              <span className="font-medium text-gray-900">
                {classInfo.teacher_name || 'Chưa có'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Không thể tải thông tin lớp.</div>
        )}
      </div>

      {selectedStudents.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium text-blue-900">
              ✓ Đã chọn {selectedStudents.size} học viên
            </span>
            <button
              onClick={() => setSelectedStudents(new Set())}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Bỏ chọn tất cả
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportSelected} variant="success">
              Xuất CSV
            </Button>
            <Button
              onClick={async () => {
                await fetchAllClasses();
                setShowBulkTransferDialog(true);
              }}
              variant="primary"
            >
              Chuyển lớp
            </Button>
            <Button onClick={() => setShowBulkRemoveDialog(true)} variant="danger">
              Xóa khỏi lớp
            </Button>
          </div>
        </div>
      )}

      <Stats summary={classSummary} />

      <StudentFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />

      {paginationLabel && <div className="text-sm text-gray-600 mb-3">{paginationLabel}</div>}

      <StudentTable
        students={students}
        loading={isListLoading}
        page={page}
        pageSize={pageSize}
        selectedStudents={selectedStudents}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelectStudent={toggleSelectStudent}
        onView={(student) => router.push(`/admin/users/${student.id}`)}
        onMove={(student) => {
          setStudentToMove(student);
          fetchAllClasses();
          setShowMoveDialog(true);
        }}
        onRemove={(student) => {
          setStudentToRemove(student);
          setShowRemoveDialog(true);
        }}
      />

      <div className="flex justify-between items-center mt-4">
        <Button
          disabled={!canGoPrev || isListLoading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          variant="secondary"
        >
          ← Trang trước
        </Button>
        <div className="text-sm text-gray-600">
          {page}/{totalPages}
        </div>
        <Button
          disabled={!canGoNext || isListLoading}
          onClick={() => setPage((p) => p + 1)}
          variant="secondary"
        >
          Trang sau →
        </Button>
      </div>

      <TransferDialog
        isOpen={showMoveDialog}
        title="Chuyển học viên sang lớp khác"
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

      <ConfirmDialog
        isOpen={showRemoveDialog}
        title="Xóa học viên khỏi lớp"
        message={studentToRemove ? `Xóa ${studentToRemove.name} khỏi lớp này?` : ''}
        confirmText="Xóa"
        cancelText="Hủy"
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
        title="Xóa học viên khỏi lớp"
        message={`Xóa ${selectedStudents.size} học viên đã chọn khỏi lớp này?`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={handleBulkRemove}
        onCancel={() => setShowBulkRemoveDialog(false)}
      />

      <TransferDialog
        isOpen={showBulkTransferDialog}
        title="Chuyển học viên đã chọn"
        subjectLabel={`${selectedStudents.size} học viên`}
        classes={allClasses}
        targetClassId={targetClassId}
        onTargetClassChange={setTargetClassId}
        onConfirm={handleBulkTransfer}
        onCancel={() => {
          setShowBulkTransferDialog(false);
          setTargetClassId(null);
        }}
        confirmText="Chuyển lớp"
      />
    </div>
  );
}

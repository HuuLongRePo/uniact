'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useDebounce } from '@/lib/debounce-hooks';
import ClassFilters from './ClassFilters';
import ClassTable from './ClassTable';
import AssignTeacherDialog from './AssignTeacherDialog';
import ClassDialog from './ClassDialog';
import ClassViewDialog from './ClassViewDialog';
import { Class, Teacher } from './types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type TeacherApiUser = {
  id: number;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

/**
 * REFACTORED (Phase 6 - Classes Module):
 * Original 403-line classes page split into focused components:
 * - ClassFilters.tsx: Search & filter classes
 * - ClassTable.tsx: Display class grid with actions
 * - AssignTeacherDialog.tsx: GVCN assignment modal
 * - types.ts: Shared types
 * - page.tsx: Main page with API & state management
 *
 * Benefits:
 * ✅ Tránh reload khung search/filter khi search (debounce + component riêng)
 * ✅ Reduced file complexity (403L → ~180L + 3 components)
 * ✅ Consistent with Users module pattern
 * ✅ Better performance with debounced search
 */
export default function AdminClassesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [viewClass, setViewClass] = useState<Class | null>(null);
  const [editClass, setEditClass] = useState<Class | null>(null);
  const [deleteClass, setDeleteClass] = useState<Class | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const debouncedGrade = useDebounce(gradeFilter, 400);
  const effectiveSearch = debouncedSearch.trim();
  const effectiveGrade = debouncedGrade.trim();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchTeachers();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    // Avoid loading for 1-character queries
    if (effectiveSearch.length === 1 || effectiveGrade.length === 1) return;
    void fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, effectiveSearch, effectiveGrade, teacherFilter]);

  const fetchClasses = async () => {
    try {
      setIsListLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: '30',
      });

      if (effectiveSearch.length >= 2) params.set('search', effectiveSearch);
      if (effectiveGrade.length >= 2) params.set('grade', effectiveGrade);
      if (teacherFilter !== '') params.set('teacher_id', String(teacherFilter));

      const response = await fetch(`/api/admin/classes?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setClasses(data.classes || data.data?.classes || data.data || []);
        setTotalPages(data.pagination?.totalPages || data.data?.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Fetch classes error:', error);
      toast.error('Không thể tải danh sách lớp học');
    } finally {
      setIsListLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=teacher&page=1&limit=1000');
      const data = await response.json();

      if (response.ok) {
        const list = (data.users || data.data?.users || data.data || []) as TeacherApiUser[];
        setTeachers(
          list.map((t) => ({
            id: t.id,
            name: t.full_name || t.name,
            email: t.email,
          }))
        );
      }
    } catch (error) {
      console.error('Fetch teachers error:', error);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedClass || !selectedTeacherId) {
      toast.error('Vui lòng chọn giảng viên');
      return;
    }

    try {
      const response = await fetch(`/api/admin/classes/${selectedClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: selectedTeacherId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Đã gán GVCN thành công');
        fetchClasses();
        setSelectedClass(null);
        setSelectedTeacherId(null);
      } else {
        toast.error(data.error || 'Không thể gán GVCN');
      }
    } catch (error) {
      console.error('Assign teacher error:', error);
      toast.error('Lỗi khi gán GVCN');
    }
  };

  const performDelete = async (classId: number) => {
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Xóa lớp học thành công');
        fetchClasses();
      } else {
        toast.error(data.error || data.message || 'Xóa thất bại');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Lỗi khi xóa lớp học');
    }
  };

  const handleExport = async (classId: number, className: string) => {
    try {
      toast.loading('Đang xuất danh sách...', { duration: 1000 });

      const response = await fetch(`/api/classes/${classId}/export`);

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Xuất danh sách thất bại');
        return;
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Danh-sach-lop-${className.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Đã xuất danh sách thành công');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất danh sách');
    }
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 data-testid="classes-heading" className="text-2xl sm:text-3xl font-bold">
          🏫 Quản Lý Lớp Học
        </h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="sm:hidden px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          + Thêm Lớp
        </button>
      </div>

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

      <ClassTable
        classes={classes}
        loading={isListLoading}
        onView={(cls) => setViewClass(cls)}
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
        onDelete={(cls) => setDeleteClass(cls)}
      />

      <ClassDialog
        isOpen={showCreateForm}
        mode="create"
        teachers={teachers}
        loading={isSavingClass}
        onClose={() => setShowCreateForm(false)}
        onSave={async (classData) => {
          try {
            setIsSavingClass(true);
            const res = await fetch('/api/admin/classes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(classData),
            });

            const data = await res.json();

            if (res.ok) {
              toast.success('Đã tạo lớp học');
              setShowCreateForm(false);
              // Refresh list; keep current filters.
              fetchClasses();
            } else {
              toast.error(data.error || 'Không thể tạo lớp học');
            }
          } catch (error) {
            console.error('Create class error:', error);
            toast.error('Lỗi khi tạo lớp học');
          } finally {
            setIsSavingClass(false);
          }
        }}
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
        onSave={async (classData) => {
          if (!editClass) return;
          try {
            setIsSavingClass(true);
            const res = await fetch(`/api/admin/classes/${editClass.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(classData),
            });

            const data = await res.json();

            if (res.ok) {
              toast.success(data.message || 'Đã cập nhật lớp học');
              setShowEditForm(false);
              setEditClass(null);
              fetchClasses();
            } else {
              toast.error(data.error || 'Không thể cập nhật lớp học');
            }
          } catch (error) {
            console.error('Update class error:', error);
            toast.error('Lỗi khi cập nhật lớp học');
          } finally {
            setIsSavingClass(false);
          }
        }}
      />

      <ClassViewDialog isOpen={!!viewClass} cls={viewClass} onClose={() => setViewClass(null)} />

      <ConfirmDialog
        isOpen={!!deleteClass}
        title="Xác nhận xóa lớp"
        message={deleteClass ? `Bạn có chắc muốn xóa lớp "${deleteClass.name}"?` : ''}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setDeleteClass(null)}
        onConfirm={async () => {
          if (!deleteClass) return;
          await performDelete(deleteClass.id);
          setDeleteClass(null);
        }}
      />

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            className="px-4 py-2 border rounded disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trang trước
          </button>
          <span className="text-sm text-gray-600">
            Trang {page} / {totalPages}
          </span>
          <button
            className="px-4 py-2 border rounded disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Trang sau
          </button>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">Tổng số: {classes.length} lớp học</div>

      <AssignTeacherDialog
        selectedClass={selectedClass}
        teachers={teachers}
        selectedTeacherId={selectedTeacherId}
        onTeacherSelect={setSelectedTeacherId}
        onConfirm={handleAssignTeacher}
        onCancel={() => {
          setSelectedClass(null);
          setSelectedTeacherId(null);
        }}
      />
    </div>
  );
}

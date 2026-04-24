'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Download, Upload, Plus, X, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toVietnamDateStamp } from '@/lib/timezone';

interface Class {
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

function normalizeClass(raw: any): Class {
  const id = Number(raw?.id);
  const studentCount = Number(raw?.studentCount ?? raw?.student_count ?? 0);
  const isHomeroomClass = Boolean(raw?.isHomeroomClass ?? raw?.is_homeroom_class ?? false);
  const teacherClassRole = String(
    raw?.teacherClassRole ?? raw?.teacher_class_role ?? (isHomeroomClass ? 'primary' : 'none')
  );
  const canEdit = Boolean(
    raw?.canEdit ?? raw?.can_edit ?? (isHomeroomClass || teacherClassRole === 'admin')
  );

  return {
    id,
    name: String(raw?.name ?? ''),
    grade: String(raw?.grade ?? ''),
    studentCount: Number.isFinite(studentCount) ? studentCount : 0,
    isHomeroomClass,
    teacherClassRole,
    canEdit,
  };
}

export default function TeacherClassManagementPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<StudentToRemove>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    const selected = classes.find((cls) => cls.id === selectedClass);
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
      if (res.ok) {
        const data = await res.json();
        const normalizedClasses = Array.isArray(data.classes)
          ? data.classes.map(normalizeClass).filter((cls) => Number.isInteger(cls.id) && cls.id > 0)
          : [];

        setClasses(normalizedClasses);

        if (normalizedClasses.length > 0) {
          setSelectedClass((previous) =>
            previous && normalizedClasses.some((cls) => cls.id === previous)
              ? previous
              : normalizedClasses[0].id
          );
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Không thể tải danh sách lớp');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudents(classId: number) {
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Không thể tải danh sách sinh viên');
    }
  }

  async function handleAddStudent() {
    if (!studentEmail.trim() || !selectedClass) return;
    const selected = classes.find((cls) => cls.id === selectedClass);
    if (!selected?.canEdit) {
      toast.error('Bạn chỉ có quyền chỉnh sửa lớp do mình chủ nhiệm');
      return;
    }

    try {
      const res = await fetch(`/api/teacher/classes/${selectedClass}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail.trim() }),
      });

      if (res.ok) {
        toast.success('Thêm sinh viên thành công!');
        setStudentEmail('');
        setShowAddDialog(false);
        fetchStudents(selectedClass);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Thêm sinh viên thất bại');
      }
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Thêm sinh viên thất bại');
    }
  }

  async function handleBulkAdd() {
    if (!bulkEmails.trim() || !selectedClass) return;
    const selected = classes.find((cls) => cls.id === selectedClass);
    if (!selected?.canEdit) {
      toast.error('Bạn chỉ có quyền chỉnh sửa lớp do mình chủ nhiệm');
      return;
    }

    const emails = bulkEmails
      .split('\n')
      .map((e) => e.trim())
      .filter((e) => e);
    if (emails.length === 0) {
      toast.error('Vui lòng nhập ít nhất một email');
      return;
    }

    try {
      const res = await fetch(`/api/teacher/classes/${selectedClass}/students/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Thêm thành công ${data.added || emails.length} sinh viên!`);
        setBulkEmails('');
        setShowBulkDialog(false);
        fetchStudents(selectedClass);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Thêm sinh viên thất bại');
      }
    } catch (error) {
      console.error('Error bulk adding students:', error);
      toast.error('Thêm sinh viên thất bại');
    }
  }

  async function handleRemoveStudent(studentId: number) {
    if (!selectedClass) return;
    const selected = classes.find((cls) => cls.id === selectedClass);
    if (!selected?.canEdit) {
      toast.error('Bạn chỉ có quyền chỉnh sửa lớp do mình chủ nhiệm');
      return;
    }

    try {
      const res = await fetch(`/api/teacher/classes/${selectedClass}/students/${studentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Xóa sinh viên thành công!');
        fetchStudents(selectedClass);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Xóa sinh viên thất bại');
      }
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Xóa sinh viên thất bại');
    }
  }

  function exportToCSV() {
    if (students.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const className = classes.find((c) => c.id === selectedClass)?.name || 'class';
    const headers = ['STT', 'Họ tên', 'Email', 'Tổng điểm', 'Số hoạt động'];
    const rows = students.map((s, idx) => [
      idx + 1,
      s.name,
      s.email,
      s.totalPoints,
      s.attendedActivities,
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

    toast.success('Xuất file thành công!');
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const currentClass = classes.find((c) => c.id === selectedClass);
  const canEditCurrentClass = Boolean(currentClass?.canEdit);

  if (loading) {
    return <LoadingSpinner message="Đang tải danh sách lớp..." />;
  }

  if (classes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <EmptyState
          icon={AlertCircle}
          title="Chưa có lớp học"
          description="Bạn chưa được phân công quản lý lớp học nào."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1
                data-testid="classes-heading"
                className="text-3xl font-bold text-gray-800 flex items-center gap-2"
              >
                <Users className="w-8 h-8 text-blue-600" />
                Quản lý lớp học
              </h1>
              <p className="text-gray-600 mt-1">
                Quản lý danh sách sinh viên trong các lớp của bạn
              </p>
            </div>
          </div>

          {/* Class Selector */}
          <div className="flex flex-wrap gap-2">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedClass === cls.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cls.name}
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
                  {cls.studentCount || 0}
                </span>
                {cls.canEdit ? (
                  <span className="ml-2 text-xs opacity-90">(CN)</span>
                ) : (
                  <span className="ml-2 text-xs opacity-80">(Trợ giảng)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Class Statistics */}
        {currentClass && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Tổng sinh viên</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{students.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border-2 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Tổng điểm trung bình</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">
                    {students.length > 0
                      ? (
                          students.reduce((sum, s) => sum + s.totalPoints, 0) / students.length
                        ).toFixed(1)
                      : '0'}
                  </p>
                </div>
                <Check className="w-12 h-12 text-green-500 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Hoạt động trung bình</p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">
                    {students.length > 0
                      ? (
                          students.reduce((sum, s) => sum + s.attendedActivities, 0) /
                          students.length
                        ).toFixed(1)
                      : '0'}
                  </p>
                </div>
                <AlertCircle className="w-12 h-12 text-purple-500 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* Actions & Search */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm sinh viên theo tên hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex gap-2">
              <button
                disabled={!canEditCurrentClass}
                onClick={() => setShowAddDialog(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  canEditCurrentClass
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-5 h-5" />
                Thêm SV
              </button>
              <button
                disabled={!canEditCurrentClass}
                onClick={() => setShowBulkDialog(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  canEditCurrentClass
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Upload className="w-5 h-5" />
                Thêm hàng loạt
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-all"
              >
                <Download className="w-5 h-5" />
                Xuất CSV
              </button>
            </div>
          </div>
          {!canEditCurrentClass && (
            <p className="mt-3 text-sm text-amber-700">
              Lớp đang chọn chỉ có quyền xem. Bạn chỉ được chỉnh sửa lớp do mình chủ nhiệm.
            </p>
          )}
        </div>

        {/* Student List */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Họ tên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng điểm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số hoạt động
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {searchQuery ? 'Không tìm thấy sinh viên nào' : 'Chưa có sinh viên trong lớp'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {student.totalPoints} điểm
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {student.attendedActivities} hoạt động
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          disabled={!canEditCurrentClass}
                          onClick={() =>
                            setStudentToRemove({
                              id: student.id,
                              name: student.name,
                              email: student.email,
                            })
                          }
                          className={
                            canEditCurrentClass
                              ? 'text-red-600 hover:text-red-900 font-medium'
                              : 'text-gray-400 cursor-not-allowed font-medium'
                          }
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Student Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Thêm sinh viên</h3>
              <button
                onClick={() => setShowAddDialog(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email sinh viên
                </label>
                <input
                  type="email"
                  placeholder="student@example.com"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddStudent()}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddStudent}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Dialog */}
      {showBulkDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Thêm hàng loạt</h3>
              <button
                onClick={() => setShowBulkDialog(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Danh sách email (mỗi email một dòng)
                </label>
                <textarea
                  placeholder="student1@example.com&#10;student2@example.com&#10;student3@example.com"
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 Mỗi email một dòng, hệ thống sẽ tự động bỏ qua dòng trống
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBulkAdd}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Thêm tất cả
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={studentToRemove !== null}
        title="Xóa sinh viên khỏi lớp"
        message={
          studentToRemove
            ? `Bạn có chắc chắn muốn xóa sinh viên "${studentToRemove.name}" khỏi lớp "${currentClass?.name || ''}"?`
            : ''
        }
        confirmText="Xóa khỏi lớp"
        cancelText="Hủy"
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

'use client';

import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowLeft, Filter } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function TeacherStudentsPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'attendance'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'teacher')) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchData();
    }
  }, [currentUser, loading, router]);

  const fetchData = async () => {
    try {
      const studentsRes = await fetch('/api/teacher/students');

      if (!studentsRes.ok) {
        throw new Error('Không thể tải dữ liệu học viên');
      }

      const studentsData = await studentsRes.json();
      const teacherStudents = studentsData.students || studentsData.data?.students || [];
      const teacherClasses = studentsData.classes || studentsData.data?.classes || [];

      setStudents(teacherStudents);
      setFilteredStudents(teacherStudents);
      setClasses(teacherClasses);
    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu học viên');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    filterStudents(debouncedSearch, selectedClass);
  }, [debouncedSearch, selectedClass, sortBy, sortOrder]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleClassFilter = (classId: string) => {
    setSelectedClass(classId);
    setCurrentPage(1); // Reset to first page on filter
  };

  const handleSort = (column: 'name' | 'score' | 'attendance') => {
    if (sortBy === column) {
      // Toggle order if clicking same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for score/attendance, ascending for name
      setSortBy(column);
      setSortOrder(column === 'name' ? 'asc' : 'desc');
    }
  };

  const filterStudents = (search: string, classId: string) => {
    let filtered = students;

    if (search) {
      filtered = filtered.filter(
        (s) =>
          (s.full_name || s.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
          ((s.student_code || '') &&
            (s.student_code || '').toLowerCase().includes(search.toLowerCase()))
      );
    }

    if (classId) {
      filtered = filtered.filter((s) => s.class_id === parseInt(classId));
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'name') {
        aVal = (a.full_name || a.name || '').toLowerCase();
        bVal = (b.full_name || b.name || '').toLowerCase();
      } else if (sortBy === 'score') {
        aVal = a.total_score ?? a.total_points ?? 0;
        bVal = b.total_score ?? b.total_points ?? 0;
      } else {
        // attendance
        const aAttendance =
          (a.attended_count || 0) / Math.max(a.activity_count || a.activities_count || 1, 1);
        const bAttendance =
          (b.attended_count || 0) / Math.max(b.activity_count || b.activities_count || 1, 1);
        aVal = aAttendance;
        bVal = bAttendance;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredStudents(filtered);
    setCurrentPage(1); // Reset to first page on filter
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/teacher/dashboard"
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">👥 Danh sách học viên</h1>
          <p className="text-gray-600 mt-2">Theo dõi học viên trên các lớp và phạm vi hoạt động bạn đang quản lý</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email, hoặc mã học viên..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter by Class */}
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                value={selectedClass}
                onChange={(e) => handleClassFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả lớp học</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Stats */}
        <div className="mb-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Tìm thấy <span className="font-semibold text-gray-900">{filteredStudents.length}</span>{' '}
            học viên
            {filteredStudents.length > itemsPerPage && (
              <span className="ml-2 text-gray-500">
                (Trang {currentPage}/{totalPages})
              </span>
            )}
          </p>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Sắp xếp:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [col, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(col);
                setSortOrder(order);
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="name-asc">Tên A-Z</option>
              <option value="name-desc">Tên Z-A</option>
              <option value="score-desc">Điểm cao → thấp</option>
              <option value="score-asc">Điểm thấp → cao</option>
              <option value="attendance-desc">Điểm danh cao → thấp</option>
              <option value="attendance-asc">Điểm danh thấp → cao</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-2">👥</div>
              <p className="text-gray-500">Không tìm thấy học viên</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center hover:text-blue-600"
                      >
                        Họ và tên {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Mã học viên
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Lớp học
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Hoạt động
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      <button
                        onClick={() => handleSort('score')}
                        className="flex items-center hover:text-blue-600"
                      >
                        Điểm {sortBy === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      <button
                        onClick={() => handleSort('attendance')}
                        className="flex items-center hover:text-blue-600"
                      >
                        Điểm danh % {sortBy === 'attendance' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentItems.map((student) => {
                    const attendanceRate =
                      student.activity_count > 0
                        ? (((student.attended_count || 0) / student.activity_count) * 100).toFixed(
                            1
                          )
                        : '0.0';

                    return (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {student.full_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.student_code || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{student.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.class_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {student.activity_count || 0} hoạt động
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                          {student.total_score || 0} điểm
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                parseFloat(attendanceRate) >= 80
                                  ? 'bg-green-100 text-green-800'
                                  : parseFloat(attendanceRate) >= 50
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {attendanceRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Link
                            href={`/teacher/students/${student.id}`}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Xem chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Trước
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;

                      if (!showPage) {
                        // Show ellipsis
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="px-2 py-2 text-gray-500">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sau →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{filteredStudents.length}</div>
            <div className="text-sm text-blue-800 mt-1">Học viên hiển thị</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {filteredStudents.reduce((sum, s) => sum + (s.activity_count || 0), 0)}
            </div>
            <div className="text-sm text-green-800 mt-1">Tham gia tổng</div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredStudents.length > 0
                ? (
                    filteredStudents.reduce((sum, s) => sum + (s.total_score || 0), 0) /
                    filteredStudents.length
                  ).toFixed(1)
                : 0}
            </div>
            <div className="text-sm text-yellow-800 mt-1">Điểm trung bình</div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {filteredStudents.filter((s) => s.total_score >= 70).length}
            </div>
            <div className="text-sm text-purple-800 mt-1">Đạt chuẩn ≥70 điểm</div>
          </div>
        </div>
      </div>
    </div>
  );
}

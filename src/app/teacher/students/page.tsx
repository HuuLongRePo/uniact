'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Filter, Search, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDebounce } from '@/lib/hooks/useDebounce';

type SortBy = 'name' | 'score' | 'attendance';
type SortOrder = 'asc' | 'desc';

interface TeacherStudent {
  id: number;
  full_name?: string;
  name?: string;
  email: string;
  student_code?: string;
  class_id?: number;
  class_name?: string;
  activity_count?: number;
  activities_count?: number;
  attended_count?: number;
  total_score?: number;
  total_points?: number;
  is_homeroom_scope?: boolean;
}

interface TeacherClass {
  id: number;
  name: string;
}

function studentName(student: TeacherStudent) {
  return student.full_name || student.name || 'Học viên';
}

function totalScore(student: TeacherStudent) {
  return Number(student.total_score ?? student.total_points ?? 0);
}

function totalActivities(student: TeacherStudent) {
  return Number(student.activity_count ?? student.activities_count ?? 0);
}

function attendanceRate(student: TeacherStudent) {
  const total = Math.max(totalActivities(student), 1);
  return (Number(student.attended_count ?? 0) / total) * 100;
}

export default function TeacherStudentsPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<TeacherStudent[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'teacher')) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      void fetchData();
    }
  }, [currentUser?.id, currentUser?.role, loading]);

  useEffect(() => {
    const nextStudents = [...students];
    const normalizedSearch = debouncedSearch.trim().toLowerCase();

    const filtered = nextStudents.filter((student) => {
      if (selectedClass && String(student.class_id || '') !== selectedClass) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        studentName(student).toLowerCase().includes(normalizedSearch) ||
        String(student.email || '').toLowerCase().includes(normalizedSearch) ||
        String(student.student_code || '').toLowerCase().includes(normalizedSearch)
      );
    });

    filtered.sort((left, right) => {
      let leftValue: string | number = '';
      let rightValue: string | number = '';

      if (sortBy === 'name') {
        leftValue = studentName(left).toLowerCase();
        rightValue = studentName(right).toLowerCase();
      } else if (sortBy === 'score') {
        leftValue = totalScore(left);
        rightValue = totalScore(right);
      } else {
        leftValue = attendanceRate(left);
        rightValue = attendanceRate(right);
      }

      if (sortOrder === 'asc') {
        return leftValue > rightValue ? 1 : -1;
      }

      return leftValue < rightValue ? 1 : -1;
    });

    setFilteredStudents(filtered);
    setCurrentPage(1);
  }, [debouncedSearch, selectedClass, sortBy, sortOrder, students]);

  async function fetchData() {
    try {
      setIsLoading(true);

      const studentsRes = await fetch('/api/teacher/students');
      const payload = await studentsRes.json().catch(() => null);

      if (!studentsRes.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải dữ liệu học viên');
      }

      const teacherStudents = Array.isArray(payload?.students)
        ? payload.students
        : Array.isArray(payload?.data?.students)
          ? payload.data.students
          : [];
      const teacherClasses = Array.isArray(payload?.classes)
        ? payload.classes
        : Array.isArray(payload?.data?.classes)
          ? payload.data.classes
          : [];

      setStudents(teacherStudents);
      setFilteredStudents(teacherStudents);
      setClasses(teacherClasses);
    } catch (error) {
      console.error('Teacher students fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu học viên');
      setStudents([]);
      setFilteredStudents([]);
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSort(column: SortBy) {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortBy(column);
    setSortOrder(column === 'name' ? 'asc' : 'desc');
  }

  const totalPages = Math.max(Math.ceil(filteredStudents.length / itemsPerPage), 1);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  const homeroomStudents = filteredStudents.filter((item) => item.is_homeroom_scope).length;

  if (loading || isLoading) {
    return <LoadingSpinner message="Đang tải danh sách học viên..." />;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/teacher/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại bảng điều khiển
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Theo dõi học viên
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Danh sách học viên</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Theo dõi học viên trên các lớp giảng viên đang phụ trách, sắp xếp theo điểm và tìm
              nhanh học viên cần chăm.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchData()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Users className="h-4 w-4" />
            Tải lại
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
          <div className="text-sm font-medium text-cyan-800">Tổng học viên trong phạm vi</div>
          <div className="mt-3 text-3xl font-semibold text-cyan-950">{students.length}</div>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="text-sm font-medium text-emerald-800">Học viên lớp chủ nhiệm</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-950">{homeroomStudents}</div>
        </div>
        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
          <div className="text-sm font-medium text-violet-800">Số lớp đang theo dõi</div>
          <div className="mt-3 text-3xl font-semibold text-violet-950">{classes.length}</div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm theo tên, email hoặc mã học viên..."
              className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm text-slate-900 outline-none focus:border-cyan-300"
            />
          </div>

          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedClass}
              onChange={(event) => setSelectedClass(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 px-10 py-3 text-sm text-slate-900 outline-none focus:border-cyan-300"
            >
              <option value="">Tất cả lớp học</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(event) => {
              const [nextSort, nextOrder] = event.target.value.split('-') as [SortBy, SortOrder];
              setSortBy(nextSort);
              setSortOrder(nextOrder);
            }}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-300"
          >
            <option value="name-asc">Tên A-Z</option>
            <option value="name-desc">Tên Z-A</option>
            <option value="score-desc">Điểm cao đến thấp</option>
            <option value="score-asc">Điểm thấp đến cao</option>
            <option value="attendance-desc">Tỷ lệ điểm danh giảm dần</option>
            <option value="attendance-asc">Tỷ lệ điểm danh tăng dần</option>
          </select>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Tìm thấy <span className="font-semibold text-slate-900">{filteredStudents.length}</span>{' '}
            học viên
          </p>
          {filteredStudents.length > itemsPerPage && (
            <p>
              Trang <span className="font-semibold text-slate-900">{currentPage}</span>/{totalPages}
            </p>
          )}
        </div>

        {filteredStudents.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 px-4 py-12 text-center">
            <div className="text-base font-medium text-slate-900">Không tìm thấy học viên</div>
            <p className="mt-2 text-sm text-slate-500">
              Thử đổi từ khóa tìm kiếm hoặc bộ lọc lớp học.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 lg:hidden">
              {currentItems.map((student) => (
                <Link
                  key={student.id}
                  href={`/teacher/students/${student.id}`}
                  className="rounded-3xl border border-slate-200 p-4 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-slate-900">
                        {studentName(student)}
                      </div>
                      <div className="mt-1 truncate text-sm text-slate-500">{student.email}</div>
                    </div>
                    {student.is_homeroom_scope && (
                      <span
                        title="Học viên thuộc lớp chủ nhiệm"
                        className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                      >
                        Chủ nhiệm
                      </span>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                      Lớp: <span className="font-semibold">{student.class_name || '-'}</span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                      Mã: <span className="font-semibold">{student.student_code || '-'}</span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                      Điểm: <span className="font-semibold">{totalScore(student)}</span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                      Điểm danh:{' '}
                      <span className="font-semibold">{attendanceRate(student).toFixed(1)}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <button type="button" onClick={() => handleSort('name')} className="hover:text-cyan-700">
                        Họ và tên {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Mã học viên
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Lớp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Hoạt động
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <button type="button" onClick={() => handleSort('score')} className="hover:text-cyan-700">
                        Điểm {sortBy === 'score' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <button
                        type="button"
                        onClick={() => handleSort('attendance')}
                        className="hover:text-cyan-700"
                      >
                        Điểm danh {sortBy === 'attendance' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Chi tiết
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {currentItems.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{studentName(student)}</span>
                          {student.is_homeroom_scope && (
                            <span
                              title="Học viên thuộc lớp chủ nhiệm"
                              className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800"
                            >
                              Chủ nhiệm
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{student.student_code || '-'}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{student.email}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{student.class_name || '-'}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{totalActivities(student)}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-emerald-700">
                        {totalScore(student)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {attendanceRate(student).toFixed(1)}%
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/teacher/students/${student.id}`}
                          className="text-sm font-medium text-cyan-700 hover:text-cyan-800"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStudents.length > itemsPerPage && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trước
                </button>
                <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  {currentPage}/{totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { AlertCircle, ArrowLeft, Clock, Download, Filter, Search } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface ClassOption {
  id: number;
  name: string;
}

interface AttendanceRecord {
  student_id: number;
  student_name: string;
  student_code: string;
  class_name: string;
  activity_name: string;
  activity_date: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'not_participated';
  check_in_time?: string;
  notes?: string;
}

interface AttendanceSummary {
  class_id: number;
  class_name: string;
  total_students: number;
  total_activities: number;
  total_attendance: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  present_rate: number;
  absent_rate: number;
  late_rate: number;
}

interface StudentAttendanceSummary {
  student_id: number;
  student_name: string;
  student_code: string;
  class_name: string;
  total_activities: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate: number;
}

type AttendanceSortKey = 'date' | 'student' | 'status';
type SortDirection = 'asc' | 'desc';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getClassesFromResponse(payload: unknown): ClassOption[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { classes?: ClassOption[] };
    classes?: ClassOption[];
  };

  if (Array.isArray(normalized.data?.classes)) {
    return normalized.data.classes;
  }

  if (Array.isArray(normalized.classes)) {
    return normalized.classes;
  }

  return [];
}

function getSummaryFromResponse<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { summary?: T[] };
    summary?: T[];
  };

  return normalized.data?.summary ?? normalized.summary ?? [];
}

function getRecordsFromResponse(payload: unknown): AttendanceRecord[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { records?: AttendanceRecord[] };
    records?: AttendanceRecord[];
  };

  return normalized.data?.records ?? normalized.records ?? [];
}

export default function AttendanceReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classSummary, setClassSummary] = useState<AttendanceSummary[]>([]);
  const [studentSummary, setStudentSummary] = useState<StudentAttendanceSummary[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [viewMode, setViewMode] = useState<'class' | 'student' | 'details'>('class');

  const [filters, setFilters] = useState({
    classId: '',
    status: '',
    dateStart: '',
    dateEnd: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<AttendanceSortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');

  const [classes, setClasses] = useState<ClassOption[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [classesRes, recordsRes, classSummaryRes, studentSummaryRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/teacher/reports/attendance/records'),
        fetch('/api/teacher/reports/attendance/class-summary'),
        fetch('/api/teacher/reports/attendance/student-summary'),
      ]);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(getClassesFromResponse(classesData));
      }

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        const normalizedRecords = getRecordsFromResponse(recordsData);
        setRecords(normalizedRecords);
        setFilteredRecords(normalizedRecords);
      }

      if (classSummaryRes.ok) {
        const summaryData = await classSummaryRes.json();
        setClassSummary(getSummaryFromResponse<AttendanceSummary>(summaryData));
      }

      if (studentSummaryRes.ok) {
        const summaryData = await studentSummaryRes.json();
        setStudentSummary(getSummaryFromResponse<StudentAttendanceSummary>(summaryData));
      }
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast.error(getErrorMessage(error, 'Không thể tải dữ liệu'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      toast.error('Chỉ giảng viên mới có quyền xem báo cáo');
      router.push('/dashboard');
      return;
    }

    if (user) {
      void fetchData();
    }
  }, [authLoading, fetchData, router, user]);

  const applyFilters = useCallback(() => {
    let filtered = [...records];

    if (filters.classId) {
      filtered = filtered.filter((record) => record.class_name === filters.classId);
    }

    if (filters.status) {
      filtered = filtered.filter((record) => record.status === filters.status);
    }

    if (filters.dateStart) {
      filtered = filtered.filter(
        (record) => new Date(record.activity_date) >= new Date(filters.dateStart)
      );
    }

    if (filters.dateEnd) {
      filtered = filtered.filter(
        (record) => new Date(record.activity_date) <= new Date(filters.dateEnd)
      );
    }

    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.student_name.toLowerCase().includes(normalizedSearch) ||
          record.activity_name.toLowerCase().includes(normalizedSearch)
      );
    }

    filtered.sort((left, right) => {
      let leftValue: string | number = '';
      let rightValue: string | number = '';

      if (sortBy === 'date') {
        leftValue = new Date(left.activity_date).getTime();
        rightValue = new Date(right.activity_date).getTime();
      } else if (sortBy === 'student') {
        leftValue = left.student_name;
        rightValue = right.student_name;
      } else if (sortBy === 'status') {
        const statusOrder: Record<AttendanceRecord['status'], number> = {
          present: 0,
          late: 1,
          excused: 2,
          absent: 3,
          not_participated: 4,
        };
        leftValue = statusOrder[left.status];
        rightValue = statusOrder[right.status];
      }

      if (sortOrder === 'asc') {
        return leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;
      }

      return leftValue < rightValue ? 1 : leftValue > rightValue ? -1 : 0;
    });

    setFilteredRecords(filtered);
  }, [filters, records, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleSort = (field: AttendanceSortKey) => {
    setSortOrder((current) => (sortBy === field && current === 'asc' ? 'desc' : 'asc'));
    setSortBy(field);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/teacher/reports/attendance/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewMode,
          filters,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `attendance-report-${Date.now()}.xlsx`;
      anchor.click();
      toast.success('Đã xuất báo cáo thành công');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Không thể xuất báo cáo');
    }
  };

  const getStatusBadge = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present':
        return (
          <span className="flex w-fit items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            Có mặt
          </span>
        );
      case 'late':
        return (
          <span className="flex w-fit items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
            Đi trễ
          </span>
        );
      case 'absent':
        return (
          <span className="flex w-fit items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
            Vắng
          </span>
        );
      case 'excused':
        return (
          <span className="flex w-fit items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
            Có phép
          </span>
        );
      case 'not_participated':
        return (
          <span className="flex w-fit items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
            Chưa tham gia
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  const overallStats = {
    totalRecords: records.length,
    present: records.filter((record) => record.status === 'present').length,
    absent: records.filter((record) => record.status === 'absent').length,
    late: records.filter((record) => record.status === 'late').length,
    excused: records.filter((record) => record.status === 'excused').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </button>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <Clock className="h-6 w-6 text-blue-600" />
                  Báo cáo điểm danh
                </h1>
                <p className="mt-2 text-gray-600">
                  Phân tích tỷ lệ có mặt, vắng, đi trễ và các trường hợp có phép theo lớp.
                </p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Xuất Excel
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Tổng lượt điểm danh</div>
            <div className="text-3xl font-bold text-blue-600">{overallStats.totalRecords}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Có mặt</div>
            <div className="text-3xl font-bold text-green-600">{overallStats.present}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Đi trễ</div>
            <div className="text-3xl font-bold text-yellow-600">{overallStats.late}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Có phép</div>
            <div className="text-3xl font-bold text-blue-500">{overallStats.excused}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Vắng</div>
            <div className="text-3xl font-bold text-red-600">{overallStats.absent}</div>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setViewMode('class')}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                viewMode === 'class'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Theo lớp
            </button>
            <button
              onClick={() => setViewMode('student')}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                viewMode === 'student'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Theo học viên
            </button>
            <button
              onClick={() => setViewMode('details')}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                viewMode === 'details'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chi tiết
            </button>
          </div>
        </div>

        {viewMode === 'class' ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Lớp</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Tổng học viên
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Tổng hoạt động
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Có mặt
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Đi trễ
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Có phép
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Vắng
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Tỷ lệ có mặt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {classSummary.map((item) => (
                    <tr key={item.class_id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {item.class_name}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                        {item.total_students}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                        {item.total_activities}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-green-600">
                        {item.present_count}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-yellow-600">
                        {item.late_count}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-blue-600">
                        {item.excused_count}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-red-600">
                        {item.absent_count}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            item.present_rate >= 80
                              ? 'bg-green-100 text-green-800'
                              : item.present_rate >= 50
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.present_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === 'student' ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Học viên
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Mã sinh viên
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Lớp</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Tổng hoạt động
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Có mặt
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Đi trễ
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Có phép
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Vắng
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Tỷ lệ tham gia
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {studentSummary.map((item) => (
                    <tr key={item.student_id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {item.student_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{item.student_code}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{item.class_name}</td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                        {item.total_activities}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-green-600">
                        {item.present_count}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-yellow-600">
                        {item.late_count}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-blue-600">
                        {item.excused_count}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium text-red-600">
                        {item.absent_count}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            item.attendance_rate >= 80
                              ? 'bg-green-100 text-green-800'
                              : item.attendance_rate >= 50
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.attendance_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    <Search className="mr-1 inline h-4 w-4" />
                    Tìm kiếm
                  </label>
                  <input
                    type="text"
                    placeholder="Tên học viên hoặc hoạt động..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    <Filter className="mr-1 inline h-4 w-4" />
                    Lớp
                  </label>
                  <select
                    value={filters.classId}
                    onChange={(event) => setFilters({ ...filters, classId: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Tất cả lớp --</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.name}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Trạng thái</label>
                  <select
                    value={filters.status}
                    onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Tất cả --</option>
                    <option value="present">Có mặt</option>
                    <option value="late">Đi trễ</option>
                    <option value="excused">Có phép</option>
                    <option value="absent">Vắng</option>
                    <option value="not_participated">Chưa tham gia</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label>
                  <input
                    type="date"
                    value={filters.dateStart}
                    onChange={(event) =>
                      setFilters({ ...filters, dateStart: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
                  <input
                    type="date"
                    value={filters.dateEnd}
                    onChange={(event) => setFilters({ ...filters, dateEnd: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th
                        onClick={() => handleSort('student')}
                        className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                      >
                        Học viên {sortBy === 'student' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Lớp
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Hoạt động
                      </th>
                      <th
                        onClick={() => handleSort('date')}
                        className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                      >
                        Ngày {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        onClick={() => handleSort('status')}
                        className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                      >
                        Trạng thái {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Giờ check-in
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Ghi chú
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRecords.map((record) => (
                      <tr
                        key={`${record.student_id}-${record.activity_name}-${record.activity_date}`}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {record.student_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{record.class_name}</td>
                        <td className="px-4 py-4 text-sm font-medium text-blue-600">
                          {record.activity_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {new Date(record.activity_date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-4">{getStatusBadge(record.status)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {record.check_in_time || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{record.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredRecords.length === 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
                <AlertCircle className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <p className="text-lg text-gray-600">Không có dữ liệu điểm danh</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

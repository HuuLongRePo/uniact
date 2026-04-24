'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  AlertCircle,
  ArrowLeft,
  Clock3,
  Download,
  Filter,
  QrCode,
  ScanFace,
  Search,
  SquarePen,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildOverallStats,
  getClassesFromResponse,
  getRecordsFromResponse,
  getSummaryFromResponse,
  type AttendanceMethod,
  type AttendanceRecord,
  type AttendanceSummary,
  type ClassOption,
  type StudentAttendanceSummary,
} from '@/features/reports/attendance-report-helpers';
import { formatVietnamDateTime, parseVietnamDate } from '@/lib/timezone';

type AttendanceSortKey = 'date' | 'student' | 'status' | 'method';
type SortDirection = 'asc' | 'desc';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getMethodBadge(method: AttendanceMethod) {
  switch (method) {
    case 'manual':
      return (
        <span className="flex w-fit items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          <SquarePen className="h-3.5 w-3.5" />
          Thủ công
        </span>
      );
    case 'qr':
      return (
        <span className="flex w-fit items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800">
          <QrCode className="h-3.5 w-3.5" />
          QR
        </span>
      );
    case 'face':
      return (
        <span className="flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
          <ScanFace className="h-3.5 w-3.5" />
          Face
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          Chưa ghi nhận
        </span>
      );
  }
}

function getStatusBadge(status: AttendanceRecord['status']) {
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
    method: '',
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
      router.push('/teacher/dashboard');
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

    if (filters.method) {
      filtered = filtered.filter((record) => record.method === filters.method);
    }

    if (filters.dateStart) {
      const startDate = parseVietnamDate(`${filters.dateStart}T00:00`);
      if (startDate) {
        filtered = filtered.filter(
          (record) =>
            (parseVietnamDate(record.activity_date)?.getTime() ?? Number.NEGATIVE_INFINITY) >=
            startDate.getTime()
        );
      }
    }

    if (filters.dateEnd) {
      const endDate = parseVietnamDate(`${filters.dateEnd}T23:59:59`);
      if (endDate) {
        filtered = filtered.filter(
          (record) =>
            (parseVietnamDate(record.activity_date)?.getTime() ?? Number.POSITIVE_INFINITY) <=
            endDate.getTime()
        );
      }
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
        leftValue = parseVietnamDate(left.activity_date)?.getTime() ?? 0;
        rightValue = parseVietnamDate(right.activity_date)?.getTime() ?? 0;
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
      } else if (sortBy === 'method') {
        const methodOrder: Record<AttendanceMethod, number> = {
          face: 0,
          qr: 1,
          manual: 2,
          unknown: 3,
        };
        leftValue = methodOrder[left.method];
        rightValue = methodOrder[right.method];
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
        throw new Error('Không thể xuất báo cáo');
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

  const overallStats = useMemo(() => buildOverallStats(records), [records]);

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-gray-200 px-5 py-5 sm:px-7">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-800">
                <Clock3 className="h-3.5 w-3.5" />
                Báo cáo vận hành
              </div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Báo cáo điểm danh</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
                Theo dõi tỷ lệ có mặt, đi trễ, vắng, chưa tham gia và phương thức điểm danh thực tế
                theo lớp, theo học viên hoặc theo từng lượt ghi nhận.
              </p>
            </div>

            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Xuất Excel
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="content-card p-4">
              <div className="text-sm text-gray-600">Tổng lượt điểm danh</div>
              <div className="mt-2 text-3xl font-bold text-blue-600">
                {overallStats.totalRecords}
              </div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-gray-600">Có mặt</div>
              <div className="mt-2 text-3xl font-bold text-green-600">{overallStats.present}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-gray-600">Đi trễ</div>
              <div className="mt-2 text-3xl font-bold text-yellow-600">{overallStats.late}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-gray-600">Có phép</div>
              <div className="mt-2 text-3xl font-bold text-blue-500">{overallStats.excused}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-gray-600">Vắng</div>
              <div className="mt-2 text-3xl font-bold text-red-600">{overallStats.absent}</div>
            </div>
            <div className="content-card p-4" data-testid="not-participated-card">
              <div className="text-sm text-gray-600">Chưa tham gia</div>
              <div className="mt-2 text-3xl font-bold text-slate-700">
                {overallStats.notParticipated}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div
              className="content-card border-violet-200 bg-violet-50 p-4"
              data-testid="method-card-qr"
            >
              <div className="flex items-center gap-2 text-sm text-violet-700">
                <QrCode className="h-4 w-4" />
                Điểm danh QR
              </div>
              <div className="mt-2 text-2xl font-bold text-violet-900">{overallStats.qr}</div>
            </div>
            <div
              className="content-card border-amber-200 bg-amber-50 p-4"
              data-testid="method-card-manual"
            >
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <SquarePen className="h-4 w-4" />
                Thủ công
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-900">{overallStats.manual}</div>
            </div>
            <div
              className="content-card border-emerald-200 bg-emerald-50 p-4"
              data-testid="method-card-face"
            >
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <ScanFace className="h-4 w-4" />
                Khuôn mặt
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-900">{overallStats.face}</div>
            </div>
          </div>

          <div className="content-card p-3">
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'class', label: 'Theo lớp' },
                { id: 'student', label: 'Theo học viên' },
                { id: 'details', label: 'Chi tiết' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setViewMode(option.id as typeof viewMode)}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    viewMode === option.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'details' && (
            <div className="content-card p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả lớp</option>
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
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="present">Có mặt</option>
                    <option value="late">Đi trễ</option>
                    <option value="excused">Có phép</option>
                    <option value="absent">Vắng</option>
                    <option value="not_participated">Chưa tham gia</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Phương thức
                  </label>
                  <select
                    value={filters.method}
                    onChange={(event) => setFilters({ ...filters, method: event.target.value })}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả phương thức</option>
                    <option value="qr">QR</option>
                    <option value="manual">Thủ công</option>
                    <option value="face">Face</option>
                    <option value="unknown">Chưa ghi nhận</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label>
                  <input
                    type="date"
                    value={filters.dateStart}
                    onChange={(event) => setFilters({ ...filters, dateStart: event.target.value })}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
                  <input
                    type="date"
                    value={filters.dateEnd}
                    onChange={(event) => setFilters({ ...filters, dateEnd: event.target.value })}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'class' ? (
            <div className="content-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[860px]">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Lớp
                      </th>
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
                        Chưa tham gia
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
                        <td className="px-4 py-4 text-center text-sm font-medium text-slate-700">
                          {item.not_participated_count}
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
            <div className="content-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-[980px]">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Học viên
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Mã sinh viên
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Lớp
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
                        Chưa tham gia
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
                        <td className="px-4 py-4 text-center text-sm font-medium text-slate-700">
                          {item.not_participated_count}
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
              <div className="content-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px]">
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
                        <th
                          onClick={() => handleSort('method')}
                          className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                        >
                          Phương thức {sortBy === 'method' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                            {formatVietnamDateTime(record.activity_date, 'date')}
                          </td>
                          <td className="px-4 py-4">{getStatusBadge(record.status)}</td>
                          <td className="px-4 py-4" data-testid="attendance-method-cell">
                            {getMethodBadge(record.method)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {record.check_in_time
                              ? formatVietnamDateTime(record.check_in_time)
                              : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">{record.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredRecords.length === 0 && (
                <div className="content-card p-12 text-center">
                  <AlertCircle className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                  <p className="text-lg text-gray-600">Không có dữ liệu điểm danh</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

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
import { resolveDownloadFilename } from '@/lib/download-filename';
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
import { formatVietnamDateTime, parseVietnamDate, toVietnamFileTimestamp } from '@/lib/timezone';

type AttendanceSortKey = 'date' | 'student' | 'status' | 'method';
type SortDirection = 'asc' | 'desc';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getMethodLabel(method: AttendanceMethod) {
  switch (method) {
    case 'manual':
      return 'Thủ công';
    case 'qr':
      return 'QR';
    case 'face':
      return 'Khuôn mặt';
    default:
      return 'Chưa ghi nhận';
  }
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
          Khuôn mặt
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          Chưa ghi nhận
        </span>
      );
  }
}

function getStatusBadge(status: AttendanceRecord['status']) {
  switch (status) {
    case 'present':
      return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">Có mặt</span>;
    case 'late':
      return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Đi trễ</span>;
    case 'absent':
      return <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">Vắng</span>;
    case 'excused':
      return <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">Có phép</span>;
    case 'not_participated':
      return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Chưa tham gia</span>;
    default:
      return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{status}</span>;
  }
}

function SummaryCards({ classSummary }: { classSummary: AttendanceSummary[] }) {
  if (classSummary.length === 0) {
    return (
      <div className="content-card p-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-14 w-14 text-slate-300" />
        <p className="text-lg font-medium text-slate-700">Chưa có dữ liệu tổng hợp theo lớp</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {classSummary.map((item) => (
        <article key={item.class_id} className="content-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{item.class_name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {item.total_students} học viên · {item.total_activities} hoạt động
              </p>
            </div>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
              {item.present_rate.toFixed(1)}%
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-5">
            <div className="rounded-2xl bg-emerald-50 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Có mặt</div>
              <div className="mt-1 text-lg font-semibold text-emerald-900">{item.present_count}</div>
            </div>
            <div className="rounded-2xl bg-amber-50 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-amber-700">Đi trễ</div>
              <div className="mt-1 text-lg font-semibold text-amber-900">{item.late_count}</div>
            </div>
            <div className="rounded-2xl bg-sky-50 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-sky-700">Có phép</div>
              <div className="mt-1 text-lg font-semibold text-sky-900">{item.excused_count}</div>
            </div>
            <div className="rounded-2xl bg-rose-50 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-rose-700">Vắng</div>
              <div className="mt-1 text-lg font-semibold text-rose-900">{item.absent_count}</div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-600">Chưa TG</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{item.not_participated_count}</div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function StudentSummaryCards({ items }: { items: StudentAttendanceSummary[] }) {
  if (items.length === 0) {
    return (
      <div className="content-card p-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-14 w-14 text-slate-300" />
        <p className="text-lg font-medium text-slate-700">Chưa có dữ liệu tổng hợp theo học viên</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <article key={item.student_id} className="content-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{item.student_name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {item.student_code} · {item.class_name}
              </p>
            </div>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
              {item.attendance_rate.toFixed(1)}%
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-5">
            <div className="rounded-2xl bg-emerald-50 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-emerald-700">Có mặt</div>
              <div className="mt-1 text-lg font-semibold text-emerald-900">{item.present_count}</div>
            </div>
            <div className="rounded-2xl bg-amber-50 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-amber-700">Đi trễ</div>
              <div className="mt-1 text-lg font-semibold text-amber-900">{item.late_count}</div>
            </div>
            <div className="rounded-2xl bg-sky-50 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-sky-700">Có phép</div>
              <div className="mt-1 text-lg font-semibold text-sky-900">{item.excused_count}</div>
            </div>
            <div className="rounded-2xl bg-rose-50 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-rose-700">Vắng</div>
              <div className="mt-1 text-lg font-semibold text-rose-900">{item.absent_count}</div>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-600">Chưa TG</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{item.not_participated_count}</div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
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
      console.error('Error fetching attendance report:', error);
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
    let next = [...records];

    if (filters.classId) {
      next = next.filter((record) => record.class_name === filters.classId);
    }

    if (filters.status) {
      next = next.filter((record) => record.status === filters.status);
    }

    if (filters.method) {
      next = next.filter((record) => record.method === filters.method);
    }

    if (filters.dateStart) {
      const startDate = parseVietnamDate(`${filters.dateStart}T00:00`);
      if (startDate) {
        next = next.filter(
          (record) =>
            (parseVietnamDate(record.activity_date)?.getTime() ?? Number.NEGATIVE_INFINITY) >=
            startDate.getTime()
        );
      }
    }

    if (filters.dateEnd) {
      const endDate = parseVietnamDate(`${filters.dateEnd}T23:59:59`);
      if (endDate) {
        next = next.filter(
          (record) =>
            (parseVietnamDate(record.activity_date)?.getTime() ?? Number.POSITIVE_INFINITY) <=
            endDate.getTime()
        );
      }
    }

    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      next = next.filter(
        (record) =>
          record.student_name.toLowerCase().includes(normalizedSearch) ||
          record.activity_name.toLowerCase().includes(normalizedSearch)
      );
    }

    next.sort((left, right) => {
      let leftValue: string | number = '';
      let rightValue: string | number = '';

      if (sortBy === 'date') {
        leftValue = parseVietnamDate(left.activity_date)?.getTime() ?? 0;
        rightValue = parseVietnamDate(right.activity_date)?.getTime() ?? 0;
      } else if (sortBy === 'student') {
        leftValue = left.student_name;
        rightValue = right.student_name;
      } else if (sortBy === 'status') {
        const order: Record<AttendanceRecord['status'], number> = {
          present: 0,
          late: 1,
          excused: 2,
          absent: 3,
          not_participated: 4,
        };
        leftValue = order[left.status];
        rightValue = order[right.status];
      } else if (sortBy === 'method') {
        const order: Record<AttendanceMethod, number> = {
          face: 0,
          qr: 1,
          manual: 2,
          unknown: 3,
        };
        leftValue = order[left.method];
        rightValue = order[right.method];
      }

      if (sortOrder === 'asc') {
        return leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;
      }

      return leftValue < rightValue ? 1 : leftValue > rightValue ? -1 : 0;
    });

    setFilteredRecords(next);
  }, [filters, records, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/teacher/reports/attendance/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewMode, filters }),
      });

      if (!response.ok) {
        throw new Error('Không thể xuất báo cáo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        response.headers?.get?.('Content-Disposition') ?? null,
        `attendance-report-${toVietnamFileTimestamp(new Date())}.xlsx`
      );
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success('Da xuat bao cao thanh cong');
    } catch (error) {
      console.error('Error exporting attendance report:', error);
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
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                <Clock3 className="h-3.5 w-3.5" />
                Báo cáo vận hành
              </div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Báo cáo điểm danh</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Theo dõi tỷ lệ có mặt, đi trễ, vắng, chưa tham gia và cách điểm danh được sử dụng
                trên từng hoạt động, lớp và học viên.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-800"
            >
              <Download className="h-4 w-4" />
              Xuất Excel
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Tổng lượt điểm danh</div>
              <div className="mt-2 text-3xl font-bold text-cyan-700">{overallStats.totalRecords}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Có mặt</div>
              <div className="mt-2 text-3xl font-bold text-emerald-600">{overallStats.present}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Đi trễ</div>
              <div className="mt-2 text-3xl font-bold text-amber-600">{overallStats.late}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Có phép</div>
              <div className="mt-2 text-3xl font-bold text-sky-600">{overallStats.excused}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Vắng</div>
              <div className="mt-2 text-3xl font-bold text-rose-600">{overallStats.absent}</div>
            </div>
            <div className="content-card p-4" data-testid="not-participated-card">
              <div className="text-sm text-slate-500">Chưa tham gia</div>
              <div className="mt-2 text-3xl font-bold text-slate-700">{overallStats.notParticipated}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="content-card border-violet-200 bg-violet-50 p-4" data-testid="method-card-qr">
              <div className="flex items-center gap-2 text-sm text-violet-700">
                <QrCode className="h-4 w-4" />
                Điểm danh QR
              </div>
              <div className="mt-2 text-2xl font-bold text-violet-900">{overallStats.qr}</div>
            </div>
            <div className="content-card border-amber-200 bg-amber-50 p-4" data-testid="method-card-manual">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <SquarePen className="h-4 w-4" />
                Thủ công
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-900">{overallStats.manual}</div>
            </div>
            <div className="content-card border-emerald-200 bg-emerald-50 p-4" data-testid="method-card-face">
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
                  type="button"
                  onClick={() => setViewMode(option.id as typeof viewMode)}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    viewMode === option.id
                      ? 'bg-cyan-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'details' ? (
            <>
              <div className="content-card p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block text-sm font-medium text-slate-700">
                    <Search className="mr-1 inline h-4 w-4" />
                    Tìm kiếm
                    <input
                      type="text"
                      placeholder="Tên học viên hoặc hoạt động..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    <Filter className="mr-1 inline h-4 w-4" />
                    Lop
                    <select
                      value={filters.classId}
                      onChange={(event) => setFilters({ ...filters, classId: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Tất cả lớp</option>
                      {classes.map((classItem) => (
                        <option key={classItem.id} value={classItem.name}>
                          {classItem.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Trạng thái
                    <select
                      value={filters.status}
                      onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="present">Có mặt</option>
                      <option value="late">Đi trễ</option>
                      <option value="excused">Có phép</option>
                      <option value="absent">Vắng</option>
                      <option value="not_participated">Chưa tham gia</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Phương thức
                    <select
                      value={filters.method}
                      onChange={(event) => setFilters({ ...filters, method: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Tất cả phương thức</option>
                      <option value="qr">QR</option>
                      <option value="manual">Thủ công</option>
                      <option value="face">Khuôn mặt</option>
                      <option value="unknown">Chưa ghi nhận</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Từ ngày
                    <input
                      type="date"
                      value={filters.dateStart}
                      onChange={(event) => setFilters({ ...filters, dateStart: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Đến ngày
                    <input
                      type="date"
                      value={filters.dateEnd}
                      onChange={(event) => setFilters({ ...filters, dateEnd: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>
                </div>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="content-card p-12 text-center">
                  <AlertCircle className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                  <p className="text-lg font-medium text-slate-700">Không có dữ liệu điểm danh</p>
                </div>
              ) : (
                <div className="grid gap-4 xl:hidden">
                  {filteredRecords.map((record) => (
                    <article
                      key={`${record.student_id}-${record.activity_name}-${record.activity_date}`}
                      className="content-card p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950">{record.student_name}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {record.class_name} · {record.activity_name}
                          </p>
                        </div>
                        {getStatusBadge(record.status)}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">{getMethodBadge(record.method)}</div>
                      <div className="mt-4 grid gap-2 text-sm text-slate-600">
                        <div>Ngay: {formatVietnamDateTime(record.activity_date, 'date')}</div>
                        <div>Check-in: {record.check_in_time ? formatVietnamDateTime(record.check_in_time) : '-'}</div>
                        <div>Ghi chú: {record.notes || '-'}</div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {filteredRecords.length > 0 ? (
                <div className="content-card hidden overflow-hidden xl:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-[1100px]">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th
                            onClick={() => {
                              setSortOrder((current) => (sortBy === 'student' && current === 'asc' ? 'desc' : 'asc'));
                              setSortBy('student');
                            }}
                            className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                          >
                            Học viên {sortBy === 'student' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Lop</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Hoạt động</th>
                          <th
                            onClick={() => {
                              setSortOrder((current) => (sortBy === 'date' && current === 'asc' ? 'desc' : 'asc'));
                              setSortBy('date');
                            }}
                            className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                          >
                            Ngày {sortBy === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th
                            onClick={() => {
                              setSortOrder((current) => (sortBy === 'status' && current === 'asc' ? 'desc' : 'asc'));
                              setSortBy('status');
                            }}
                            className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                          >
                            Trạng thái {sortBy === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th
                            onClick={() => {
                              setSortOrder((current) => (sortBy === 'method' && current === 'asc' ? 'desc' : 'asc'));
                              setSortBy('method');
                            }}
                            className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                          >
                            Phương thức {sortBy === 'method' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Check-in</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredRecords.map((record) => (
                          <tr
                            key={`${record.student_id}-${record.activity_name}-${record.activity_date}`}
                            className="transition-colors hover:bg-slate-50"
                          >
                            <td className="px-4 py-4 text-sm font-medium text-slate-900">{record.student_name}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{record.class_name}</td>
                            <td className="px-4 py-4 text-sm font-medium text-cyan-700">{record.activity_name}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{formatVietnamDateTime(record.activity_date, 'date')}</td>
                            <td className="px-4 py-4">{getStatusBadge(record.status)}</td>
                            <td className="px-4 py-4" data-testid="attendance-method-cell">
                              {getMethodBadge(record.method)}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">
                              {record.check_in_time ? formatVietnamDateTime(record.check_in_time) : '-'}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">{record.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          ) : viewMode === 'student' ? (
            <StudentSummaryCards items={studentSummary} />
          ) : (
            <SummaryCards classSummary={classSummary} />
          )}
        </div>
      </section>
    </div>
  );
}

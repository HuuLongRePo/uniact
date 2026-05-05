'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';
import { resolveDownloadFilename } from '@/lib/download-filename';
import { parseVietnamDate, toVietnamDateStamp } from '@/lib/timezone';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type AttendanceRecord = {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  student_code: string | null;
  class_name: string | null;
  status: AttendanceStatus;
  check_in_time: string;
  notes: string | null;
};

type Activity = {
  id: number;
  title: string;
  date_time: string;
  location: string;
};

function getStatusLabel(status: AttendanceStatus) {
  if (status === 'present') return 'Có mặt';
  if (status === 'absent') return 'Vắng mặt';
  if (status === 'late') return 'Đi muộn';
  return 'Có phép';
}

function getStatusClasses(status: AttendanceStatus) {
  if (status === 'present') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'absent') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (status === 'late') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-sky-200 bg-sky-50 text-sky-800';
}

export default function TeacherAttendanceHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | AttendanceStatus>('all');
  const [filterClass, setFilterClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'status'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'teacher' && user.role !== 'admin') {
      toast.error('Chỉ giảng viên mới có quyền xem lịch sử điểm danh');
      router.push('/teacher/dashboard');
      return;
    }

    if (user && activityId) {
      void fetchData();
    }
  }, [activityId, authLoading, router, user]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const activityRes = await fetch(`/api/activities/${activityId}`);
      if (!activityRes.ok) {
        throw new Error('Không thể tải hoạt động');
      }
      const activityJson = await activityRes.json();
      setActivity(activityJson?.activity ?? activityJson?.data?.activity ?? activityJson);

      const attendanceRes = await fetch(`/api/activities/${activityId}/attendance`);
      if (!attendanceRes.ok) {
        throw new Error('Không thể tải lịch sử điểm danh');
      }

      const attendanceJson = await attendanceRes.json();
      setRecords(attendanceJson?.records ?? attendanceJson?.data?.records ?? []);
    } catch (error: unknown) {
      console.error('Error fetching attendance history:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải lịch sử điểm danh');
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  const filteredRecords = [...records]
    .filter((record) => {
      if (filterStatus !== 'all' && record.status !== filterStatus) {
        return false;
      }

      if (filterClass && record.class_name !== filterClass) {
        return false;
      }

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          record.student_name.toLowerCase().includes(query) ||
          record.student_email.toLowerCase().includes(query) ||
          (record.student_code || '').toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      return true;
    })
    .sort((left, right) => {
      let leftValue: string | number = '';
      let rightValue: string | number = '';

      if (sortBy === 'name') {
        leftValue = left.student_name.toLowerCase();
        rightValue = right.student_name.toLowerCase();
      } else if (sortBy === 'status') {
        leftValue = left.status;
        rightValue = right.status;
      } else {
        leftValue = parseVietnamDate(left.check_in_time)?.getTime() ?? 0;
        rightValue = parseVietnamDate(right.check_in_time)?.getTime() ?? 0;
      }

      if (sortOrder === 'asc') {
        return leftValue > rightValue ? 1 : -1;
      }

      return leftValue < rightValue ? 1 : -1;
    });

  const presentCount = records.filter((record) => record.status === 'present').length;
  const absentCount = records.filter((record) => record.status === 'absent').length;
  const lateCount = records.filter((record) => record.status === 'late').length;
  const excusedCount = records.filter((record) => record.status === 'excused').length;
  const availableClasses = Array.from(new Set(records.map((record) => record.class_name).filter(Boolean)));

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/activities/${activityId}/attendance/export`);
      if (!response.ok) {
        throw new Error('Không thể xuất tệp điểm danh');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        response.headers.get('Content-Disposition'),
        `attendance-history-${activityId}-${toVietnamDateStamp(new Date())}.xlsx`
      );
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success('Đã xuất tệp điểm danh');
    } catch (error: unknown) {
      console.error('Error exporting attendance history:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể xuất tệp');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!activity) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-6xl p-6">
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 text-rose-900">
            Không tìm thấy hoạt động để xem lịch sử điểm danh.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href={`/teacher/activities/${activityId}`}
                className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại hub hoạt động
              </Link>

              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Lịch sử điểm danh
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Lịch sử điểm danh</h1>
              <p className="mt-2 text-sm text-slate-600">
                Theo dõi nhật ký điểm danh, lọc theo danh sách và xuất tệp tổng hợp khi cần.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <span>{activity.title}</span>
                <span>{formatDate(activity.date_time)}</span>
                <span>{activity.location}</span>
              </div>
            </div>

            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              Xuất tệp
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="page-surface rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng bản ghi</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{records.length}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Có mặt</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{presentCount}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">Vắng mặt</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{absentCount}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Đi muộn</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{lateCount}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Có phép</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{excusedCount}</div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="grid gap-4 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Tìm kiếm</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tên, email, mã học viên"
                  className="w-full rounded-xl border border-slate-300 bg-white px-10 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                <Filter className="mr-1 inline h-4 w-4" />
                Trạng thái
              </span>
              <select
                value={filterStatus}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    value === 'all' ||
                    value === 'present' ||
                    value === 'absent' ||
                    value === 'late' ||
                    value === 'excused'
                  ) {
                    setFilterStatus(value);
                  }
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Tất cả ({records.length})</option>
                <option value="present">Có mặt ({presentCount})</option>
                <option value="absent">Vắng mặt ({absentCount})</option>
                <option value="late">Đi muộn ({lateCount})</option>
                <option value="excused">Có phép ({excusedCount})</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Lớp học</span>
              <select
                value={filterClass}
                onChange={(event) => setFilterClass(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tất cả lớp</option>
                {availableClasses.map((className) => (
                  <option key={className} value={className || ''}>
                    {className}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Sắp xếp</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(event) => {
                  const [nextSortBy, nextSortOrder] = event.target.value.split('-');
                  if (nextSortBy === 'name' || nextSortBy === 'time' || nextSortBy === 'status') {
                    setSortBy(nextSortBy);
                  }
                  if (nextSortOrder === 'asc' || nextSortOrder === 'desc') {
                    setSortOrder(nextSortOrder);
                  }
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="time-desc">Thời gian mới nhất</option>
                <option value="time-asc">Thời gian cũ nhất</option>
                <option value="name-asc">Tên A-Z</option>
                <option value="name-desc">Tên Z-A</option>
                <option value="status-asc">Trạng thái A-Z</option>
              </select>
            </label>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Bản ghi điểm danh</h2>
              <p className="mt-1 text-sm text-slate-600">
                Xem từng lần ghi nhận, ghi chú và thông tin liên quan.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {filteredRecords.length} bản ghi sau bộ lọc
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Không có bản ghi điểm danh phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <article
                  key={record.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{record.student_name}</div>
                      <div className="mt-1 text-sm text-slate-600">{record.student_email}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {record.class_name ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            {record.class_name}
                          </span>
                        ) : null}
                        {record.student_code ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            {record.student_code}
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full border px-3 py-1 font-semibold ${getStatusClasses(
                            record.status
                          )}`}
                        >
                          {getStatusLabel(record.status)}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:w-[28rem]">
                      <div className="rounded-xl bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Thời gian ghi nhận
                        </div>
                        <div className="mt-2 inline-flex items-center gap-2 font-medium text-slate-800">
                          <CalendarClock className="h-4 w-4" />
                          {formatDate(record.check_in_time)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Ghi chú
                        </div>
                        <div className="mt-2 font-medium text-slate-800">
                          {record.notes || 'Không có ghi chú'}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

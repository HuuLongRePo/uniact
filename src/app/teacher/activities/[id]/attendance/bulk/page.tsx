'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Filter,
  Save,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type Student = {
  id: number;
  full_name: string;
  email: string;
  student_code: string | null;
  class_name: string | null;
  attendance_status: AttendanceStatus | null;
};

type Activity = {
  id: number;
  title: string;
  date_time: string;
  location: string;
  status: string;
};

type ParticipantPayload = {
  id?: number | string | null;
  student_id?: number | string | null;
  full_name?: string | null;
  student_name?: string | null;
  name?: string | null;
  email?: string | null;
  student_email?: string | null;
  student_code?: string | null;
  class_name?: string | null;
  attendance_status?: string | null;
  attendance_notes?: string | null;
  notes?: string | null;
  note?: string | null;
};

function normalizeAttendanceStatus(rawStatus: string | null | undefined): AttendanceStatus | null {
  if (rawStatus === 'attended' || rawStatus === 'present') return 'present';
  if (rawStatus === 'absent') return 'absent';
  if (rawStatus === 'late') return 'late';
  if (rawStatus === 'excused') return 'excused';
  return null;
}

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

export default function TeacherBulkAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<number, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'marked' | 'unmarked'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'teacher' && user.role !== 'admin') {
      toast.error('Chi giang vien moi co quyen diem danh');
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

      const participantsRes = await fetch(`/api/activities/${activityId}/participants`);
      if (!participantsRes.ok) {
        throw new Error('Không thể tải danh sách tham gia');
      }

      const participantsJson = await participantsRes.json();
      const participants: ParticipantPayload[] =
        participantsJson?.participations ?? participantsJson?.data?.participations ?? [];

      const mappedStudents = participants
        .map((item) => {
          const studentId = Number(item.student_id ?? item.id);
          if (!Number.isFinite(studentId)) return null;

          return {
            id: studentId,
            full_name: String(item.full_name ?? item.student_name ?? item.name ?? ''),
            email: String(item.email ?? item.student_email ?? ''),
            student_code: item.student_code ? String(item.student_code) : null,
            class_name: item.class_name ? String(item.class_name) : null,
            attendance_status: normalizeAttendanceStatus(item.attendance_status),
          } satisfies Student;
        })
        .filter(Boolean) as Student[];

      const initialAttendance: Record<number, AttendanceStatus> = {};
      const initialNotes: Record<number, string> = {};

      participants.forEach((item) => {
        const studentId = Number(item.student_id ?? item.id);
        if (!Number.isFinite(studentId)) return;

        const status = normalizeAttendanceStatus(item.attendance_status);
        if (status) initialAttendance[studentId] = status;

        const note = item.attendance_notes ?? item.notes ?? item.note;
        if (note) initialNotes[studentId] = String(note);
      });

      setStudents(mappedStudents);
      setAttendanceData(initialAttendance);
      setNotes(initialNotes);
      setSelectedIds(new Set());
    } catch (error: unknown) {
      console.error('Error fetching bulk attendance data:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu');
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  const filteredStudents = students.filter((student) => {
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        student.full_name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        (student.student_code || '').toLowerCase().includes(query);

      if (!matchesSearch) return false;
    }

    if (filterClass && student.class_name !== filterClass) {
      return false;
    }

    if (filterStatus === 'marked' && attendanceData[student.id] === undefined) {
      return false;
    }

    if (filterStatus === 'unmarked' && attendanceData[student.id] !== undefined) {
      return false;
    }

    return true;
  });

  const markedCount = Object.keys(attendanceData).length;
  const presentCount = Object.values(attendanceData).filter((status) => status === 'present').length;
  const absentCount = Object.values(attendanceData).filter((status) => status === 'absent').length;
  const pendingCount = Math.max(students.length - markedCount, 0);
  const availableClasses = Array.from(new Set(students.map((student) => student.class_name).filter(Boolean)));

  const handleMarkAttendance = (studentId: number, status: AttendanceStatus) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleBulkMark = (status: AttendanceStatus) => {
    if (selectedIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất một học viên');
      return;
    }

    setAttendanceData((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = status;
      });
      return next;
    });

    toast.success(`Đã cập nhật ${selectedIds.size} học viên sang trạng thái ${getStatusLabel(status)}`);
  };

  const handleMarkVisiblePresent = () => {
    if (filteredStudents.length === 0) {
      toast.error('Không có học viên nào trong bộ lọc hiện tại');
      return;
    }

    setAttendanceData((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((student) => {
        next[student.id] = 'present';
      });
      return next;
    });

    toast.success(`Đã đánh dấu ${filteredStudents.length} học viên có mặt`);
  };

  const handleToggleSelect = (studentId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectVisible = () => {
    if (filteredStudents.length === 0) {
      setSelectedIds(new Set());
      return;
    }

    const allVisibleSelected = filteredStudents.every((student) => selectedIds.has(student.id));
    if (allVisibleSelected) {
      const next = new Set(selectedIds);
      filteredStudents.forEach((student) => next.delete(student.id));
      setSelectedIds(next);
      return;
    }

    const next = new Set(selectedIds);
    filteredStudents.forEach((student) => next.add(student.id));
    setSelectedIds(next);
  };

  const handleSave = async () => {
    const attendanceRecords = Object.entries(attendanceData).map(([studentId, status]) => ({
      student_id: Number(studentId),
      status,
      notes: notes[Number(studentId)] || null,
      check_in_time: new Date().toISOString(),
    }));

    if (attendanceRecords.length === 0) {
      toast.error('Chưa có dữ liệu điểm danh để lưu');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/activities/${activityId}/attendance/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: attendanceRecords }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Không thể lưu điểm danh');
      }

      toast.success(result?.message || `Đã lưu ${attendanceRecords.length} bản ghi điểm danh`);
      await fetchData();
    } catch (error: unknown) {
      console.error('Error saving bulk attendance:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể lưu điểm danh');
    } finally {
      setSaving(false);
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
            Không tìm thấy hoạt động để điểm danh.
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

              <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Điểm danh hàng loạt
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Điểm danh hàng loạt</h1>
              <p className="mt-2 text-sm text-slate-600">
                Đánh dấu có mặt, vắng, đi muộn hoặc có phép cho từng học viên trong danh sách vận hành.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <span>{activity.title}</span>
                <span>{formatDate(activity.date_time)}</span>
                <span>{activity.location}</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || markedCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Đang lưu...' : `Lưu điểm danh (${markedCount})`}
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="page-surface rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng danh sách</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{students.length}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Đã đánh dấu</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{markedCount}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Có mặt</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{presentCount}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Chưa xử lý</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{pendingCount}</div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-4 md:grid-cols-3">
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
                <span className="mb-2 block text-sm font-medium text-slate-700">Lớp học</span>
                <span className="relative block">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={filterClass}
                    onChange={(event) => setFilterClass(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-10 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Tất cả lớp</option>
                    {availableClasses.map((className) => (
                      <option key={className} value={className || ''}>
                        {className}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Trạng thái</span>
                <select
                  value={filterStatus}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === 'all' || value === 'marked' || value === 'unmarked') {
                      setFilterStatus(value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">Tất cả ({students.length})</option>
                  <option value="marked">Đã đánh dấu ({markedCount})</option>
                  <option value="unmarked">Chưa đánh dấu ({pendingCount})</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSelectVisible}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Users className="h-4 w-4" />
                {filteredStudents.length > 0 && filteredStudents.every((student) => selectedIds.has(student.id))
                  ? 'Bỏ chọn nhóm hiện tại'
                  : 'Chọn nhóm hiện tại'}
              </button>
              <button
                onClick={handleMarkVisiblePresent}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Đánh dấu nhóm hiện tại có mặt
              </button>
            </div>
          </div>
        </section>

        {selectedIds.size > 0 ? (
          <section className="page-surface rounded-[1.5rem] border border-blue-200 bg-blue-50 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm font-medium text-blue-800">
                Đã chọn {selectedIds.size} học viên
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBulkMark('present')}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Có mặt
                </button>
                <button
                  onClick={() => handleBulkMark('absent')}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Vắng mặt
                </button>
                <button
                  onClick={() => handleBulkMark('late')}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Đi muộn
                </button>
                <button
                  onClick={() => handleBulkMark('excused')}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Có phép
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Danh sách điểm danh</h2>
              <p className="mt-1 text-sm text-slate-600">
                Chọn từng học viên, cập nhật trạng thái và ghi chú khi cần.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {filteredStudents.length} học viên trong bộ lọc
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Không có học viên nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStudents.map((student) => {
                const currentStatus = attendanceData[student.id] || null;
                return (
                  <article
                    key={student.id}
                    className={`rounded-[1.5rem] border p-4 transition ${
                      selectedIds.has(student.id)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(student.id)}
                          onChange={() => handleToggleSelect(student.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />

                        <div>
                          <div className="text-base font-semibold text-slate-900">{student.full_name}</div>
                          <div className="mt-1 text-sm text-slate-600">{student.email}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {student.class_name ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                                {student.class_name}
                              </span>
                            ) : null}
                            {student.student_code ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                                {student.student_code}
                              </span>
                            ) : null}
                            {currentStatus ? (
                              <span
                                className={`rounded-full border px-3 py-1 font-semibold ${getStatusClasses(
                                  currentStatus
                                )}`}
                              >
                                {getStatusLabel(currentStatus)}
                              </span>
                            ) : (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                                Chưa đánh dấu
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full max-w-2xl space-y-3">
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <button
                            onClick={() => handleMarkAttendance(student.id, 'present')}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white'
                                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Có mặt
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student.id, 'absent')}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white'
                                : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            <XCircle className="h-4 w-4" />
                            Vắng mặt
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student.id, 'late')}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 text-white'
                                : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            <Clock3 className="h-4 w-4" />
                            Đi muộn
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(student.id, 'excused')}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              currentStatus === 'excused'
                                ? 'bg-sky-600 text-white'
                                : 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                            }`}
                          >
                            <AlertCircle className="h-4 w-4" />
                            Có phép
                          </button>
                        </div>

                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Ghi chú
                          </span>
                          <textarea
                            rows={2}
                            value={notes[student.id] || ''}
                            onChange={(event) =>
                              setNotes((prev) => ({
                                ...prev,
                                [student.id]: event.target.value,
                              }))
                            }
                            placeholder="Thêm ghi chú cho học viên này nếu cần"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </label>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

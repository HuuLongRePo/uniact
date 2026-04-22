'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Users,
  CheckSquare,
  Square,
  UserCheck,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
} from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface Student {
  id: number;
  full_name: string;
  email: string;
  student_code: string | null;
  class_name: string | null;
  is_participant: boolean;
  attendance_status: AttendanceStatus | null;
}

interface Activity {
  id: number;
  title: string;
  date_time: string;
  location: string;
  status: string;
}

interface ClassOption {
  id: number;
  name: string;
}

export default function BulkAttendancePage() {
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
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      toast.error('Chỉ giảng viên mới có quyền điểm danh');
      router.push('/teacher/dashboard');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading, activityId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch activity
      const activityRes = await fetch(`/api/activities/${activityId}`);
      if (!activityRes.ok) throw new Error('Activity not found');
      const activityData = await activityRes.json();
      setActivity(activityData?.activity ?? activityData?.data?.activity ?? activityData);

      // Fetch participants with attendance status
      const participantsRes = await fetch(`/api/activities/${activityId}/participants`);
      if (participantsRes.ok) {
        const data = await participantsRes.json();
        const participants = data?.participations ?? data?.data?.participations ?? [];
        const mapped = (participants as any[]).map((p: any) => {
          const studentId = Number(p.student_id);
          const normalizedStatus: AttendanceStatus | null =
            p.attendance_status === 'attended' || p.attendance_status === 'present'
              ? 'present'
              : p.attendance_status === 'absent'
                ? 'absent'
                : null;

          return {
            id: Number.isFinite(studentId) ? studentId : Number(p.id),
            full_name: String(p.full_name ?? p.student_name ?? p.name ?? ''),
            email: String(p.email ?? p.student_email ?? ''),
            student_code: (p.student_code ?? null) as string | null,
            class_name: (p.class_name ?? null) as string | null,
            is_participant: true,
            attendance_status: normalizedStatus,
          } satisfies Student;
        });

        setStudents(mapped);

        // Pre-fill existing attendance
        const existing: Record<number, AttendanceStatus> = {};
        const existingNotes: Record<number, string> = {};

        for (const raw of participants as any[]) {
          const sid = Number(raw?.student_id);
          if (!Number.isFinite(sid)) continue;

          const normalizedStatus: AttendanceStatus | null =
            raw.attendance_status === 'attended' || raw.attendance_status === 'present'
              ? 'present'
              : raw.attendance_status === 'absent'
                ? 'absent'
                : null;

          if (normalizedStatus) existing[sid] = normalizedStatus;

          const noteVal = raw?.attendance_notes ?? raw?.notes ?? raw?.note;
          if (noteVal) existingNotes[sid] = String(noteVal);
        }

        setAttendanceData(existing);
        setNotes(existingNotes);
      }

      // Fetch classes
      const classesRes = await fetch('/api/classes');
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData?.classes ?? classesData?.data?.classes ?? classesData);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error(error.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = (studentId: number, status: AttendanceStatus) => {
    setAttendanceData({
      ...attendanceData,
      [studentId]: status,
    });
  };

  const handleBulkMark = (status: AttendanceStatus) => {
    if (selectedIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất một học viên');
      return;
    }

    const newData = { ...attendanceData };
    Array.from(selectedIds).forEach((id) => {
      newData[id] = status;
    });
    setAttendanceData(newData);
    toast.success(`Đã đánh dấu ${selectedIds.size} học viên: ${getStatusLabel(status)}`);
  };

  const handleMarkAllPresent = () => {
    const filtered = getFilteredStudents();
    const newData = { ...attendanceData };
    filtered.forEach((student) => {
      newData[student.id] = 'present';
    });
    setAttendanceData(newData);
    toast.success(`Đã đánh dấu tất cả ${filtered.length} học viên có mặt`);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const attendanceRecords = Object.entries(attendanceData).map(([studentId, status]) => ({
        student_id: parseInt(studentId),
        status,
        notes: notes[parseInt(studentId)] || null,
        check_in_time: new Date().toISOString(),
      }));

      const response = await fetch(`/api/activities/${activityId}/attendance/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: attendanceRecords }),
      });

      if (!response.ok) throw new Error('Không thể lưu điểm danh');

      const result = await response.json();
      toast.success(
        `Đã lưu điểm danh cho ${result.saved_count || attendanceRecords.length} học viên`
      );
      fetchData(); // Reload
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Không thể lưu điểm danh');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAll = () => {
    const filtered = getFilteredStudents();
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleToggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const getFilteredStudents = () => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.student_code && s.student_code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterClass) {
      filtered = filtered.filter((s) => s.class_name === filterClass);
    }

    if (filterStatus === 'marked') {
      filtered = filtered.filter((s) => attendanceData[s.id] !== undefined);
    } else if (filterStatus === 'unmarked') {
      filtered = filtered.filter((s) => attendanceData[s.id] === undefined);
    }

    return filtered;
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    const labels = {
      present: 'Có mặt',
      absent: 'Vắng',
      late: 'Muộn',
      excused: 'Có phép',
    };
    return labels[status];
  };

  const getStatusBadge = (status: AttendanceStatus | null) => {
    if (!status) return <span className="text-gray-400 text-sm">Chưa điểm danh</span>;

    const styles = {
      present: 'bg-green-100 text-green-800 border-green-300',
      absent: 'bg-red-100 text-red-800 border-red-300',
      late: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      excused: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    const icons = {
      present: <CheckCircle2 className="w-4 h-4" />,
      absent: <XCircle className="w-4 h-4" />,
      late: <Clock className="w-4 h-4" />,
      excused: <CheckCircle2 className="w-4 h-4" />,
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${styles[status]}`}
      >
        {icons[status]}
        {getStatusLabel(status)}
      </span>
    );
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Không tìm thấy hoạt động</p>
      </div>
    );
  }

  const filteredStudents = getFilteredStudents();
  const markedCount = Object.keys(attendanceData).length;
  const presentCount = Object.values(attendanceData).filter((s) => s === 'present').length;
  const absentCount = Object.values(attendanceData).filter((s) => s === 'absent').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </button>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-green-600" />
                  Điểm danh hàng loạt
                </h1>
                <p className="text-gray-600 mt-2">{activity.title}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>📅 {new Date(activity.date_time).toLocaleDateString('vi-VN')}</span>
                  <span>📍 {activity.location}</span>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || markedCount === 0}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Đang lưu...' : `Lưu điểm danh (${markedCount})`}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Tổng học viên</div>
            <div className="text-3xl font-bold text-blue-600">{students.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Đã điểm danh</div>
            <div className="text-3xl font-bold text-purple-600">{markedCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Có mặt</div>
            <div className="text-3xl font-bold text-green-600">{presentCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Vắng</div>
            <div className="text-3xl font-bold text-red-600">{absentCount}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Thao tác nhanh</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleMarkAllPresent}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Đánh dấu tất cả có mặt
            </button>
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => handleBulkMark('present')}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                >
                  ✓ Có mặt ({selectedIds.size})
                </button>
                <button
                  onClick={() => handleBulkMark('absent')}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                >
                  ✗ Vắng ({selectedIds.size})
                </button>
                <button
                  onClick={() => handleBulkMark('late')}
                  className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
                >
                  ⏰ Muộn ({selectedIds.size})
                </button>
                <button
                  onClick={() => handleBulkMark('excused')}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  📋 Có phép ({selectedIds.size})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm học viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">Tất cả lớp</option>
                {Array.from(new Set(students.map((s) => s.class_name).filter(Boolean))).map(
                  (className) => (
                    <option key={className} value={className!}>
                      {className}
                    </option>
                  )
                )}
              </select>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả ({students.length})</option>
              <option value="marked">Đã điểm danh ({markedCount})</option>
              <option value="unmarked">Chưa điểm danh ({students.length - markedCount})</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Danh sách học viên ({filteredStudents.length})
            </h3>

            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Không có học viên nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.size === filteredStudents.length &&
                            filteredStudents.length > 0
                          }
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Học viên
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Lớp
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Thao tác nhanh
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          selectedIds.has(student.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(student.id)}
                            onChange={() => handleToggleSelect(student.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.full_name}
                          </div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                          {student.student_code && (
                            <div className="text-xs text-gray-400">MSV: {student.student_code}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {student.class_name || '-'}
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(attendanceData[student.id] || null)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMarkAttendance(student.id, 'present')}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                attendanceData[student.id] === 'present'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                              }`}
                              title="Có mặt"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(student.id, 'absent')}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                attendanceData[student.id] === 'absent'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                              }`}
                              title="Vắng"
                            >
                              ✗
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(student.id, 'late')}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                attendanceData[student.id] === 'late'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-yellow-100'
                              }`}
                              title="Muộn"
                            >
                              ⏰
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(student.id, 'excused')}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                attendanceData[student.id] === 'excused'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
                              }`}
                              title="Có phép"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

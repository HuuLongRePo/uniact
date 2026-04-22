'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  student_code: string | null;
  class_name: string | null;
  status: AttendanceStatus;
  check_in_time: string;
  notes: string | null;
}

interface Activity {
  id: number;
  title: string;
  date_time: string;
  location: string;
}

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);

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

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      toast.error('Chỉ giảng viên mới có quyền xem trang này');
      router.push('/teacher/dashboard');
      return;
    }

    if (user) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, activityId, router]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, filterStatus, filterClass, searchTerm, sortBy, sortOrder]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch activity
      const activityRes = await fetch(`/api/activities/${activityId}`);
      if (!activityRes.ok) throw new Error('Activity not found');
      const activityData = await activityRes.json();
      setActivity(activityData?.activity ?? activityData?.data?.activity ?? activityData);

      // Fetch attendance records
      const attendanceRes = await fetch(`/api/activities/${activityId}/attendance`);
      if (attendanceRes.ok) {
        const data = await attendanceRes.json();
        setRecords(data.records || []);
      }
    } catch (caught: unknown) {
      const error = caught as { message?: string };
      console.error('Error fetching data:', caught);
      toast.error(error.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  const applyFilters = () => {
    let filtered = [...records];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    // Filter by class
    if (filterClass) {
      filtered = filtered.filter((r) => r.class_name === filterClass);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.student_code && r.student_code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortBy === 'name') {
        aVal = a.student_name.toLowerCase();
        bVal = b.student_name.toLowerCase();
      } else if (sortBy === 'time') {
        aVal = new Date(a.check_in_time).getTime();
        bVal = new Date(b.check_in_time).getTime();
      } else {
        aVal = a.status;
        bVal = b.status;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    setFilteredRecords(filtered);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/activities/${activityId}/attendance/export`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${activityId}-${Date.now()}.xlsx`;
      a.click();
      toast.success('Đã xuất file thành công');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Không thể xuất file');
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
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
      excused: <AlertCircle className="w-4 h-4" />,
    };

    const labels = {
      present: 'Có mặt',
      absent: 'Vắng',
      late: 'Muộn',
      excused: 'Có phép',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${styles[status]}`}
      >
        {icons[status]}
        {labels[status]}
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

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const excusedCount = records.filter((r) => r.status === 'excused').length;

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
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Lịch sử điểm danh
                </h1>
                <p className="text-gray-600 mt-2">{activity.title}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>📅 {new Date(activity.date_time).toLocaleDateString('vi-VN')}</span>
                  <span>📍 {activity.location}</span>
                </div>
              </div>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Tổng số</div>
            <div className="text-3xl font-bold text-blue-600">{records.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Có mặt</div>
            <div className="text-3xl font-bold text-green-600">{presentCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Vắng</div>
            <div className="text-3xl font-bold text-red-600">{absentCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Muộn</div>
            <div className="text-3xl font-bold text-yellow-600">{lateCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Có phép</div>
            <div className="text-3xl font-bold text-blue-600">{excusedCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
              <input
                type="text"
                placeholder="Tên, email, mã SV..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="inline w-4 h-4 mr-1" />
                Trạng thái
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  const value = e.target.value;
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tất cả ({records.length})</option>
                <option value="present">Có mặt ({presentCount})</option>
                <option value="absent">Vắng ({absentCount})</option>
                <option value="late">Muộn ({lateCount})</option>
                <option value="excused">Có phép ({excusedCount})</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lớp học</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tất cả lớp</option>
                {Array.from(new Set(records.map((r) => r.class_name).filter(Boolean))).map(
                  (className) => (
                    <option key={className} value={className!}>
                      {className}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sắp xếp</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [col, order] = e.target.value.split('-');
                  if (col === 'name' || col === 'time' || col === 'status') {
                    setSortBy(col);
                  }
                  if (order === 'asc' || order === 'desc') {
                    setSortOrder(order);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="time-desc">Thời gian (mới nhất)</option>
                <option value="time-asc">Thời gian (cũ nhất)</option>
                <option value="name-asc">Tên A-Z</option>
                <option value="name-desc">Tên Z-A</option>
                <option value="status-asc">Trạng thái</option>
              </select>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bản ghi điểm danh ({filteredRecords.length})
            </h3>

            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Không có bản ghi nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
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
                        Thời gian check-in
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Ghi chú
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.student_name}
                          </div>
                          <div className="text-xs text-gray-500">{record.student_email}</div>
                          {record.student_code && (
                            <div className="text-xs text-gray-400">MSV: {record.student_code}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {record.class_name || '-'}
                        </td>
                        <td className="px-4 py-4">{getStatusBadge(record.status)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {new Date(record.check_in_time).toLocaleString('vi-VN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{record.notes || '-'}</td>
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

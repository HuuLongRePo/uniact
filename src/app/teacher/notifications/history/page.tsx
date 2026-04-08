'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { ArrowLeft, History, Search, Filter, Download, CheckCircle2, Clock } from 'lucide-react';

interface NotificationRecord {
  id: number;
  notification_id: number;
  notification_title: string;
  student_id: number;
  student_name: string;
  class_name: string;
  sent_at: string;
  read_at?: string;
  is_read: boolean;
  read_on_device: 'web' | 'mobile' | 'email' | 'sms';
}

export default function NotificationHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<NotificationRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<NotificationRecord[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    readStatus: '',
    classId: '',
    dateStart: '',
    dateEnd: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('sent_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      toast.error('Chỉ giảng viên mới có quyền xem lịch sử thông báo');
      router.push('/dashboard');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [classesRes, recordsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/teacher/notifications/history'),
      ]);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData);
      }

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        setRecords(recordsData.records || []);
        setFilteredRecords(recordsData.records || []);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải lịch sử thông báo');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = records;

    if (filters.readStatus === 'read') {
      filtered = filtered.filter((r) => r.is_read);
    } else if (filters.readStatus === 'unread') {
      filtered = filtered.filter((r) => !r.is_read);
    }

    if (filters.classId) {
      filtered = filtered.filter((r) => r.class_name === filters.classId);
    }

    if (filters.dateStart) {
      filtered = filtered.filter((r) => new Date(r.sent_at) >= new Date(filters.dateStart));
    }
    if (filters.dateEnd) {
      filtered = filtered.filter((r) => new Date(r.sent_at) <= new Date(filters.dateEnd));
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.notification_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      if (sortBy === 'sent_at') {
        aVal = new Date(a.sent_at).getTime();
        bVal = new Date(b.sent_at).getTime();
      } else if (sortBy === 'student') {
        aVal = a.student_name;
        bVal = b.student_name;
      } else if (sortBy === 'read_at') {
        aVal = a.read_at ? new Date(a.read_at).getTime() : 0;
        bVal = b.read_at ? new Date(b.read_at).getTime() : 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    setFilteredRecords(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, searchTerm, sortBy, sortOrder, records]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/teacher/notifications/history/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notification-history-${Date.now()}.csv`;
      a.click();
      toast.success('Đã xuất lịch sử thông báo');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Không thể xuất lịch sử');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  const stats = {
    total: records.length,
    read: records.filter((r) => r.is_read).length,
    unread: records.filter((r) => !r.is_read).length,
  };

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
                  <History className="w-6 h-6 text-blue-600" />
                  Lịch sử thông báo
                </h1>
                <p className="text-gray-600 mt-2">
                  Theo dõi trạng thái đọc và gửi thông báo đến từng học viên
                </p>
              </div>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Tổng cộng</div>
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Đã đọc</div>
            <div className="text-3xl font-bold text-green-600">{stats.read}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total > 0 ? ((stats.read / stats.total) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Chưa đọc</div>
            <div className="text-3xl font-bold text-yellow-600">{stats.unread}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total > 0 ? ((stats.unread / stats.total) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="inline w-4 h-4 mr-1" />
                Tìm kiếm
              </label>
              <input
                type="text"
                placeholder="Tên học viên hoặc tiêu đề..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="inline w-4 h-4 mr-1" />
                Trạng thái đọc
              </label>
              <select
                value={filters.readStatus}
                onChange={(e) => setFilters({ ...filters, readStatus: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Tất cả --</option>
                <option value="read">Đã đọc</option>
                <option value="unread">Chưa đọc</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lớp</label>
              <select
                value={filters.classId}
                onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Tất cả lớp --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
              <input
                type="date"
                value={filters.dateStart}
                onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
            <input
              type="date"
              value={filters.dateEnd}
              onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    onClick={() => setSortBy('student')}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  >
                    Học viên {sortBy === 'student' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Lớp</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Thông báo
                  </th>
                  <th
                    onClick={() => setSortBy('sent_at')}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  >
                    Gửi lúc {sortBy === 'sent_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => setSortBy('read_at')}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  >
                    Đọc lúc {sortBy === 'read_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Thiết bị
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {record.student_name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{record.class_name}</td>
                    <td className="px-4 py-4 text-sm text-blue-600">{record.notification_title}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {new Date(record.sent_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {record.read_at ? new Date(record.read_at).toLocaleString('vi-VN') : '-'}
                    </td>
                    <td className="px-4 py-4">
                      {record.is_read ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Đã đọc
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          Chưa đọc
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {record.read_on_device === 'web'
                        ? '🌐 Web'
                        : record.read_on_device === 'mobile'
                          ? '📱 Mobile'
                          : record.read_on_device === 'email'
                            ? '📧 Email'
                            : '💬 SMS'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRecords.length === 0 && (
            <div className="p-12 text-center">
              <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Không có lịch sử thông báo nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Download, Calendar, Trophy, Award } from 'lucide-react';
import toast from 'react-hot-toast';

interface HistoryItem {
  participation_id: number;
  activity_id: number;
  title: string;
  description: string;
  date_time: string;
  end_time: string;
  location: string;
  activity_type: string;
  organization_level: string;
  max_participants: number;
  registered_at: string;
  attended: number;
  achievement_level: string | null;
  feedback: string | null;
  points_earned: number;
  status: string;
  attendance_method?: string | null;
}

function getAttendanceMethodLabel(method?: string | null) {
  switch (method) {
    case 'face':
      return 'Face attendance';
    case 'qr':
      return 'QR attendance';
    case 'manual':
      return 'Điểm danh thủ công';
    default:
      return 'Chưa rõ phương thức';
  }
}

export default function StudentHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'attended' | 'registered'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'points'>('date');
  const [dateRange, setDateRange] = useState<'all' | 'this-month' | 'last-3-months' | 'this-year'>(
    'all'
  );

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }
    if (user) fetchHistory();
  }, [user, authLoading, router]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/history');
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || json?.message || 'Không thể tải lịch sử tham gia');
      }

      setHistory(json?.data?.history || json?.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải lịch sử tham gia');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history
    .filter((item) => {
      if (filter === 'attended') return item.attended === 1;
      if (filter === 'registered') return item.attended === 0;
      return true;
    })
    .filter((item) => {
      if (dateRange === 'all') return true;
      const now = new Date();
      const itemDate = new Date(item.date_time);

      if (dateRange === 'this-month') {
        return (
          itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()
        );
      }
      if (dateRange === 'last-3-months') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return itemDate >= threeMonthsAgo;
      }
      if (dateRange === 'this-year') {
        return itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'points') return (b.points_earned || 0) - (a.points_earned || 0);
      return new Date(b.date_time).getTime() - new Date(a.date_time).getTime();
    });

  const exportToCSV = () => {
    if (filteredHistory.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const headers = [
      'Hoạt động',
      'Loại',
      'Cấp tổ chức',
      'Ngày bắt đầu',
      'Ngày kết thúc',
      'Địa điểm',
      'Trạng thái',
      'Xếp loại',
      'Điểm',
      'Nhận xét',
    ];

    const rows = filteredHistory.map((item) => [
      item.title,
      item.activity_type,
      item.organization_level,
      new Date(item.date_time).toLocaleString('vi-VN'),
      new Date(item.end_time).toLocaleString('vi-VN'),
      item.location,
      item.attended === 1 ? 'Đã tham gia' : 'Chờ điểm danh',
      item.achievement_level || 'Chưa đánh giá',
      item.points_earned || 0,
      item.feedback || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lich-su-hoat-dong-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Đã xuất file CSV thành công!');
  };

  const stats = {
    total: history.length,
    attended: history.filter((h) => h.attended === 1).length,
    registered: history.filter((h) => h.attended === 0).length,
    totalPoints: history.reduce((sum, h) => sum + (h.points_earned || 0), 0),
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            Lịch Sử Hoạt Động
          </h1>
          <p className="text-gray-600 mt-1">Xem lại toàn bộ hoạt động bạn đã tham gia</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
        >
          <Download className="w-5 h-5" />
          Xuất CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tổng hoạt động</div>
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Đã tham gia</div>
          <div className="text-2xl font-bold text-green-600">{stats.attended}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Chờ điểm danh</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.registered}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tổng điểm</div>
          <div className="text-2xl font-bold text-orange-600">{stats.totalPoints}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'attended' | 'registered')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="attended">Đã tham gia</option>
              <option value="registered">Chờ điểm danh</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thời gian</label>
            <select
              value={dateRange}
              onChange={(e) =>
                setDateRange(e.target.value as 'all' | 'this-month' | 'last-3-months' | 'this-year')
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="this-month">Tháng này</option>
              <option value="last-3-months">3 tháng gần đây</option>
              <option value="this-year">Năm nay</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sắp xếp</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'points')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Ngày gần nhất</option>
              <option value="points">Điểm cao nhất</option>
            </select>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Hiển thị <span className="font-semibold text-blue-600">{filteredHistory.length}</span>{' '}
          hoạt động
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có lịch sử</h3>
            <p className="text-gray-600">Chưa có hoạt động nào phù hợp với bộ lọc</p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.participation_id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {item.activity_type}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      {item.organization_level}
                    </span>
                    {item.attended === 1 ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        ✓ Đã tham gia
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        ⏳ Chờ điểm danh
                      </span>
                    )}
                    {item.achievement_level && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                        🏅 {item.achievement_level}
                      </span>
                    )}
                    {item.attended === 1 && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                        📍 {getAttendanceMethodLabel(item.attendance_method)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">📅 Bắt đầu:</span>{' '}
                      {new Date(item.date_time).toLocaleString('vi-VN')}
                    </div>
                    <div>
                      <span className="font-medium">🏁 Kết thúc:</span>{' '}
                      {new Date(item.end_time).toLocaleString('vi-VN')}
                    </div>
                    <div>
                      <span className="font-medium">📍 Địa điểm:</span> {item.location}
                    </div>
                    <div>
                      <span className="font-medium">📝 Đăng ký:</span>{' '}
                      {new Date(item.registered_at).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  {item.feedback && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Award className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-blue-900 mb-1">💬 Nhận xét:</div>
                          <div className="text-sm text-blue-800">{item.feedback}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-6 text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end mb-1">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-600">{item.points_earned || 0}</div>
                  <div className="text-sm text-gray-500">điểm</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import StudentScoreFlowNav from '@/components/student/StudentScoreFlowNav';
import { Calendar, Download, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';
import { parseVietnamDate, toVietnamDateStamp } from '@/lib/timezone';

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

interface HistorySummary {
  total_participations: number;
  registered_count: number;
  attended_count: number;
  absent_count: number;
  excellent_count: number;
  good_count: number;
  participated_count: number;
  total_points_earned: number;
}

function getAttendanceMethodLabel(method?: string | null) {
  switch (method) {
    case 'face':
      return 'Điểm danh khuôn mặt';
    case 'qr':
      return 'Điểm danh QR';
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
  const [summary, setSummary] = useState<HistorySummary | null>(null);
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
    if (user) {
      void fetchHistory();
    }
  }, [user, authLoading, router]);

  async function fetchHistory() {
    try {
      setLoading(true);
      const res = await fetch('/api/student/history');
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || json?.message || 'Không thể tải lịch sử tham gia');
      }

      setHistory((json?.data?.history || json?.history || []) as HistoryItem[]);
      setSummary((json?.data?.summary || json?.summary || null) as HistorySummary | null);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải lịch sử tham gia');
      setHistory([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  const filteredHistory = useMemo(() => {
    return history
      .filter((item) => {
        if (filter === 'attended') return item.attended === 1;
        if (filter === 'registered') return item.attended === 0;
        return true;
      })
      .filter((item) => {
        if (dateRange === 'all') return true;
        const now = new Date();
        const itemDate = parseVietnamDate(item.date_time);
        if (!itemDate) return false;

        if (dateRange === 'this-month') {
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
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
      .sort((left, right) => {
        if (sortBy === 'points') return (right.points_earned || 0) - (left.points_earned || 0);
        return (
          (parseVietnamDate(right.date_time)?.getTime() ?? 0) -
          (parseVietnamDate(left.date_time)?.getTime() ?? 0)
        );
      });
  }, [history, filter, sortBy, dateRange]);

  function exportToCSV() {
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
      formatDate(item.date_time),
      formatDate(item.end_time),
      item.location,
      item.attended === 1 ? 'Đã tham gia' : 'Chờ điểm danh',
      item.achievement_level || 'Chưa đánh giá',
      item.points_earned || 0,
      item.feedback || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `lich-su-hoat-dong-${toVietnamDateStamp(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất tệp CSV');
  }

  const stats = summary || {
    total_participations: history.length,
    registered_count: history.filter((item) => item.attended === 0).length,
    attended_count: history.filter((item) => item.attended === 1).length,
    absent_count: 0,
    excellent_count: history.filter((item) => item.achievement_level === 'excellent').length,
    good_count: history.filter((item) => item.achievement_level === 'good').length,
    participated_count: history.filter((item) => item.achievement_level === 'participated').length,
    total_points_earned: history.reduce((sum, item) => sum + (item.points_earned || 0), 0),
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
                <Calendar className="h-8 w-8 text-blue-600" />
                Lịch sử hoạt động
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Tổng hợp các hoạt động bạn đã đăng ký, đã tham gia và số điểm đã được ghi nhận.
              </p>
            </div>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-slate-900"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </button>
          </div>
        </div>

        <StudentDailyQuickActions />
        <StudentScoreFlowNav />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">Tổng hoạt động</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total_participations}</div>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Đã tham gia</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.attended_count}</div>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm dark:border-amber-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-amber-700 dark:text-amber-300">Chờ điểm danh</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.registered_count}</div>
          </div>
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Tổng điểm</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total_points_earned}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Trạng thái</label>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as 'all' | 'attended' | 'registered')}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900"
              >
                <option value="all">Tất cả</option>
                <option value="attended">Đã tham gia</option>
                <option value="registered">Chờ điểm danh</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Thời gian</label>
              <select
                value={dateRange}
                onChange={(event) =>
                  setDateRange(
                    event.target.value as 'all' | 'this-month' | 'last-3-months' | 'this-year'
                  )
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900"
              >
                <option value="all">Tất cả</option>
                <option value="this-month">Tháng này</option>
                <option value="last-3-months">3 tháng gần đây</option>
                <option value="this-year">Năm nay</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Sắp xếp</label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as 'date' | 'points')}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-900"
              >
                <option value="date">Ngày gần nhất</option>
                <option value="points">Điểm cao nhất</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Đang hiển thị <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredHistory.length}</span> hoạt động.
          </div>
        </div>

        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <div
              data-testid="student-history-empty-state"
              className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Không có lịch sử</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Chưa có hoạt động nào phù hợp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.participation_id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{item.title}</h2>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                        {item.activity_type}
                      </span>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-500/15 dark:text-purple-200">
                        {item.organization_level}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.attended === 1
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
                        }`}
                      >
                        {item.attended === 1 ? 'Đã tham gia' : 'Chờ điểm danh'}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Bắt đầu</div>
                        <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{formatDate(item.date_time)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Kết thúc</div>
                        <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{formatDate(item.end_time)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Địa điểm</div>
                        <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{item.location}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Đăng ký lúc</div>
                        <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{formatDate(item.registered_at)}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.achievement_level && (
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
                          {item.achievement_level === 'excellent'
                            ? 'Xuất sắc'
                            : item.achievement_level === 'good'
                              ? 'Tốt'
                              : 'Tham gia'}
                        </span>
                      )}
                      {item.attended === 1 && (
                        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200">
                          {getAttendanceMethodLabel(item.attendance_method)}
                        </span>
                      )}
                    </div>

                    {item.feedback && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                        <div className="font-semibold">Nhận xét</div>
                        <div className="mt-1">{item.feedback}</div>
                      </div>
                    )}
                  </div>

                  <div className="w-full shrink-0 rounded-3xl bg-slate-50 p-4 text-center dark:bg-slate-800/70 lg:w-44">
                    <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      <span className="text-xs font-semibold uppercase tracking-wide">Điểm</span>
                    </div>
                    <div className="mt-2 text-4xl font-bold text-emerald-600 dark:text-emerald-300">{item.points_earned || 0}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

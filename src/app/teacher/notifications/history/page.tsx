'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  History,
  Search,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime, toVietnamFileTimestamp } from '@/lib/timezone';

type ReadDevice = 'web' | 'mobile' | 'email' | 'sms' | 'unknown';

interface NotificationRecord {
  id: number;
  notification_id: number;
  notification_title: string;
  student_id: number;
  student_name: string;
  class_name: string;
  sent_at: string;
  read_at?: string | null;
  is_read: boolean;
  read_on_device: ReadDevice;
}

interface NotificationSummaryItem {
  id: number;
  title: string;
  message: string;
  target_type: string;
  target_names?: string | null;
  recipient_count: number;
  delivered_count: number;
  read_count: number;
  unread_count: number;
  read_rate: number;
  sent_at?: string | null;
  created_at: string;
}

interface NotificationHistorySummary {
  total_notifications: number;
  total_recipients: number;
  total_read: number;
  total_unread: number;
  low_read_notifications: NotificationSummaryItem[];
}

function getClasses(payload: unknown): Array<{ id: number; name: string }> {
  if (!payload || typeof payload !== 'object') return [];
  const data = payload as {
    data?: { classes?: Array<{ id: number; name: string }> };
    classes?: Array<{ id: number; name: string }>;
  };
  return data.data?.classes ?? data.classes ?? [];
}

function getHistoryPayload(payload: unknown): {
  records: NotificationRecord[];
  notifications: NotificationSummaryItem[];
  summary: NotificationHistorySummary;
} {
  if (!payload || typeof payload !== 'object') {
    return {
      records: [],
      notifications: [],
      summary: {
        total_notifications: 0,
        total_recipients: 0,
        total_read: 0,
        total_unread: 0,
        low_read_notifications: [],
      },
    };
  }

  const data = payload as {
    data?: {
      records?: NotificationRecord[];
      notifications?: NotificationSummaryItem[];
      summary?: NotificationHistorySummary;
    };
    records?: NotificationRecord[];
    notifications?: NotificationSummaryItem[];
    summary?: NotificationHistorySummary;
  };

  return {
    records: data.data?.records ?? data.records ?? [],
    notifications: data.data?.notifications ?? data.notifications ?? [],
    summary: data.data?.summary ??
      data.summary ?? {
        total_notifications: 0,
        total_recipients: 0,
        total_read: 0,
        total_unread: 0,
        low_read_notifications: [],
      },
  };
}

export default function NotificationHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<NotificationRecord[]>([]);
  const [broadcasts, setBroadcasts] = useState<NotificationSummaryItem[]>([]);
  const [summary, setSummary] = useState<NotificationHistorySummary>({
    total_notifications: 0,
    total_recipients: 0,
    total_read: 0,
    total_unread: 0,
    low_read_notifications: [],
  });
  const [filteredRecords, setFilteredRecords] = useState<NotificationRecord[]>([]);

  const [filters, setFilters] = useState({
    readStatus: '',
    className: '',
    dateStart: '',
    dateEnd: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'sent_at' | 'student' | 'read_at'>('sent_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      toast.error('Chỉ giảng viên hoặc quản trị viên mới được xem lịch sử thông báo');
      router.push('/teacher/dashboard');
      return;
    }

    if (user) {
      void fetchData();
    }
  }, [authLoading, router, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, historyRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/teacher/notifications/history'),
      ]);

      if (classesRes.ok) {
        const classPayload = await classesRes.json();
        setClasses(getClasses(classPayload));
      }

      if (historyRes.ok) {
        const historyPayload = await historyRes.json();
        const normalized = getHistoryPayload(historyPayload);
        setRecords(normalized.records);
        setFilteredRecords(normalized.records);
        setBroadcasts(normalized.notifications);
        setSummary(normalized.summary);
      }
    } catch (error) {
      console.error('Error fetching notification history:', error);
      toast.error('Không thể tải lịch sử thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let next = [...records];

    if (filters.readStatus === 'read') {
      next = next.filter((record) => record.is_read);
    } else if (filters.readStatus === 'unread') {
      next = next.filter((record) => !record.is_read);
    }

    if (filters.className) {
      next = next.filter((record) => record.class_name === filters.className);
    }

    if (filters.dateStart) {
      next = next.filter((record) => new Date(record.sent_at) >= new Date(filters.dateStart));
    }

    if (filters.dateEnd) {
      next = next.filter((record) => new Date(record.sent_at) <= new Date(filters.dateEnd));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      next = next.filter(
        (record) =>
          record.student_name.toLowerCase().includes(q) ||
          record.notification_title.toLowerCase().includes(q)
      );
    }

    next.sort((left, right) => {
      let leftValue: string | number = '';
      let rightValue: string | number = '';

      if (sortBy === 'sent_at') {
        leftValue = new Date(left.sent_at).getTime();
        rightValue = new Date(right.sent_at).getTime();
      } else if (sortBy === 'student') {
        leftValue = left.student_name;
        rightValue = right.student_name;
      } else {
        leftValue = left.read_at ? new Date(left.read_at).getTime() : 0;
        rightValue = right.read_at ? new Date(right.read_at).getTime() : 0;
      }

      if (sortOrder === 'asc') {
        return leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;
      }
      return leftValue < rightValue ? 1 : leftValue > rightValue ? -1 : 0;
    });

    setFilteredRecords(next);
  }, [records, filters, searchTerm, sortBy, sortOrder]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/teacher/notifications/history/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            readStatus: filters.readStatus,
            className: filters.className,
            dateStart: filters.dateStart,
            dateEnd: filters.dateEnd,
          },
        }),
      });
      if (!response.ok) throw new Error('Không thể xuất tệp');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `notification-history-${toVietnamFileTimestamp(new Date())}.csv`;
      anchor.click();
      toast.success('Đã xuất CSV lịch sử thông báo');
    } catch (error) {
      console.error('Error exporting history:', error);
      toast.error('Không thể xuất lịch sử thông báo');
    }
  };

  const readRate = useMemo(() => {
    if (summary.total_recipients === 0) return 0;
    return (summary.total_read / summary.total_recipients) * 100;
  }, [summary.total_read, summary.total_recipients]);

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  const sortIndicator = (field: 'sent_at' | 'student' | 'read_at') =>
    sortBy === field ? (sortOrder === 'asc' ? '↑' : '↓') : '';

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <header className="border-b border-gray-200 px-5 py-5 sm:px-7">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                <History className="h-6 w-6 text-blue-600" />
                Lịch sử thông báo
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
                Theo dõi độ phủ gửi, tỷ lệ đọc và các thông báo có hiệu suất thấp để tối ưu nội
                dung.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </button>
          </div>
        </header>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="content-card p-4">
              <div className="mb-1 text-sm text-gray-600">Thông báo đã gửi</div>
              <div className="text-3xl font-bold text-blue-600">{summary.total_notifications}</div>
            </div>
            <div className="content-card p-4">
              <div className="mb-1 text-sm text-gray-600">Tổng lượt nhận</div>
              <div className="text-3xl font-bold text-indigo-600">{summary.total_recipients}</div>
            </div>
            <div className="content-card p-4">
              <div className="mb-1 text-sm text-gray-600">Đã đọc</div>
              <div className="text-3xl font-bold text-emerald-600">{summary.total_read}</div>
            </div>
            <div className="content-card p-4" data-testid="notification-read-rate-card">
              <div className="mb-1 text-sm text-gray-600">Tỷ lệ đọc</div>
              <div className="text-3xl font-bold text-amber-600">{readRate.toFixed(1)}%</div>
            </div>
          </div>

          <div
            className="content-card border-orange-200 bg-orange-50 p-6"
            data-testid="notification-low-read-section"
          >
            <div className="mb-4 flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />
              <div>
                <h2 className="text-lg font-semibold text-orange-900">
                  Thông báo có tỷ lệ đọc thấp
                </h2>
                <p className="text-sm text-orange-800">
                  Cân nhắc điều chỉnh tiêu đề, nội dung hoặc thời điểm gửi cho nhóm dưới đây.
                </p>
              </div>
            </div>

            {summary.low_read_notifications.length === 0 ? (
              <div className="rounded-lg bg-white/80 p-4 text-sm text-orange-900">
                Chưa có đủ dữ liệu để đánh giá tỷ lệ đọc thấp.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {summary.low_read_notifications.map((item) => (
                  <div key={item.id} className="rounded-lg bg-white/80 p-4 shadow-sm">
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="mt-2 text-xs text-gray-500">
                      {item.target_names || 'Tất cả nhóm phù hợp'}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">Nhận</div>
                        <div className="mt-1 font-semibold text-blue-700">
                          {item.delivered_count}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">Đã đọc</div>
                        <div className="mt-1 font-semibold text-emerald-700">{item.read_count}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          Chưa đọc
                        </div>
                        <div className="mt-1 font-semibold text-orange-800">
                          {item.unread_count}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-orange-900">
                      Tỷ lệ đọc: <span className="font-semibold">{item.read_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="content-card p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  <Search className="mr-1 inline h-4 w-4" />
                  Tìm kiếm
                </label>
                <input
                  type="text"
                  placeholder="Tên học viên hoặc tiêu đề thông báo..."
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
                  value={filters.className}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, className: event.target.value }))
                  }
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
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Trạng thái đọc
                </label>
                <select
                  value={filters.readStatus}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, readStatus: event.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Tất cả --</option>
                  <option value="read">Đã đọc</option>
                  <option value="unread">Chưa đọc</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label>
                  <input
                    type="date"
                    value={filters.dateStart}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, dateStart: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
                  <input
                    type="date"
                    value={filters.dateEnd}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, dateEnd: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="content-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th
                      onClick={() => {
                        setSortBy('student');
                        setSortOrder((current) =>
                          sortBy === 'student' && current === 'asc' ? 'desc' : 'asc'
                        );
                      }}
                      className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                    >
                      Học viên {sortIndicator('student')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Lớp</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Thông báo
                    </th>
                    <th
                      onClick={() => {
                        setSortBy('sent_at');
                        setSortOrder((current) =>
                          sortBy === 'sent_at' && current === 'asc' ? 'desc' : 'asc'
                        );
                      }}
                      className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                    >
                      Gửi lúc {sortIndicator('sent_at')}
                    </th>
                    <th
                      onClick={() => {
                        setSortBy('read_at');
                        setSortOrder((current) =>
                          sortBy === 'read_at' && current === 'asc' ? 'desc' : 'asc'
                        );
                      }}
                      className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                    >
                      Đọc lúc {sortIndicator('read_at')}
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
                    <tr key={record.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {record.student_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{record.class_name}</td>
                      <td className="px-4 py-4 text-sm text-blue-600">
                        {record.notification_title}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatVietnamDateTime(record.sent_at)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {record.read_at ? formatVietnamDateTime(record.read_at) : '-'}
                      </td>
                      <td className="px-4 py-4">
                        {record.is_read ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Đã đọc
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                            <Clock className="h-3 w-3" />
                            Chưa đọc
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {record.read_on_device === 'unknown'
                          ? 'Không theo dõi'
                          : record.read_on_device}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRecords.length === 0 && (
              <div className="p-12 text-center">
                <History className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <p className="text-lg text-gray-600">Không có bản ghi thông báo nào</p>
              </div>
            )}
          </div>

          {broadcasts.length > 0 && (
            <div className="text-right text-sm text-gray-500">
              Đang theo dõi {broadcasts.length} chiến dịch gần nhất.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { Send, History as HistoryIcon, Clock } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  email: string;
  total_points: number;
  class_id?: number;
  class_name?: string;
  is_homeroom_scope?: boolean;
}

interface NotificationRecord {
  id: number;
  title: string;
  message: string;
  recipient_count: number;
  created_at: string;
  updated_at: string;
  read_count?: number;
}

interface ScheduledNotification {
  id: number;
  title: string;
  message: string;
  recipient_count: number;
  scheduled_at: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

export default function TeacherNotifyStudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classFilter, setClassFilter] = useState<'all' | string>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'scheduled'>('send');
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [notificationToCancel, setNotificationToCancel] = useState<ScheduledNotification | null>(
    null
  );

  // Schedule state
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [useSchedule, setUseSchedule] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchStudents();
      fetchHistory();
      fetchScheduled();
    }
  }, [user, authLoading, router]);

  const classOptions = useMemo(
    () =>
      Array.from(
        new Map(
          students
            .filter(
              (student) =>
                Number.isInteger(Number(student.class_id)) && Number(student.class_id) > 0
            )
            .map((student) => [
              String(student.class_id),
              {
                id: String(student.class_id),
                name: student.class_name || `Lớp #${student.class_id}`,
              },
            ])
        ).values()
      ).sort((left, right) => left.name.localeCompare(right.name, 'vi')),
    [students]
  );

  const filteredStudents = useMemo(() => {
    if (classFilter === 'all') {
      return students;
    }
    return students.filter((student) => String(student.class_id || '') === classFilter);
  }, [students, classFilter]);

  const allVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedIds.includes(Number(student.id)));

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const studentsRes = await fetch('/api/teacher/students');
      const studentsData = await studentsRes.json().catch(() => null);

      if (!studentsRes.ok) {
        throw new Error(
          studentsData?.error || studentsData?.message || 'Không thể tải danh sách học viên'
        );
      }

      setStudents(studentsData?.students || studentsData?.data?.students || []);
    } catch (e) {
      console.error('Fetch students error:', e);
      toast.error(e instanceof Error ? e.message : 'Không thể tải danh sách học viên');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch('/api/teacher/notifications/history');
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setHistory(data?.notifications || data?.data?.notifications || []);
      } else {
        throw new Error(data?.error || data?.message || 'Không thể tải lịch sử thông báo');
      }
    } catch (e) {
      console.error('Fetch history error:', e);
      toast.error(e instanceof Error ? e.message : 'Không thể tải lịch sử thông báo');
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchScheduled = async () => {
    try {
      setScheduledLoading(true);
      const res = await fetch('/api/teacher/notifications/scheduled');
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setScheduled(data?.notifications || data?.data?.notifications || []);
      } else {
        throw new Error(data?.error || data?.message || 'Không thể tải lịch gửi thông báo');
      }
    } catch (e) {
      console.error('Fetch scheduled error:', e);
      toast.error(e instanceof Error ? e.message : 'Không thể tải lịch gửi thông báo');
    } finally {
      setScheduledLoading(false);
    }
  };

  const handleToggleStudent = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (filteredStudents.length === 0) {
      return;
    }

    const visibleIdSet = new Set(filteredStudents.map((student) => Number(student.id)));
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIdSet.has(Number(id))));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...Array.from(visibleIdSet)])));
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 học viên');
      return;
    }
    if (!title.trim() || !message.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung');
      return;
    }

    try {
      setSending(true);

      if (useSchedule && scheduleDate && scheduleTime) {
        // Schedule for later
        const scheduledDateTime = `${scheduleDate}T${scheduleTime}`;
        const res = await fetch('/api/teacher/notifications/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_ids: selectedIds,
            title: title.trim(),
            message: message.trim(),
            scheduled_at: scheduledDateTime,
            type: 'info',
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          toast.success(data?.message || 'Đã lên lịch gửi thông báo');
          setTitle('');
          setMessage('');
          setSelectedIds([]);
          setScheduleDate('');
          setScheduleTime('');
          setUseSchedule(false);
          await fetchScheduled();
        } else {
          toast.error(data?.error || data?.message || 'Lên lịch gửi thất bại');
        }
      } else {
        // Send now
        const res = await fetch('/api/students/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_ids: selectedIds,
            title: title.trim(),
            message: message.trim(),
            type: 'info',
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          toast.success(data?.message || 'Đã gửi thông báo thành công');
          setTitle('');
          setMessage('');
          setSelectedIds([]);
          // Refresh history
          await fetchHistory();
        } else {
          toast.error(data?.error || data?.message || 'Gửi thông báo thất bại');
        }
      }
    } catch (e) {
      console.error('Send notification error:', e);
      toast.error(e instanceof Error ? e.message : 'Lỗi khi gửi thông báo');
    } finally {
      setSending(false);
    }
  };

  const handleCancelScheduled = async (id: number) => {
    try {
      const res = await fetch(`/api/teacher/notifications/scheduled/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast.success(data?.message || 'Đã hủy thông báo');
        await fetchScheduled();
      } else {
        toast.error(data?.error || data?.message || 'Hủy thông báo thất bại');
      }
    } catch (e) {
      console.error('Cancel scheduled error:', e);
      toast.error(e instanceof Error ? e.message : 'Lỗi khi hủy thông báo');
    }
  };
  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="w-8 h-8 text-blue-600" />
            Gửi Thông Báo Cho Học Viên
          </h1>
          <p className="mt-2 text-gray-600">Quản lý thông báo và lịch sử gửi</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('send')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'send'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Send className="w-4 h-4" />
              Gửi Thông Báo
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'scheduled'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Lên Lịch ({scheduled.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <HistoryIcon className="w-4 h-4" />
              Lịch Sử ({history.length})
            </button>
          </div>
        </div>

        {/* Send Tab */}
        {activeTab === 'send' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  Chọn học viên ({selectedIds.length}/{students.length})
                </h2>
                <button
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  {allVisibleSelected ? 'Bỏ chọn lớp đang lọc' : 'Chọn lớp đang lọc'}
                </button>
              </div>

              <div className="mb-3 flex items-center gap-3">
                <label htmlFor="notify-class-filter" className="text-sm font-medium text-gray-700">
                  Lọc theo lớp:
                </label>
                <select
                  id="notify-class-filter"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="all">Tất cả lớp</option>
                  {classOptions.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                {filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(student.id)}
                      onChange={() => handleToggleStudent(student.id)}
                      className="mr-3 w-4 h-4 accent-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-600">{student.email}</div>
                    </div>
                    <div className="text-sm text-gray-500">{student.total_points} điểm</div>
                  </label>
                ))}
                {filteredStudents.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    Không có học viên trong bộ lọc này
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Nội dung thông báo</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tiêu đề thông báo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={100}
                  />
                  <div className="text-xs text-gray-500 mt-1 text-right">{title.length}/100</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung *</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Nhập nội dung thông báo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-500 mt-1 text-right">{message.length}/500</div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">📋 Xem trước:</p>
                  <div className="p-3 bg-white rounded border border-blue-100">
                    <div className="font-medium text-gray-900">{title || '(Tiêu đề)'}</div>
                    <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3">
                      {message || '(Nội dung thông báo)'}
                    </div>
                  </div>
                </div>

                {/* Schedule Options */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSchedule}
                      onChange={(e) => setUseSchedule(e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="font-medium text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Lên lịch gửi sau
                    </span>
                  </label>

                  {useSchedule && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Giờ</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSend}
                  disabled={
                    sending ||
                    selectedIds.length === 0 ||
                    !title.trim() ||
                    !message.trim() ||
                    (useSchedule && (!scheduleDate || !scheduleTime))
                  }
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending
                    ? 'Đang xử lý...'
                    : useSchedule
                      ? `⏱️ Lên lịch cho ${selectedIds.length} học viên`
                      : `Gửi cho ${selectedIds.length} học viên`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-blue-600" />
                Lịch Sử Gửi Thông Báo
              </h2>
            </div>

            {historyLoading ? (
              <LoadingSpinner />
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <HistoryIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Chưa có thông báo nào được gửi</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Tiêu Đề
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Nội Dung
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                        Số Người Nhận
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                        Đã Đọc
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Thời Gian
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history.map((notification) => (
                      <tr key={notification.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {notification.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                          {notification.message}
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {notification.recipient_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {notification.read_count || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(notification.created_at).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Scheduled Tab */}
        {activeTab === 'scheduled' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Thông Báo Được Lên Lịch
              </h2>
            </div>

            {scheduledLoading ? (
              <LoadingSpinner />
            ) : scheduled.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Chưa có thông báo nào được lên lịch</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Tiêu Đề
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Nội Dung
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                        Số Người Nhận
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                        Thời Gian Lên Lịch
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                        Trạng Thái
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                        Hành Động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {scheduled.map((notification) => (
                      <tr key={notification.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {notification.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                          {notification.message}
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {notification.recipient_count}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(notification.scheduled_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              notification.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : notification.status === 'sent'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {notification.status === 'pending'
                              ? 'Chờ gửi'
                              : notification.status === 'sent'
                                ? 'Đã gửi'
                                : 'Lỗi'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          {notification.status === 'pending' && (
                            <button
                              onClick={() => setNotificationToCancel(notification)}
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              Hủy
                            </button>
                          )}
                          {notification.status !== 'pending' && (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={notificationToCancel !== null}
        title="Hủy thông báo đã lên lịch"
        message={
          notificationToCancel
            ? `Bạn có chắc chắn muốn hủy thông báo "${notificationToCancel.title}" đã lên lịch gửi?`
            : ''
        }
        confirmText="Hủy thông báo"
        cancelText="Giữ lại"
        variant="danger"
        onCancel={() => setNotificationToCancel(null)}
        onConfirm={async () => {
          if (!notificationToCancel) return;
          await handleCancelScheduled(notificationToCancel.id);
          setNotificationToCancel(null);
        }}
      />
    </div>
  );
}

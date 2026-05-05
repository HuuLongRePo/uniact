'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';
import { parseVietnamDate } from '@/lib/timezone';

interface Registration {
  id: number;
  activity_id: number;
  attendance_status: string;
  achievement_level?: string | null;
  feedback?: string | null;
  registered_at: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  activity_status: string;
  teacher_name: string;
  participant_count: number;
  max_participants: number;
}

interface Registrations {
  upcoming: Registration[];
  completed: Registration[];
  cancelled: Registration[];
}

type TabKey = 'upcoming' | 'completed' | 'cancelled';

const EMPTY_REGISTRATIONS: Registrations = {
  upcoming: [],
  completed: [],
  cancelled: [],
};

export default function MyActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registrations>(EMPTY_REGISTRATIONS);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'title'>('date_desc');
  const [upcomingReminders, setUpcomingReminders] = useState<number[]>([]);
  const [cancelTarget, setCancelTarget] = useState<Registration | null>(null);
  const [cancelingActivityId, setCancelingActivityId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchRegistrations();
    }
  }, [user, authLoading, router]);

  async function fetchRegistrations() {
    try {
      const response = await fetch('/api/activities/my-registrations');
      const data = await response.json();
      const payload = data?.data ?? data;
      const nextRegistrations = payload?.registrations ?? EMPTY_REGISTRATIONS;

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Không thể tải danh sách đăng ký');
      }

      setRegistrations(nextRegistrations);

      const now = new Date();
      const upcoming24h = nextRegistrations.upcoming.filter((registration: Registration) => {
        const activityTime = parseVietnamDate(registration.date_time);
        if (!activityTime) return false;
        const hoursUntil = (activityTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil > 0 && hoursUntil <= 24;
      });

      setUpcomingReminders(upcoming24h.map((registration: Registration) => registration.activity_id));
    } catch (error) {
      console.error('Fetch registrations error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải danh sách đăng ký');
      setRegistrations(EMPTY_REGISTRATIONS);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRegistration(activityId: number) {
    setCancelingActivityId(activityId);
    try {
      const response = await fetch(`/api/activities/${activityId}/register`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Đã hủy đăng ký thành công');
        await fetchRegistrations();
      } else {
        toast.error(data.error || 'Không thể hủy đăng ký');
      }
    } catch (error) {
      console.error('Cancel registration error:', error);
      toast.error('Lỗi khi hủy đăng ký');
    } finally {
      setCancelingActivityId(null);
    }
  }

  const currentList = useMemo(() => {
    const list = [...registrations[tab]];

    const filtered = list.filter((registration) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.trim().toLowerCase();
      return (
        registration.title.toLowerCase().includes(query) ||
        registration.description.toLowerCase().includes(query) ||
        registration.location.toLowerCase().includes(query)
      );
    });

    filtered.sort((left, right) => {
      if (sortBy === 'title') return left.title.localeCompare(right.title, 'vi');
      const timeLeft = parseVietnamDate(left.date_time)?.getTime() ?? 0;
      const timeRight = parseVietnamDate(right.date_time)?.getTime() ?? 0;
      return sortBy === 'date_asc' ? timeLeft - timeRight : timeRight - timeLeft;
    });

    return filtered;
  }, [registrations, tab, searchQuery, sortBy]);

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!user || user.role !== 'student') {
    return null;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <h1 data-testid="my-activities-heading" className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Hoạt động của tôi
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Theo dõi các hoạt động đã đăng ký, hoạt động đã tham gia và các mục đã hủy trên một
            giao diện gọn gàng hơn cho điện thoại.
          </p>
        </div>

        <StudentDailyQuickActions />

        {upcomingReminders.length > 0 && tab === 'upcoming' && (
          <div className="rounded-3xl border border-orange-300 bg-orange-50 p-4 shadow-sm dark:border-orange-500/40 dark:bg-orange-500/10">
            <div className="text-sm font-semibold text-orange-900 dark:text-orange-200">
              Có {upcomingReminders.length} hoạt động sắp diễn ra trong 24 giờ tới.
            </div>
            <div className="mt-1 text-sm text-orange-700 dark:text-orange-300">
              Kiểm tra thời gian bắt đầu và mở trang điểm danh QR đúng lúc để tránh bỏ lỡ điểm
              danh.
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Sắp diễn ra</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{registrations.upcoming.length}</div>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
            <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Đã hoàn thành</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{registrations.completed.length}</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Đã hủy</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{registrations.cancelled.length}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
            <button
              onClick={() => setTab('upcoming')}
              className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold ${
                tab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              Sắp diễn ra ({registrations.upcoming.length})
            </button>
            <button
              onClick={() => setTab('completed')}
              className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold ${
                tab === 'completed' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              Đã hoàn thành ({registrations.completed.length})
            </button>
            <button
              onClick={() => setTab('cancelled')}
              className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold ${
                tab === 'cancelled' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              Đã hủy ({registrations.cancelled.length})
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Tìm kiếm</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tên, mô tả, địa điểm..."
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Sắp xếp</label>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as 'date_desc' | 'date_asc' | 'title')
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
              >
                <option value="date_desc">Ngày mới nhất</option>
                <option value="date_asc">Ngày xa nhất</option>
                <option value="title">Theo tên A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {currentList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">Chưa có hoạt động phù hợp</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Hãy đổi tab hoặc bộ lọc để xem danh sách khác.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map((registration) => {
              const activityDate = parseVietnamDate(registration.date_time);
              const activityTimestamp = activityDate?.getTime() ?? Number.NaN;
              const canCancel =
                tab === 'upcoming' && (activityTimestamp - Date.now()) / (1000 * 60 * 60) >= 24;
              const isSoon = upcomingReminders.includes(registration.activity_id);
              const hoursUntil = Number.isFinite(activityTimestamp)
                ? (activityTimestamp - Date.now()) / (1000 * 60 * 60)
                : null;

              return (
                <div
                  key={registration.id}
                  className={`rounded-3xl border bg-white p-5 shadow-sm dark:bg-slate-900 ${
                    tab === 'cancelled' ? 'border-slate-200 opacity-70 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700'
                  } ${isSoon ? 'border-orange-300 dark:border-orange-500/40' : ''}`}
                >
                  {isSoon && hoursUntil !== null && (
                    <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-200">
                      Sắp diễn ra trong khoảng {Math.max(1, Math.round(hoursUntil))} giờ nữa.
                    </div>
                  )}

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{registration.title}</h2>
                        {tab === 'upcoming' && (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                            Đã đăng ký
                          </span>
                        )}
                        {tab === 'cancelled' && (
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                            Đã hủy
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{registration.description}</p>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Giảng viên</div>
                          <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{registration.teacher_name}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Thời gian</div>
                          <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                            {formatDate(registration.date_time)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Địa điểm</div>
                          <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{registration.location}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Số chỗ</div>
                          <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                            {registration.participant_count}/{registration.max_participants}
                          </div>
                        </div>
                      </div>

                      {registration.feedback && (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                          <div className="font-semibold">Nhận xét</div>
                          <div className="mt-1">{registration.feedback}</div>
                        </div>
                      )}
                    </div>

                    <div className="w-full shrink-0 space-y-3 lg:w-60">
                      {registration.achievement_level && (
                        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Thành tích</div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                            {registration.achievement_level === 'excellent'
                              ? 'Xuất sắc'
                              : registration.achievement_level === 'good'
                                ? 'Tốt'
                                : 'Tham gia'}
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
                          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Đăng ký lúc</div>
                        <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                          {formatDate(registration.registered_at)}
                        </div>
                      </div>

                      {canCancel && (
                        <button
                          onClick={() => setCancelTarget(registration)}
                          disabled={cancelingActivityId === registration.activity_id}
                          className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {cancelingActivityId === registration.activity_id ? 'Đang hủy...' : 'Hủy đăng ký'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmDialog
          isOpen={cancelTarget !== null}
          title="Xác nhận hủy đăng ký"
          message={
            cancelTarget
              ? `Bạn có chắc muốn hủy đăng ký hoạt động "${cancelTarget.title}" không?`
              : ''
          }
          confirmText="Hủy đăng ký"
          cancelText="Quay lại"
          variant="danger"
          onCancel={() => setCancelTarget(null)}
          onConfirm={async () => {
            if (!cancelTarget) return;
            const activityId = cancelTarget.activity_id;
            setCancelTarget(null);
            await handleCancelRegistration(activityId);
          }}
        />
      </div>
    </div>
  );
}

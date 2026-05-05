'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Loader2,
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toVietnamDatetimeLocalValue } from '@/lib/timezone';

interface ActivityOption {
  id: number;
  title: string;
  max_participants: number;
  date_time: string;
}

interface TimeSlot {
  id: number;
  activity_id?: number;
  activity_title?: string;
  slot_date?: string;
  slot_start: string;
  slot_end: string;
  max_concurrent: number;
  current_registered?: number;
  status: string;
}

interface MessageState {
  type: 'success' | 'error';
  text: string;
}

const DEFAULT_SLOT_SIZE = 500;

function getActivitiesFromPayload(payload: unknown): ActivityOption[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as {
    activities?: ActivityOption[];
    data?: { activities?: ActivityOption[] };
  };
  return record.activities ?? record.data?.activities ?? [];
}

function getSlotsFromPayload(payload: unknown): TimeSlot[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as {
    slots?: TimeSlot[];
    data?: { slots?: TimeSlot[] };
  };
  return record.slots ?? record.data?.slots ?? [];
}

function toDateInputValue(dateTime: string) {
  const value = toVietnamDatetimeLocalValue(dateTime);
  return value ? value.slice(0, 10) : '';
}

function getSlotStatusLabel(status: string) {
  switch (status) {
    case 'available':
      return 'San sang';
    case 'closed':
      return 'Da dong';
    case 'full':
      return 'Da day';
    default:
      return status || 'Khong ro';
  }
}

function formatTimeRange(slot: TimeSlot) {
  return `${String(slot.slot_start || '').slice(0, 5)} - ${String(slot.slot_end || '').slice(0, 5)}`;
}

export default function AdminTimeSlotsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [slotDate, setSlotDate] = useState('');
  const [totalParticipants, setTotalParticipants] = useState(DEFAULT_SLOT_SIZE);
  const [slotSize, setSlotSize] = useState(DEFAULT_SLOT_SIZE);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [message, setMessage] = useState<MessageState | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      void loadActivities();
    }
  }, [authLoading, router, user]);

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId) ?? null,
    [activities, selectedActivityId]
  );

  const estimatedSlots = useMemo(() => {
    if (!totalParticipants || !slotSize) return 0;
    return Math.max(1, Math.ceil(totalParticipants / slotSize));
  }, [slotSize, totalParticipants]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/activities?limit=100');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the tai danh sach hoat dong'
        );
      }

      setActivities(getActivitiesFromPayload(payload));
      setMessage(null);
    } catch (error) {
      console.error('Load admin activities for time slots error:', error);
      setMessage({ type: 'error', text: 'Khong the tai danh sach hoat dong' });
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSlots = async (activityId: number) => {
    try {
      const response = await fetch(`/api/admin/time-slots?activity_id=${activityId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the tai danh sach khung gio'
        );
      }

      setSlots(getSlotsFromPayload(payload));
    } catch (error) {
      console.error('Load existing time slots error:', error);
      setSlots([]);
      setMessage({ type: 'error', text: 'Khong the tai danh sach khung gio' });
    }
  };

  const handleActivityChange = async (value: string) => {
    const activityId = Number(value);
    if (!Number.isFinite(activityId) || activityId <= 0) {
      setSelectedActivityId(null);
      setSlotDate('');
      setSlots([]);
      return;
    }

    setSelectedActivityId(activityId);
    const activity = activities.find((item) => item.id === activityId);
    if (activity) {
      setTotalParticipants(activity.max_participants || DEFAULT_SLOT_SIZE);
      setSlotDate(toDateInputValue(activity.date_time));
    }

    setMessage(null);
    await loadExistingSlots(activityId);
  };

  const handleCreateSlots = async () => {
    if (!selectedActivityId || !slotDate) {
      setMessage({ type: 'error', text: 'Hay chon hoat dong va ngay to chuc truoc.' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const response = await fetch('/api/admin/time-slots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: selectedActivityId,
          slotDate,
          totalParticipants,
          slotSize,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Tao khung gio that bai'
        );
      }

      const createdSlots = getSlotsFromPayload(payload);
      setSlots(createdSlots);
      setMessage({
        type: 'success',
        text:
          (payload && typeof payload === 'object' && 'message' in payload && String(payload.message)) ||
          'Da tao khung gio thanh cong',
      });
    } catch (error) {
      console.error('Create admin time slots error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Tao khung gio that bai',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai cong cu khung gio..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                href="/admin/dashboard"
                className="rounded-xl border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Time slots
                </div>
                <h1
                  className="mt-3 text-3xl font-bold text-slate-900"
                  data-testid="admin-time-slots-heading"
                >
                  Dieu phoi khung gio hoat dong
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Tach luot diem danh thanh cac khung gio de giam tai dong thoi va chuan bi cho
                  ngay to chuc dong nguoi.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadActivities()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Tai lai hoat dong
              </button>
              <button
                type="button"
                disabled={!selectedActivityId}
                onClick={() => selectedActivityId && void loadExistingSlots(selectedActivityId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Clock3 className="h-4 w-4" />
                Tai lai khung gio
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.5rem] bg-blue-50 px-4 py-4 text-blue-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Hoat dong da tai</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{activities.length}</div>
              </div>
              <CalendarDays className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-emerald-50 px-4 py-4 text-emerald-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">So khung du kien</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{estimatedSlots}</div>
              </div>
              <Clock3 className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-violet-50 px-4 py-4 text-violet-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Suc chua moi khung</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{slotSize}</div>
              </div>
              <Users className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-amber-50 px-4 py-4 text-amber-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Tong nguoi du kien</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{totalParticipants}</div>
              </div>
              <Zap className="h-8 w-8" />
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                <span>Hoat dong</span>
                <select
                  value={selectedActivityId ?? ''}
                  onChange={(event) => void handleActivityChange(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Chon hoat dong can chia khung gio</option>
                  {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.title} ({activity.max_participants || DEFAULT_SLOT_SIZE} nguoi)
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Ngay to chuc</span>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(event) => setSlotDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Tong nguoi du kien</span>
                <input
                  type="number"
                  min="1"
                  value={totalParticipants}
                  onChange={(event) => setTotalParticipants(Number(event.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Suc chua moi khung</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={slotSize}
                  onChange={(event) => setSlotSize(Number(event.target.value) || DEFAULT_SLOT_SIZE)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>

              <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Goi y van hanh
                </div>
                <ul className="mt-3 space-y-2">
                  <li>{estimatedSlots} khung gio se duoc tao theo moc 1 gio bat dau tu 08:00.</li>
                  <li>
                    Gia tri mac dinh {DEFAULT_SLOT_SIZE} nguoi/khung phu hop voi su kien dong nguoi.
                  </li>
                  <li>Luon tai lai danh sach khung gio sau khi thay doi so luong nguoi du kien.</li>
                </ul>
              </div>
            </div>

            {message && (
              <div
                className={`mt-4 rounded-2xl border px-4 py-4 text-sm ${
                  message.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={submitting || !selectedActivityId}
                onClick={() => void handleCreateSlots()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Tao khung gio
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedActivityId(null);
                  setSlotDate('');
                  setTotalParticipants(DEFAULT_SLOT_SIZE);
                  setSlotSize(DEFAULT_SLOT_SIZE);
                  setSlots([]);
                  setMessage(null);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Dat lai form
              </button>
            </div>
          </article>

          <article className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
            <h2 className="text-lg font-semibold text-slate-900">Khung gio hien co</h2>
            <p className="mt-1 text-sm text-slate-600">
              {selectedActivity
                ? `Dang xem cac khung gio cua ${selectedActivity.title}.`
                : 'Chon mot hoat dong de xem danh sach khung gio da tao.'}
            </p>

            <div className="mt-4 space-y-3">
              {slots.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Chua co khung gio nao cho hoat dong dang chon.
                </div>
              ) : (
                slots.map((slot, index) => (
                  <div key={slot.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Khung {index + 1}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-slate-900">
                          {formatTimeRange(slot)}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {slot.slot_date || slotDate || 'Chua co ngay'}
                        </div>
                        <div className="mt-2 text-sm text-slate-700">
                          Toi da {slot.max_concurrent} nguoi
                          {typeof slot.current_registered === 'number'
                            ? ` • Da dang ky ${slot.current_registered}`
                            : ''}
                        </div>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          slot.status === 'available'
                            ? 'bg-emerald-100 text-emerald-700'
                            : slot.status === 'full'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {getSlotStatusLabel(slot.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

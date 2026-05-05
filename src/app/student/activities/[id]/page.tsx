'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  MapPin,
  QrCode,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import Countdown from '@/components/Countdown';
import ConfirmationModal from '@/components/ConfirmationModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import { useAuth } from '@/contexts/AuthContext';
import { resolveClientFetchUrl } from '@/lib/client-fetch-url';
import { formatDate } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { formatVietnamWithOptions, parseVietnamDate } from '@/lib/timezone';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';

interface ActivityDetail {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  max_participants: number | null;
  participant_count: number;
  available_slots: number | null;
  status: string;
  approval_status?: string;
  qr_enabled: boolean;
  teacher_id: number;
  teacher_name: string;
  activity_type: string | null;
  organization_level: string | null;
  class_ids: number[];
  class_names: string[];
  is_registered: boolean;
  registration_status?: string | null;
  can_cancel: boolean;
  can_register: boolean;
  participation_source?: string | null;
  is_mandatory?: boolean;
  applies_to_student?: boolean;
  applicability_scope?: string | null;
  applicability_reason?: string | null;
  base_points: number;
  registration_deadline: string | null;
}

interface RegistrationConflictItem {
  id: number;
  title: string;
  date_time: string;
  location: string;
}

function resolveStatusPresentation(status: string) {
  switch (status) {
    case 'published':
      return { label: 'Đã công bố', className: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/40' };
    case 'draft':
      return { label: 'Bản nháp', className: 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-600' };
    case 'completed':
      return { label: 'Đã hoàn thành', className: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-200 dark:bg-blue-500/10 dark:border-blue-500/40' };
    case 'cancelled':
      return { label: 'Đã hủy', className: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-200 dark:bg-rose-500/10 dark:border-rose-500/40' };
    default:
      return { label: status, className: 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-600' };
  }
}

function resolveParticipationLabel(activity: ActivityDetail) {
  if (activity.registration_status === 'attended') return 'Đã điểm danh';
  if (activity.is_mandatory) return 'Bắt buộc với bạn';
  return 'Đã đăng ký';
}

export default function StudentActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [registerConflict, setRegisterConflict] = useState<RegistrationConflictItem[]>([]);

  const activityId = Array.isArray(params.id) ? params.id[0] : params.id;

  const fetchActivity = useEffectEventCompat(async () => {
    if (!activityId) return;

    try {
      setLoading(true);
      const response = await fetch(resolveClientFetchUrl(`/api/activities/${activityId}`));
      const payload = await response.json();
      const resolvedActivity = payload?.activity || payload?.data?.activity || null;

      if (!response.ok || !resolvedActivity) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải thông tin hoạt động');
      }

      setActivity(resolvedActivity);
    } catch (error) {
      console.error('Fetch activity detail error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải thông tin hoạt động');
      router.push('/student/activities');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user && activityId) {
      void fetchActivity();
    }
  }, [activityId, authLoading, fetchActivity, router, user]);

  async function handleRegister(forceRegister: boolean = false) {
    if (!activity) return;

    setRegistering(true);
    try {
      const response = await fetch(resolveClientFetchUrl(`/api/activities/${activity.id}/register`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_register: forceRegister }),
      });
      const payload = await response.json();

      if (response.ok) {
        setRegisterConflict([]);
        toast.success(payload?.message || 'Đăng ký thành công');
        await fetchActivity();
        return;
      }

      if (
        payload?.code === 'CONFLICT' &&
        payload?.details?.can_override === true &&
        Array.isArray(payload?.details?.conflicts)
      ) {
        setRegisterConflict(payload.details.conflicts);
        return;
      }

      throw new Error(payload?.error || payload?.message || 'Đăng ký thất bại');
    } catch (error) {
      console.error('Register activity error:', error);
      toast.error(error instanceof Error ? error.message : 'Đăng ký thất bại');
    } finally {
      setRegistering(false);
    }
  }

  async function handleCancelRegistration() {
    if (!activity) return;

    setRegistering(true);
    try {
      const response = await fetch(resolveClientFetchUrl(`/api/activities/${activity.id}/register`), {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Hủy đăng ký thất bại');
      }

      toast.success(payload?.message || 'Hủy đăng ký thành công');
      setShowCancelModal(false);
      await fetchActivity();
    } catch (error) {
      console.error('Cancel registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Hủy đăng ký thất bại');
    } finally {
      setRegistering(false);
    }
  }

  const meta = useMemo(() => {
    if (!activity) return null;

    const now = new Date();
    const activityDate = parseVietnamDate(activity.date_time);
    const registrationDeadline = activity.registration_deadline
      ? parseVietnamDate(activity.registration_deadline)
      : null;
    const isPast = activityDate ? activityDate.getTime() <= now.getTime() : false;
    const isFull =
      activity.max_participants !== null && activity.participant_count >= activity.max_participants;
    const isRegistrationClosed =
      registrationDeadline !== null && registrationDeadline.getTime() <= now.getTime();
    const remainingSlots =
      activity.max_participants === null
        ? 'Không giới hạn'
        : String(Math.max(0, activity.max_participants - activity.participant_count));
    const appliesToStudent = activity.applies_to_student !== false;
    const applicabilityReason =
      activity.applicability_reason ||
      (appliesToStudent
        ? 'Hoạt động này đang áp dụng cho bạn.'
        : 'Hoạt động này hiện không áp dụng cho bạn.');

    return {
      activityDate,
      registrationDeadline,
      isPast,
      isFull,
      isRegistrationClosed,
      remainingSlots,
      appliesToStudent,
      applicabilityReason,
      countdownTarget: activity.registration_deadline || activity.date_time,
      status: resolveStatusPresentation(activity.status),
      participationLabel: resolveParticipationLabel(activity),
    };
  }, [activity]);

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!activity || !meta) {
    return (
      <div className="page-shell">
        <section className="page-surface rounded-[1.75rem] px-5 py-8 text-center sm:px-7">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Không tìm thấy hoạt động</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Bản ghi này có thể đã bị xóa, ẩn hoặc không còn trong phạm vi truy cập của bạn.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>
        <Link
          href="/student/activities"
          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
        >
          Danh sách hoạt động
        </Link>

        <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-sky-600 via-blue-700 to-slate-900 px-5 py-6 text-white shadow-xl sm:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                {activity.activity_type ? (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {activity.activity_type}
                  </span>
                ) : null}
                {activity.organization_level ? (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {activity.organization_level}
                  </span>
                ) : null}
                <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-100">
                  {activity.base_points} điểm
                </span>
                {activity.qr_enabled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                    <QrCode className="h-3.5 w-3.5" />
                    QR điểm danh
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{activity.title}</h1>
              <p className="mt-3 max-w-3xl text-sm text-sky-50/90">{activity.description}</p>

              <div className="mt-5 grid gap-3 text-sm text-white/90 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <CalendarDays className="h-4 w-4" />
                    <span>Thời gian</span>
                  </div>
                  <div className="mt-2">
                    {formatVietnamWithOptions(activity.date_time, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4" />
                    <span>Địa điểm</span>
                  </div>
                  <div className="mt-2">{activity.location}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <GraduationCap className="h-4 w-4" />
                    <span>Giảng viên</span>
                  </div>
                  <div className="mt-2">{activity.teacher_name}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <Users className="h-4 w-4" />
                    <span>Số lượng</span>
                  </div>
                  <div className="mt-2">
                    {activity.participant_count}/
                    {activity.max_participants === null ? 'Không giới hạn' : activity.max_participants}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[24rem] xl:grid-cols-1">
              <div className={`rounded-[1.5rem] border px-4 py-4 ${meta.status.className}`}>
                <div className="text-xs font-semibold uppercase tracking-wide">Trạng thái hoạt động</div>
                <div className="mt-2 text-2xl font-bold">{meta.status.label}</div>
              </div>

              <div
                className={`rounded-[1.5rem] border px-4 py-4 ${
                  meta.appliesToStudent
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
                }`}
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  {meta.appliesToStudent ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <span>{meta.appliesToStudent ? 'Phạm vi áp dụng' : 'Không thuộc phạm vi của bạn'}</span>
                </div>
                <p className="text-sm">{meta.applicabilityReason}</p>
              </div>

              {activity.is_registered ? (
                <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <div className="text-xs font-semibold uppercase tracking-wide">Trạng thái tham gia</div>
                  <div className="mt-2 text-2xl font-bold">{meta.participationLabel}</div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <StudentDailyQuickActions />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.95fr)]">
          <div className="space-y-6">
            {activity.class_names && activity.class_names.length > 0 ? (
              <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Lớp được tham gia</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activity.class_names.map((className) => (
                    <span
                      key={className}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                    >
                      {className}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Thông tin chi tiết</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Hạn đăng ký
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {activity.registration_deadline
                      ? formatDate(activity.registration_deadline)
                      : 'Không giới hạn'}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Số chỗ còn lại
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {meta.remainingSlots}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Điểm cơ bản
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    +{activity.base_points}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Cách điểm danh
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {activity.qr_enabled ? 'Quét QR trên lớp' : 'Theo quy trình hoạt động'}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
            {!meta.isPast && !activity.is_registered && !meta.isRegistrationClosed && meta.appliesToStudent ? (
              <Countdown targetDate={meta.countdownTarget} label="Thời gian còn lại để đăng ký" />
            ) : null}

            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Đăng ký tham gia</h2>
              <div className="mt-5 space-y-4">
                {meta.isPast ? (
                  <div className="rounded-2xl bg-slate-100 px-4 py-4 text-center text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Hoạt động đã kết thúc.
                  </div>
                ) : activity.is_registered ? (
                  <div className="space-y-3">
                    <div
                      className={`rounded-2xl border px-4 py-4 text-center text-sm font-semibold ${
                        activity.is_mandatory
                          ? 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-200'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                      }`}
                    >
                      {activity.is_mandatory ? 'Bắt buộc với bạn' : 'Bạn đã đăng ký'}
                    </div>
                    {activity.is_mandatory ? (
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Hoạt động này được gán bắt buộc cho bạn, vì vậy không thể tự hủy đăng ký.
                      </p>
                    ) : activity.can_cancel ? (
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        disabled={registering}
                        className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {registering ? 'Đang xử lý...' : 'Hủy đăng ký'}
                      </button>
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Không thể hủy trong vòng 24 giờ trước khi hoạt động bắt đầu hoặc sau khi đã điểm danh.
                      </p>
                    )}
                  </div>
                ) : !meta.appliesToStudent ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                    Hoạt động này hiện không áp dụng cho bạn nên không thể tự đăng ký.
                  </div>
                ) : meta.isRegistrationClosed ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                    Đã hết hạn đăng ký.
                  </div>
                ) : meta.isFull ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                    Hoạt động đã đủ số lượng tham gia.
                  </div>
                ) : activity.can_register ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => void handleRegister()}
                      disabled={registering}
                      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:dark:bg-slate-700"
                    >
                      {registering ? 'Đang đăng ký...' : 'Đăng ký ngay'}
                    </button>
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                      <p>Hệ thống sẽ cảnh báo nếu lịch bắt đầu trùng với hoạt động khác đã tham gia.</p>
                      <p className="mt-2">Bạn chỉ nên giữ đăng ký nếu có thể có mặt đúng giờ tại lớp.</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Không thể đăng ký hoạt động này.
                  </div>
                )}
              </div>
            </section>

            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Thống kê nhanh</h2>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Người đã đăng ký</span>
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">{activity.participant_count}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Chỗ còn lại</span>
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">{meta.remainingSlots}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Điểm cơ bản</span>
                  <span className="inline-flex items-center gap-1 text-base font-semibold text-amber-700 dark:text-amber-300">
                    <Trophy className="h-4 w-4" />
                    +{activity.base_points}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => void handleCancelRegistration()}
        title="Xác nhận hủy đăng ký"
        message="Bạn có chắc chắn muốn hủy đăng ký hoạt động này không?"
        confirmText="Hủy đăng ký"
        cancelText="Giữ lại"
        confirmButtonClass="bg-rose-600 hover:bg-rose-700"
        icon={<AlertTriangle className="h-6 w-6 text-rose-600" />}
        details={
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Hoạt động</span>
              <span className="text-right font-semibold text-slate-900 dark:text-slate-100">{activity.title}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Thời gian</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatDate(activity.date_time)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400">Địa điểm</span>
              <span className="text-right font-medium text-slate-900 dark:text-slate-100">{activity.location}</span>
            </div>
          </div>
        }
      />

      <ConfirmationModal
        isOpen={registerConflict.length > 0}
        onClose={() => setRegisterConflict([])}
        onConfirm={() => void handleRegister(true)}
        title="Xung đột giờ bắt đầu"
        message="Bạn đang có hoạt động khác trùng giờ bắt đầu. Nếu tiếp tục, hệ thống sẽ ghi nhận đăng ký với xác nhận override."
        confirmText="Vẫn đăng ký"
        cancelText="Xem lại"
        confirmButtonClass="bg-amber-600 hover:bg-amber-700"
        icon={<AlertTriangle className="h-6 w-6 text-amber-600" />}
        details={
          <div className="space-y-3 text-sm">
            <div className="font-semibold text-slate-900 dark:text-slate-100">Hoạt động đang đăng ký: {activity.title}</div>
            {registerConflict.map((conflict) => (
              <div
                key={conflict.id}
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">{conflict.title}</div>
                <div className="text-slate-600 dark:text-slate-300">{formatDate(conflict.date_time)}</div>
                <div className="text-slate-600 dark:text-slate-300">{conflict.location}</div>
              </div>
            ))}
          </div>
        }
      />
    </div>
  );
}

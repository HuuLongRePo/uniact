import React from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { StudentActivitySummary } from './student-activity-types';
import { formatDate } from '@/lib/formatters';

interface StudentActivityCardProps {
  activity: StudentActivitySummary;
  registering: number | null;
  onRegister: (id: number) => void;
  onCancel: (activity: StudentActivitySummary) => void;
}

function resolveApplicabilityLabel(appliesToStudent: boolean) {
  return appliesToStudent ? 'Áp dụng với bạn' : 'Không áp dụng với bạn';
}

export default function StudentActivityCard({
  activity,
  registering,
  onRegister,
  onCancel,
}: StudentActivityCardProps) {
  const isFull =
    activity.max_participants !== null && activity.participant_count >= activity.max_participants;
  const appliesToStudent = activity.applies_to_student !== false;
  const isMandatory = activity.is_mandatory === true;
  const canCancel = activity.can_cancel === true;
  const isRegisteringCurrent = registering === activity.id;
  const applicabilityReason =
    activity.applicability_reason ||
    (appliesToStudent
      ? 'Hoạt động này đang áp dụng cho bạn.'
      : 'Hoạt động này hiện không nằm trong phạm vi được đăng ký của bạn.');

  return (
    <article
      data-testid={`activity-card-${activity.id}`}
      className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-blue-500/50"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {activity.activity_type ? (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                {activity.activity_type}
              </span>
            ) : null}
            {activity.organization_level ? (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                {activity.organization_level}
              </span>
            ) : null}
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                appliesToStudent
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
              }`}
            >
              {resolveApplicabilityLabel(appliesToStudent)}
            </span>
            {isMandatory ? (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-800 dark:bg-orange-500/15 dark:text-orange-200">
                Bắt buộc
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">{activity.title}</h3>
          <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{activity.description}</p>
        </div>

        {activity.is_registered ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            {isMandatory ? 'Bắt buộc tham gia' : 'Đã đăng ký'}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 rounded-[1.25rem] bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span>{activity.teacher_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span>{formatDate(activity.date_time)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span>{activity.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className={isFull ? 'font-semibold text-rose-600' : ''}>
            {activity.participant_count}/
            {activity.max_participants === null ? 'Không giới hạn' : activity.max_participants}
            {isFull ? ' người (Đầy)' : ' người'}
          </span>
        </div>
      </div>

      <div
        className={`mt-4 rounded-[1.25rem] border px-4 py-3 text-sm ${
          appliesToStudent
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
            : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
        }`}
      >
        <div className="mb-1 flex items-center gap-2 font-semibold">
          {appliesToStudent ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <CircleAlert className="h-4 w-4" />
          )}
          <span>{resolveApplicabilityLabel(appliesToStudent)}</span>
        </div>
        <p>{applicabilityReason}</p>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Link
          href={`/student/activities/${activity.id}`}
          className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-300/60"
        >
          Xem chi tiết
        </Link>

        {activity.is_registered ? (
          isMandatory ? (
            <p className="rounded-xl bg-orange-50 px-4 py-3 text-center text-sm text-orange-800 dark:bg-orange-500/15 dark:text-orange-200">
              Bạn đã được gán bắt buộc, không thể tự hủy đăng ký.
            </p>
          ) : canCancel ? (
            <button
              type="button"
              onClick={() => onCancel(activity)}
              disabled={isRegisteringCurrent}
              className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-rose-300/60"
            >
              {isRegisteringCurrent ? 'Đang hủy...' : 'Hủy đăng ký'}
            </button>
          ) : (
            <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Không thể hủy trong vòng 24 giờ trước khi hoạt động diễn ra.
            </p>
          )
        ) : appliesToStudent ? (
          <button
            type="button"
            onClick={() => onRegister(activity.id)}
            disabled={isRegisteringCurrent || isFull}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:dark:bg-slate-700 dark:focus-visible:ring-blue-300/60"
          >
            {isRegisteringCurrent ? 'Đang đăng ký...' : isFull ? 'Hết chỗ' : 'Đăng ký ngay'}
          </button>
        ) : (
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Bạn không thể đăng ký hoạt động này.
          </p>
        )}
      </div>
    </article>
  );
}

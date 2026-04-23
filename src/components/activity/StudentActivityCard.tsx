import React from 'react';
import type { StudentActivitySummary } from './student-activity-types';
import { formatDate } from '@/lib/formatters';

interface StudentActivityCardProps {
  activity: StudentActivitySummary;
  registering: number | null;
  onView: (id: number) => void;
  onRegister: (id: number) => void;
  onCancel: (activity: StudentActivitySummary) => void;
}

export default function StudentActivityCard({
  activity,
  registering,
  onView,
  onRegister,
  onCancel,
}: StudentActivityCardProps) {
  const isFull =
    activity.max_participants !== null && activity.participant_count >= activity.max_participants;
  const appliesToStudent = activity.applies_to_student !== false;
  const isMandatory = activity.is_mandatory === true;
  const canCancel = activity.can_cancel === true;
  const applicabilityReason =
    activity.applicability_reason ||
    (appliesToStudent
      ? 'Hoạt động này đang áp dụng cho bạn.'
      : 'Bạn không thể đăng ký vì hoạt động này không áp dụng cho bạn.');

  return (
    <div
      data-testid={`activity-card-${activity.id}`}
      className="relative rounded-lg border bg-white p-6 shadow-md"
    >
      {activity.is_registered && (
        <div className="absolute right-4 top-4">
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            ✓ Đã đăng ký
          </span>
        </div>
      )}

      <h3 className="mb-2 pr-24 text-xl font-bold">{activity.title}</h3>

      <div className="mb-3 flex gap-2">
        {activity.activity_type && (
          <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
            {activity.activity_type}
          </span>
        )}
        {activity.organization_level && (
          <span className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">
            {activity.organization_level}
          </span>
        )}
        <span
          className={`rounded px-2 py-1 text-xs ${
            appliesToStudent ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {appliesToStudent ? 'Áp dụng với bạn' : 'Không áp dụng cho bạn'}
        </span>
        {isMandatory && (
          <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">
            Bắt buộc tham gia
          </span>
        )}
      </div>

      <div className="mb-4 space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span>👨🏫</span>
          <span>{activity.teacher_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>{formatDate(activity.date_time)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📍</span>
          <span>{activity.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>👥</span>
          <span className={isFull ? 'font-bold text-red-500' : ''}>
            {activity.participant_count}/{activity.max_participants ?? 'Không giới hạn'} người
            {isFull && ' (Đầy)'}
          </span>
        </div>
      </div>

      <p className="mb-4 line-clamp-3 text-gray-700">{activity.description}</p>
      <div
        className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
          appliesToStudent
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        {applicabilityReason}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => onView(activity.id)}
          className="flex-1 rounded bg-blue-100 px-4 py-2 font-medium text-blue-700 transition hover:bg-blue-200"
        >
          📖 Chi tiết
        </button>
      </div>

      {activity.is_registered ? (
        <div className="space-y-2">
          <div
            className={`rounded border px-4 py-2 text-center ${
              isMandatory
                ? 'border-orange-200 bg-orange-50 text-orange-800'
                : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            {isMandatory ? 'Bắt buộc tham gia' : '✅ Đã đăng ký'}
          </div>
          {isMandatory ? (
            <p className="text-center text-xs text-gray-500">
              Bạn đã được xếp vào danh sách tham gia bắt buộc nên không thể tự hủy đăng ký
            </p>
          ) : canCancel ? (
            <button
              onClick={() => onCancel(activity)}
              disabled={registering === activity.id}
              className="w-full rounded bg-red-500 px-4 py-2 text-white disabled:bg-gray-300 hover:bg-red-600"
            >
              {registering === activity.id ? 'Đang hủy...' : 'Hủy đăng ký'}
            </button>
          ) : (
            <p className="text-center text-xs text-gray-500">
              Không thể hủy trong vòng 24 giờ trước hoạt động
            </p>
          )}
        </div>
      ) : appliesToStudent ? (
        <button
          onClick={() => onRegister(activity.id)}
          disabled={registering === activity.id || isFull}
          className="w-full rounded bg-blue-500 px-4 py-2 text-white disabled:bg-gray-300 hover:bg-blue-600"
        >
          {registering === activity.id ? 'Đang đăng ký...' : isFull ? 'Hết chỗ' : 'Đăng ký ngay'}
        </button>
      ) : (
        <div className="rounded bg-gray-100 px-4 py-2 text-center text-gray-600">
          Không thể đăng ký vì hoạt động này không áp dụng cho bạn
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Edit,
  Eye,
  MapPin,
  QrCode,
  Trash2,
  UserRound,
  Users2,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatVietnamDateTime } from '@/lib/timezone';
import { Activity } from './types';

type ActiveQrSessionSummary = {
  session_id: number;
  expires_at: string;
};

interface ActivityTableProps {
  activities: Activity[];
  loading: boolean;
  onDelete: (activity: Activity) => void;
  activeQrSessions?: Record<number, ActiveQrSessionSummary>;
}

function renderStatusBadge(status: string) {
  const badges: Record<string, { label: string; className: string }> = {
    draft: { label: 'Ban nhap', className: 'bg-slate-100 text-slate-800' },
    pending: { label: 'Da gui duyet', className: 'bg-amber-100 text-amber-800' },
    published: { label: 'Da cong bo', className: 'bg-emerald-100 text-emerald-800' },
    completed: { label: 'Hoan thanh', className: 'bg-blue-100 text-blue-800' },
    rejected: { label: 'Bi tu choi', className: 'bg-rose-100 text-rose-800' },
    cancelled: { label: 'Da huy', className: 'bg-rose-100 text-rose-800' },
  };

  const badge = badges[status] || badges.draft;
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>;
}

function renderApprovalBadge(approval: string) {
  const badges: Record<string, { label: string; className: string; icon: LucideIcon | null }> = {
    draft: { label: 'Chua gui', className: 'bg-slate-100 text-slate-800', icon: null },
    requested: { label: 'Da gui duyet', className: 'bg-amber-100 text-amber-800', icon: null },
    approved: { label: 'Da duyet', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
    rejected: { label: 'Bi tu choi', className: 'bg-rose-100 text-rose-800', icon: XCircle },
  };

  const badge = badges[approval] || badges.draft;
  const Icon = badge.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {badge.label}
    </span>
  );
}

export default function ActivityTable({
  activities,
  loading,
  onDelete,
  activeQrSessions = {},
}: ActivityTableProps) {
  const now = Date.now();

  if (loading && activities.length === 0) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
        Dang tai danh sach hoat dong...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
        <div className="text-base font-medium text-slate-900">Khong tim thay hoat dong nao</div>
        <p className="mt-2 text-sm text-slate-500">
          Thu doi bo loc workflow, review hoac tu khoa de mo rong ket qua.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loading && activities.length > 0 ? (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          Dang cap nhat danh sach hoat dong...
        </div>
      ) : null}

      <div className="grid gap-4 lg:hidden">
        {activities.map((activity) => {
          const activityTime = new Date(activity.date_time).getTime();
          const isArchived =
            (activity.status === 'published' &&
              Number.isFinite(activityTime) &&
              activityTime <= now) ||
            activity.status === 'completed' ||
            activity.status === 'cancelled';

          return (
            <article
              key={activity.id}
              className={`rounded-[2rem] border p-5 shadow-sm ${
                isArchived ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{activity.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{activity.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {renderStatusBadge(activity.status)}
                  {renderApprovalBadge(activity.approval_status)}
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <UserRound className="h-4 w-4 text-cyan-700" />
                  {activity.teacher_name}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <MapPin className="h-4 w-4 text-violet-700" />
                  {activity.location}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  {formatVietnamDateTime(activity.date_time, 'date')}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <Users2 className="h-4 w-4 text-amber-700" />
                  {activity.participant_count}/{activity.max_participants} nguoi, {activity.points} diem
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">{activity.activity_type}</span>
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">{activity.organization_level}</span>
              </div>

              {isArchived ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  {activity.status === 'published'
                    ? 'Da qua hoac da khep lai, can ra lai viec hoan thanh thuc te.'
                    : activity.status === 'completed'
                      ? 'Da khep lai o trang thai hoan thanh.'
                      : 'Da khep lai o trang thai huy.'}
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-2 gap-2">
                {activeQrSessions[activity.id] ? (
                  <Link
                    href={`/admin/attendance?activityId=${activity.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
                    aria-label="Diem danh"
                  >
                    <QrCode className="h-4 w-4" />
                    Diem danh
                  </Link>
                ) : (
                  <div />
                )}
                <Link
                  href={`/admin/activities/${activity.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  <Eye className="h-4 w-4" />
                  Xem
                </Link>
                <Link
                  href={`/admin/activities/${activity.id}/edit`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white"
                >
                  <Edit className="h-4 w-4" />
                  Sua
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(activity)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-700 px-4 py-3 text-sm font-medium text-white"
                >
                  <Trash2 className="h-4 w-4" />
                  Huy
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Hoat dong
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Giang vien
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Loai / cap do
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Thoi gian
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Tham gia
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Trang thai
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Thao tac
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {activities.map((activity) => {
              const activityTime = new Date(activity.date_time).getTime();
              const isArchived =
                (activity.status === 'published' &&
                  Number.isFinite(activityTime) &&
                  activityTime <= now) ||
                activity.status === 'completed' ||
                activity.status === 'cancelled';

              return (
                <tr key={activity.id} className={`hover:bg-slate-50 ${isArchived ? 'bg-slate-50/70' : ''}`}>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{activity.title}</div>
                    <div className="mt-1 line-clamp-1 text-sm text-slate-500">{activity.description}</div>
                    {isArchived ? (
                      <div className="mt-2 text-xs font-medium text-slate-600">
                        {activity.status === 'published'
                          ? 'Da qua hoac da khep lai, can ra lai viec hoan thanh thuc te.'
                          : activity.status === 'completed'
                            ? 'Da khep lai o trang thai hoan thanh.'
                            : 'Da khep lai o trang thai huy.'}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{activity.teacher_name}</td>
                  <td className="px-4 py-4 text-sm">
                    <div className="text-slate-900">{activity.activity_type}</div>
                    <div className="mt-1 text-slate-500">{activity.organization_level}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {formatVietnamDateTime(activity.date_time, 'date')}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <div className="font-medium text-slate-900">
                      {activity.participant_count}/{activity.max_participants}
                    </div>
                    <div className="mt-1 text-slate-500">{activity.points} diem</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      {renderStatusBadge(activity.status)}
                      {renderApprovalBadge(activity.approval_status)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      {activeQrSessions[activity.id] ? (
                        <Link
                          href={`/admin/attendance?activityId=${activity.id}`}
                          className="inline-flex items-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
                          aria-label="Diem danh"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          Diem danh
                        </Link>
                      ) : null}
                      <Link
                        href={`/admin/activities/${activity.id}`}
                        className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Xem
                      </Link>
                      <Link
                        href={`/admin/activities/${activity.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-2xl bg-cyan-700 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-800"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Sua
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(activity)}
                        className="inline-flex items-center gap-1 rounded-2xl bg-rose-700 px-3 py-2 text-xs font-medium text-white hover:bg-rose-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Huy
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

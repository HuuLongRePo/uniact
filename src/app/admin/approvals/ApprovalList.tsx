'use client';

import { CheckCircle2, MapPin, UserRound, Users2, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { Activity } from './types';

interface ApprovalListProps {
  activities: Activity[];
  loading: boolean;
  selectedActivities: number[];
  onSelectActivity: (id: number) => void;
  onSelectAll: (selected: boolean) => void;
  onApprove: (activity: Activity) => void;
  onReject: (activity: Activity) => void;
}

export default function ApprovalList({
  activities,
  loading,
  selectedActivities,
  onSelectActivity,
  onSelectAll,
  onApprove,
  onReject,
}: ApprovalListProps) {
  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
        Dang tai danh sach cho duyet...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
        <div className="text-base font-medium text-slate-900">Khong co hoat dong cho duyet</div>
        <p className="mt-2 text-sm text-slate-500">
          Khi teacher gui hoat dong len workflow, danh sach se xuat hien tai day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={selectedActivities.length === activities.length && activities.length > 0}
            onChange={(event) => onSelectAll(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
          />
          Chon tat ca hoat dong trong trang nay
        </label>
        <p className="mt-2 text-sm text-slate-500">
          Da chon {selectedActivities.length}/{activities.length} hoat dong.
        </p>
      </div>

      <div className="grid gap-4">
        {activities.map((activity) => (
          <article
            key={activity.id}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  checked={selectedActivities.includes(activity.id)}
                  onChange={() => onSelectActivity(activity.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
                />

                <div className="space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{activity.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{activity.description}</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <MapPin className="h-4 w-4 text-cyan-700" />
                      {activity.location || 'Chua co dia diem'}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      {formatDate(activity.date_time, 'date')}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <UserRound className="h-4 w-4 text-violet-700" />
                      {activity.teacher_name || activity.creator_name || 'Chua ro nguoi gui'}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <Users2 className="h-4 w-4 text-amber-700" />
                      Toi da {activity.max_participants || 0} nguoi
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:w-[260px]">
                <button
                  type="button"
                  onClick={() => onApprove(activity)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Phe duyet
                </button>
                <button
                  type="button"
                  onClick={() => onReject(activity)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-700 px-4 py-3 text-sm font-medium text-white hover:bg-rose-800"
                >
                  <XCircle className="h-4 w-4" />
                  Tu choi
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

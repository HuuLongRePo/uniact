'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  MessageSquare,
  Send,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatVietnamDateTime } from '@/lib/timezone';

interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  approval_status?: string;
  teacher_name: string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  max_participants: number | null;
  class_count: number;
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  const formatted = formatVietnamDateTime(value);
  return formatted === '-' ? null : formatted;
}

function StatusBadge({ status }: { status: Activity['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
        <CheckCircle className="h-4 w-4" />
        Da duyet
      </span>
    );
  }

  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
        <Clock className="h-4 w-4" />
        Dang cho duyet
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700">
        <XCircle className="h-4 w-4" />
        Bi tu choi
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
      Nhap
    </span>
  );
}

export default function ApprovalsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [resubmitMessage, setResubmitMessage] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => {
    void fetchActivities();
  }, [filter]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchActivities();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [filter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/activities/approvals?status=${filter}`);
      if (!response.ok) {
        throw new Error('Khong the tai danh sach hoat dong');
      }

      const data = await response.json();
      setActivities(data.activities || data.data?.activities || []);
    } catch (error) {
      console.error(error);
      toast.error('Khong the tai danh sach hoat dong');
    } finally {
      setLoading(false);
    }
  };

  const openActivityModal = (activity: Activity) => {
    setSelectedActivity(activity);
    setResubmitMessage('');
  };

  const handleResubmit = async (activityId: number) => {
    try {
      setResubmitting(true);
      const response = await fetch(`/api/teacher/activities/${activityId}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: resubmitMessage.trim() || 'Gui lai de duyet',
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Khong the gui lai');
      }

      toast.success(data?.message || 'Da gui lai de duyet');
      setResubmitMessage('');
      setSelectedActivity(null);
      await fetchActivities();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Khong the gui lai');
    } finally {
      setResubmitting(false);
    }
  };

  const stats = useMemo(
    () => ({
      pending: activities.filter((activity) => activity.status === 'pending').length,
      approved: activities.filter((activity) => activity.status === 'approved').length,
      rejected: activities.filter((activity) => activity.status === 'rejected').length,
    }),
    [activities]
  );

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Approval tracker
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Theo doi duyet hoat dong</h1>
              <p className="mt-2 text-sm text-slate-600">
                Teacher dung man nay de xem hoat dong dang cho duyet, bi tu choi va gui lai sau khi da bo sung thong tin.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Dang cho
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{stats.pending}</div>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Da duyet
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{stats.approved}</div>
              </div>
              <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                  Bi tu choi
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{stats.rejected}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === tab
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab === 'all' && 'Tat ca'}
                {tab === 'pending' && 'Dang cho'}
                {tab === 'approved' && 'Da duyet'}
                {tab === 'rejected' && 'Bi tu choi'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              Dang tai du lieu duyet...
            </div>
          ) : activities.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <p className="text-lg font-semibold text-slate-900">Khong co hoat dong nao</p>
              <p className="mt-2 text-sm text-slate-600">Bo loc hien tai chua co muc can theo doi.</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4">
              {activities.map((activity) => (
                <article
                  key={activity.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">{activity.title}</h2>
                        <StatusBadge status={activity.status} />
                      </div>

                      <p className="mt-3 text-sm text-slate-600">{activity.description}</p>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {formatVietnamDateTime(activity.date_time, 'date')}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {activity.location || 'Chua cap nhat'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          {activity.class_count} lop
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          {activity.teacher_name}
                        </div>
                      </div>

                      {activity.submitted_at ? (
                        <div className="mt-4 space-y-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          <div>Gui duyet: {formatDateTime(activity.submitted_at)}</div>
                          {activity.status === 'approved' && activity.approved_at ? (
                            <div className="text-emerald-700">Da duyet: {formatDateTime(activity.approved_at)}</div>
                          ) : null}
                          {activity.status === 'rejected' && activity.rejected_at ? (
                            <div className="text-rose-700">
                              Bi tu choi: {formatDateTime(activity.rejected_at)}
                              {activity.rejection_reason ? (
                                <div className="mt-1">Ly do: {activity.rejection_reason}</div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      {activity.status === 'rejected' ? (
                        <button
                          onClick={() => openActivityModal(activity)}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4" />
                          Gui lai
                        </button>
                      ) : null}
                      {activity.status === 'pending' ? (
                        <button
                          onClick={() => openActivityModal(activity)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Chi tiet
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedActivity ? (
        <div className="app-modal-backdrop p-4" onClick={() => setSelectedActivity(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-approval-activity-dialog-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="teacher-approval-activity-dialog-title" className="text-2xl font-bold text-slate-900">
              {selectedActivity.status === 'rejected' ? 'Gui lai de duyet' : 'Chi tiet hoat dong'}
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500">Hoat dong</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedActivity.title}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Trang thai hien tai</p>
                <div className="mt-2">
                  <StatusBadge status={selectedActivity.status} />
                </div>
              </div>
              {selectedActivity.submitted_at ? (
                <div>
                  <p className="text-sm text-slate-500">Lan gui gan nhat</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {formatDateTime(selectedActivity.submitted_at)}
                  </p>
                </div>
              ) : null}
              {selectedActivity.rejection_reason ? (
                <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-700">Ly do tu choi</p>
                  <p className="mt-1 text-sm text-rose-600">{selectedActivity.rejection_reason}</p>
                </div>
              ) : null}
              {selectedActivity.status === 'rejected' ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Ghi chu gui lai</label>
                  <textarea
                    value={resubmitMessage}
                    onChange={(event) => setResubmitMessage(event.target.value)}
                    placeholder="Nhap noi dung bo sung truoc khi gui lai..."
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setSelectedActivity(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Dong
              </button>
              {selectedActivity.status === 'rejected' ? (
                <button
                  onClick={() => void handleResubmit(selectedActivity.id)}
                  disabled={resubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {resubmitting ? 'Dang gui...' : 'Gui lai'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

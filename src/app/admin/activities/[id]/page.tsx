'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  History,
  Loader2,
  MapPin,
  Search,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime, toVietnamDateStamp } from '@/lib/timezone';

type ActivityStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'rejected'
  | 'completed'
  | 'cancelled';

type Activity = {
  id: number;
  title: string;
  description: string | null;
  activity_type_name?: string | null;
  organization_level_name?: string | null;
  date_time: string;
  end_time?: string | null;
  location?: string | null;
  max_participants?: number | null;
  status: ActivityStatus;
  approval_status?: 'draft' | 'requested' | 'approved' | 'rejected' | null;
  approval_notes?: string | null;
  creator_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Participant = {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  class_name?: string | null;
  registered_at: string;
  attendance_status?: 'present' | 'absent' | 'registered' | 'not_participated' | null;
  achievement_level?: string | null;
  points_earned?: number | null;
};

type ApprovalHistoryEntry = {
  id: number;
  status: string;
  status_label?: string | null;
  is_pending_request?: boolean;
  notes?: string | null;
  changed_by_name?: string | null;
  changed_at: string;
};

type DetailTab = 'overview' | 'participants' | 'history';

function parseActivityPayload(payload: any): Activity | null {
  return payload?.activity || payload?.data?.activity || null;
}

function parseParticipantsPayload(payload: any): Participant[] {
  const source = payload?.participants || payload?.data?.participants || [];
  return Array.isArray(source) ? source : [];
}

function parseHistoryPayload(payload: any): ApprovalHistoryEntry[] {
  const source = payload?.history || payload?.data?.history || [];
  return Array.isArray(source) ? source : [];
}

function getStatusMeta(status: ActivityStatus) {
  switch (status) {
    case 'published':
      return { label: 'Published', badgeClass: 'bg-emerald-100 text-emerald-700' };
    case 'pending':
      return { label: 'Pending', badgeClass: 'bg-amber-100 text-amber-700' };
    case 'rejected':
      return { label: 'Rejected', badgeClass: 'bg-rose-100 text-rose-700' };
    case 'completed':
      return { label: 'Completed', badgeClass: 'bg-violet-100 text-violet-700' };
    case 'cancelled':
      return { label: 'Cancelled', badgeClass: 'bg-slate-200 text-slate-700' };
    default:
      return { label: 'Draft', badgeClass: 'bg-slate-100 text-slate-700' };
  }
}

function getAttendanceMeta(status?: Participant['attendance_status']) {
  if (status === 'present') {
    return { label: 'Co mat', badgeClass: 'bg-emerald-100 text-emerald-700' };
  }
  if (status === 'absent') {
    return { label: 'Vang', badgeClass: 'bg-rose-100 text-rose-700' };
  }
  if (status === 'not_participated') {
    return { label: 'Khong tham gia', badgeClass: 'bg-slate-200 text-slate-700' };
  }
  return { label: 'Da dang ky', badgeClass: 'bg-blue-100 text-blue-700' };
}

function getHistoryMeta(entry: ApprovalHistoryEntry) {
  if (entry.status === 'approved') {
    return {
      label: entry.status_label || 'Da phe duyet',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    };
  }

  if (entry.status === 'rejected') {
    return {
      label: entry.status_label || 'Da tu choi',
      icon: <XCircle className="h-5 w-5 text-rose-600" />,
    };
  }

  return {
    label: entry.status_label || 'Da gui duyet',
    icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
  };
}

export default function AdminActivityDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const activityId = String(params?.id || '');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantStatusFilter, setParticipantStatusFilter] = useState('all');
  const [participantClassFilter, setParticipantClassFilter] = useState('all');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      const [activityResponse, participantsResponse, historyResponse] = await Promise.all([
        fetch(`/api/admin/activities/${activityId}`),
        fetch(`/api/admin/activities/${activityId}/participants`),
        fetch(`/api/admin/activities/${activityId}/approval-history`),
      ]);

      const activityPayload = await activityResponse.json().catch(() => null);
      if (!activityResponse.ok) {
        throw new Error(
          activityPayload?.error || activityPayload?.message || 'Khong the tai chi tiet hoat dong'
        );
      }

      setActivity(parseActivityPayload(activityPayload));

      if (participantsResponse.ok) {
        setParticipants(parseParticipantsPayload(await participantsResponse.json().catch(() => null)));
      } else {
        setParticipants([]);
      }

      if (historyResponse.ok) {
        setApprovalHistory(parseHistoryPayload(await historyResponse.json().catch(() => null)));
      } else {
        setApprovalHistory([]);
      }
    } catch (error) {
      console.error('Fetch admin activity detail error:', error);
      setActivity(null);
      setParticipants([]);
      setApprovalHistory([]);
      toast.error(
        error instanceof Error ? error.message : 'Khong the tai chi tiet hoat dong'
      );
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user && activityId) {
      void fetchActivity();
    }
  }, [activityId, authLoading, fetchActivity, router, user]);

  const participantClasses = useMemo(
    () =>
      Array.from(
        new Set(participants.map((participant) => participant.class_name).filter(Boolean))
      ) as string[],
    [participants]
  );

  const filteredParticipants = useMemo(() => {
    const normalizedSearch = participantSearch.trim().toLowerCase();

    return participants.filter((participant) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        participant.user_name.toLowerCase().includes(normalizedSearch) ||
        participant.user_email.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        participantStatusFilter === 'all' ||
        (participant.attendance_status || 'registered') === participantStatusFilter;

      const matchesClass =
        participantClassFilter === 'all' || participant.class_name === participantClassFilter;

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [participantClassFilter, participantSearch, participantStatusFilter, participants]);

  async function handleApprovalSubmit() {
    if (approvalAction === 'reject' && !approvalNotes.trim()) {
      toast.error('Nhap ly do tu choi truoc khi tiep tuc');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/activities/${activityId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: approvalAction,
          notes: approvalNotes.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the cap nhat phe duyet');
      }

      toast.success(
        payload?.message ||
          (approvalAction === 'approve'
            ? 'Da phe duyet hoat dong'
            : 'Da tu choi hoat dong')
      );
      setShowApprovalModal(false);
      setApprovalNotes('');
      await fetchActivity();
    } catch (error) {
      console.error('Submit admin activity approval error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the cap nhat phe duyet');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelActivity() {
    try {
      const response = await fetch(`/api/admin/activities/${activityId}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the huy hoat dong');
      }

      toast.success(payload?.message || 'Da huy hoat dong');
      router.push('/admin/activities');
    } catch (error) {
      console.error('Cancel admin activity error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the huy hoat dong');
    }
  }

  function exportParticipants() {
    if (filteredParticipants.length === 0) {
      toast.error('Khong co nguoi tham gia de xuat');
      return;
    }

    const csv = [
      ['Ho ten', 'Email', 'Lop', 'Dang ky', 'Diem danh', 'Thanh tich', 'Diem'].join(','),
      ...filteredParticipants.map((participant) =>
        [
          participant.user_name,
          participant.user_email,
          participant.class_name || '-',
          formatVietnamDateTime(participant.registered_at, 'datetime'),
          getAttendanceMeta(participant.attendance_status).label,
          participant.achievement_level || '-',
          participant.points_earned || 0,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-${activityId}-participants-${toVietnamDateStamp(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Da xuat ${filteredParticipants.length} nguoi tham gia`);
  }

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai chi tiet hoat dong..." />;
  }

  if (!activity) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-3xl">
          <section className="page-surface rounded-[1.75rem] px-5 py-10 text-center sm:px-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Khong tim thay hoat dong</h1>
            <button
              type="button"
              onClick={() => router.push('/admin/activities')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lai danh sach
            </button>
          </section>
        </div>
      </div>
    );
  }

  const statusMeta = getStatusMeta(activity.status);
  const shouldShowApprovalActions =
    activity.approval_status === 'requested' || activity.status === 'pending';

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => router.push('/admin/activities')}
                className="rounded-xl border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Activity detail
                </div>
                <h1
                  className="mt-3 text-3xl font-bold text-slate-900"
                  data-testid="admin-activity-detail-heading"
                >
                  {activity.title}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  ID {activity.id} | Tao boi {activity.creator_name || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <span
                className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
              <button
                type="button"
                onClick={() => router.push(`/admin/activities/${activityId}/edit`)}
                className="rounded-xl border border-blue-300 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Chinh sua
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Huy hoat dong
              </button>
            </div>
          </div>
        </section>

        {shouldShowApprovalActions ? (
          <section className="page-surface rounded-[1.75rem] border-amber-200 bg-amber-50 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-amber-800">Hoat dong dang cho phe duyet</div>
                <p className="mt-1 text-sm text-amber-700">
                  Kiem tra thong tin, roster du kien va lich su de ra quyet dinh nhanh.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setApprovalAction('approve');
                    setApprovalNotes('');
                    setShowApprovalModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Phe duyet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApprovalAction('reject');
                    setApprovalNotes('');
                    setShowApprovalModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  <XCircle className="h-4 w-4" />
                  Tu choi
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thoi gian</div>
              <Calendar className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900">
              {formatVietnamDateTime(activity.date_time, 'datetime')}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {activity.end_time ? `Ket thuc ${formatVietnamDateTime(activity.end_time, 'datetime')}` : 'Chua co gio ket thuc'}
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dia diem</div>
              <MapPin className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900">
              {activity.location || 'Chua xac dinh'}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {activity.organization_level_name || 'Chua co cap to chuc'}
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tham gia</div>
              <Users className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{participants.length}</div>
            <div className="mt-2 text-xs text-slate-500">
              Toi da {activity.max_participants || 'Khong gioi han'}
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lich su duyet</div>
              <History className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{approvalHistory.length}</div>
            <div className="mt-2 text-xs text-slate-500">
              {activity.activity_type_name || 'Chua co loai hoat dong'}
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tong quan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('participants')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'participants'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Nguoi tham gia ({participants.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'history'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Lich su duyet ({approvalHistory.length})
            </button>
          </div>

          {activeTab === 'overview' ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Loai hoat dong
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {activity.activity_type_name || 'Chua xac dinh'}
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cap to chuc
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {activity.organization_level_name || 'Chua xac dinh'}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mo ta hoat dong
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {activity.description || 'Chua co mo ta.'}
                </p>
              </div>

              {activity.approval_notes ? (
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Ghi chu phe duyet
                  </div>
                  <p className="mt-3 text-sm leading-7 text-amber-900">{activity.approval_notes}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'participants' ? (
            <div className="mt-6 space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl text-sm text-slate-600">
                  Kiem tra roster, trang thai diem danh va diem duoc ghi nhan theo tung hoc vien.
                </div>
                <button
                  type="button"
                  onClick={exportParticipants}
                  disabled={filteredParticipants.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Xuat CSV
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Tim kiem</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={participantSearch}
                      onChange={(event) => setParticipantSearch(event.target.value)}
                      placeholder="Ten hoac email"
                      className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-900"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Diem danh</span>
                  <select
                    value={participantStatusFilter}
                    onChange={(event) => setParticipantStatusFilter(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  >
                    <option value="all">Tat ca</option>
                    <option value="present">Co mat</option>
                    <option value="absent">Vang</option>
                    <option value="registered">Da dang ky</option>
                    <option value="not_participated">Khong tham gia</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Lop</span>
                  <select
                    value={participantClassFilter}
                    onChange={(event) => setParticipantClassFilter(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  >
                    <option value="all">Tat ca lop</option>
                    {participantClasses.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {filteredParticipants.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                  Khong co nguoi tham gia phu hop voi bo loc hien tai.
                </div>
              ) : (
                <>
                  <div className="grid gap-4 xl:hidden">
                    {filteredParticipants.map((participant) => {
                      const attendanceMeta = getAttendanceMeta(participant.attendance_status);
                      return (
                        <article
                          key={participant.id}
                          className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {participant.user_name}
                              </div>
                              <div className="mt-1 text-sm text-slate-500">
                                {participant.user_email}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {participant.class_name || 'Chua gan lop'}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-semibold text-blue-700">
                                {participant.points_earned || 0}
                              </div>
                              <div className="text-xs text-slate-500">diem</div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${attendanceMeta.badgeClass}`}
                            >
                              {attendanceMeta.label}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {participant.achievement_level || 'Chua xep hang'}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto xl:block">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Hoc vien
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Lop
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Dang ky
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Diem danh
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Thanh tich
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Diem
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredParticipants.map((participant) => {
                          const attendanceMeta = getAttendanceMeta(participant.attendance_status);
                          return (
                            <tr key={participant.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="text-sm font-semibold text-slate-900">
                                  {participant.user_name}
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                  {participant.user_email}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {participant.class_name || 'Chua gan lop'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {formatVietnamDateTime(participant.registered_at, 'datetime')}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${attendanceMeta.badgeClass}`}
                                >
                                  {attendanceMeta.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {participant.achievement_level || '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">
                                {participant.points_earned || 0}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {activeTab === 'history' ? (
            <div className="mt-6">
              {approvalHistory.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                  Chua co lich su phe duyet.
                </div>
              ) : (
                <div className="space-y-4">
                  {approvalHistory.map((entry) => {
                    const historyMeta = getHistoryMeta(entry);
                    return (
                      <article
                        key={entry.id}
                        className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5"
                      >
                        <div className="flex items-start gap-3">
                          {historyMeta.icon}
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-900">
                              {historyMeta.label}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {entry.changed_by_name || 'N/A'} |{' '}
                              {formatVietnamDateTime(entry.changed_at, 'datetime')}
                            </div>
                            {entry.notes ? (
                              <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                {entry.notes}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>

      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Huy hoat dong"
        message="Hoat dong se duoc chuyen sang trang thai cancelled. Ban co chac chan muon tiep tuc?"
        confirmText="Huy hoat dong"
        cancelText="Dong"
        variant="danger"
        onCancel={() => setShowCancelConfirm(false)}
        onConfirm={async () => {
          await handleCancelActivity();
          setShowCancelConfirm(false);
        }}
      />

      {showApprovalModal ? (
        <div className="app-modal-backdrop p-4" onClick={() => setShowApprovalModal(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-activity-approval-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-lg p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="admin-activity-approval-title" className="text-2xl font-semibold text-slate-900">
              {approvalAction === 'approve' ? 'Phe duyet hoat dong' : 'Tu choi hoat dong'}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {approvalAction === 'approve'
                ? 'Nhap ghi chu neu can roi xac nhan de cong bo hoat dong.'
                : 'Nhap ly do tu choi de tra lai thong tin ro rang cho giang vien.'}
            </p>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Ghi chu {approvalAction === 'reject' ? '(bat buoc)' : '(tuy chon)'}
              </span>
              <textarea
                rows={4}
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
                placeholder={
                  approvalAction === 'approve'
                    ? 'Nhap ghi chu neu can...'
                    : 'Nhap ly do tu choi...'
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                disabled={submitting}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Dong
              </button>
              <button
                type="button"
                onClick={() => void handleApprovalSubmit()}
                disabled={submitting}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${
                  approvalAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {approvalAction === 'approve' ? 'Xac nhan phe duyet' : 'Xac nhan tu choi'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

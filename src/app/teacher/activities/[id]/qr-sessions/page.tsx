'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Play,
  QrCode,
  StopCircle,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

type QrSession = {
  id: number;
  session_code: string;
  date_time: string;
  end_time: string | null;
  status: 'active' | 'ended';
  attendance_count: number;
  duration_minutes: number | null;
};

type Activity = {
  id: number;
  title: string;
  date_time: string;
  location: string;
};

async function requestQrSessionsData(activityId: string) {
  const [activityRes, sessionsRes] = await Promise.all([
    fetch(`/api/activities/${activityId}`),
    fetch(`/api/activities/${activityId}/qr-sessions`),
  ]);

  if (!activityRes.ok) {
    throw new Error('Khong tim thay hoat dong');
  }

  const activityJson = await activityRes.json();
  const sessionsJson = sessionsRes.ok ? await sessionsRes.json() : null;

  return {
    activity:
      activityJson?.activity ??
      activityJson?.data?.activity ??
      activityJson?.data ??
      activityJson,
    sessions: sessionsJson?.sessions ?? sessionsJson?.data?.sessions ?? [],
  };
}

function formatDuration(minutes: number | null) {
  if (!minutes) return 'Chua dong phien';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} phut`;
}

function getStatusBadge(status: QrSession['status']) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        Dang hoat dong
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
      <StopCircle className="h-3.5 w-3.5" />
      Da ket thuc
    </span>
  );
}

export default function TeacherQrSessionsPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [sessions, setSessions] = useState<QrSession[]>([]);
  const [sessionToEnd, setSessionToEnd] = useState<QrSession | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'teacher' && user.role !== 'admin') {
      toast.error('Chi giang vien moi co quyen quan ly QR');
      router.push('/teacher/dashboard');
      return;
    }

    if (user && activityId) {
      void fetchData();
    }
  }, [activityId, authLoading, router, user]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await requestQrSessionsData(activityId);
      setActivity(data.activity);
      setSessions(data.sessions);
    } catch (error: unknown) {
      console.error('Error fetching QR sessions data:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai du lieu QR');
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  const handleEndSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/qr-sessions/${sessionId}/end`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the ket thuc phien QR');
      }

      toast.success(payload?.message || 'Da ket thuc phien QR');
      await fetchData();
    } catch (error: unknown) {
      console.error('Error ending QR session:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the ket thuc phien QR');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!activity) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-6xl p-6">
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 text-rose-900">
            Khong tim thay hoat dong de quan ly phien QR.
          </div>
        </div>
      </div>
    );
  }

  const activeSessions = sessions.filter((session) => session.status === 'active');
  const totalAttendance = sessions.reduce((sum, session) => sum + session.attendance_count, 0);

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href={`/teacher/activities/${activityId}`}
                className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lai hub hoat dong
              </Link>

              <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                QR sessions
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Lich su phien QR</h1>
              <p className="mt-2 text-sm text-slate-600">
                Theo doi cac dot mo QR, luot check-in va dong phien ngay tai hoat dong hien tai.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <span>{activity.title}</span>
                <span>{formatVietnamDateTime(activity.date_time, 'date')}</span>
                <span>{activity.location || 'Chua cap nhat dia diem'}</span>
              </div>
            </div>

            <Link
              href={`/teacher/qr?activity_id=${activityId}`}
              className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Play className="h-4 w-4" />
              Tao phien moi
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="page-surface rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong phien</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{sessions.length}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Dang mo</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{activeSessions.length}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Tong check-in</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totalAttendance}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">Trang thai hub</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {activeSessions.length > 0 ? 'Live' : 'Idle'}
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Danh sach phien QR</h2>
              <p className="mt-1 text-sm text-slate-600">
                Moi phien chi nen mo khi dang diem danh va dong lai ngay sau khi ket thuc.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {sessions.length} phien
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <QrCode className="mx-auto h-12 w-12 text-slate-400" />
              <div className="mt-4 text-lg font-semibold text-slate-700">Chua co phien QR nao</div>
              <p className="mt-2 text-sm text-slate-500">
                Tao phien dau tien de bat dau check-in bang camera web hoac dien thoai.
              </p>
              <Link
                href={`/teacher/qr?activity_id=${activityId}`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                <Play className="h-4 w-4" />
                Tao phien QR dau tien
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <article
                  key={session.id}
                  className={`rounded-[1.5rem] border p-4 transition ${
                    session.status === 'active'
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-2xl p-3 ${
                          session.status === 'active' ? 'bg-emerald-100' : 'bg-slate-100'
                        }`}
                      >
                        <QrCode
                          className={`h-5 w-5 ${
                            session.status === 'active' ? 'text-emerald-700' : 'text-slate-700'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-900">
                            Ma phien: {session.session_code}
                          </h3>
                          {getStatusBadge(session.status)}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">Session #{session.id}</p>
                        <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl bg-white/80 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Bat dau
                            </div>
                            <div className="mt-2 font-medium text-slate-800">
                              {formatVietnamDateTime(session.date_time)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/80 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Ket thuc
                            </div>
                            <div className="mt-2 font-medium text-slate-800">
                              {session.end_time
                                ? formatVietnamDateTime(session.end_time)
                                : 'Dang mo phien'}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/80 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Thoi luong
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2 font-medium text-slate-800">
                              <Clock3 className="h-4 w-4" />
                              {formatDuration(session.duration_minutes)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-white/80 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Luot check-in
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2 font-medium text-slate-800">
                              <Users className="h-4 w-4" />
                              {session.attendance_count}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:w-[17rem] xl:justify-end">
                      {session.status === 'active' ? (
                        <>
                          <Link
                            href={`/teacher/qr?activity_id=${activityId}&tab=history`}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                          >
                            <QrCode className="h-4 w-4" />
                            Xem man QR
                          </Link>
                          <button
                            onClick={() => setSessionToEnd(session)}
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                          >
                            <StopCircle className="h-4 w-4" />
                            Dong phien
                          </button>
                        </>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Phien da hoan tat
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={sessionToEnd !== null}
        title="Ket thuc phien QR"
        message={
          sessionToEnd
            ? `Ban co chac chan muon ket thuc phien QR "${sessionToEnd.session_code}"? Sau khi dong phien, hoc vien se khong the tiep tuc check-in vao ma nay.`
            : ''
        }
        confirmText="Ket thuc phien"
        cancelText="Huy"
        variant="danger"
        onCancel={() => setSessionToEnd(null)}
        onConfirm={async () => {
          if (!sessionToEnd) return;
          await handleEndSession(sessionToEnd.id);
          setSessionToEnd(null);
        }}
      />
    </div>
  );
}

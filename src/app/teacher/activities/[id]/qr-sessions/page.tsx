'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, Clock, Play, QrCode, StopCircle, Users } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

interface QRSession {
  id: number;
  session_code: string;
  date_time: string;
  end_time: string | null;
  status: 'active' | 'ended';
  attendance_count: number;
  duration_minutes: number | null;
}

interface Activity {
  id: number;
  title: string;
  date_time: string;
  location: string;
}

async function requestQRSessionsData(activityId: string) {
  const [activityRes, sessionsRes] = await Promise.all([
    fetch(`/api/activities/${activityId}`),
    fetch(`/api/activities/${activityId}/qr-sessions`),
  ]);

  if (!activityRes.ok) {
    throw new Error('Không tìm thấy hoạt động');
  }

  const activityData = await activityRes.json();
  const sessionsData = sessionsRes.ok ? await sessionsRes.json() : null;

  return {
    activity:
      activityData.activity ?? activityData.data?.activity ?? activityData.data ?? activityData,
    sessions: sessionsData?.sessions ?? sessionsData?.data?.sessions ?? [],
  };
}

export default function QRSessionsPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [sessions, setSessions] = useState<QRSession[]>([]);
  const [sessionToEnd, setSessionToEnd] = useState<QRSession | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      toast.error('Chỉ giảng viên mới có quyền xem trang này');
      router.push('/teacher/dashboard');
      return;
    }

    if (!user) return;

    void (async () => {
      try {
        setLoading(true);
        const data = await requestQRSessionsData(activityId);
        setActivity(data.activity);
        setSessions(data.sessions);
      } catch (error: unknown) {
        console.error('Error fetching QR sessions data:', error);
        toast.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    })();
  }, [activityId, authLoading, router, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await requestQRSessionsData(activityId);
      setActivity(data.activity);
      setSessions(data.sessions);
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/qr-sessions/${sessionId}/end`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Không thể kết thúc phiên QR');
      }

      toast.success('Đã kết thúc phiên QR');
      await fetchData();
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Không thể kết thúc phiên QR');
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }

    return `${mins} phút`;
  };

  const getStatusBadge = (status: 'active' | 'ended') => {
    if (status === 'active') {
      return (
        <span className="flex w-fit items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 animate-pulse">
          <span className="h-2 w-2 rounded-full bg-green-600"></span>
          Đang hoạt động
        </span>
      );
    }

    return (
      <span className="flex w-fit items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
        <StopCircle className="h-3 w-3" />
        Đã kết thúc
      </span>
    );
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!activity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Không tìm thấy hoạt động</p>
      </div>
    );
  }

  const activeSessions = sessions.filter((session) => session.status === 'active');
  const totalAttendance = sessions.reduce((sum, session) => sum + session.attendance_count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </button>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <QrCode className="h-6 w-6 text-purple-600" />
                  Lịch sử phiên QR
                </h1>
                <p className="mt-2 text-gray-600">{activity.title}</p>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <span>📅 {formatVietnamDateTime(activity.date_time, 'date')}</span>
                  <span>📍 {activity.location || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <Link
                href={`/teacher/qr?activity_id=${activityId}`}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-white transition-colors hover:bg-purple-700"
              >
                <Play className="h-5 w-5" />
                Tạo phiên mới
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Tổng số phiên</div>
            <div className="text-3xl font-bold text-blue-600">{sessions.length}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Phiên đang hoạt động</div>
            <div className="text-3xl font-bold text-green-600">{activeSessions.length}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Tổng lượt điểm danh</div>
            <div className="text-3xl font-bold text-purple-600">{totalAttendance}</div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Danh sách phiên QR ({sessions.length})
            </h3>

            {sessions.length === 0 ? (
              <div className="py-12 text-center">
                <QrCode className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <p className="mb-2 text-lg text-gray-600">Chưa có phiên QR nào</p>
                <p className="mb-6 text-sm text-gray-500">
                  Tạo phiên QR mới để bắt đầu điểm danh bằng mã QR.
                </p>
                <Link
                  href={`/teacher/qr?activity_id=${activityId}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-white transition-colors hover:bg-purple-700"
                >
                  <Play className="h-5 w-5" />
                  Tạo phiên QR đầu tiên
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-lg border p-5 transition-all ${
                      session.status === 'active'
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex items-center gap-3">
                          <div
                            className={`rounded-lg p-3 ${
                              session.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                            }`}
                          >
                            <QrCode
                              className={`h-6 w-6 ${
                                session.status === 'active' ? 'text-green-600' : 'text-gray-600'
                              }`}
                            />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center gap-3">
                              <h4 className="text-lg font-semibold text-gray-900">
                                Mã phiên: {session.session_code}
                              </h4>
                              {getStatusBadge(session.status)}
                            </div>
                            <p className="text-sm text-gray-600">Phiên #{session.id}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <div className="flex items-center gap-2">
                            <Play className="h-4 w-4 text-gray-500" />
                            <div>
                              <div className="text-xs text-gray-500">Bắt đầu</div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatVietnamDateTime(session.date_time)}
                              </div>
                            </div>
                          </div>

                          {session.end_time && (
                            <div className="flex items-center gap-2">
                              <StopCircle className="h-4 w-4 text-gray-500" />
                              <div>
                                <div className="text-xs text-gray-500">Kết thúc</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {formatVietnamDateTime(session.end_time)}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <div>
                              <div className="text-xs text-gray-500">Thời lượng</div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatDuration(session.duration_minutes)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <div>
                              <div className="text-xs text-gray-500">Lượt điểm danh</div>
                              <div className="text-sm font-medium text-purple-600">
                                {session.attendance_count}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        {session.status === 'active' ? (
                          <>
                            <Link
                              href={`/teacher/qr?activity_id=${activityId}&tab=history`}
                              className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700"
                            >
                              <QrCode className="h-4 w-4" />
                              Xem QR
                            </Link>
                            <button
                              onClick={() => setSessionToEnd(session)}
                              className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
                            >
                              <StopCircle className="h-4 w-4" />
                              Kết thúc
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Hoàn thành
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900">
              <QrCode className="h-5 w-5" />
              Thông tin về phiên QR
            </h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Mỗi phiên QR có mã duy nhất để học viên quét và điểm danh.</li>
              <li>
                • Phiên đang hoạt động sẽ hiển thị mã QR động và cập nhật theo thời gian thực.
              </li>
              <li>• Kết thúc phiên khi hoàn tất điểm danh để tránh ghi nhận nhầm.</li>
              <li>• Có thể tạo nhiều phiên cho cùng một hoạt động nếu cần chia đợt.</li>
            </ul>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={sessionToEnd !== null}
        title="Kết thúc phiên QR"
        message={
          sessionToEnd
            ? `Bạn có chắc chắn muốn kết thúc phiên QR "${sessionToEnd.session_code}"? Sau khi kết thúc, học viên sẽ không thể tiếp tục điểm danh vào phiên này.`
            : ''
        }
        confirmText="Kết thúc phiên"
        cancelText="Hủy"
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

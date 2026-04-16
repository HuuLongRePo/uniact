'use client';

import React, { useEffect, useState } from 'react';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import Countdown from '@/components/Countdown';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/lib/toast';
import { AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { resolveClientFetchUrl } from '@/lib/client-fetch-url';

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
      const res = await fetch(resolveClientFetchUrl(`/api/activities/${activityId}`));
      const data = await res.json();

      if (res.ok) {
        setActivity(data.activity);
      } else {
        toast.error(data.error || 'Không thể tải thông tin hoạt động');
        router.push('/student/activities');
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      toast.error('Lỗi khi tải dữ liệu');
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
      fetchActivity();
    }
  }, [user, authLoading, activityId, fetchActivity]);

  const handleRegister = async (forceRegister: boolean = false) => {
    if (!activity) return;

    setRegistering(true);
    try {
      const res = await fetch(resolveClientFetchUrl(`/api/activities/${activity.id}/register`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force_register: forceRegister }),
      });
      const data = await res.json();

      if (res.ok) {
        setRegisterConflict([]);
        toast.success('Đăng ký thành công!');
        await fetchActivity();
      } else if (
        data?.code === 'CONFLICT' &&
        data?.details?.can_override === true &&
        Array.isArray(data?.details?.conflicts)
      ) {
        setRegisterConflict(data.details.conflicts);
      } else {
        toast.error(data.error || 'Đăng ký thất bại');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Lỗi khi đăng ký');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!activity) return;

    setRegistering(true);
    try {
      const res = await fetch(resolveClientFetchUrl(`/api/activities/${activity.id}/register`), {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        toast.success('Hủy đăng ký thành công!');
        await fetchActivity();
      } else {
        toast.error(data.error || 'Hủy đăng ký thất bại');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Lỗi khi hủy đăng ký');
    } finally {
      setRegistering(false);
      setShowCancelModal(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!activity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Không tìm thấy hoạt động</p>
        </div>
      </div>
    );
  }

  const activityDate = new Date(activity.date_time);
  const registrationDeadline = activity.registration_deadline
    ? new Date(activity.registration_deadline)
    : null;
  const now = new Date();
  const isPast = activityDate.getTime() <= now.getTime();
  const isFull =
    activity.max_participants !== null && activity.participant_count >= activity.max_participants;
  const isRegistrationClosed =
    registrationDeadline !== null && registrationDeadline.getTime() <= now.getTime();
  const countdownTarget = activity.registration_deadline || activity.date_time;
  const statusText =
    activity.status === 'published'
      ? 'Đã công bố'
      : activity.status === 'draft'
        ? 'Bản nháp'
        : activity.status === 'completed'
          ? 'Đã hoàn thành'
          : activity.status === 'cancelled'
            ? 'Đã hủy'
            : activity.status;
  const statusClass =
    activity.status === 'published'
      ? 'text-green-600'
      : activity.status === 'draft'
        ? 'text-gray-600'
        : activity.status === 'cancelled'
          ? 'text-red-600'
          : 'text-blue-600';
  const participationLabel =
    activity.registration_status === 'attended'
      ? 'Đã điểm danh'
      : activity.is_mandatory
        ? 'Bắt buộc với bạn'
        : 'Đã đăng ký';
  const remainingSlotsLabel =
    activity.max_participants === null
      ? 'Không giới hạn'
      : String(Math.max(0, activity.max_participants - activity.participant_count));

  const appliesToStudent = activity.applies_to_student !== false;
  const applicabilityReason =
    activity.applicability_reason ||
    (appliesToStudent
      ? 'Hoat dong nay dang ap dung cho ban.'
      : 'Hoat dong nay hien khong ap dung cho ban.');

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-700"
      >
        ← Quay lại
      </button>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-8 mb-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-4">{activity.title}</h1>
            <div className="flex flex-wrap gap-3">
              {activity.activity_type && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  📋 {activity.activity_type}
                </span>
              )}
              {activity.organization_level && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  🏆 {activity.organization_level}
                </span>
              )}
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                ⭐ {activity.base_points} điểm
              </span>
              {activity.qr_enabled && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">📱 Điểm danh QR</span>
              )}
              {activity.is_mandatory && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Bắt buộc với bạn</span>
              )}
            </div>
          </div>

          {activity.is_registered && (
            <div className="bg-green-500 px-4 py-2 rounded-lg font-semibold">
              ✓ {participationLabel}
            </div>
          )}

          <div
            className={`rounded-lg border p-6 ${
              appliesToStudent ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
            }`}
          >
            <h2 className="mb-2 text-xl font-bold">
              {appliesToStudent ? 'Pham vi ap dung' : 'Khong thuoc pham vi cua ban'}
            </h2>
            <p className={appliesToStudent ? 'text-green-700' : 'text-amber-800'}>
              {applicabilityReason}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">📝 Mô tả hoạt động</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{activity.description}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">ℹ️ Thông tin chi tiết</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">📅 Thời gian diễn ra</div>
                <div className="font-semibold">
                  {activityDate.toLocaleString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">📍 Địa điểm</div>
                <div className="font-semibold">{activity.location}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">👨‍🏫 Giảng viên phụ trách</div>
                <div className="font-semibold">{activity.teacher_name}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-1">👥 Số lượng tham gia</div>
                <div className="font-semibold">
                  <span className={isFull ? 'text-red-600' : 'text-green-600'}>
                    {activity.participant_count}/
                    {activity.max_participants === null
                      ? 'Không giới hạn'
                      : activity.max_participants}{' '}
                    người
                  </span>
                  {isFull && <span className="text-red-600 ml-2">(Đầy)</span>}
                </div>
              </div>

              {activity.registration_deadline && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">⏳ Hạn đăng ký</div>
                  <div className="font-semibold">{formatDate(activity.registration_deadline)}</div>
                </div>
              )}

              <div>
                <div className="text-sm text-gray-600 mb-1">📌 Trạng thái hoạt động</div>
                <div className={`font-semibold ${statusClass}`}>{statusText}</div>
              </div>
            </div>
          </div>

          {activity.class_names && activity.class_names.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">🎯 Lớp được tham gia</h2>
              <div className="flex flex-wrap gap-2">
                {activity.class_names.map((className) => (
                  <span
                    key={className}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {className}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {!isPast && !activity.is_registered && !isRegistrationClosed && appliesToStudent && (
            <Countdown targetDate={countdownTarget} label="Thời gian còn lại để đăng ký" />
          )}

          <div className="bg-white rounded-lg shadow p-6 sticky top-4">
            <h3 className="font-bold text-lg mb-4">Đăng ký tham gia</h3>

            {isPast ? (
              <div className="bg-gray-100 text-gray-600 px-4 py-3 rounded text-center">
                ⏰ Hoạt động đã kết thúc
              </div>
            ) : activity.is_registered ? (
              <div className="space-y-3">
                <div
                  className={`border px-4 py-3 rounded text-center font-medium ${
                    activity.is_mandatory
                      ? 'bg-orange-50 border-orange-200 text-orange-800'
                      : 'bg-green-50 border-green-200 text-green-800'
                  }`}
                >
                  {activity.is_mandatory ? 'Bắt buộc với bạn' : '✓ Bạn đã đăng ký'}
                </div>
                {activity.is_mandatory ? (
                  <p className="text-xs text-gray-600 text-center">
                    Hoạt động này đang áp dụng bắt buộc với bạn nên bạn không thể tự hủy đăng ký
                  </p>
                ) : activity.can_cancel ? (
                  <>
                    <p className="text-xs text-gray-600 text-center">
                      Bạn có thể hủy đăng ký trước 24 giờ
                    </p>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={registering}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-3 rounded font-semibold transition"
                    >
                      {registering ? 'Đang xử lý...' : 'Hủy đăng ký'}
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-gray-600 text-center">
                    Không thể hủy trong vòng 24 giờ trước hoạt động hoặc sau khi đã điểm danh
                  </p>
                )}
              </div>
            ) : !appliesToStudent ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-center">
                Hoat dong nay hien khong ap dung cho ban nen ban khong the tu dang ky
              </div>
            ) : isRegistrationClosed ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-center">
                ⏳ Đã hết hạn đăng ký
              </div>
            ) : isFull ? (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-center">
                ❌ Hoạt động đã đủ số lượng
              </div>
            ) : activity.can_register ? (
              <>
                <button
                  onClick={() => {
                    void handleRegister();
                  }}
                  disabled={registering}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded font-semibold transition mb-3"
                >
                  {registering ? 'Đang đăng ký...' : '✓ Đăng ký ngay'}
                </button>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• Xác nhận đăng ký sau khi nhấn nút</p>
                  <p>• Có thể hủy trước 24 giờ</p>
                  <p>• Nhớ tham gia đúng giờ</p>
                </div>
              </>
            ) : (
              <div className="bg-gray-100 text-gray-600 px-4 py-3 rounded text-center">
                Không thể đăng ký
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">📊 Thống kê nhanh</h3>
            <div className="space-y-3">
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Điểm cơ bản:</span>
                <span className="font-bold text-blue-600">{activity.base_points}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Đã đăng ký:</span>
                <span className="font-bold">{activity.participant_count}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Còn trống:</span>
                <span className="font-bold text-green-600">{remainingSlotsLabel}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Trạng thái:</span>
                <span className={`font-bold ${statusClass}`}>{statusText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelRegistration}
        title="Xác nhận hủy đăng ký"
        message="Bạn có chắc chắn muốn hủy đăng ký hoạt động này?"
        confirmText="Hủy đăng ký"
        cancelText="Không, giữ lại"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        icon={
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        }
        details={
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Hoạt động:</span>
              <span className="font-semibold text-gray-900 text-right">{activity.title}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Thời gian:</span>
              <span className="font-medium text-gray-900">{formatDate(activity.date_time)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Địa điểm:</span>
              <span className="font-medium text-gray-900 text-right">{activity.location}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Điểm:</span>
              <span className="font-medium text-yellow-600">+{activity.base_points} điểm</span>
            </div>
          </div>
        }
      />

      <ConfirmationModal
        isOpen={registerConflict.length > 0}
        onClose={() => setRegisterConflict([])}
        onConfirm={() => {
          void handleRegister(true);
        }}
        title="Xung đột giờ bắt đầu"
        message="Bạn đang có hoạt động khác trùng giờ bắt đầu. Nếu vẫn tiếp tục, hệ thống sẽ gửi đăng ký với xác nhận override."
        confirmText="Vẫn đăng ký"
        cancelText="Xem lại"
        confirmButtonClass="bg-amber-600 hover:bg-amber-700"
        icon={
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
        }
        details={
          activity && registerConflict.length > 0 ? (
            <div className="space-y-3 text-sm">
              <div className="font-semibold text-gray-900">
                Hoạt động đang đăng ký: {activity.title}
              </div>
              <div className="text-gray-600">Các hoạt động đang trùng giờ bắt đầu:</div>
              <div className="space-y-2">
                {registerConflict.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="rounded border border-amber-200 bg-amber-50 p-3"
                  >
                    <div className="font-medium text-gray-900">{conflict.title}</div>
                    <div className="text-gray-600">
                      {new Date(conflict.date_time).toLocaleString('vi-VN')}
                    </div>
                    <div className="text-gray-600">{conflict.location}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}

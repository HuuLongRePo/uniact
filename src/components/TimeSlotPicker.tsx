'use client';

import { useState, useEffect } from 'react';

interface TimeSlot {
  id: number;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  max_concurrent: number;
  current_registered: number;
  status: 'available' | 'full' | 'closed';
}

interface TimeSlotPickerProps {
  activityId: number;
  participationId: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function TimeSlotPicker({
  activityId,
  participationId,
  onSuccess,
  onError,
}: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadSlots();
  }, [activityId]);

  const loadSlots = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}/time-slots`);

      if (!res.ok) {
        throw new Error('Không thể tải khung giờ');
      }

      const data = await res.json();
      setSlots(data.slots || []);
    } catch (err: any) {
      console.error('Load slots error:', err);
      setError(err.message || 'Lỗi tải khung giờ');
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedSlot) {
      setError('Vui lòng chọn khung giờ');
      return;
    }

    setRegistering(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/activities/${activityId}/time-slots/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot,
          participationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đăng ký khung giờ thất bại');
      }

      if (data.success) {
        setSuccess('✅ Đăng ký khung giờ thành công!');
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
        // Reload slots to update availability
        loadSlots();
      } else {
        throw new Error('Đăng ký không thành công');
      }
    } catch (err: any) {
      console.error('Register slot error:', err);
      setError(err.message || 'Đăng ký thất bại');
      onError?.(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const formatTime = (timeStr: string) => {
    // Format HH:MM:SS to HH:MM
    return timeStr.substring(0, 5);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSlotColor = (slot: TimeSlot) => {
    const percentFull = (slot.current_registered / slot.max_concurrent) * 100;

    if (slot.status === 'full') return 'bg-red-50 border-red-300 text-red-700';
    if (slot.status === 'closed') return 'bg-gray-50 border-gray-300 text-gray-500';
    if (percentFull >= 80) return 'bg-amber-50 border-amber-300 text-amber-700';
    return 'bg-green-50 border-green-300 text-green-700';
  };

  const getAvailabilityIcon = (slot: TimeSlot) => {
    if (slot.status === 'full') return '🔴';
    if (slot.status === 'closed') return '🔒';
    const percentFull = (slot.current_registered / slot.max_concurrent) * 100;
    if (percentFull >= 80) return '🟡';
    return '🟢';
  };

  if (loading) {
    return (
      <div className="time-slot-picker bg-white p-6 rounded-lg shadow-md border-2 border-purple-200">
        <div className="flex items-center justify-center gap-3 py-8">
          <svg className="animate-spin h-6 w-6 text-purple-600" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-gray-600">Đang tải khung giờ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="time-slot-picker bg-white p-6 rounded-lg shadow-md border-2 border-purple-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl">⏰</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Chọn khung giờ tham gia</h3>
          <p className="text-sm text-gray-600">
            Mỗi khung giờ giới hạn {slots[0]?.max_concurrent || 500} người
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md text-sm bg-red-50 text-red-800 border border-red-200">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-md text-sm bg-green-50 text-green-800 border border-green-200">
          {success}
        </div>
      )}

      {slots.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-3">
            {slots.map((slot) => {
              const isSelected = selectedSlot === slot.id;
              const isDisabled = slot.status === 'full' || slot.status === 'closed';
              const percentFull = (slot.current_registered / slot.max_concurrent) * 100;

              return (
                <button
                  key={slot.id}
                  onClick={() => !isDisabled && setSelectedSlot(slot.id)}
                  disabled={isDisabled}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                      : getSlotColor(slot)
                  } ${
                    isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{getAvailabilityIcon(slot)}</span>
                        <span className="font-semibold text-gray-800">
                          {formatTime(slot.slot_start)} - {formatTime(slot.slot_end)}
                        </span>
                        {isSelected && (
                          <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                            Đã chọn
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{formatDate(slot.slot_date)}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              percentFull >= 90
                                ? 'bg-red-500'
                                : percentFull >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${percentFull}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {slot.current_registered}/{slot.max_concurrent}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="ml-3 text-purple-600">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleRegister}
            disabled={!selectedSlot || registering}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
              !selectedSlot || registering
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
            }`}
          >
            {registering ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang đăng ký...
              </span>
            ) : (
              'Xác nhận khung giờ'
            )}
          </button>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-3">📅</p>
          <p>Chưa có khung giờ nào được tạo</p>
          <p className="text-xs mt-2">Liên hệ giảng viên để tạo khung giờ</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <span>🟢</span>
            <span>Còn trống</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🟡</span>
            <span>Gần đầy (&gt;80%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔴</span>
            <span>Đã đầy</span>
          </div>
        </div>
      </div>
    </div>
  );
}

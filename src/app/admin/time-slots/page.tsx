'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toVietnamDatetimeLocalValue } from '@/lib/timezone';

interface Activity {
  id: number;
  title: string;
  max_participants: number;
  date_time: string;
}

interface CreatedSlot {
  id: number;
  slot_start: string;
  slot_end: string;
  max_concurrent: number;
  status: string;
}

interface ActivitiesResponse {
  activities?: Activity[];
}

interface CreateSlotsResponse {
  error?: string;
  message?: string;
  slots?: CreatedSlot[];
}

type MessageState = {
  type: 'success' | 'error';
  text: string;
};

const DEFAULT_SLOT_SIZE = 500;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const toDateInputValue = (dateTime: string) => {
  const datetimeValue = toVietnamDatetimeLocalValue(dateTime);
  return datetimeValue ? datetimeValue.slice(0, 10) : '';
};

const getSlotStatusLabel = (status: string) => {
  switch (status) {
    case 'available':
      return 'Sẵn sàng';
    case 'closed':
      return 'Đã đóng';
    default:
      return status;
  }
};

export default function AdminTimeSlots() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
  const [slotDate, setSlotDate] = useState('');
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [slotSize, setSlotSize] = useState(DEFAULT_SLOT_SIZE);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [createdSlots, setCreatedSlots] = useState<CreatedSlot[]>([]);

  const loadActivities = async () => {
    try {
      const res = await fetch('/api/admin/activities?limit=100');
      const data = (await res.json()) as ActivitiesResponse;

      if (!res.ok) {
        throw new Error('Không thể tải danh sách hoạt động');
      }

      setActivities(Array.isArray(data.activities) ? data.activities : []);
    } catch (error) {
      console.error('Load activities error:', error);
      setMessage({
        type: 'error',
        text: getErrorMessage(error, 'Không thể tải danh sách hoạt động'),
      });
    }
  };

  const handleActivitySelect = (activityId: number) => {
    setSelectedActivity(activityId);

    const activity = activities.find((item) => item.id === activityId);
    if (!activity) {
      setSlotDate('');
      return;
    }

    setTotalParticipants(activity.max_participants || DEFAULT_SLOT_SIZE);
    setSlotDate(toDateInputValue(activity.date_time));
  };

  const handleCreateSlots = async () => {
    if (!selectedActivity || !slotDate) {
      setMessage({ type: 'error', text: 'Vui lòng chọn hoạt động và ngày.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/time-slots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: selectedActivity,
          slotDate,
          totalParticipants,
          slotSize,
        }),
      });

      const data = (await res.json()) as CreateSlotsResponse;

      if (!res.ok) {
        throw new Error(data.error || 'Tạo khung giờ thất bại');
      }

      setMessage({
        type: 'success',
        text: data.message || 'Tạo khung giờ thành công.',
      });
      setCreatedSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: getErrorMessage(error, 'Lỗi tạo khung giờ'),
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSlots = () => {
    if (!totalParticipants || !slotSize) {
      return 0;
    }

    return Math.ceil(totalParticipants / slotSize);
  };

  const calculateReductionPercent = () => {
    if (!totalParticipants || !slotSize) {
      return 0;
    }

    return Math.max(0, Math.round((1 - slotSize / totalParticipants) * 100));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h1 className="mb-6 text-2xl font-bold text-gray-800">Quản lý khung giờ hoạt động</h1>

          <div className="mb-6">
            <Button onClick={loadActivities}>Tải danh sách hoạt động</Button>
          </div>

          {activities.length > 0 && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">Chọn hoạt động</label>
              <select
                value={selectedActivity || ''}
                onChange={(e) => handleActivitySelect(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn hoạt động --</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.title} (Tối đa: {activity.max_participants} người)
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedActivity && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Ngày tổ chức</label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Tổng số người tham gia
                </label>
                <input
                  type="number"
                  value={totalParticipants}
                  onChange={(e) => setTotalParticipants(Number(e.target.value))}
                  min="1"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Kích thước mỗi khung giờ
                </label>
                <input
                  type="number"
                  value={slotSize}
                  onChange={(e) => setSlotSize(Number(e.target.value))}
                  min="1"
                  max="1000"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Khuyến nghị: {DEFAULT_SLOT_SIZE} người/khung để tối ưu chi phí hạ tầng.
                </p>
              </div>

              <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 font-semibold text-blue-900">Dự kiến</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>
                    Số khung giờ: <strong>{calculateSlots()} khung</strong>
                  </li>
                  <li>
                    Tổng thời gian: {calculateSlots()} giờ (8:00 - {8 + calculateSlots()}:00)
                  </li>
                  <li>
                    Tải đồng thời tối đa: {slotSize} người (giảm {calculateReductionPercent()}%)
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleCreateSlots}
                disabled={loading}
                isLoading={loading}
                loadingText="Đang tạo..."
                variant="success"
                size="lg"
                className="w-full"
              >
                Tạo khung giờ
              </Button>
            </div>
          )}

          {message && (
            <div
              className={`mb-4 rounded-md border p-4 ${
                message.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {createdSlots.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-semibold text-gray-800">
                Đã tạo {createdSlots.length} khung giờ
              </h3>
              <div className="space-y-2">
                {createdSlots.map((slot, index) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3"
                  >
                    <div>
                      <span className="font-medium text-gray-800">
                        Khung {index + 1}: {slot.slot_start} - {slot.slot_end}
                      </span>
                      <span className="ml-3 text-sm text-gray-600">
                        (Tối đa: {slot.max_concurrent} người)
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        slot.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {getSlotStatusLabel(slot.status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-md border border-purple-200 bg-purple-50 p-4">
            <h4 className="mb-2 font-semibold text-purple-900">Hướng dẫn sử dụng</h4>
            <ol className="ml-4 list-decimal space-y-1 text-sm text-purple-800">
              <li>Tải danh sách hoạt động từ hệ thống.</li>
              <li>Chọn hoạt động cần tạo khung giờ.</li>
              <li>Cấu hình ngày, tổng số người và kích thước mỗi khung.</li>
              <li>Xem trước số khung giờ sẽ được tạo.</li>
              <li>Nhấn &quot;Tạo khung giờ&quot; để áp dụng.</li>
            </ol>
            <p className="mt-3 text-xs text-purple-700">
              <strong>Lưu ý:</strong> Kích thước khung {DEFAULT_SLOT_SIZE} người thường phù hợp để
              giảm tải đồng thời trên hạ tầng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useEffect, useState } from 'react';
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

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleString('vi-VN');
}

function statusBadge(status: Activity['status']) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
          <CheckCircle className="h-4 w-4" />
          Đã duyệt
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
          <Clock className="h-4 w-4" />
          Đã gửi duyệt
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
          <XCircle className="h-4 w-4" />
          Bị từ chối
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          Nháp
        </span>
      );
  }
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

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/activities/approvals?status=${filter}`);
      if (!response.ok) {
        throw new Error('Không thể tải danh sách hoạt động');
      }

      const data = await response.json();
      setActivities(data.activities || data.data?.activities || []);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách hoạt động');
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
          message: resubmitMessage.trim() || 'Gửi lại để duyệt',
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Không thể gửi lại');
      }

      toast.success(data?.message || 'Đã gửi duyệt hoạt động');
      setResubmitMessage('');
      setSelectedActivity(null);
      await fetchActivities();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Không thể gửi duyệt');
    } finally {
      setResubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Theo dõi duyệt hoạt động</h1>
          <p className="mt-2 text-gray-600">Quản lý hoạt động của bạn trong quy trình duyệt.</p>
        </div>

        <div className="mb-6 flex gap-2 border-b">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-3 font-medium transition ${
                filter === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'all' && 'Tất cả'}
              {tab === 'pending' && 'Đã gửi duyệt'}
              {tab === 'approved' && 'Đã duyệt'}
              {tab === 'rejected' && 'Bị từ chối'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow">
            <p className="text-lg text-gray-600">Không có hoạt động nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{activity.title}</h3>
                      {statusBadge(activity.status)}
                    </div>

                    <p className="mb-4 text-gray-600">{activity.description}</p>

                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {new Date(activity.date_time).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        {activity.location || 'Chưa xác định'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Users className="h-4 w-4 text-gray-500" />
                        {activity.class_count} lớp
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="h-4 w-4 text-gray-500" />
                        {activity.teacher_name}
                      </div>
                    </div>

                    {activity.submitted_at && (
                      <div className="mt-4 space-y-2 text-sm text-gray-600">
                        <div>Gửi duyệt: {formatDateTime(activity.submitted_at)}</div>
                        {activity.status === 'approved' && activity.approved_at && (
                          <div className="text-green-600">
                            Đã duyệt: {formatDateTime(activity.approved_at)}
                          </div>
                        )}
                        {activity.status === 'rejected' && activity.rejected_at && (
                          <div className="text-red-600">
                            Bị từ chối: {formatDateTime(activity.rejected_at)}
                            {activity.rejection_reason && (
                              <div className="mt-1">Lý do: {activity.rejection_reason}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {activity.status === 'rejected' && (
                      <button
                        onClick={() => openActivityModal(activity)}
                        className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                      >
                        <Send className="h-4 w-4" />
                        Gửi lại
                      </button>
                    )}
                    {activity.status === 'pending' && (
                      <button
                        onClick={() => openActivityModal(activity)}
                        className="flex items-center gap-2 rounded bg-gray-200 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-300"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Chi tiết
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-2xl font-bold">
              {selectedActivity.status === 'rejected' ? 'Gửi lại duyệt' : 'Chi tiết hoạt động'}
            </h2>

            <div className="mb-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Hoạt động</p>
                <p className="font-medium">{selectedActivity.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Trạng thái hiện tại</p>
                <div className="mt-1">{statusBadge(selectedActivity.status)}</div>
              </div>
              {selectedActivity.submitted_at && (
                <div>
                  <p className="text-sm text-gray-600">Lần gửi gần nhất</p>
                  <p className="font-medium">{formatDateTime(selectedActivity.submitted_at)}</p>
                </div>
              )}
              {selectedActivity.rejection_reason && (
                <div className="rounded border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-700">Lý do từ chối</p>
                  <p className="mt-1 text-sm text-red-600">{selectedActivity.rejection_reason}</p>
                </div>
              )}
              {selectedActivity.status === 'rejected' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Ghi chú</label>
                  <textarea
                    value={resubmitMessage}
                    onChange={(event) => setResubmitMessage(event.target.value)}
                    placeholder="Nhập ghi chú gửi lại..."
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedActivity(null)}
                className="flex-1 rounded-lg border px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Đóng
              </button>
              {selectedActivity.status === 'rejected' && (
                <button
                  onClick={() => void handleResubmit(selectedActivity.id)}
                  disabled={resubmitting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {resubmitting ? 'Đang gửi...' : 'Gửi lại'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  Clock,
  XCircle,
  Send,
  MessageSquare,
  User,
  Calendar,
  MapPin,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  teacher_status: string;
  teacher_name: string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  max_participants: number | null;
  class_count: number;
}

export default function ApprovalsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [resubmitMessage, setResubmitMessage] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/activities/approvals?status=${filter}`);
      if (!response.ok) throw new Error('Không thể tải danh sách hoạt động');
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách hoạt động');
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async (activityId: number) => {
    if (!resubmitMessage.trim() && filter !== 'rejected') {
      toast.error('Vui lòng nhập lý do gửi lại');
      return;
    }

    try {
      setResubmitting(true);
      const response = await fetch(`/api/teacher/activities/${activityId}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: resubmitMessage || 'Gửi lại để duyệt',
        }),
      });

      if (!response.ok) throw new Error('Không thể gửi lại');

      toast.success('Gửi duyệt thành công');
      setResubmitMessage('');
      setSelectedActivity(null);
      fetchActivities();
    } catch (error) {
      console.error(error);
      toast.error('Không thể gửi duyệt');
    } finally {
      setResubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
            <CheckCircle className="w-4 h-4" />
            Đã duyệt
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
            <Clock className="w-4 h-4" />
            Chờ duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
            <XCircle className="w-4 h-4" />
            Từ chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
            📝 Nháp
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Theo dõi duyệt hoạt động</h1>
          <p className="text-gray-600 mt-2">Quản lý hoạt động của bạn trong quy trình duyệt</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`py-3 px-4 font-medium transition ${
                filter === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'all' && '📋 Tất cả'}
              {tab === 'pending' && '⏳ Chờ duyệt'}
              {tab === 'approved' && '✓ Đã duyệt'}
              {tab === 'rejected' && '✗ Từ chối'}
            </button>
          ))}
        </div>

        {/* Activities Grid */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
            <p className="text-gray-600 text-lg">Không có hoạt động nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{activity.title}</h3>
                      {getStatusBadge(activity.status)}
                    </div>
                    <p className="text-gray-600 mb-4">{activity.description}</p>

                    {/* Activity Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        {new Date(activity.date_time).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        {activity.location || 'Chưa xác định'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Users className="w-4 h-4 text-gray-500" />
                        {activity.class_count} lớp
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="w-4 h-4 text-gray-500" />
                        {activity.teacher_name}
                      </div>
                    </div>

                    {/* Timeline */}
                    {activity.submitted_at && (
                      <div className="mt-4 space-y-2 text-sm text-gray-600">
                        <div>
                          ⏳ Gửi duyệt: {new Date(activity.submitted_at).toLocaleString('vi-VN')}
                        </div>
                        {activity.status === 'approved' && activity.approved_at && (
                          <div className="text-green-600">
                            ✓ Đã duyệt: {new Date(activity.approved_at).toLocaleString('vi-VN')}
                          </div>
                        )}
                        {activity.status === 'rejected' && activity.rejected_at && (
                          <div className="text-red-600">
                            ✗ Từ chối: {new Date(activity.rejected_at).toLocaleString('vi-VN')}
                            {activity.rejection_reason && (
                              <div className="mt-1">Lý do: {activity.rejection_reason}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {activity.status === 'rejected' && (
                      <button
                        onClick={() => setSelectedActivity(activity)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-2 transition"
                      >
                        <Send className="w-4 h-4" />
                        Gửi lại
                      </button>
                    )}
                    {activity.status === 'pending_approval' && (
                      <button
                        onClick={() => setSelectedActivity(activity)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-medium flex items-center gap-2 transition"
                      >
                        <MessageSquare className="w-4 h-4" />
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

      {/* Resubmit Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {selectedActivity.status === 'rejected' ? 'Gửi lại duyệt' : 'Chi tiết hoạt động'}
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Hoạt động</p>
                <p className="font-medium">{selectedActivity.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Trạng thái hiện tại</p>
                <p className="font-medium">{getStatusBadge(selectedActivity.status)}</p>
              </div>
              {selectedActivity.rejection_reason && (
                <div className="p-3 bg-red-50 rounded border border-red-200">
                  <p className="text-sm font-medium text-red-700">Lý do từ chối:</p>
                  <p className="text-sm text-red-600 mt-1">{selectedActivity.rejection_reason}</p>
                </div>
              )}
              {selectedActivity.status === 'rejected' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    value={resubmitMessage}
                    onChange={(e) => setResubmitMessage(e.target.value)}
                    placeholder="Nhập ghi chú gửi lại..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedActivity(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Đóng
              </button>
              {selectedActivity.status === 'rejected' && (
                <button
                  onClick={() => handleResubmit(selectedActivity.id)}
                  disabled={resubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
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

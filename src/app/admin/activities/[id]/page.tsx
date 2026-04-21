'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Calendar,
  MapPin,
  Users,
  Award,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
  Download,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Activity {
  id: number;
  title: string;
  description: string | null;
  activity_type_id: number;
  activity_type_name: string;
  organization_level_id: number;
  organization_level_name: string;
  date_time: string;
  end_time: string;
  location: string | null;
  max_participants: number | null;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'completed' | 'cancelled';
  approval_status: 'draft' | 'requested' | 'approved' | 'rejected' | null;
  approval_notes: string | null;
  approved_by: number | null;
  approved_at: string | null;
  created_by: number;
  creator_name: string;
  created_at: string;
  updated_at: string;
}

interface Participant {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  class_name: string | null;
  registered_at: string;
  attendance_status: 'present' | 'absent' | 'registered' | 'not_participated' | null;
  achievement_level: 'excellent' | 'good' | 'average' | 'participated' | null;
  points_earned: number;
}

interface ApprovalHistory {
  id: number;
  status: string;
  status_label?: string;
  is_pending_request?: boolean;
  notes: string | null;
  changed_by: number;
  changed_by_name: string;
  changed_at: string;
}

export default function AdminActivityDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const activityId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'participants' | 'history'>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantStatusFilter, setParticipantStatusFilter] = useState<string>('all');
  const [participantClassFilter, setParticipantClassFilter] = useState<string>('all');
  const [participantPage, setParticipantPage] = useState(1);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const participantsPerPage = 10;

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user && activityId) {
      fetchActivity();
    }
  }, [user, authLoading, activityId]);

  useEffect(() => {
    setParticipantPage(1);
  }, [participantSearch, participantStatusFilter, participantClassFilter, activeTab]);

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

      const normalizedAttendance =
        participant.attendance_status === 'present'
          ? 'present'
          : participant.attendance_status === 'absent'
            ? 'absent'
            : 'registered';

      const matchesStatus =
        participantStatusFilter === 'all' || normalizedAttendance === participantStatusFilter;
      const matchesClass =
        participantClassFilter === 'all' || participant.class_name === participantClassFilter;

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [participants, participantSearch, participantStatusFilter, participantClassFilter]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const [activityRes, participantsRes, historyRes] = await Promise.all([
        fetch(`/api/admin/activities/${activityId}`),
        fetch(`/api/admin/activities/${activityId}/participants`),
        fetch(`/api/admin/activities/${activityId}/approval-history`),
      ]);

      if (!activityRes.ok) throw new Error('Không thể tải thông tin hoạt động');

      const activityData = await activityRes.json();
      setActivity(activityData.activity || activityData.data?.activity || null);

      if (participantsRes.ok) {
        const participantsData = await participantsRes.json();
        setParticipants(participantsData.participants || participantsData.data?.participants || []);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setApprovalHistory(historyData.history || historyData.data?.history || []);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      toast.error('Không thể tải thông tin hoạt động');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = (action: 'approve' | 'reject') => {
    setApprovalAction(action);
    setApprovalNotes('');
    setShowApprovalModal(true);
  };

  const submitApproval = async () => {
    if (approvalAction === 'reject' && !approvalNotes.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: approvalAction,
          notes: approvalNotes.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Không thể xử lý phê duyệt');

      toast.success(
        data.message ||
          (approvalAction === 'approve' ? 'Đã phê duyệt hoạt động' : 'Đã từ chối hoạt động')
      );
      setShowApprovalModal(false);
      fetchActivity();
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi xử lý phê duyệt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/activities/${activityId}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Không thể hủy hoạt động');

      toast.success(data.message || 'Đã hủy hoạt động');
      router.push('/admin/activities');
    } catch (error: any) {
      toast.error(error.message || 'Không thể hủy hoạt động');
    }
  };

  const exportParticipants = () => {
    if (participants.length === 0) {
      toast.error('Không có người tham gia để xuất');
      return;
    }

    const csv = [
      ['Tên', 'Email', 'Lớp', 'Ngày đăng ký', 'Điểm danh', 'Thành tích', 'Điểm'].join(','),
      ...participants.map((p) =>
        [
          p.user_name,
          p.user_email,
          p.class_name || '-',
          new Date(p.registered_at).toLocaleDateString('vi-VN'),
          p.attendance_status === 'present'
            ? 'Có mặt'
            : p.attendance_status === 'absent'
              ? 'Vắng'
              : 'Chưa tham gia',
          p.achievement_level || '-',
          p.points_earned || 0,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hoat-dong-${activityId}-nguoi-tham-gia-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${participants.length} người tham gia`);
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-gray-600">Không tìm thấy hoạt động</p>
          <button
            onClick={() => router.push('/admin/activities')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };

  const statusLabels = {
    draft: 'Nháp',
    pending: 'Chờ duyệt',
    published: 'Đã công bố',
    rejected: 'Bị từ chối',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  };

  const totalParticipantPages = Math.max(
    1,
    Math.ceil(filteredParticipants.length / participantsPerPage)
  );
  const paginatedParticipants = filteredParticipants.slice(
    (participantPage - 1) * participantsPerPage,
    participantPage * participantsPerPage
  );

  const getHistoryPresentation = (entry: ApprovalHistory) => {
    if (entry.status === 'approved') {
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        label: entry.status_label || 'Đã phê duyệt',
      };
    }

    if (entry.status === 'rejected') {
      return {
        icon: <XCircle className="w-5 h-5 text-red-600" />,
        label: entry.status_label || 'Đã từ chối',
      };
    }

    return {
      icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
      label: entry.status_label || 'Đã gửi duyệt',
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/activities')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại danh sách
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{activity.title}</h1>
              <p className="text-gray-600 mt-1">
                ID: {activity.id} | Tạo bởi: {activity.creator_name}
              </p>
            </div>

            <div className="flex gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[activity.status]}`}
              >
                {statusLabels[activity.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {(activity.approval_status === 'requested' || activity.status === 'pending') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Hoạt động này đang ở trạng thái chờ duyệt</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprovalAction('approve')}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Phê duyệt
              </button>
              <button
                onClick={() => handleApprovalAction('reject')}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Từ chối
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => router.push(`/admin/activities/${activityId}/edit`)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Chỉnh sửa
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa
            </button>
          </div>

          <ConfirmDialog
            isOpen={showDeleteConfirm}
            title="Xác nhận hủy hoạt động"
            message="Bạn có chắc chắn muốn hủy hoạt động này?"
            confirmText="Hủy hoạt động"
            cancelText="Hủy"
            variant="danger"
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={async () => {
              await handleDelete();
              setShowDeleteConfirm(false);
            }}
          />

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2 px-1 font-medium ${
                  activeTab === 'details'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Chi tiết
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`pb-2 px-1 font-medium ${
                  activeTab === 'participants'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Người tham gia ({participants.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2 px-1 font-medium ${
                  activeTab === 'history'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <History className="w-4 h-4 inline mr-2" />
                Lịch sử duyệt ({approvalHistory.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Thời gian
                  </label>
                  <p className="text-gray-900">
                    {new Date(activity.date_time).toLocaleString('vi-VN')} -{' '}
                    {new Date(activity.end_time).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Địa điểm
                  </label>
                  <p className="text-gray-900">{activity.location || 'Chưa xác định'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại hoạt động
                  </label>
                  <p className="text-gray-900">{activity.activity_type_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cấp tổ chức
                  </label>
                  <p className="text-gray-900">{activity.organization_level_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    Số lượng tối đa
                  </label>
                  <p className="text-gray-900">{activity.max_participants || 'Không giới hạn'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Ngày tạo
                  </label>
                  <p className="text-gray-900">
                    {new Date(activity.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {activity.description || 'Không có mô tả'}
                </p>
              </div>

              {activity.approval_notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-yellow-800 mb-2">
                    Ghi chú phê duyệt
                  </label>
                  <p className="text-yellow-900">{activity.approval_notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'participants' && (
            <div>
              <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Danh sách người tham gia ({participants.length})
                  </h3>
                  <p className="text-sm text-gray-500">
                    Hiển thị {filteredParticipants.length} kết quả phù hợp
                  </p>
                </div>
                <button
                  onClick={exportParticipants}
                  disabled={participants.length === 0}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Xuất CSV
                </button>
              </div>

              {participants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có người đăng ký</p>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        placeholder="Tìm theo tên hoặc email"
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <select
                        value={participantStatusFilter}
                        onChange={(e) => setParticipantStatusFilter(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Tất cả điểm danh</option>
                        <option value="present">Có mặt</option>
                        <option value="absent">Vắng</option>
                        <option value="registered">Chưa điểm danh</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={participantClassFilter}
                        onChange={(e) => setParticipantClassFilter(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">Tất cả lớp</option>
                        {participantClasses.map((className) => (
                          <option key={className} value={className}>
                            {className}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredParticipants.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Không có người tham gia phù hợp với bộ lọc hiện tại
                    </p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                Tên
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                Email
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                Lớp
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                Đăng ký
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                Điểm danh
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                Thành tích
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                                Điểm
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {paginatedParticipants.map((p) => (
                              <tr key={p.id}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {p.user_name}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{p.user_email}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{p.class_name || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {new Date(p.registered_at).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-4 py-3">
                                  {p.attendance_status === 'present' ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                      Có mặt
                                    </span>
                                  ) : p.attendance_status === 'absent' ? (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                      Vắng
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                      Đã đăng ký / chưa điểm danh
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {p.achievement_level || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                                  {p.points_earned || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
                        <div>
                          Hiển thị {(participantPage - 1) * participantsPerPage + 1}-
                          {Math.min(participantPage * participantsPerPage, filteredParticipants.length)} /{' '}
                          {filteredParticipants.length} người tham gia phù hợp
                        </div>
                        {totalParticipantPages > 1 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setParticipantPage((page) => Math.max(1, page - 1))}
                              disabled={participantPage === 1}
                              className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                            >
                              ← Trước
                            </button>
                            <span>
                              Trang {participantPage}/{totalParticipantPages}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setParticipantPage((page) => Math.min(totalParticipantPages, page + 1))
                              }
                              disabled={participantPage === totalParticipantPages}
                              className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Tiếp →
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Lịch sử phê duyệt ({approvalHistory.length})
              </h3>

              {approvalHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có lịch sử phê duyệt</p>
              ) : (
                <div className="space-y-4">
                  {approvalHistory.map((h) => (
                    <div key={h.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        {getHistoryPresentation(h).icon}
                        <span className="font-medium text-gray-900">
                          {getHistoryPresentation(h).label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Bởi: {h.changed_by_name} | {new Date(h.changed_at).toLocaleString('vi-VN')}
                      </p>
                      {h.notes && (
                        <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                          {h.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {approvalAction === 'approve' ? 'Phê duyệt hoạt động' : 'Từ chối hoạt động'}
            </h3>

            <p className="text-gray-600 mb-4">
              {approvalAction === 'approve'
                ? 'Xác nhận phê duyệt hoạt động này? Hoạt động sẽ được hiển thị cho học viên đăng ký.'
                : 'Vui lòng nhập lý do từ chối hoạt động này.'}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú {approvalAction === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={
                  approvalAction === 'approve' ? 'Ghi chú (tùy chọn)' : 'Lý do từ chối (bắt buộc)'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={submitApproval}
                disabled={submitting}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:bg-gray-300`}
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  IdCard,
  Calendar,
  Edit,
  Lock,
  Award,
  TrendingUp,
  Activity,
  MapPin,
  User,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getRoleBadgeClass, getRoleLabel } from '../roles';

interface UserDetail {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: number;
  avatar_url?: string;
  student_code?: string;
  phone?: string;
  class_id?: number;
  class_name?: string;
  year?: string;
  created_at: string;
  gender?: string;
  date_of_birth?: string;
  citizen_id?: string;
  province?: string;
  district?: string;
  ward?: string;
  address_detail?: string;
  stats: {
    total_activities: number;
    excellent_count: number;
    good_count: number;
    total_points: number;
    completed_activities: number;
  };
  recentActivities: UserRecentActivity[];
  awards: UserAward[];
}

type PendingUserAction = 'reset-password' | 'toggle-status' | 'delete-user';

type UserRecentActivity = {
  id: number;
  title: string;
  date_time: string;
  achievement_level?: string | null;
  points: number;
};

type UserAward = {
  id: number;
  title: string;
  description?: string | null;
  award_type?: string | null;
  awarded_at: string;
  points_awarded: number;
};

export default function UserDetailPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null);

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      void fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, loading, router]);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const userData = data.data as Partial<UserDetail>;
        setUser({
          ...(userData as UserDetail),
          recentActivities: Array.isArray(userData.recentActivities) ? userData.recentActivities : [],
          awards: Array.isArray(userData.awards) ? userData.awards : [],
        });
      } else {
        throw new Error('Không tìm thấy người dùng');
      }
    } catch (_error) {
      console.error('Lỗi tải dữ liệu người dùng:', _error);
      toast.error('Không thể tải thông tin người dùng');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const handleResetPassword = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Mật khẩu mới: ${data.data.temporaryPassword}`);
        // Show password in a better way
        toast.success('Mật khẩu đã được reset!');
        // Copy to clipboard
        navigator.clipboard.writeText(data.data.temporaryPassword);
        toast.success(`Mật khẩu tạm thời: ${data.data.temporaryPassword} (đã copy vào clipboard)`, {
          duration: 8000,
        });
      } else {
        toast.error(data.error || 'Không thể đặt lại mật khẩu');
      }
    } catch (_error) {
      toast.error('Lỗi đặt lại mật khẩu');
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Không thể xóa người dùng');
      }

      toast.success('Đã xóa người dùng thành công');
      router.push('/admin/users');
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi xóa người dùng');
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Không thể chuyển trạng thái tài khoản');
      }

      const data = await response.json();
      toast.success(data.message);

      // Reload user data
      void fetchUserData();
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi cập nhật trạng thái');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Không tìm thấy người dùng</div>
      </div>
    );
  }

  const getRoleColor = (role: string) => getRoleBadgeClass(role);
  const getRoleDisplay = (role: string) => getRoleLabel(role);

  const getAchievementColor = (level: string) => {
    const colors: Record<string, string> = {
      Excellent: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      Good: 'text-blue-600 bg-blue-50 border-blue-200',
      Participated: 'text-gray-600 bg-gray-50 border-gray-200',
    };
    return colors[level] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    switch (pendingAction) {
      case 'reset-password':
        await handleResetPassword();
        break;
      case 'toggle-status':
        await handleToggleStatus();
        break;
      case 'delete-user':
        await handleDelete();
        break;
      default:
        break;
    }

    setPendingAction(null);
  };

  const confirmConfig =
    pendingAction === 'reset-password'
      ? {
          title: 'Đặt lại mật khẩu',
          message: `Bạn có chắc muốn đặt lại mật khẩu cho "${user.full_name}"? Mật khẩu tạm thời mới sẽ được tạo ngay sau khi xác nhận.`,
          confirmText: 'Đặt lại',
          variant: 'warning' as const,
        }
      : pendingAction === 'toggle-status'
        ? {
            title: user.is_active ? 'Vô hiệu hóa người dùng' : 'Kích hoạt người dùng',
            message: `Bạn có chắc chắn muốn ${
              user.is_active ? 'vô hiệu hóa' : 'kích hoạt'
            } người dùng "${user.full_name}"?`,
            confirmText: user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt',
            variant: 'warning' as const,
          }
        : {
            title: 'Xóa người dùng',
            message: `Bạn có chắc chắn muốn xóa người dùng "${user.full_name}"? Đây là xóa mềm, dữ liệu vẫn sẽ được lưu trong hệ thống.`,
            confirmText: 'Xóa người dùng',
            variant: 'danger' as const,
          };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/admin/users"
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại danh sách
          </Link>
          <div className="flex gap-3">
            <Link
              href={`/admin/users/${params.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Chỉnh sửa
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center">{user.full_name}</h2>
                <p className="text-gray-600 text-sm mt-1">{user.email}</p>
              </div>

              {/* Role Badge */}
              <div className="mb-6 flex flex-col items-center gap-2">
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}
                >
                  {getRoleDisplay(user.role)}
                </span>
                {/* Status Badge */}
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.is_active ? '✓ Đang hoạt động' : '✕ Đã vô hiệu hóa'}
                </span>
              </div>

              {/* Quick Stats */}
              <div className="mb-6 space-y-3 border-t border-b py-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Hoạt động tham gia</span>
                  <span className="font-semibold text-gray-900">{user.stats.total_activities}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Hoạt động hoàn thành</span>
                  <span className="font-semibold text-green-600">
                    {user.stats.completed_activities}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tổng điểm</span>
                  <span className="font-bold text-blue-600 text-lg">
                    {user.stats.total_points || 0}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => setPendingAction('toggle-status')}
                  className={`w-full flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${
                    user.is_active
                      ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                      : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                </button>
                <button
                  onClick={() => setPendingAction('reset-password')}
                  className="w-full flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <Lock className="w-4 h-4" />
                  Đặt lại mật khẩu
                </button>
                <Link
                  href={`/admin/users/${user.id}/logs`}
                  className="w-full flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <Activity className="w-4 h-4" />
                  Xem lịch sử hoạt động
                </Link>
                <button
                  onClick={() => setPendingAction('delete-user')}
                  className="w-full flex items-center gap-2 px-4 py-2 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa người dùng
                </button>
              </div>
            </div>
          </div>

          {/* Right - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {user.stats.total_activities}
                </div>
                <div className="text-xs text-gray-600 mt-1">Tổng hoạt động</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {user.stats.completed_activities}
                </div>
                <div className="text-xs text-gray-600 mt-1">Đã hoàn thành</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{user.stats.excellent_count}</div>
                <div className="text-xs text-gray-600 mt-1">Xuất sắc</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {user.stats.total_points || 0}
                </div>
                <div className="text-xs text-gray-600 mt-1">Tổng điểm</div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <User className="w-5 h-5" />
                Thông tin cá nhân
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Họ và tên</label>
                  <div className="text-gray-900">{user.full_name}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Tên đăng nhập
                  </label>
                  <div className="text-gray-900">{user.username}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email
                  </label>
                  <div className="text-gray-900">{user.email}</div>
                </div>

                {user.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      Điện thoại
                    </label>
                    <div className="text-gray-900">{user.phone}</div>
                  </div>
                )}

                {user.student_code && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-gray-400" />
                      Mã học viên
                    </label>
                    <div className="text-gray-900">{user.student_code}</div>
                  </div>
                )}

                {user.gender && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Giới tính
                    </label>
                    <div className="text-gray-900">
                      {user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác'}
                    </div>
                  </div>
                )}

                {user.date_of_birth && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Ngày sinh
                    </label>
                    <div className="text-gray-900">{formatDate(user.date_of_birth)}</div>
                  </div>
                )}

                {user.citizen_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      CCCD/CMND
                    </label>
                    <div className="text-gray-900">{user.citizen_id}</div>
                  </div>
                )}
              </div>

              {/* Address */}
              {(user.province || user.address_detail) && (
                <div className="mt-6 pt-6 border-t">
                  <label className="block text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Địa chỉ
                  </label>
                  <div className="text-gray-900">
                    {user.address_detail && <div>{user.address_detail}</div>}
                    {(user.ward || user.district || user.province) && (
                      <div className="text-gray-600 mt-1">
                        {[user.ward, user.district, user.province].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Thông tin tài khoản</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Vai trò</label>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}
                  >
                    {getRoleDisplay(user.role)}
                  </span>
                </div>

                {user.class_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Lớp học</label>
                    <Link
                      href={`/admin/classes/${user.class_id}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {user.class_name} {user.year && `(${user.year})`}
                    </Link>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Ngày tạo tài khoản
                  </label>
                  <div className="text-gray-900">{formatDate(user.created_at)}</div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            {user.recentActivities && user.recentActivities.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Hoạt động gần đây
                </h3>
                <div className="space-y-3">
                  {user.recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <Link
                          href={`/admin/activities/${activity.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {activity.title}
                        </Link>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span>{formatDate(activity.date_time)}</span>
                          {activity.achievement_level && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium border ${getAchievementColor(activity.achievement_level)}`}
                            >
                              {activity.achievement_level}
                            </span>
                          )}
                        </div>
                      </div>
                      {activity.points > 0 && (
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-blue-600">+{activity.points}</div>
                          <div className="text-xs text-gray-500">điểm</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Link
                  href={`/admin/users/${user.id}/activities`}
                  className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Xem tất cả hoạt động →
                </Link>
              </div>
            )}

            {/* Awards */}
            {user.awards && user.awards.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  Giải thưởng
                </h3>
                <div className="space-y-3">
                  {user.awards.map((award) => (
                    <div
                      key={award.id}
                      className="flex items-start justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{award.title}</div>
                        {award.description && (
                          <div className="text-sm text-gray-600 mt-1">{award.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          {award.award_type && (
                            <span className="px-2 py-0.5 bg-yellow-100 rounded">
                              {award.award_type}
                            </span>
                          )}
                          <span>{formatDate(award.awarded_at)}</span>
                        </div>
                      </div>
                      {award.points_awarded > 0 && (
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-yellow-600">
                            +{award.points_awarded}
                          </div>
                          <div className="text-xs text-gray-500">điểm</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText="Hủy"
        variant={confirmConfig.variant}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </div>
  );
}

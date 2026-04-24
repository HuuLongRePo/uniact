'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatVietnamDateTime } from '@/lib/timezone';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
  class_id?: number;
  class_name?: string;
  activity_count: number;
  total_points: number;
  created_at: string;
  gender?: string;
  date_of_birth?: string;
  province?: string;
  district?: string;
  ward?: string;
  address_detail?: string;
}

export default function StudentProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/me');
      const data = await response.json();

      if (response.ok) {
        setProfile(data.user);
        setFormData({
          name: data.user.name,
          email: data.user.email,
        });
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Cập nhật thông tin thành công');
        setEditing(false);
        fetchProfile();
      } else {
        toast.error(data.error || 'Cập nhật thất bại');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Lỗi khi cập nhật thông tin');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Đổi mật khẩu thành công');
        setShowPasswordModal(false);
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      } else {
        toast.error(data.error || 'Đổi mật khẩu thất bại');
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('Lỗi khi đổi mật khẩu');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return <div className="text-center py-12">Không tìm thấy thông tin</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">👤 Hồ Sơ Cá Nhân</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Avatar & Stats */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-32 h-32 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center text-6xl">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                '👨‍🎓'
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2">{profile.name}</h2>
            <p className="text-gray-600 mb-4">{profile.email}</p>
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
              Học viên
            </span>

            <div className="mt-6 space-y-3">
              <div className="bg-green-50 p-4 rounded">
                <div className="text-3xl font-bold text-green-600">{profile.total_points || 0}</div>
                <div className="text-sm text-gray-600">Tổng điểm</div>
              </div>
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-3xl font-bold text-blue-600">{profile.activity_count}</div>
                <div className="text-sm text-gray-600">Hoạt động tham gia</div>
              </div>
              {profile.class_name && (
                <div className="bg-purple-50 p-4 rounded">
                  <div className="text-lg font-bold text-purple-600">{profile.class_name}</div>
                  <div className="text-sm text-gray-600">Lớp</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="mt-6 w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              🔒 Đổi mật khẩu
            </button>
          </div>
        </div>

        {/* Right: Details & Edit */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Thông Tin Chi Tiết</h3>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  ✏️ Chỉnh sửa
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({ name: profile.name, email: profile.email });
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  ✖️ Hủy
                </button>
              )}
            </div>

            {!editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                  <div className="text-lg">{profile.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="text-lg">{profile.email}</div>
                </div>
                {profile.gender && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giới tính
                    </label>
                    <div className="text-lg">{profile.gender === 'nam' ? 'Nam' : 'Nữ'}</div>
                  </div>
                )}
                {profile.date_of_birth && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày sinh
                    </label>
                    <div className="text-lg">
                      {formatVietnamDateTime(profile.date_of_birth, 'date')}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label>
                  <div className="text-lg">{profile.class_name || 'Chưa có'}</div>
                </div>
                {(profile.province ||
                  profile.district ||
                  profile.ward ||
                  profile.address_detail) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                    <div className="text-lg">
                      {[profile.address_detail, profile.ward, profile.district, profile.province]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày tham gia
                  </label>
                  <div className="text-lg">
                    {formatVietnamDateTime(profile.created_at, 'date')}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  💾 Lưu thay đổi
                </button>
              </form>
            )}
          </div>

          {/* Activity History */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-xl font-bold mb-4">📊 Thống Kê</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{profile.activity_count}</div>
                <div className="text-sm text-gray-600">Hoạt động tham gia</div>
              </div>
              <div className="border rounded p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{profile.total_points || 0}</div>
                <div className="text-sm text-gray-600">Tổng điểm tích lũy</div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => router.push('/student/my-activities')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Xem lịch sử hoạt động chi tiết →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">🔒 Đổi Mật Khẩu</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, current_password: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new_password: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirm_password: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Đổi mật khẩu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({
                      current_password: '',
                      new_password: '',
                      confirm_password: '',
                    });
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

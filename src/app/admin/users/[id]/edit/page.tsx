'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROLE_OPTIONS } from '../../roles';
import { User } from '../../types';

type ClassOption = {
  id: number;
  name: string;
};

type UserEditFormData = {
  username: string;
  full_name: string;
  email: string;
  role: string;
  class_id: number | null;
  teaching_class_id: number | null;
  phone: string;
  gender: string;
  date_of_birth: string;
  citizen_id: string;
  province: string;
  district: string;
  ward: string;
  address_detail: string;
  address: string;
  teacher_rank: string;
  academic_title: string;
  academic_degree: string;
};

export default function UserEditPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserEditFormData>({
    username: '',
    full_name: '',
    email: '',
    role: 'student',
    class_id: null,
    teaching_class_id: null,
    phone: '',
    gender: '',
    date_of_birth: '',
    citizen_id: '',
    province: '',
    district: '',
    ward: '',
    address_detail: '',
    address: '',
    teacher_rank: '',
    academic_title: '',
    academic_degree: '',
  });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      (async () => {
        setIsLoading(true);
        try {
          await Promise.all([fetchUserData(), fetchClasses()]);
        } finally {
          setIsLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, loading, router]);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const userData = data.data as User;
        setUser(userData);
        setFormData({
          username: userData.username ?? '',
          full_name: userData.full_name ?? '',
          email: userData.email ?? '',
          role: userData.role ?? 'student',
          class_id: userData.class_id ?? null,
          teaching_class_id: userData.teaching_class_id ?? null,
          phone: userData.phone ?? '',
          gender: userData.gender ?? '',
          date_of_birth: userData.date_of_birth ?? '',
          citizen_id: userData.citizen_id ?? '',
          province: userData.province ?? '',
          district: userData.district ?? '',
          ward: userData.ward ?? '',
          address_detail: userData.address_detail ?? '',
          address: userData.address ?? '',
          teacher_rank: userData.teacher_rank ?? '',
          academic_title: userData.academic_title ?? '',
          academic_degree: userData.academic_degree ?? '',
        });
      } else if (res.status === 404) {
        setUser(null);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Không thể tải dữ liệu người dùng');
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu người dùng:', error);
    }
  }, [userId]);

  const fetchClasses = useCallback(async () => {
    try {
      // Admin edit page: use admin classes endpoint (fresh DB view, no in-memory cache)
      const params = new URLSearchParams({ page: '1', limit: '1000' });
      const res = await fetch(`/api/admin/classes?${params}`);
      if (res.ok) {
        const data = await res.json();
        const classData = data?.data ?? [];
        if (Array.isArray(classData)) {
          setClasses(classData as ClassOption[]);
        }
      }
    } catch (error) {
      console.error('Lỗi tải danh sách lớp:', error);
    }
  }, []);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'class_id' || name === 'teaching_class_id'
          ? value
            ? parseInt(value)
            : null
          : value,
    }));
  };

  const handleSave = async () => {
    if (!formData.username || !formData.full_name || !formData.email) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Cập nhật người dùng thành công');
        router.push(`/admin/users/${userId}`);
      } else {
        throw new Error('Cập nhật thất bại');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsSaving(false);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href={`/admin/users/${params.id}`}
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại chi tiết
          </Link>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Chỉnh sửa thông tin người dùng</h1>
          <p className="text-gray-600 mb-8">
            ID: {userId} | {user.email}
          </p>

          <div className="space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Thông tin cơ bản
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên đăng nhập"
                    required
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập họ và tên"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập email"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="09xxxxxxxx"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mã</label>
                  <input
                    type="text"
                    value={user.code || ''}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                    placeholder="(Chưa có)"
                  />
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Thông tin tài khoản
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class - Students */}
                {(formData.role === 'student' || formData.role === 'class_manager') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lớp học</label>
                    <select
                      name="class_id"
                      value={formData.class_id || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Class - Teachers */}
                {formData.role === 'teacher' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lớp phụ trách
                    </label>
                    <select
                      name="teaching_class_id"
                      value={formData.teaching_class_id || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn lớp phụ trách --</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Thông tin cá nhân
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Teacher-specific */}
                {formData.role === 'teacher' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cấp bậc
                      </label>
                      <input
                        type="text"
                        name="teacher_rank"
                        value={formData.teacher_rank}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ví dụ: Thượng tá"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Học hàm
                      </label>
                      <input
                        type="text"
                        name="academic_title"
                        value={formData.academic_title}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ví dụ: PGS"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Học vị</label>
                      <input
                        type="text"
                        name="academic_degree"
                        value={formData.academic_degree}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ví dụ: Tiến sĩ"
                      />
                    </div>
                  </>
                )}

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn giới tính --</option>
                    <option value="nam">Nam</option>
                    <option value="nữ">Nữ</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Citizen ID */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">CCCD/CMND</label>
                  <input
                    type="text"
                    name="citizen_id"
                    value={formData.citizen_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập số CCCD/CMND"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Địa chỉ</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tỉnh/Thành</label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Hà Nội"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quận/Huyện</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Thanh Xuân"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phường/Xã</label>
                  <input
                    type="text"
                    name="ward"
                    value={formData.ward}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Phương Liệt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Địa chỉ chi tiết
                  </label>
                  <input
                    type="text"
                    name="address_detail"
                    value={formData.address_detail}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Số nhà, đường, thôn/xóm..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Địa chỉ (tổng hợp)
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập địa chỉ"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <Link
                href={`/admin/users/${params.id}`}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Hủy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { User } from './types';
import toast from 'react-hot-toast';
import { ROLE_OPTIONS } from './roles';

interface UserDialogProps {
  isOpen: boolean;
  user: User | null;
  initialRole?: string;
  onClose: () => void;
  onSave: (userData: any) => Promise<void>;
  loading: boolean;
}

export default function UserDialog({
  isOpen,
  user,
  initialRole,
  onClose,
  onSave,
  loading,
}: UserDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    phone: '',
    role: initialRole || 'student',
    student_code: '',
    class_id: '',
    teaching_class_id: '',
    teacher_rank: '',
    academic_title: '',
    academic_degree: '',
    gender: '',
    date_of_birth: '',
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [resetPassword, setResetPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset or populate form data
      if (user) {
        setFormData({
          email: user.email || '',
          username: user.username || '',
          full_name: user.full_name || '',
          password: '',
          phone: user.phone || '',
          role: user.role || 'student',
          student_code: user.student_code || '',
          class_id: user.class_id?.toString() || '',
          teaching_class_id: user.teaching_class_id?.toString() || '',
          teacher_rank: user.teacher_rank || '',
          academic_title: user.academic_title || '',
          academic_degree: user.academic_degree || '',
          gender: user.gender || '',
          date_of_birth: user.date_of_birth || '',
        });
      } else {
        setFormData({
          email: '',
          username: '',
          full_name: '',
          password: '',
          phone: '',
          role: initialRole || 'student',
          student_code: '',
          class_id: '',
          teaching_class_id: '',
          teacher_rank: '',
          academic_title: '',
          academic_degree: '',
          gender: '',
          date_of_birth: '',
        });
      }
      setResetPassword(false);
      fetchClasses();

      // For edit: fetch full user details to ensure teacher fields and teaching class are populated.
      if (user?.id) {
        fetchUserDetails(user.id);
      }
    }
  }, [isOpen, user, initialRole]);

  const fetchUserDetails = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.success || !data?.data) return;

      const u = data.data as any;
      setFormData((prev) => ({
        ...prev,
        email: u.email ?? prev.email,
        username: u.username ?? prev.username,
        full_name: u.full_name ?? prev.full_name,
        role: u.role || prev.role,
        phone: u.phone ?? prev.phone,
        gender: u.gender ?? prev.gender,
        date_of_birth: u.date_of_birth ?? prev.date_of_birth,
        student_code: u.student_code ?? prev.student_code,
        class_id: u.class_id?.toString?.() || '',
        teaching_class_id: u.teaching_class_id?.toString?.() || '',
        teacher_rank: u.teacher_rank || '',
        academic_title: u.academic_title || '',
        academic_degree: u.academic_degree || '',
      }));
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '1000' });
      const res = await fetch(`/api/admin/classes?${params}`);
      const data = await res.json().catch(() => ({}));
      if (data?.success) setClasses(data.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.data?.new_password) {
        const newPassword = data.data.new_password;
        toast.success(`Mật khẩu mới: ${newPassword}`, { duration: 10000 });
        navigator.clipboard.writeText(newPassword);
        toast.success('Đã copy mật khẩu vào clipboard', { duration: 3000 });
        setResetPassword(false);
      } else {
        toast.error(data.error || 'Không thể reset mật khẩu');
      }
    } catch (error) {
      toast.error('Lỗi khi reset mật khẩu');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizeIntOrNull = (value: any) => {
      if (value === '' || value === null || value === undefined) return null;
      const n = parseInt(String(value), 10);
      return Number.isFinite(n) ? n : null;
    };

    await onSave({
      ...formData,
      student_code: formData.role === 'student' ? formData.student_code || null : null,
      class_id: normalizeIntOrNull(formData.class_id),
      teaching_class_id: normalizeIntOrNull(formData.teaching_class_id),
    });
  };

  const isRoleLocked = Boolean(initialRole) && !user;
  const needsClassSelection = formData.role === 'student' || formData.role === 'class_manager';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {user ? 'Chỉnh Sửa Người Dùng' : 'Thêm Người Dùng Mới'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vai Trò *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
                disabled={isRoleLocked}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên Đăng Nhập *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Họ Tên *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium mb-1">Mật Khẩu *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>
          )}

          {user && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">Reset Mật Khẩu</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Tạo mật khẩu ngẫu nhiên mới cho người dùng
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  🔑 Reset Mật Khẩu
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Điện Thoại</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Giới Tính</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">-- Chọn --</option>
                <option value="nam">Nam</option>
                <option value="nữ">Nữ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ngày Sinh</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {formData.role === 'student' && user ? (
              <div>
                <label className="block text-sm font-medium mb-1">Mã Học Viên</label>
                <input
                  type="text"
                  value={formData.student_code}
                  onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Hệ thống tự sinh"
                />
              </div>
            ) : null}

            {needsClassSelection && (
              <div>
                <label className="block text-sm font-medium mb-1">Lớp</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.grade})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.role === 'teacher' && (
              <div>
                <label className="block text-sm font-medium mb-1">Lớp Phụ Trách</label>
                <select
                  value={formData.teaching_class_id}
                  onChange={(e) => setFormData({ ...formData, teaching_class_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.grade})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {formData.role === 'teacher' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cấp Bậc</label>
                <input
                  type="text"
                  value={formData.teacher_rank}
                  onChange={(e) => setFormData({ ...formData, teacher_rank: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ví dụ: Thượng tá"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Học Hàm</label>
                <input
                  type="text"
                  value={formData.academic_title}
                  onChange={(e) => setFormData({ ...formData, academic_title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ví dụ: PGS"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Học Vị</label>
                <input
                  type="text"
                  value={formData.academic_degree}
                  onChange={(e) => setFormData({ ...formData, academic_degree: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ví dụ: Tiến sĩ"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

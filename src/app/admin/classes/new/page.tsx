'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

interface Teacher {
  id: number;
  name: string;
  email: string;
}

export default function NewClassPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    description: '',
    teacher_id: '',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchTeachers();
    }
  }, [user, authLoading, router]);

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=teacher&page=1&limit=1000');
      const data = await response.json();

      if (response.ok) {
        const list = (data.data || []) as any[];
        setTeachers(
          list.map((t) => ({
            id: t.id,
            name: t.full_name || t.name,
            email: t.email,
          }))
        );
      }
    } catch (error) {
      console.error('Fetch teachers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Tạo lớp học thành công');
        router.push('/admin/classes');
      } else {
        toast.error(data.error || 'Tạo lớp học thất bại');
      }
    } catch (error) {
      console.error('Create class error:', error);
      toast.error('Lỗi khi tạo lớp học');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">➕ Thêm Lớp Học Mới</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên lớp <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Lớp K65A1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khối <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="VD: K65, K66, K67..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giảng viên chủ nhiệm
              </label>
              <select
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn giảng viên --</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Có thể để trống và chọn sau</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả về lớp học..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded font-medium disabled:bg-gray-300"
              >
                {submitting ? 'Đang tạo...' : 'Tạo lớp học'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border rounded hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

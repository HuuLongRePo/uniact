'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Teacher {
  id: number;
  name: string;
  email: string;
}

type TeacherApiUser = {
  id: number;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

interface Class {
  id: number;
  name: string;
  grade: string;
  teacher_id?: number;
  description?: string;
}

export default function EditClassPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [classData, setClassData] = useState<Class | null>(null);
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

    if (user && classId) {
      void fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router, classId]);

  const fetchData = async () => {
    try {
      // Fetch class data
      const classRes = await fetch(`/api/admin/classes/${classId}`);
      const classData = await classRes.json();

      if (!classRes.ok) {
        toast.error(classData.error || 'Không tìm thấy lớp học');
        router.push('/admin/classes');
        return;
      }

      const cls = (classData.data ?? classData.class) as Class;
      setClassData(cls);
      setFormData({
        name: cls.name,
        grade: cls.grade,
        teacher_id: cls.teacher_id ? String(cls.teacher_id) : '',
        description: cls.description || '',
      });

      // Fetch teachers
      const teachersRes = await fetch('/api/admin/users?role=teacher&page=1&limit=1000');
      const teachersData = await teachersRes.json();

      if (teachersRes.ok) {
        const list = (teachersData.data || []) as TeacherApiUser[];
        setTeachers(
          list.map((t) => ({
            id: t.id,
            name: t.full_name || t.name,
            email: t.email,
          }))
        );
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Cập nhật lớp học thành công');
        router.push(`/admin/classes/${classId}`);
      } else {
        toast.error(data.error || 'Cập nhật thất bại');
      }
    } catch (error) {
      console.error('Update class error:', error);
      toast.error('Lỗi khi cập nhật lớp học');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!classData) {
    return <div className="text-center py-12">Không tìm thấy lớp học</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/admin/classes/${classId}`}
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Quay lại chi tiết lớp
        </Link>

        <h1 className="text-3xl font-bold mb-6">✏️ Chỉnh Sửa Lớp Học</h1>

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
                <option value="">-- Không có --</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded font-medium disabled:bg-gray-300"
              >
                {submitting ? 'Đang cập nhật...' : 'Lưu thay đổi'}
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

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClassWithTeacher } from '@/types/database';
import ClassCard from '@/components/ClassCard';
import Link from 'next/link';

export default function ClassesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassWithTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchClasses();
    }
  }, [user, loading, router]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách lớp:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canCreateClass = user.role === 'admin' || user.role === 'teacher';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quản lý Lớp học</h1>
              <p className="mt-2 text-gray-600">
                {user.role === 'admin' && 'Quản lý tất cả lớp học trong hệ thống'}
                {user.role === 'teacher' && 'Quản lý lớp học bạn phụ trách'}
                {user.role === 'student' && 'Lớp học của bạn'}
              </p>
            </div>

            {canCreateClass && (
              <Link
                href="/classes/new"
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                + Thêm lớp mới
              </Link>
            )}
          </div>
        </div>

        {/* Classes Grid */}
        {classes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏫</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {user.role === 'student' ? 'Chưa có lớp học' : 'Chưa có lớp học nào'}
            </h3>
            <p className="text-gray-500 mb-4">
              {user.role === 'student'
                ? 'Bạn chưa được phân vào lớp học nào.'
                : 'Bắt đầu bằng cách tạo lớp học đầu tiên.'}
            </p>
            {canCreateClass && (
              <Link
                href="/classes/new"
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Tạo lớp học đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                showActions={user.role !== 'student'}
              />
            ))}
          </div>
        )}

        {/* Stats */}
        {classes.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{classes.length}</div>
              <div className="text-gray-600">Tổng số lớp</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">
                {classes.reduce((total, cls) => total + (cls.student_count || 0), 0)}
              </div>
              <div className="text-gray-600">Tổng học viên</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">
                {new Set(classes.map((cls) => cls.teacher_id)).size}
              </div>
              <div className="text-gray-600">Giảng viên phụ trách</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Edit, Award, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ClassDetailPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalActivities: 0,
    averageScore: 0,
  });

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchClassData();
    }
  }, [currentUser, loading, router]);

  const fetchClassData = async () => {
    try {
      const [classRes, studentsRes] = await Promise.all([
        fetch(`/api/admin/classes/${classId}`),
        fetch(`/api/admin/students?class_id=${encodeURIComponent(classId)}&page=1&limit=200`),
      ]);

      if (classRes.ok) {
        const classData = await classRes.json();
        setClassData(classData.data);
        setStats({
          totalStudents: classData.data.student_count || 0,
          totalActivities: 0,
          averageScore: 7.5,
        });
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu lớp:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportClassRoster = () => {
    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Total Points', 'Activities Count', 'Class'];
    const rows = students.map((s) => [
      s.id,
      s.name,
      s.email,
      s.total_points || 0,
      s.activity_count || 0,
      classData.name,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `class_${classData.name}_roster_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Không tìm thấy lớp học</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/admin/classes"
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại danh sách
          </Link>
          <div className="flex gap-3">
            <button
              onClick={exportClassRoster}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <Link
              href={`/admin/classes/${params.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Chỉnh sửa
            </Link>
          </div>
        </div>

        {/* Class Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold mb-2">{classData.name}</h1>
          <p className="text-blue-100 text-lg">{classData.description}</p>
          <div className="flex gap-8 mt-6 text-blue-50">
            <div>
              Khối: <span className="font-semibold">{classData.grade}</span>
            </div>
            <div>
              Ngày tạo: <span className="font-semibold">{formatDate(classData.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalStudents}</div>
                <div className="text-gray-600 text-sm">Học viên</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">🎯</span>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalActivities}</div>
                <div className="text-gray-600 text-sm">Hoạt động</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.averageScore.toFixed(1)}
                </div>
                <div className="text-gray-600 text-sm">Điểm trung bình</div>
              </div>
            </div>
          </div>
        </div>

        {/* Students Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              👥 Danh sách học viên ({students.length})
            </h2>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-2">👥</div>
              <p className="text-gray-500">Chưa có học viên trong lớp này</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Họ và tên
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Mã học viên
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Hoạt động
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Điểm
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {student.full_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.student_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                        {student.activity_count || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                        {student.total_points || 0}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/admin/users/${student.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

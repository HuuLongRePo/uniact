'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ArrowLeft, Users, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

type ClassStudent = {
  id: number;
  name: string;
  email: string;
  created_at?: string;
  activity_count?: number;
  total_points?: number;
};

type ClassDetail = {
  id: number;
  name: string;
  grade?: string;
  description?: string;
  teacher_id?: number | null;
  teacher?: { id: number; name: string; email: string };
  student_count?: number;
  students?: ClassStudent[];
};

export default function ClassDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && id) fetchClass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, id]);

  const fetchClass = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/classes/${id}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || 'Không thể tải thông tin lớp học');
        setClassData(null);
        return;
      }

      setClassData(data.class);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tải dữ liệu');
      setClassData(null);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:underline inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </button>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-lg font-semibold text-gray-900">Không tìm thấy lớp học</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:underline inline-flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
              {classData.grade && (
                <div className="text-sm text-gray-600 mt-1">Khối/Lớp: {classData.grade}</div>
              )}
              {classData.description && (
                <div className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">
                  {classData.description}
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-2 text-gray-700">
                <Users className="w-4 h-4" />
                <span className="font-semibold">
                  {classData.student_count ?? classData.students?.length ?? 0}
                </span>
                <span>học viên</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-gray-700">
            <GraduationCap className="w-4 h-4" />
            <span className="font-medium">Giảng viên:</span>
            <span>
              {classData.teacher?.name
                ? `${classData.teacher.name} (${classData.teacher.email})`
                : 'Chưa phân công'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="text-lg font-semibold text-gray-900">Danh sách học viên</div>
          </div>

          {!classData.students || classData.students.length === 0 ? (
            <div className="p-6 text-gray-600">Chưa có học viên trong lớp.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Học viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Hoạt động
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tổng điểm
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {classData.students.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{s.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{s.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-right">
                        {s.activity_count ?? 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-right">
                        {s.total_points ?? 0}
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

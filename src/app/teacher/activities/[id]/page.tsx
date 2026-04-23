'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ArrowLeft, Users, ClipboardCheck, FileText, QrCode, Pencil, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

type Activity = {
  id: number;
  title: string;
  date_time?: string;
  status?: string;
  approval_status?: string;
};

export default function TeacherActivityOverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'teacher' && user.role !== 'admin') {
      toast.error('Chỉ giảng viên mới có quyền truy cập trang này');
      router.push('/teacher/dashboard');
      return;
    }

    if (user && id) {
      fetchActivity();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, id]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/activities/${id}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || 'Không thể tải thông tin hoạt động');
        setActivity(null);
        return;
      }

      setActivity(data.activity);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi tải dữ liệu');
      setActivity(null);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:underline inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </button>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-lg font-semibold text-gray-900">Không tìm thấy hoạt động</div>
          </div>
        </div>
      </div>
    );
  }

  const title = activity.title || `Hoạt động #${activity.id}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:underline inline-flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="text-2xl font-bold text-gray-900">{title}</div>
          {activity.date_time && (
            <div className="text-sm text-gray-600 mt-2">
              Thời gian: {formatDate(activity.date_time)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/teacher/activities/${activity.id}/participants`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-600" />
              <div className="text-lg font-semibold text-gray-900">Danh sách tham gia</div>
            </div>
            <div className="text-sm text-gray-600">
              Xem học viên đăng ký/tham gia và trạng thái.
            </div>
          </Link>

          <Link
            href={`/teacher/activities/${activity.id}/evaluate`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <ClipboardCheck className="w-6 h-6 text-green-600" />
              <div className="text-lg font-semibold text-gray-900">Đánh giá</div>
            </div>
            <div className="text-sm text-gray-600">
              Chấm/đánh giá kết quả tham gia cho học viên.
            </div>
          </Link>

          <Link
            href={`/teacher/activities/${activity.id}/files`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-purple-600" />
              <div className="text-lg font-semibold text-gray-900">Tài liệu</div>
            </div>
            <div className="text-sm text-gray-600">Quản lý tệp đính kèm và tài liệu hoạt động.</div>
          </Link>

          <Link
            href={`/teacher/activities/${activity.id}/qr-sessions`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <QrCode className="w-6 h-6 text-orange-600" />
              <div className="text-lg font-semibold text-gray-900">Phiên QR</div>
            </div>
            <div className="text-sm text-gray-600">Tạo và quản lý phiên QR điểm danh.</div>
          </Link>

          <Link
            href={`/teacher/activities/${activity.id}/attendance/history`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <History className="w-6 h-6 text-indigo-600" />
              <div className="text-lg font-semibold text-gray-900">Lịch sử điểm danh</div>
            </div>
            <div className="text-sm text-gray-600">Xem log/phiên điểm danh theo hoạt động.</div>
          </Link>

          <Link
            href={`/teacher/activities/${activity.id}/edit`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3 mb-2">
              <Pencil className="w-6 h-6 text-gray-700" />
              <div className="text-lg font-semibold text-gray-900">Chỉnh sửa</div>
            </div>
            <div className="text-sm text-gray-600">Cập nhật thông tin hoạt động.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

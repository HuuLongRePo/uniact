'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/lib/toast';

interface Activity {
  id: number;
  title: string;
  activity_type_name: string;
  organization_level_name: string;
  date_time: string;
  end_time: string;
  base_points: number;
}

interface Participation {
  id: number;
  student_id: number;
  student_name: string;
  student_code: string;
  attendance_status: string;
  achievement_level: string | null;
  award_type: string | null;
  total_points: number | null;
  evaluated_at: string | null;
  evaluator_name: string | null;
}

export default function AttendanceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      // Fetch activity details
      const activityRes = await fetch(`/api/activities/${id}`);
      if (!activityRes.ok) throw new Error('Không thể tải hoạt động');
      const activityData = await activityRes.json();
      setActivity(activityData.data);

      // Fetch participations
      const partRes = await fetch(`/api/activities/${id}/participations`);
      if (partRes.ok) {
        const partData = await partRes.json();
        setParticipations(partData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAttendance(participationId: number, status: string) {
    try {
      const res = await fetch(`/api/participations/${participationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_status: status }),
      });

      if (!res.ok) throw new Error('Không thể cập nhật điểm danh');

      toast.success('Đã cập nhật điểm danh');
      fetchData();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Không thể cập nhật điểm danh');
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-yellow-100 text-yellow-800',
      excused: 'bg-blue-100 text-blue-800',
    };
    const labels = {
      present: 'Có mặt',
      absent: 'Vắng mặt',
      late: 'Muộn',
      excused: 'Có phép',
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getAchievementBadge = (level: string | null) => {
    if (!level) return <span className="text-gray-400 text-sm">Chưa đánh giá</span>;

    const styles = {
      excellent: 'bg-purple-100 text-purple-800',
      good: 'bg-blue-100 text-blue-800',
      participated: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      excellent: 'Xuất sắc',
      good: 'Tốt',
      participated: 'Tham gia',
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${styles[level as keyof typeof styles]}`}
      >
        {labels[level as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-6xl mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Không tìm thấy hoạt động</p>
      </div>
    );
  }

  const presentCount = participations.filter((p) => p.attendance_status === 'present').length;
  const evaluatedCount = participations.filter((p) => p.achievement_level).length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/teacher/attendance')}
          className="text-blue-600 hover:underline mb-2"
        >
          ← Quay lại danh sách
        </button>
        <h1 className="text-3xl font-bold">{activity.title}</h1>
      </div>

      {/* Activity Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Thông tin hoạt động</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Loại hoạt động</p>
            <p className="font-semibold">{activity.activity_type_name}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Cấp tổ chức</p>
            <p className="font-semibold">{activity.organization_level_name}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Điểm cơ bản</p>
            <p className="font-semibold">{activity.base_points} điểm</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Thời gian</p>
            <p className="font-semibold">
              {new Date(activity.date_time).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">Tổng số học viên</p>
          <p className="text-2xl font-bold text-blue-600">{participations.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">Đã điểm danh</p>
          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">Đã đánh giá</p>
          <p className="text-2xl font-bold text-purple-600">{evaluatedCount}</p>
        </div>
      </div>

      {/* Participations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Danh sách học viên</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã SV
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Họ tên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Điểm danh
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đánh giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giải thưởng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Điểm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {participations.map((part, index) => (
                <tr key={part.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {part.student_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {part.student_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={part.attendance_status}
                      onChange={(e) => handleMarkAttendance(part.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="present">Có mặt</option>
                      <option value="absent">Vắng mặt</option>
                      <option value="late">Muộn</option>
                      <option value="excused">Có phép</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getAchievementBadge(part.achievement_level)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {part.award_type ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        {part.award_type === 'first_prize' && 'Giải Nhất'}
                        {part.award_type === 'second_prize' && 'Giải Nhì'}
                        {part.award_type === 'third_prize' && 'Giải Ba'}
                        {part.award_type === 'consolation' && 'Giải Khuyến khích'}
                        {part.award_type === 'special' && 'Giải Đặc biệt'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {part.total_points !== null ? (
                      <span className="font-semibold text-green-600">
                        {part.total_points.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/teacher/attendance/${part.id}/evaluate`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {part.achievement_level ? '✏️ Sửa' : '📝 Đánh giá'}
                    </Link>
                  </td>
                </tr>
              ))}

              {participations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Chưa có học viên tham gia
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      {participations.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Hướng dẫn:</strong> Chọn trạng thái điểm danh cho từng học viên, sau đó nhấn
            &quot;Đánh giá&quot; để chấm điểm và ghi nhận thành tích.
          </p>
        </div>
      )}
    </div>
  );
}

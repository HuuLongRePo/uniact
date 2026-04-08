'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/Button';

type StudentProfileResponse = {
  success: boolean;
  data?: {
    student?: {
      id: number;
      name: string;
      email: string;
      class_id: number | null;
      class_name: string | null;
      created_at: string;
      stats?: {
        total_activities: number;
        attended_count: number;
        total_points: number;
        class_rank: number;
        awards_count: number;
      };
    };
    activities?: Array<{
      id: number;
      title: string;
      date_time: string;
      location: string | null;
      activity_type: string | null;
      org_level: string | null;
      registration_date: string | null;
      attendance_status: string | null;
      points: number | null;
      bonus_points: number | null;
      penalty_points: number | null;
    }>;
    awards?: Array<{
      id: number;
      award_type: string | null;
      reason: string | null;
      awarded_date: string | null;
      awarded_by_name: string | null;
    }>;
    monthlyStats?: Array<{
      month: string;
      activity_count: number;
      attended_count: number;
      points_earned: number;
    }>;
    notes?: Array<{
      id: number;
      content: string;
      created_at: string;
      created_by_name: string | null;
    }>;
  };
  error?: string;
};

export default function AdminStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const studentId = useMemo(() => {
    const raw = (params as any)?.id;
    const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NonNullable<StudentProfileResponse['data']> | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (!user) return;

    if (!studentId) {
      toast.error('ID học viên không hợp lệ');
      router.push('/admin/students');
      return;
    }

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, studentId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/students/${studentId}/profile`);
      const json = (await res.json().catch(() => ({}))) as StudentProfileResponse;

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Không thể tải hồ sơ học viên');
      }

      setData(json.data || null);
    } catch (e: any) {
      console.error('Fetch student profile error:', e);
      toast.error(e?.message || 'Không thể tải hồ sơ học viên');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  const student = data?.student;
  const stats = student?.stats;
  const activities = data?.activities || [];
  const awards = data?.awards || [];
  const notes = data?.notes || [];
  const monthly = data?.monthlyStats || [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Hồ sơ học viên</h1>
          <p className="text-gray-600 mt-1">Chi tiết tham gia hoạt động, điểm và khen thưởng</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/admin/students')}>
            Quay lại
          </Button>
          {studentId && (
            <Button
              variant="primary"
              onClick={() => router.push(`/admin/scores/${studentId}/adjust`)}
            >
              Điều chỉnh điểm
            </Button>
          )}
        </div>
      </div>

      {student && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Họ và tên</div>
              <div className="font-semibold text-lg">{student.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Email</div>
              <div className="font-semibold">{student.email}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Lớp</div>
              <div className="font-semibold">{student.class_name || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Ngày tạo</div>
              <div className="font-semibold">
                {new Date(student.created_at).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-600">Tổng HĐ</div>
                <div className="text-xl font-bold">{stats.total_activities}</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-600">Đã tham dự</div>
                <div className="text-xl font-bold">{stats.attended_count}</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-600">Tổng điểm</div>
                <div className="text-xl font-bold">{stats.total_points}</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-600">Hạng trong lớp</div>
                <div className="text-xl font-bold">#{stats.class_rank}</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-600">Khen thưởng</div>
                <div className="text-xl font-bold">{stats.awards_count}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Tham gia hoạt động (gần đây)</h2>
          {activities.length === 0 ? (
            <div className="text-gray-600">Chưa có dữ liệu.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left bg-gray-50 border-b">
                  <tr>
                    <th className="py-2 pr-3">Hoạt động</th>
                    <th className="py-2 pr-3">Thời gian</th>
                    <th className="py-2 pr-3">Trạng thái</th>
                    <th className="py-2 pr-3 text-right">Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{a.title}</div>
                        <div className="text-xs text-gray-500">
                          {(a.activity_type || 'N/A') + (a.org_level ? ` • ${a.org_level}` : '')}
                        </div>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {a.date_time ? new Date(a.date_time).toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{a.attendance_status || '-'}</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">
                        {Number(a.points || 0) +
                          Number(a.bonus_points || 0) -
                          Number(a.penalty_points || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Khen thưởng</h2>
          {awards.length === 0 ? (
            <div className="text-gray-600">Chưa có dữ liệu.</div>
          ) : (
            <div className="space-y-3">
              {awards.map((a) => (
                <div key={a.id} className="border rounded p-3">
                  <div className="font-semibold">{a.award_type || 'Khen thưởng'}</div>
                  {a.reason && <div className="text-sm text-gray-700 mt-1">{a.reason}</div>}
                  <div className="text-xs text-gray-500 mt-2">
                    {a.awarded_date ? new Date(a.awarded_date).toLocaleDateString('vi-VN') : '-'}
                    {a.awarded_by_name ? ` • bởi ${a.awarded_by_name}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Thống kê 6 tháng</h2>
          {monthly.length === 0 ? (
            <div className="text-gray-600">Chưa có dữ liệu.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left bg-gray-50 border-b">
                  <tr>
                    <th className="py-2 pr-3">Tháng</th>
                    <th className="py-2 pr-3 text-right">HĐ</th>
                    <th className="py-2 pr-3 text-right">Tham dự</th>
                    <th className="py-2 pr-3 text-right">Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr key={m.month} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">{m.month}</td>
                      <td className="py-2 pr-3 text-right">{m.activity_count}</td>
                      <td className="py-2 pr-3 text-right">{m.attended_count}</td>
                      <td className="py-2 pr-3 text-right">{m.points_earned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Ghi chú</h2>
          {notes.length === 0 ? (
            <div className="text-gray-600">Chưa có dữ liệu.</div>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="border rounded p-3">
                  <div className="text-sm text-gray-700">{n.content}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(n.created_at).toLocaleString('vi-VN')}
                    {n.created_by_name ? ` • ${n.created_by_name}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

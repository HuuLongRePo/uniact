'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

type AdminUser = {
  id: number;
  role: string;
  full_name?: string;
  name?: string;
  email?: string;
};

type StudentActivityRow = {
  id: number;
  title: string;
  date_time: string;
  location: string | null;
  activity_type: string | null;
  org_level: string | null;
  attendance_status: string | null;
  points: number | null;
  bonus_points: number | null;
  penalty_points: number | null;
};

type TeacherActivityRow = {
  id: number;
  title: string;
  teacher_id: number;
  teacher_name: string;
  activity_type: string;
  organization_level: string;
  date_time: string;
  end_time: string;
  location: string | null;
  max_participants: number;
  participant_count: number;
  points: number;
  status: string;
  created_at: string;
};

export default function AdminUserActivitiesPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();

  const userId = useMemo(() => {
    const raw = (params as any)?.id;
    const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [studentActivities, setStudentActivities] = useState<StudentActivityRow[]>([]);
  const [teacherActivities, setTeacherActivities] = useState<TeacherActivityRow[]>([]);

  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (!currentUser) return;

    if (!userId) {
      toast.error('ID người dùng không hợp lệ');
      router.push('/admin/users');
      return;
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, authLoading, userId]);

  const load = async () => {
    try {
      setLoading(true);
      const userRes = await fetch(`/api/admin/users/${userId}`);
      const userJson = await userRes.json().catch(() => ({}));
      if (!userRes.ok || !userJson?.success)
        throw new Error(userJson?.error || 'Không thể tải người dùng');

      const u: AdminUser = userJson.data;
      setUser(u);

      if (u.role === 'student') {
        const res = await fetch(`/api/students/${userId}/profile`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success)
          throw new Error(json?.error || 'Không thể tải hoạt động học viên');
        setStudentActivities((json.data?.activities || []) as StudentActivityRow[]);
      } else if (u.role === 'teacher') {
        const params = new URLSearchParams({ page: '1', limit: '200', teacher_id: String(userId) });
        const res = await fetch(`/api/admin/activities?${params.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Không thể tải hoạt động của giáo viên');
        setTeacherActivities((json.activities || []) as TeacherActivityRow[]);
      } else {
        setStudentActivities([]);
        setTeacherActivities([]);
      }
    } catch (e: any) {
      console.error('Load user activities error:', e);
      toast.error(e?.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  const displayName = user?.full_name || user?.name || user?.email || `#${userId}`;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Hoạt động của người dùng</h1>
          <p className="text-gray-600 mt-1">{displayName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push(`/admin/users/${userId}`)}>
            Quay lại
          </Button>
          {user?.role === 'student' && (
            <Button variant="secondary" onClick={() => router.push(`/admin/students/${userId}`)}>
              Mở hồ sơ học viên
            </Button>
          )}
        </div>
      </div>

      {user?.role === 'student' ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Lịch sử tham gia (50 gần nhất)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-left">
                <tr>
                  <th className="py-2 pr-3">Hoạt động</th>
                  <th className="py-2 pr-3">Thời gian</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 pr-3 text-right">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {studentActivities.map((a) => (
                  <tr key={a.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs text-gray-500">
                        {(a.activity_type || 'N/A') + (a.org_level ? ` • ${a.org_level}` : '')}
                      </div>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(a.date_time).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{a.attendance_status || '-'}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                      {Number(a.points || 0) +
                        Number(a.bonus_points || 0) -
                        Number(a.penalty_points || 0)}
                    </td>
                  </tr>
                ))}
                {studentActivities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-600">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : user?.role === 'teacher' ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Hoạt động được tạo (admin view)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-left">
                <tr>
                  <th className="py-2 pr-3">Tiêu đề</th>
                  <th className="py-2 pr-3">Thời gian</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 pr-3 text-right">Tham gia</th>
                </tr>
              </thead>
              <tbody>
                {teacherActivities.map((a) => (
                  <tr key={a.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-medium">{a.title}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {a.date_time ? new Date(a.date_time).toLocaleString('vi-VN') : '-'}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{a.status}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                      {a.participant_count}
                    </td>
                  </tr>
                ))}
                {teacherActivities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-600">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-gray-600">
          Chưa có màn hình hoạt động cho vai trò này.
        </div>
      )}
    </div>
  );
}

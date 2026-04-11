'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

interface Activity {
  id: number;
  title: string;
  date_time: string;
  location: string;
  status: string;
}

interface Student {
  id: number;
  user_id: number;
  name: string;
  email: string;
  registration_status: string;
  attendance_status: string | null;
  achievement_level?: 'excellent' | 'good' | 'participated' | null;
}

export default function TeacherManualAttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [achievements, setAchievements] = useState<
    Record<number, 'excellent' | 'good' | 'participated' | null>
  >({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.push('/login');
      return;
    }
    if (user) fetchActivities();
  }, [user, authLoading, router]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/activities?scope=operational&status=ongoing,completed');
      const data = await res.json();
      if (res.ok) {
        setActivities(data.activities || []);
      }
    } catch (e) {
      console.error('Fetch activities error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (activityId: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance/manual?activity_id=${activityId}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
        // Tự động chọn những học viên đã điểm danh
        const attended = data.students
          .filter((s: Student) => s.attendance_status === 'attended')
          .map((s: Student) => s.user_id);
        setSelectedStudents(attended);

        // Load existing achievements
        const existingAchievements: Record<number, any> = {};
        data.students.forEach((s: Student) => {
          if (s.achievement_level) {
            existingAchievements[s.user_id] = s.achievement_level;
          }
        });
        setAchievements(existingAchievements);
      }
    } catch (e) {
      console.error('Fetch students error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityChange = (activityId: number) => {
    setSelectedActivityId(activityId);
    setStudents([]);
    setSelectedStudents([]);
    setAchievements({});
    if (activityId) {
      fetchStudents(activityId);
    }
  };

  const handleToggleStudent = (userId: number) => {
    setSelectedStudents((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.user_id));
    }
  };

  const handleSubmit = async () => {
    if (!selectedActivityId) {
      toast.error('Vui lòng chọn hoạt động');
      return;
    }
    if (selectedStudents.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 học viên');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: selectedActivityId,
          student_ids: selectedStudents,
          achievements: achievements, // Gửi achievements map
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Điểm danh thành công');
        // Refresh danh sách
        fetchStudents(selectedActivityId);
      } else {
        toast.error(data.error || 'Điểm danh thất bại');
      }
    } catch (e) {
      console.error('Submit attendance error:', e);
      toast.error('Lỗi khi điểm danh');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">✅ Điểm Danh Thủ Công</h1>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-yellow-800">
            <strong>Lưu ý:</strong> Chức năng này dùng khi hệ thống QR không khả dụng. Ưu tiên sử dụng
            QR code để điểm danh tự động. Nếu cần đánh giá ngưỡng quá tải QR hoặc pilot face attendance,
            hãy mở trang chính sách điểm danh.
          </p>
          <Link
            href="/teacher/attendance/policy"
            className="inline-flex items-center justify-center rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
          >
            Mở chính sách điểm danh
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Chọn hoạt động</h2>

          <div className="space-y-2">
            {activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => handleActivityChange(activity.id)}
                className={`w-full text-left p-3 border rounded transition ${
                  selectedActivityId === activity.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{activity.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  📅 {new Date(activity.date_time).toLocaleDateString('vi-VN')}
                </div>
                <div className="text-sm text-gray-600">📍 {activity.location}</div>
                <div className="mt-1">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      activity.status === 'ongoing' || activity.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : activity.status === 'completed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {activity.status === 'ongoing' || activity.status === 'published'
                      ? 'Đang diễn ra'
                      : activity.status === 'completed'
                        ? 'Đã kết thúc'
                        : activity.status}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {activities.length === 0 && (
            <p className="text-gray-500 text-center py-8">Không có hoạt động nào</p>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          {!selectedActivityId ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg">← Chọn hoạt động bên trái để bắt đầu điểm danh</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  Danh sách học viên ({selectedStudents.length}/{students.length})
                </h2>
                <button onClick={handleSelectAll} className="text-blue-600 hover:underline text-sm">
                  {selectedStudents.length === students.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>

              <div className="mb-4">
                <div className="flex gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div>
                    <span>Đã điểm danh</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                    <span>Chưa điểm danh</span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-gray-600">Đánh giá:</span>
                    <span className="text-xs">🏆 Xuất sắc (×1.5)</span>
                    <span className="text-xs">⭐ Tốt (×1.2)</span>
                    <span className="text-xs">✓ Tham gia (×1.0)</span>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2 mb-6">
                {students.map((student) => {
                  const isAttended = student.attendance_status === 'attended';
                  const isSelected = selectedStudents.includes(student.user_id);
                  return (
                    <div
                      key={student.user_id}
                      className={`flex items-center p-3 border rounded transition ${
                        isSelected
                          ? 'bg-green-50 border-green-500'
                          : isAttended
                            ? 'bg-green-50 border-green-200'
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleStudent(student.user_id)}
                        className="mr-3 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{student.name}</div>
                        <div className="text-sm text-gray-600 truncate">{student.email}</div>
                      </div>

                      {/* Achievement Dropdown */}
                      <div className="ml-3 flex-shrink-0">
                        <select
                          value={achievements[student.user_id] || ''}
                          onChange={(e) => {
                            const value = e.target.value as
                              | 'excellent'
                              | 'good'
                              | 'participated'
                              | '';
                            setAchievements((prev) => ({
                              ...prev,
                              [student.user_id]: value || null,
                            }));
                          }}
                          disabled={!isSelected}
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Chưa đánh giá</option>
                          <option value="excellent">🏆 Xuất sắc</option>
                          <option value="good">⭐ Tốt</option>
                          <option value="participated">✓ Tham gia</option>
                        </select>
                      </div>

                      {isAttended && (
                        <span className="text-green-600 text-sm font-medium ml-2 flex-shrink-0">
                          ✓ Đã có mặt
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {students.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  Không có học viên đăng ký hoạt động này
                </p>
              )}

              {students.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selectedStudents.length === 0}
                  className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {submitting
                    ? 'Đang xử lý...'
                    : `💾 Lưu điểm danh (${selectedStudents.length} học viên)`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface StudentProfile {
  id: number;
  name: string;
  email: string;
  class_name: string;
  major: string;
  academic_year: string;
  stats: {
    total_activities: number;
    attended_count: number;
    cancelled_count: number;
    total_points: number;
    class_rank: number;
    awards_count: number;
  };
}

interface Activity {
  id: number;
  title: string;
  date_time: string;
  location: string;
  activity_type: string;
  org_level: string;
  attendance_status: string;
  points: number;
}

interface Award {
  id: number;
  award_type: string;
  reason: string;
  awarded_date: string;
  awarded_by_name: string;
}

interface MonthStat {
  month: string;
  activity_count: number;
  attended_count: number;
  points_earned: number;
}

interface Note {
  id: number;
  content: string;
  created_at: string;
  created_by_name: string;
}

export default function StudentProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthStat[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'attendance' | 'scores' | 'timeline' | 'notes'
  >('overview');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'teacher'))) {
      router.push('/login');
      return;
    }
    if (user) fetchProfile();
  }, [user, authLoading, router, id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/students/${id}/profile`);
      const data = await res.json();
      if (res.ok) {
        setStudent(data.student);
        setActivities(data.activities || []);
        setAwards(data.awards || []);
        setMonthlyStats(data.monthlyStats || []);
        setNotes(data.notes || []);
      } else {
        toast.error(data.error || 'Không thể tải hồ sơ học viên');
      }
    } catch (e) {
      console.error('Fetch profile error:', e);
      toast.error('Lỗi khi tải hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      setSavingNote(true);
      const res = await fetch(`/api/students/${params.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewNote('');
        fetchProfile(); // Reload để lấy note mới
      } else {
        toast.error(data.error || 'Không thể thêm ghi chú');
      }
    } catch (e) {
      console.error('Add note error:', e);
      toast.error('Lỗi khi thêm ghi chú');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      const res = await fetch(`/api/students/${params.id}/notes?noteId=${noteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchProfile();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Không thể xóa ghi chú');
      }
    } catch (e) {
      console.error('Delete note error:', e);
      toast.error('Lỗi khi xóa ghi chú');
    }
  };

  if (authLoading || loading || !student) return <LoadingSpinner />;

  const attendanceRate =
    student.stats.total_activities > 0
      ? ((student.stats.attended_count / student.stats.total_activities) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline">
        ← Quay lại
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{student.name}</h1>
            <p className="text-gray-600 mt-1">{student.email}</p>
            <p className="text-sm text-gray-500 mt-1">
              Lớp: {student.class_name} | {student.major} | K{student.academic_year}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Xếp hạng lớp</div>
            <div className="text-4xl font-bold text-blue-600">#{student.stats.class_rank}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded">
            <div className="text-sm text-gray-600">Tổng điểm</div>
            <div className="text-2xl font-bold text-blue-600">{student.stats.total_points}</div>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <div className="text-sm text-gray-600">Hoạt động</div>
            <div className="text-2xl font-bold text-green-600">
              {student.stats.total_activities}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <div className="text-sm text-gray-600">Tỷ lệ điểm danh</div>
            <div className="text-2xl font-bold text-purple-600">{attendanceRate}%</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded">
            <div className="text-sm text-gray-600">Khen thưởng</div>
            <div className="text-2xl font-bold text-yellow-600">{student.stats.awards_count}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b flex gap-4 px-6">
          {[
            { id: 'overview', label: 'Tổng quan', icon: '📊' },
            { id: 'attendance', label: 'Lịch sử điểm danh', icon: '📅' },
            { id: 'scores', label: 'Phân tích điểm', icon: '🏆' },
            { id: 'timeline', label: 'Dòng thời gian', icon: '⏱️' },
            { id: 'notes', label: `Ghi chú (${notes.length})`, icon: '📝' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id as 'overview' | 'attendance' | 'scores' | 'timeline' | 'notes')
              }
              className={`py-3 px-4 font-medium flex items-center gap-2 ${
                activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Thống kê theo tháng (6 tháng gần nhất)</h2>
              {monthlyStats.length > 0 ? (
                <div className="space-y-3">
                  {monthlyStats.map((stat) => (
                    <div key={stat.month} className="border rounded p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{stat.month}</span>
                        <span className="text-sm text-gray-600">
                          {stat.activity_count} hoạt động | {stat.attended_count} điểm danh |{' '}
                          {stat.points_earned} điểm
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded">
                        <div
                          className="h-full bg-blue-500 rounded"
                          style={{
                            width: `${stat.activity_count > 0 ? (stat.attended_count / stat.activity_count) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Chưa có dữ liệu</p>
              )}
            </div>
          )}

          {/* Tab 2: Attendance History */}
          {activeTab === 'attendance' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Lịch sử điểm danh</h2>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Ngày</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Hoạt động</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Loại</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activities
                      .filter((a) => a.attendance_status === 'attended')
                      .map((act) => (
                        <tr key={act.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            {new Date(act.date_time).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{act.title}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{act.activity_type}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              ✓ Có mặt
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                            {act.points > 0 ? `+${act.points}` : '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {activities.filter((a) => a.attendance_status === 'attended').length === 0 && (
                  <p className="text-gray-500 text-center py-12">Chưa có dữ liệu điểm danh</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Score Analysis */}
          {activeTab === 'scores' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Phân tích điểm số</h2>

              {/* Score summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Tổng điểm</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {student.stats.total_points}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-gray-600 mb-1">Điểm TB/hoạt động</div>
                  <div className="text-3xl font-bold text-green-600">
                    {student.stats.total_activities > 0
                      ? (student.stats.total_points / student.stats.attended_count).toFixed(1)
                      : '0'}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm text-gray-600 mb-1">Xếp hạng lớp</div>
                  <div className="text-3xl font-bold text-purple-600">
                    #{student.stats.class_rank}
                  </div>
                </div>
              </div>

              {/* Score breakdown */}
              <h3 className="font-semibold text-lg mb-3">Chi tiết điểm theo hoạt động</h3>
              <div className="space-y-3">
                {activities
                  .filter((a) => a.points > 0)
                  .sort((a, b) => b.points - a.points)
                  .map((act) => (
                    <div key={act.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{act.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(act.date_time).toLocaleDateString('vi-VN')} •{' '}
                            {act.activity_type} • {act.org_level}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">+{act.points}</div>
                          <div className="text-xs text-gray-500 mt-1">điểm</div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min((act.points / 10) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                {activities.filter((a) => a.points > 0).length === 0 && (
                  <p className="text-gray-500 text-center py-12">Chưa có dữ liệu điểm</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Timeline */}
          {activeTab === 'timeline' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Dòng thời gian hoạt động</h2>
              <div className="space-y-6">
                {/* Combine activities and awards into timeline */}
                {[
                  ...activities.map((a) => ({
                    date: a.date_time,
                    type: 'activity' as const,
                    title: a.title,
                    subtitle: `${a.activity_type} • ${a.org_level}`,
                    status: a.attendance_status,
                    points: a.points,
                    id: `activity-${a.id}`,
                  })),
                  ...awards.map((aw) => ({
                    date: aw.awarded_date,
                    type: 'award' as const,
                    title: aw.award_type,
                    subtitle: aw.reason,
                    awardedBy: aw.awarded_by_name,
                    id: `award-${aw.id}`,
                  })),
                ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((event) => (
                    <div key={event.id} className="flex gap-4">
                      <div
                        className='flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl
                        ${event.type === "activity" ? "bg-blue-100" : "bg-yellow-100"}'
                      >
                        {event.type === 'activity' ? '📅' : '🏆'}
                      </div>
                      <div className="flex-grow border-l-2 border-gray-200 pl-6 pb-6">
                        <div className="text-xs text-gray-500 mb-1">
                          {new Date(event.date).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{event.subtitle}</p>
                        {event.type === 'activity' && (
                          <div className="mt-2 flex items-center gap-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                event.status === 'attended'
                                  ? 'bg-green-100 text-green-800'
                                  : event.status === 'registered'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {event.status === 'attended'
                                ? '✓ Đã tham gia'
                                : event.status === 'registered'
                                  ? 'Đã đăng ký'
                                  : 'Đã hủy'}
                            </span>
                            {event.points > 0 && (
                              <span className="text-sm font-semibold text-blue-600">
                                +{event.points} điểm
                              </span>
                            )}
                          </div>
                        )}
                        {event.type === 'award' && (
                          <p className="text-xs text-gray-500 mt-2">Người cấp: {event.awardedBy}</p>
                        )}
                      </div>
                    </div>
                  ))}
                {activities.length === 0 && awards.length === 0 && (
                  <p className="text-gray-500 text-center py-12">Chưa có hoạt động nào</p>
                )}
              </div>
            </div>
          )}

          {/* Tab 5: Notes */}
          {activeTab === 'notes' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Ghi chú của giảng viên</h2>
              <div className="mb-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Nhập ghi chú mới..."
                  className="w-full p-3 border rounded h-24"
                />
                <button
                  onClick={handleAddNote}
                  disabled={savingNote || !newNote.trim()}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingNote ? 'Đang lưu...' : '+ Thêm ghi chú'}
                </button>
              </div>
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="border rounded p-4 bg-yellow-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {note.created_by_name} |{' '}
                          {new Date(note.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <button
                        onClick={() => setNoteToDelete(note)}
                        className="ml-4 text-red-600 hover:text-red-800 text-sm"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-gray-500">Chưa có ghi chú nào</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={noteToDelete !== null}
        title="Xóa ghi chú"
        message={
          noteToDelete
            ? `Bạn có chắc chắn muốn xóa ghi chú do "${noteToDelete.created_by_name}" tạo không?`
            : ''
        }
        confirmText="Xóa ghi chú"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setNoteToDelete(null)}
        onConfirm={async () => {
          if (!noteToDelete) return;
          await handleDeleteNote(noteToDelete.id);
          setNoteToDelete(null);
        }}
      />
    </div>
  );
}

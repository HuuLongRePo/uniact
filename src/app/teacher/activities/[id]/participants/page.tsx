'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/lib/toast';

interface Participation {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  attendance_status: 'registered' | 'attended' | 'absent';
  achievement_level?: 'excellent' | 'good' | 'participated' | null;
  evaluated_at?: string;
  points?: number;
}

interface Activity {
  id: number;
  title: string;
  date_time: string;
  location: string;
  status: string;
}

type ClassQuickAddTarget = { id: number; name: string } | null;

export default function ParticipantsPage() {
  const params = useParams();
  const activityId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [achievements, setAchievements] = useState<
    Record<number, 'excellent' | 'good' | 'participated' | null>
  >({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [classToAdd, setClassToAdd] = useState<ClassQuickAddTarget>(null);
  const [showBulkRemoveDialog, setShowBulkRemoveDialog] = useState(false);
  useEffect(() => {
    if (activityId) {
      fetchData();
    }
  }, [activityId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch activity info
      const activityRes = await fetch(`/api/activities/${activityId}`);
      if (!activityRes.ok) throw new Error('Failed to fetch activity');
      const activityData = await activityRes.json();
      setActivity(activityData?.activity ?? activityData?.data?.activity ?? activityData);

      // Fetch participations
      const participationsRes = await fetch(`/api/activities/${activityId}/participants`);
      if (!participationsRes.ok) throw new Error('Failed to fetch participants');
      const participationsData = await participationsRes.json();
      const participationList =
        participationsData?.participations ?? participationsData?.data?.participations ?? [];
      setParticipations(participationList);

      // Pre-fill existing achievements
      const existingAchievements: Record<number, Participation['achievement_level']> = {};
      participationList.forEach((p: Participation) => {
        if (p.achievement_level) {
          existingAchievements[p.id] = p.achievement_level;
        }
      });
      setAchievements(existingAchievements);

      // Fetch classes for quick add
      const classesRes = await fetch('/api/classes');
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData?.classes ?? classesData?.data?.classes ?? classesData);
      }
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (participationId: number) => {
    const achievement = achievements[participationId];
    if (!achievement) {
      toast.error('Vui lòng chọn mức độ đánh giá');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/participations/${participationId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievement_level: achievement }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to evaluate');
      }

      const data = await res.json();
      toast.success(data.message || 'Đánh giá thành công');

      // Refresh data
      fetchData();
    } catch (error: unknown) {
      console.error('Error evaluating:', error);
      toast.error(error instanceof Error ? error.message : 'Lỗi khi đánh giá');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkEvaluate = async () => {
    const toEvaluate = participations.filter(
      (p) => p.attendance_status === 'attended' && achievements[p.id] && !p.evaluated_at
    );

    if (toEvaluate.length === 0) {
      toast.error('Không có học viên nào cần đánh giá');
      return;
    }

    try {
      setSaving(true);
      let successCount = 0;

      for (const p of toEvaluate) {
        const res = await fetch(`/api/participations/${p.id}/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievement_level: achievements[p.id] }),
        });

        if (res.ok) successCount++;
      }

      toast.success(`Đã đánh giá ${successCount}/${toEvaluate.length} học viên`);
      fetchData();
    } catch (error: unknown) {
      console.error('Error bulk evaluating:', error);
      toast.error('Lỗi khi đánh giá hàng loạt');
    } finally {
      setSaving(false);
    }
  };

  const handleAddByClass = async (classId: number) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/activities/${activityId}/participants/add-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId }),
      });

      if (!res.ok) throw new Error('Failed to add class');
      const data = await res.json();
      toast.success(`Đã thêm ${data.added_count || 0} học viên`);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm lớp');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất một học viên');
      return;
    }

    try {
      setSaving(true);
      const studentIds = Array.from(selectedIds)
        .map((participationId) => {
          const p = participations.find((x) => x.id === participationId);
          return p?.student_id;
        })
        .filter(Boolean);

      const res = await fetch(`/api/activities/${activityId}/participants/bulk-remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: studentIds }),
      });

      if (!res.ok) throw new Error('Failed to remove');
      const data = await res.json();
      toast.success(`Đã xóa ${data.removed_count || 0} học viên`);
      setSelectedIds(new Set());
      setShowBulkRemoveDialog(false);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}/participants/export`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participants-${activityId}-${Date.now()}.csv`;
      a.click();
      toast.success('Đã xuất file thành công');
    } catch (_error) {
      toast.error('Không thể xuất file');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === participations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(participations.map((p) => p.id)));
    }
  };

  const handleToggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Không tìm thấy hoạt động</p>
        </div>
      </div>
    );
  }

  const attendedCount = participations.filter((p) => p.attendance_status === 'attended').length;
  const evaluatedCount = participations.filter((p) => p.evaluated_at).length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/activities" className="text-green-600 hover:text-green-800 mb-2 inline-block">
          ← Quay lại danh sách hoạt động
        </Link>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý người tham gia & Đánh giá</h1>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            📥 Xuất CSV
          </button>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-2">{activity.title}</h2>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>📅 {new Date(activity.date_time).toLocaleString('vi-VN')}</span>
            <span>📍 {activity.location}</span>
          </div>
        </div>
      </div>

      {/* Quick Add by Class */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Thêm nhanh theo lớp học</h3>
        <div className="flex flex-wrap gap-2">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setClassToAdd({ id: cls.id, name: cls.name })}
              disabled={saving}
              className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors text-sm disabled:opacity-50"
            >
              ➕ {cls.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-700 font-medium">Đã chọn {selectedIds.size} học viên</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkRemoveDialog(true)}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                ❌ Xóa khỏi hoạt động
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={classToAdd !== null}
        title="Thêm nhanh theo lớp"
        message={
          classToAdd
            ? `Bạn có chắc chắn muốn thêm toàn bộ học viên của lớp "${classToAdd.name}" vào hoạt động này?`
            : ''
        }
        confirmText="Thêm cả lớp"
        cancelText="Hủy"
        variant="warning"
        onCancel={() => setClassToAdd(null)}
        onConfirm={async () => {
          if (!classToAdd) return;
          await handleAddByClass(classToAdd.id);
          setClassToAdd(null);
        }}
      />

      <ConfirmDialog
        isOpen={showBulkRemoveDialog}
        title="Xóa học viên khỏi hoạt động"
        message={`Bạn có chắc chắn muốn xóa ${selectedIds.size} học viên đã chọn khỏi hoạt động này?`}
        confirmText="Xóa khỏi hoạt động"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setShowBulkRemoveDialog(false)}
        onConfirm={async () => {
          await handleBulkRemove();
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tổng đăng ký</div>
          <div className="text-2xl font-bold text-gray-900">{participations.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Đã điểm danh</div>
          <div className="text-2xl font-bold text-green-600">{attendedCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Đã đánh giá</div>
          <div className="text-2xl font-bold text-blue-600">{evaluatedCount}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-4 text-sm flex-wrap">
          <span className="font-medium">Mức độ đánh giá:</span>
          <span>🏆 Xuất sắc (×1.5 điểm)</span>
          <span>⭐ Tốt (×1.2 điểm)</span>
          <span>✓ Tham gia (×1.0 điểm)</span>
        </div>
      </div>

      {/* Bulk actions */}
      {attendedCount > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <button
            onClick={handleBulkEvaluate}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang xử lý...' : '💾 Lưu tất cả đánh giá'}
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Lưu đánh giá cho tất cả học viên đã điểm danh và chưa được đánh giá
          </p>
        </div>
      )}

      {/* Participants table */}
      {participations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Chưa có học sinh đăng ký</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === participations.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Học sinh
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Mức độ đánh giá
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Điểm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {participations.map((p, index) => (
                  <tr
                    key={p.id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedIds.has(p.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => handleToggleSelect(p.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{p.student_name}</div>
                      <div className="text-sm text-gray-500">{p.student_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          p.attendance_status === 'attended'
                            ? 'bg-green-100 text-green-800'
                            : p.attendance_status === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {p.attendance_status === 'attended'
                          ? 'Đã điểm danh'
                          : p.attendance_status === 'absent'
                            ? 'Vắng mặt'
                            : 'Đã đăng ký'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.attendance_status === 'attended' ? (
                        <select
                          value={achievements[p.id] || ''}
                          onChange={(e) => {
                            const value = e.target.value as
                              | 'excellent'
                              | 'good'
                              | 'participated'
                              | '';
                            setAchievements((prev) => ({
                              ...prev,
                              [p.id]: value || null,
                            }));
                          }}
                          disabled={saving || !!p.evaluated_at}
                          className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Chọn mức độ</option>
                          <option value="excellent">🏆 Xuất sắc</option>
                          <option value="good">⭐ Tốt</option>
                          <option value="participated">✓ Tham gia</option>
                        </select>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.points !== undefined && p.points !== null ? (
                        <span className="text-sm font-bold text-green-600">{p.points} điểm</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {p.attendance_status === 'attended' && !p.evaluated_at ? (
                        <button
                          onClick={() => handleEvaluate(p.id)}
                          disabled={saving || !achievements[p.id]}
                          className="text-blue-600 hover:text-blue-900 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          Đánh giá
                        </button>
                      ) : p.evaluated_at ? (
                        <span className="text-green-600">✓ Đã đánh giá</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

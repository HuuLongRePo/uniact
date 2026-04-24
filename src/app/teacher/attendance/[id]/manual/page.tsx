'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Save, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatVietnamDateTime, toVietnamDatetimeLocalValue } from '@/lib/timezone';

interface Student {
  id: number;
  name: string;
  student_code: string;
}

interface AttendanceRecord {
  id: number;
  student_id: number;
  activity_id: number;
  status: 'present' | 'absent';
  achievement_level?: 'excellent' | 'good' | 'fair' | 'poor';
  marked_at: string;
  marked_by: string;
}

interface Activity {
  id: number;
  title: string;
  date_time: string;
}

const ACHIEVEMENT_LEVELS = [
  { key: 'excellent', label: 'Xuất sắc', color: 'bg-green-100 text-green-700 border-green-300' },
  { key: 'good', label: 'Khá', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'fair', label: 'Trung bình', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { key: 'poor', label: 'Yếu', color: 'bg-orange-100 text-orange-700 border-orange-300' },
];

export default function ManualAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Record<number, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Record<number, string>>({});
  const [bulkAchievement, setBulkAchievement] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [actRes, studentsRes, recordsRes] = await Promise.all([
        fetch(`/api/activities/${id}`),
        fetch(`/api/activities/${id}/students`),
        fetch(`/api/activities/${id}/attendance`),
      ]);

      if (!actRes.ok) throw new Error('Không thể tải hoạt động');
      if (!studentsRes.ok) throw new Error('Không thể tải danh sách học viên');

      const actData = await actRes.json();
      setActivity(actData.activity || actData);

      const studentsData = await studentsRes.json();
      setStudents(studentsData.students || []);

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        const recordMap: Record<number, AttendanceRecord> = {};
        const achievementMap: Record<number, string> = {};

        (recordsData.records || []).forEach((record: AttendanceRecord) => {
          recordMap[record.student_id] = record;
          if (record.achievement_level) {
            achievementMap[record.student_id] = record.achievement_level;
          }
        });

        setRecords(recordMap);
        setSelectedAchievement(achievementMap);
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId: number) => {
    setRecords((prev) => {
      const current = prev[studentId];
      if (!current) {
        return {
          ...prev,
          [studentId]: {
            id: 0,
            student_id: studentId,
            activity_id: parseInt(id),
            status: 'present',
            marked_at: new Date().toISOString(),
            marked_by: '',
          },
        };
      }
      return {
        ...prev,
        [studentId]: { ...current, status: current.status === 'present' ? 'absent' : 'present' },
      };
    });
  };

  const setAchievementLevel = (studentId: number, level: string) => {
    setSelectedAchievement((prev) => ({
      ...prev,
      [studentId]: level === prev[studentId] ? '' : level,
    }));
  };

  const markAllPresent = () => {
    const newRecords: Record<number, AttendanceRecord> = { ...records };
    students.forEach((student) => {
      if (!newRecords[student.id]) {
        newRecords[student.id] = {
          id: 0,
          student_id: student.id,
          activity_id: parseInt(id),
          status: 'present',
          marked_at: new Date().toISOString(),
          marked_by: '',
        };
      } else {
        newRecords[student.id].status = 'present';
      }
    });
    setRecords(newRecords);
    toast.success('Đã đánh dấu tất cả học viên có mặt');
  };

  const applyBulkAchievement = () => {
    if (!bulkAchievement) {
      toast.error('Vui lòng chọn mức độ');
      return;
    }

    const updated: Record<number, string> = { ...selectedAchievement };
    students.forEach((student) => {
      if (records[student.id]?.status === 'present') {
        updated[student.id] = bulkAchievement;
      }
    });
    setSelectedAchievement(updated);
    setBulkAchievement('');
    toast.success('Đã áp dụng mức độ cho tất cả học viên có mặt');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const attendanceData = students.map((student) => ({
        student_id: student.id,
        status: records[student.id]?.status || 'absent',
        achievement_level:
          records[student.id]?.status === 'present'
            ? selectedAchievement[student.id] || null
            : null,
      }));

      const response = await fetch(`/api/activities/${id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: attendanceData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Không thể lưu dấu danh');
      }

      toast.success('Lưu dấu danh thành công');
      router.back();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Không thể lưu dấu danh');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/activities/${id}/attendance/export`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Không thể xuất file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dau-danh-${id}-${toVietnamDatetimeLocalValue(new Date()).slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      toast.error('Không thể xuất file');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!activity || students.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
            <p className="text-gray-600">Không tìm thấy hoạt động hoặc danh sách học viên</p>
          </div>
        </div>
      </div>
    );
  }

  const presentCount = Object.values(records).filter((r) => r.status === 'present').length;
  const absentCount = students.length - presentCount;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dấu danh - {activity?.title}</h1>
          <p className="text-gray-600 mt-2">
            Ngày: {formatVietnamDateTime(activity!.date_time, 'date')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <p className="text-gray-600 text-sm">Tổng học viên</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{students.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-green-200 bg-green-50">
            <p className="text-green-600 text-sm font-medium">Có mặt</p>
            <p className="text-3xl font-bold text-green-700 mt-2">{presentCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-red-200 bg-red-50">
            <p className="text-red-600 text-sm font-medium">Vắng mặt</p>
            <p className="text-3xl font-bold text-red-700 mt-2">{absentCount}</p>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Hành động hàng loạt</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={markAllPresent}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
            >
              ✓ Đánh dấu tất cả có mặt
            </button>
            <div className="flex gap-2">
              <select
                value={bulkAchievement}
                onChange={(e) => setBulkAchievement(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn mức độ --</option>
                {ACHIEVEMENT_LEVELS.map((level) => (
                  <option key={level.key} value={level.key}>
                    {level.label}
                  </option>
                ))}
              </select>
              <button
                onClick={applyBulkAchievement}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Áp dụng
              </button>
            </div>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Xuất file Excel
            </button>
          </div>
        </div>

        {/* Attendance List */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 w-12">STT</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                    Tên học viên
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                    Mã học viên
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900 w-32">
                    Dấu danh
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                    Mức độ đạt được
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const record = records[student.id];
                  const isPresent = record?.status === 'present';

                  return (
                    <tr key={student.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.student_code}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleAttendance(student.id)}
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition ${
                            isPresent
                              ? 'bg-green-100 text-green-700 border-2 border-green-400'
                              : 'bg-gray-100 text-gray-400 border-2 border-gray-300 hover:border-red-400'
                          }`}
                        >
                          {isPresent && <Check className="w-5 h-5" />}
                          {!isPresent && '−'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {isPresent ? (
                          <div className="flex flex-wrap gap-2">
                            {ACHIEVEMENT_LEVELS.map((level) => (
                              <button
                                key={level.key}
                                onClick={() => setAchievementLevel(student.id, level.key)}
                                className={`px-3 py-1 rounded border-2 text-sm font-medium transition ${
                                  selectedAchievement[student.id] === level.key
                                    ? `${level.color} border-current`
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-current'
                                }`}
                              >
                                {level.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Vắng mặt</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Đang lưu...' : 'Lưu dấu danh'}
          </button>
        </div>
      </div>
    </div>
  );
}

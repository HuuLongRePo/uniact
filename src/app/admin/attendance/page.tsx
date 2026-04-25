'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Edit2, Save } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatVietnamDateTime } from '@/lib/timezone';

interface AttendanceRecord {
  id: number;
  activityId: number;
  activityName: string;
  activityDate: string;
  userId: number;
  userName: string;
  userEmail: string;
  status: 'present' | 'absent' | 'late';
  pointsAwarded: number;
}

export default function AttendanceManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActivity, setFilterActivity] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    const activityIdParam = searchParams.get('activityId') ?? searchParams.get('activity_id') ?? '';
    if (activityIdParam.trim()) {
      setFilterActivity(activityIdParam);
    }
  }, [searchParams]);

  async function fetchRecords() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/attendance');
      const data = await res.json();
      if (res.ok) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Fetch attendance error:', error);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(record: AttendanceRecord) {
    setEditingId(record.id);
    setEditStatus(record.status);
  }

  async function saveEdit(id: number) {
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus }),
      });

      if (res.ok) {
        await fetchRecords();
        setEditingId(null);
        toast.success('Đã cập nhật điểm danh');
      } else {
        toast.error('Cập nhật điểm danh thất bại');
      }
    } catch (error) {
      console.error('Update attendance error:', error);
      toast.error('Cập nhật điểm danh thất bại');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditStatus('');
  }

  const filteredRecords = records.filter(
    (r) =>
      filterActivity.trim() === '' ||
      (/^\d+$/.test(filterActivity.trim()) && Number(filterActivity.trim()) === r.activityId) ||
      r.activityName.toLowerCase().includes(filterActivity.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Quản lý điểm danh</h1>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Quay lại
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Tổng bản ghi</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Có mặt</p>
                <p className="text-2xl font-bold">
                  {records.filter((r) => r.status === 'present').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">Vắng</p>
                <p className="text-2xl font-bold">
                  {records.filter((r) => r.status === 'absent').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Muộn</p>
                <p className="text-2xl font-bold">
                  {records.filter((r) => r.status === 'late').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <input
            type="text"
            placeholder="Tìm theo tên hoạt động hoặc ID..."
            value={filterActivity}
            onChange={(e) => setFilterActivity(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">Đang tải bản ghi điểm danh...</p>
          ) : filteredRecords.length === 0 ? (
            <p className="p-6 text-gray-500">Không tìm thấy bản ghi điểm danh</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Hoạt động
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ngày
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Học viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Điểm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{record.activityName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatVietnamDateTime(record.activityDate, 'date')}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{record.userName}</p>
                          <p className="text-xs text-gray-500">{record.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {editingId === record.id ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="present">Có mặt</option>
                            <option value="absent">Vắng</option>
                            <option value="late">Muộn</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'absent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {record.status === 'present'
                              ? 'Có mặt'
                              : record.status === 'absent'
                                ? 'Vắng'
                                : 'Muộn'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{record.pointsAwarded}</td>
                      <td className="px-6 py-4">
                        {editingId === record.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(record.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              <Save className="w-3 h-3" />
                              Lưu
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(record)}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                          >
                            <Edit2 className="w-3 h-3" />
                            Sửa
                          </button>
                        )}
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

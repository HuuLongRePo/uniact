'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Edit2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActivity, setFilterActivity] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');

  useEffect(() => {
    fetchRecords();
  }, []);

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
      filterActivity === '' || r.activityName.toLowerCase().includes(filterActivity.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Attendance Records</h1>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Present</p>
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
                <p className="text-sm text-gray-500">Absent</p>
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
                <p className="text-sm text-gray-500">Late</p>
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
            placeholder="Search by activity name..."
            value={filterActivity}
            onChange={(e) => setFilterActivity(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">Loading attendance records...</p>
          ) : filteredRecords.length === 0 ? (
            <p className="p-6 text-gray-500">No attendance records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{record.activityName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(record.activityDate).toLocaleDateString()}
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
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
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
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
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
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(record)}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
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

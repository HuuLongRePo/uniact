'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Edit2, RefreshCw, Save } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
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

function parseAttendancePayload(payload: any) {
  const records = payload?.records || payload?.data?.records || payload?.data || [];
  return Array.isArray(records) ? (records as AttendanceRecord[]) : [];
}

export default function AttendanceManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActivity, setFilterActivity] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceRecord['status']>('present');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user?.id, user?.role]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    void fetchRecords();
  }, [user?.id, user?.role]);

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
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai ban ghi diem danh');
      }

      setRecords(parseAttendancePayload(payload));
    } catch (error) {
      console.error('Fetch attendance error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai ban ghi diem danh');
      setRecords([]);
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
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Cap nhat diem danh that bai');
      }

      await fetchRecords();
      setEditingId(null);
      toast.success(payload?.message || 'Da cap nhat diem danh');
    } catch (error) {
      console.error('Update attendance error:', error);
      toast.error(error instanceof Error ? error.message : 'Cap nhat diem danh that bai');
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditStatus('present');
  }

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const keyword = filterActivity.trim().toLowerCase();
        if (!keyword) return true;

        return (
          (/^\d+$/.test(keyword) && Number(keyword) === record.activityId) ||
          record.activityName.toLowerCase().includes(keyword)
        );
      }),
    [filterActivity, records]
  );

  const presentCount = filteredRecords.filter((record) => record.status === 'present').length;
  const absentCount = filteredRecords.filter((record) => record.status === 'absent').length;
  const lateCount = filteredRecords.filter((record) => record.status === 'late').length;

  if (authLoading) {
    return <LoadingSpinner message="Dang tai khu quan ly diem danh..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Attendance control
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Quan ly diem danh</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Admin co the doi soat ban ghi diem danh, loc theo hoat dong va sua nhanh trang thai
              khi can can thi thu cong.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchRecords()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Tai lai
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Quay lai
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-cyan-800">Tong ban ghi</div>
            <div className="mt-3 text-3xl font-semibold text-cyan-950">{filteredRecords.length}</div>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-800">Co mat</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-950">{presentCount}</div>
          </div>
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-rose-800">Vang</div>
            <div className="mt-3 text-3xl font-semibold text-rose-950">{absentCount}</div>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-800">Muon</div>
            <div className="mt-3 text-3xl font-semibold text-amber-950">{lateCount}</div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_auto]">
          <label className="block text-sm font-medium text-slate-700">
            Tim theo ten hoat dong hoac activity ID
            <input
              type="text"
              placeholder="VD: Sinh hoat dau tuan hoac 77"
              value={filterActivity}
              onChange={(event) => setFilterActivity(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
          </label>
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDays className="h-4 w-4 text-cyan-700" />
              Loc thong minh
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Tu dong nhan `activityId` trong query string de doi soat sau khi nhay tu dashboard.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
            Dang tai ban ghi diem danh...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
            <div className="text-base font-medium text-slate-900">Khong tim thay ban ghi diem danh</div>
            <p className="mt-2 text-sm text-slate-500">
              Thu doi bo loc hoac mo hoat dong khac de kiem tra du lieu.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 lg:hidden">
              {filteredRecords.map((record) => (
                <article
                  key={record.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{record.activityName}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {formatVietnamDateTime(record.activityDate, 'date')}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      #{record.activityId}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                    <div className="font-medium text-slate-900">{record.userName}</div>
                    <div className="mt-1">{record.userEmail}</div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                      Trang thai:{' '}
                      <span className="font-semibold">
                        {record.status === 'present'
                          ? 'Co mat'
                          : record.status === 'absent'
                            ? 'Vang'
                            : 'Muon'}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                      Diem: <span className="font-semibold">{record.pointsAwarded}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {editingId === record.id ? (
                      <div className="space-y-3">
                        <select
                          value={editStatus}
                          onChange={(event) => setEditStatus(event.target.value as AttendanceRecord['status'])}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                        >
                          <option value="present">Co mat</option>
                          <option value="absent">Vang</option>
                          <option value="late">Muon</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEdit(record.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
                          >
                            <Save className="h-4 w-4" />
                            Luu
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Huy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(record)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Edit2 className="h-4 w-4" />
                        Sua diem danh
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Hoat dong
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Ngay
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Hoc vien
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Trang thai
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Diem
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Thao tac
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{record.activityName}</div>
                        <div className="mt-1 text-sm text-slate-500">Activity #{record.activityId}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatVietnamDateTime(record.activityDate, 'date')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">{record.userName}</div>
                        <div className="mt-1 text-sm text-slate-500">{record.userEmail}</div>
                      </td>
                      <td className="px-4 py-4">
                        {editingId === record.id ? (
                          <select
                            value={editStatus}
                            onChange={(event) => setEditStatus(event.target.value as AttendanceRecord['status'])}
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                          >
                            <option value="present">Co mat</option>
                            <option value="absent">Vang</option>
                            <option value="late">Muon</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              record.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : record.status === 'absent'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {record.status === 'present'
                              ? 'Co mat'
                              : record.status === 'absent'
                                ? 'Vang'
                                : 'Muon'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">{record.pointsAwarded}</td>
                      <td className="px-4 py-4">
                        {editingId === record.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void saveEdit(record.id)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-800"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Luu
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Huy
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => startEdit(record)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Sua
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              He thong dang hien thi <span className="font-semibold text-slate-900">{filteredRecords.length}</span>{' '}
              ban ghi sau khi loc.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

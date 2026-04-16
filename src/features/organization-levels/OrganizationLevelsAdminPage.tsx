'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

export interface OrgLevel {
  id: number;
  name: string;
  multiplier: number;
  description?: string;
  created_at: string;
}

export default function OrganizationLevelsAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [levels, setLevels] = useState<OrgLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OrgLevel | null>(null);
  const [levelToDelete, setLevelToDelete] = useState<OrgLevel | null>(null);
  const [form, setForm] = useState({ name: '', multiplier: 1.0, description: '' });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) fetchLevels();
  }, [user, authLoading, router]);

  const fetchLevels = async () => {
    try {
      const res = await fetch('/api/organization-levels');
      const data = await res.json();
      if (res.ok) setLevels(data.organization_levels || []);
    } catch (e) {
      console.error('Fetch org levels error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (level?: OrgLevel) => {
    if (level) {
      setEditing(level);
      setForm({
        name: level.name,
        multiplier: level.multiplier,
        description: level.description || '',
      });
    } else {
      setEditing(null);
      setForm({ name: '', multiplier: 1.0, description: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/organization-levels/${editing.id}` : '/api/organization-levels';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editing ? 'Cập nhật thành công' : 'Tạo mới thành công');
        closeModal();
        fetchLevels();
      } else {
        toast.error(data.error || 'Thao tác thất bại');
      }
    } catch (e) {
      console.error('Submit org level error:', e);
      toast.error('Lỗi thao tác');
    }
  };

  const handleDelete = async (level: OrgLevel) => {
    try {
      const res = await fetch(`/api/organization-levels/${level.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Xóa thành công');
        fetchLevels();
      } else {
        toast.error(data.error || 'Xóa thất bại');
      }
    } catch (e) {
      console.error('Delete org level error:', e);
      toast.error('Lỗi xóa cấp độ');
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🏛️ Cấp Độ Tổ Chức</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
        >
          + Thêm Cấp Độ
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Hệ số nhân
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mô tả
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ngày tạo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {levels.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">{l.id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{l.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">
                  x{l.multiplier.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate">
                  {l.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(l.created_at, 'date')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => openModal(l)}
                    className="text-green-600 hover:text-green-800 font-medium"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => setLevelToDelete(l)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {levels.length === 0 && (
          <div className="text-center py-12 text-gray-500">Chưa có cấp độ tổ chức nào</div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">Tổng số: {levels.length} cấp độ</div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              {editing ? 'Chỉnh Sửa Cấp Độ' : 'Thêm Cấp Độ Mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hệ số nhân *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={form.multiplier}
                  onChange={(e) =>
                    setForm({ ...form, multiplier: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2 border rounded h-24"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  {editing ? 'Cập nhật' : 'Tạo mới'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={levelToDelete !== null}
        title="Xóa cấp độ tổ chức"
        message={
          levelToDelete ? `Bạn có chắc chắn muốn xóa cấp độ "${levelToDelete.name}" không?` : ''
        }
        confirmText="Xóa cấp độ"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setLevelToDelete(null)}
        onConfirm={async () => {
          if (!levelToDelete) return;
          await handleDelete(levelToDelete);
          setLevelToDelete(null);
        }}
      />
    </div>
  );
}

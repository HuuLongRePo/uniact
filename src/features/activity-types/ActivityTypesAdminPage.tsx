'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

export interface ActivityType {
  id: number;
  name: string;
  base_points: number;
  color: string;
  created_at: string;
  updated_at?: string;
}

export default function ActivityTypesAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<ActivityType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<ActivityType | null>(null);
  const [formData, setFormData] = useState({ name: '', base_points: 10, color: '#3B82F6' });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) fetchActivityTypes();
  }, [user, authLoading, router]);

  const fetchActivityTypes = async () => {
    try {
      const response = await fetch('/api/activity-types');
      const data = await response.json();
      if (response.ok) setActivityTypes(data.activityTypes || []);
    } catch (e) {
      console.error('Fetch activity types error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type?: ActivityType) => {
    if (type) {
      setEditingType(type);
      setFormData({ name: type.name, base_points: type.base_points, color: type.color });
    } else {
      setEditingType(null);
      setFormData({ name: '', base_points: 10, color: '#3B82F6' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({ name: '', base_points: 10, color: '#3B82F6' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingType ? `/api/activity-types/${editingType.id}` : '/api/activity-types';
    try {
      const response = await fetch(url, {
        method: editingType ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(editingType ? 'Cập nhật thành công' : 'Tạo mới thành công');
        handleCloseModal();
        fetchActivityTypes();
      } else {
        toast.error(data.error || 'Thao tác thất bại');
      }
    } catch (e) {
      console.error('Submit activity type error:', e);
      toast.error('Lỗi khi thực hiện');
    }
  };

  const handleDelete = async (id: number, _name: string) => {
    try {
      const response = await fetch(`/api/activity-types/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        toast.success('Xóa thành công');
        fetchActivityTypes();
      } else {
        toast.error(data.error || 'Xóa thất bại');
      }
    } catch (e) {
      console.error('Delete activity type error:', e);
      toast.error('Lỗi khi xóa');
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🎯 Quản Lý Loại Hoạt Động</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          + Thêm Loại Hoạt Động
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
                Điểm cơ bản
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Màu sắc
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
            {activityTypes.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">{type.id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{type.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                  {type.base_points} điểm
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm text-gray-600">{type.color}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(type.created_at, 'date')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleOpenModal(type)}
                    className="text-green-600 hover:text-green-800 font-medium"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => setTypeToDelete(type)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {activityTypes.length === 0 && (
          <div className="text-center py-12 text-gray-500">Chưa có loại hoạt động nào</div>
        )}
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Tổng số: {activityTypes.length} loại hoạt động
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              {editingType ? 'Chỉnh Sửa Loại Hoạt Động' : 'Thêm Loại Hoạt Động Mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên loại hoạt động *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Điểm cơ bản *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={formData.base_points}
                  onChange={(e) =>
                    setFormData({ ...formData, base_points: parseInt(e.target.value) })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Màu sắc</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 p-2 border border-gray-300 rounded"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  {editingType ? 'Cập nhật' : 'Tạo mới'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
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
        isOpen={typeToDelete !== null}
        title="Xóa loại hoạt động"
        message={
          typeToDelete
            ? `Bạn có chắc chắn muốn xóa loại hoạt động "${typeToDelete.name}" không?`
            : ''
        }
        confirmText="Xóa loại hoạt động"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setTypeToDelete(null)}
        onConfirm={async () => {
          if (!typeToDelete) return;
          await handleDelete(typeToDelete.id, typeToDelete.name);
          setTypeToDelete(null);
        }}
      />
    </div>
  );
}

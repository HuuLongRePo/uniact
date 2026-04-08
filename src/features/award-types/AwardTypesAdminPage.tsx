'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

export interface AwardType {
  id: number;
  name: string;
  description: string;
  min_points: number;
  award_count?: number;
  created_at: string;
}

export default function AwardTypesAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [awardTypes, setAwardTypes] = useState<AwardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<AwardType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<AwardType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    min_points: 100,
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) fetchAwardTypes();
  }, [user, authLoading, router]);

  const fetchAwardTypes = async () => {
    try {
      const response = await fetch('/api/admin/award-types');
      const data = await response.json();
      if (response.ok) setAwardTypes(data.data || []);
    } catch (e) {
      console.error('Fetch award types error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type?: AwardType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description,
        min_points: type.min_points,
      });
    } else {
      setEditingType(null);
      setFormData({ name: '', description: '', min_points: 100 });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({ name: '', description: '', min_points: 100 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingType ? `/api/admin/award-types/${editingType.id}` : '/api/admin/award-types';
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
        fetchAwardTypes();
      } else {
        toast.error(data.error || 'Thao tác thất bại');
      }
    } catch (e) {
      console.error('Submit award type error:', e);
      toast.error('Lỗi khi thực hiện');
    }
  };

  const handleDelete = async (id: number, _name: string) => {
    try {
      const response = await fetch(`/api/admin/award-types/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        toast.success('Xóa thành công');
        fetchAwardTypes();
      } else {
        toast.error(data.error || 'Xóa thất bại');
      }
    } catch (e) {
      console.error('Delete award type error:', e);
      toast.error('Lỗi khi xóa');
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🏆 Quản Lý Loại Danh Hiệu</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          + Thêm Loại Danh Hiệu
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
                Mô tả
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Điểm tối thiểu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Đã cấp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {awardTypes.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">{type.id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{type.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-md" title={type.description}>
                  {type.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                  {type.min_points} điểm
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {type.award_count || 0} danh hiệu
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
        {awardTypes.length === 0 && (
          <div className="text-center py-12 text-gray-500">Chưa có loại danh hiệu nào</div>
        )}
      </div>
      <div className="mt-4 text-sm text-gray-600">Tổng số: {awardTypes.length} loại danh hiệu</div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingType ? 'Chỉnh Sửa Loại Danh Hiệu' : 'Thêm Loại Danh Hiệu Mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên loại danh hiệu *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="VD: Học Bổng Danh Dự"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mô tả (bao gồm cả điều kiện) *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  rows={5}
                  placeholder="VD: Trao cho sinh viên có thành tích học tập và rèn luyện xuất sắc. Yêu cầu: Đạt 500 điểm rèn luyện, điểm trung bình >= 3.5, không vi phạm nội quy..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Điểm tối thiểu *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={formData.min_points}
                  onChange={(e) =>
                    setFormData({ ...formData, min_points: parseInt(e.target.value) })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Số điểm rèn luyện tối thiểu để đủ điều kiện nhận danh hiệu
                </p>
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
        title="Xóa loại danh hiệu"
        message={
          typeToDelete
            ? `Bạn có chắc chắn muốn xóa loại danh hiệu "${typeToDelete.name}" không? Lưu ý: chỉ có thể xóa nếu chưa có danh hiệu nào sử dụng.`
            : ''
        }
        confirmText="Xóa loại danh hiệu"
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

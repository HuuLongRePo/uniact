'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Edit2, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrgLevel {
  id: number;
  name: string;
  point_multiplier: number;
  description: string | null;
}

export default function OrgLevelsConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<OrgLevel[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [levelToDelete, setLevelToDelete] = useState<OrgLevel | null>(null);
  const [formData, setFormData] = useState({ name: '', point_multiplier: '', description: '' });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) fetchLevels();
  }, [user, authLoading, router]);

  const fetchLevels = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/organization-levels');
      const data = await res.json();
      setLevels(data.levels || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.point_multiplier) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const url = editing
        ? `/api/admin/config/org-levels/${editing}`
        : '/api/admin/config/org-levels';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Save failed');

      toast.success(editing ? 'Đã cập nhật' : 'Đã tạo mới');
      setFormData({ name: '', point_multiplier: '', description: '' });
      setEditing(null);
      fetchLevels();
    } catch (_error) {
      toast.error('Lưu thất bại');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/config/org-levels/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

      toast.success('Đã xóa');
      fetchLevels();
    } catch (_error) {
      toast.error('Xóa thất bại');
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🏢 Cấp Độ Tổ Chức</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editing ? 'Chỉnh sửa' : 'Thêm mới'} cấp độ
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Tên cấp độ"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Hệ số"
              value={formData.point_multiplier}
              onChange={(e) => setFormData({ ...formData, point_multiplier: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Mô tả"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {editing ? 'Cập nhật' : 'Thêm'}
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(null);
                  setFormData({ name: '', point_multiplier: '', description: '' });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Hệ số</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mô tả</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {levels.map((level) => (
                <tr key={level.id}>
                  <td className="px-4 py-3 font-medium">{level.name}</td>
                  <td className="px-4 py-3">{level.point_multiplier}x</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{level.description || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(level.id);
                          setFormData({
                            name: level.name,
                            point_multiplier: level.point_multiplier.toString(),
                            description: level.description || '',
                          });
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setLevelToDelete(level)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ConfirmDialog
          isOpen={levelToDelete !== null}
          title="Xóa cấp độ tổ chức"
          message={
            levelToDelete
              ? `Bạn có chắc chắn muốn xóa cấp độ "${levelToDelete.name}" không?`
              : ''
          }
          confirmText="Xóa cấp độ"
          cancelText="Hủy"
          variant="danger"
          onCancel={() => setLevelToDelete(null)}
          onConfirm={async () => {
            if (!levelToDelete) return;
            await handleDelete(levelToDelete.id);
            setLevelToDelete(null);
          }}
        />
      </div>
    </div>
  );
}

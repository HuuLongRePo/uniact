'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

interface ScoringConfigItem {
  id: number;
  name: string;
  point_multiplier: number;
  description: string | null;
  created_at: string;
}

type ConfigType = 'activity_types' | 'organization_levels' | 'achievement_levels';

export default function AdminScoringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ConfigType>('activity_types');
  const [activityTypes, setActivityTypes] = useState<ScoringConfigItem[]>([]);
  const [organizationLevels, setOrganizationLevels] = useState<ScoringConfigItem[]>([]);
  const [achievementLevels, setAchievementLevels] = useState<ScoringConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ScoringConfigItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: ConfigType; id: number } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    point_multiplier: '',
    description: '',
  });

  const fetchActivityTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/activity-types');
      const json = await res.json();
      if (json.success) setActivityTypes(json.data);
    } catch (error) {
      console.error('Error fetching activity types:', error);
    }
  }, []);

  const fetchOrganizationLevels = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/organization-levels');
      const json = await res.json();
      if (json.success) setOrganizationLevels(json.data);
    } catch (error) {
      console.error('Error fetching organization levels:', error);
    }
  }, []);

  const fetchAchievementLevels = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/achievement-levels');
      const json = await res.json();
      if (json.success) setAchievementLevels(json.data);
    } catch (error) {
      console.error('Error fetching achievement levels:', error);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchActivityTypes(), fetchOrganizationLevels(), fetchAchievementLevels()]);
    setLoading(false);
  }, [fetchAchievementLevels, fetchActivityTypes, fetchOrganizationLevels]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      void fetchAllData();
    }
  }, [authLoading, fetchAllData, router, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const endpoint =
      activeTab === 'activity_types'
        ? '/api/admin/activity-types'
        : activeTab === 'organization_levels'
          ? '/api/admin/organization-levels'
          : '/api/admin/achievement-levels';

    const url = editingItem ? `${endpoint}/${editingItem.id}` : endpoint;
    const method = editingItem ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          point_multiplier: parseFloat(formData.point_multiplier),
          description: formData.description || null,
        }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(editingItem ? 'Cập nhật thành công' : 'Tạo mới thành công');
        setShowModal(false);
        setEditingItem(null);
        resetForm();
        void fetchAllData();
      } else {
        toast.error('Lỗi: ' + json.error);
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const endpoint =
      deleteConfirm.type === 'activity_types'
        ? '/api/admin/activity-types'
        : deleteConfirm.type === 'organization_levels'
          ? '/api/admin/organization-levels'
          : '/api/admin/achievement-levels';

    try {
      const res = await fetch(`${endpoint}/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (json.success) {
        toast.success('Xóa thành công');
        setDeleteConfirm(null);
        void fetchAllData();
      } else {
        toast.error('Lỗi: ' + json.error);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const openEditModal = (item: ScoringConfigItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      point_multiplier: item.point_multiplier.toString(),
      description: item.description || '',
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      point_multiplier: '',
      description: '',
    });
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'activity_types':
        return activityTypes;
      case 'organization_levels':
        return organizationLevels;
      case 'achievement_levels':
        return achievementLevels;
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'activity_types':
        return 'Loại Hoạt Động';
      case 'organization_levels':
        return 'Cấp Độ Tổ Chức';
      case 'achievement_levels':
        return 'Mức Thành Tích';
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  const currentData = getCurrentData();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">⚙️ Cấu Hình Chấm Điểm</h1>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Thêm {getTabLabel()}
        </button>
      </div>

      {/* Formula Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-3">📐 Công Thức Tính Điểm</h2>
        <div className="bg-white rounded-lg p-4 font-mono text-sm">
          <div className="text-center text-lg mb-2">
            Điểm = (Điểm cơ bản × <span className="text-blue-600 font-bold">Hệ số loại</span> ×{' '}
            <span className="text-purple-600 font-bold">Hệ số cấp độ</span> ×{' '}
            <span className="text-orange-600 font-bold">Hệ số thành tích</span>) + Thưởng - Phạt
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Base Points × Type Multiplier × Level Multiplier × Achievement Multiplier + Awards -
            Penalties
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('activity_types')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'activity_types'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🎯 Loại Hoạt Động
            </button>
            <button
              onClick={() => setActiveTab('organization_levels')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'organization_levels'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🏢 Cấp Độ Tổ Chức
            </button>
            <button
              onClick={() => setActiveTab('achievement_levels')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'achievement_levels'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🏆 Mức Thành Tích
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hệ số
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Mô tả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Chưa có dữ liệu
                  </td>
                </tr>
              ) : (
                currentData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">
                        ×{item.point_multiplier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ type: activeTab, id: item.id })}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️ Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingItem ? `Sửa ${getTabLabel()}` : `Thêm ${getTabLabel()} Mới`}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Thể thao, Trường, Xuất sắc..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hệ số nhân *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.point_multiplier}
                    onChange={(e) => setFormData({ ...formData, point_multiplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 1.0, 1.5, 2.0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Hệ số càng cao, điểm cộng càng nhiều</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Mô tả chi tiết..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? 'Cập nhật' : 'Tạo mới'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

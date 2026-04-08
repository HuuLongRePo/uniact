'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface Template {
  id: number;
  name: string;
  description: string;
  activity_type_id: number;
  activity_type_name: string;
  organization_level_id: number;
  organization_level_name: string;
  default_duration_hours: number;
  default_max_participants: number;
  qr_enabled: boolean;
  created_at: string;
}

interface ActivityTypeOption {
  id: number;
  name: string;
}

interface OrgLevelOption {
  id: number;
  name: string;
}

export default function ActivityTemplatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeOption[]>([]);
  const [orgLevels, setOrgLevels] = useState<OrgLevelOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    activity_type_id: '',
    organization_level_id: '',
    default_duration_hours: 2,
    default_max_participants: 50,
    qr_enabled: true,
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchTemplates();
      fetchOptions();
    }
  }, [user, authLoading, router]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/activity-templates');
      const data = await res.json();
      if (res.ok) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [typesRes, levelsRes] = await Promise.all([
        fetch('/api/activity-types'),
        fetch('/api/organization-levels'),
      ]);

      const typesData = await typesRes.json();
      const levelsData = await levelsRes.json();

      if (typesRes.ok) setActivityTypes(typesData.types || []);
      if (levelsRes.ok) setOrgLevels(levelsData.levels || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/admin/activity-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Tạo template thành công!');
        setShowForm(false);
        fetchTemplates();
        setFormData({
          name: '',
          description: '',
          activity_type_id: '',
          organization_level_id: '',
          default_duration_hours: 2,
          default_max_participants: 50,
          qr_enabled: true,
        });
      } else {
        toast.error(data.error || 'Tạo template thất bại');
      }
    } catch (error) {
      console.error('Create template error:', error);
      toast.error('Lỗi khi tạo template');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/activity-templates/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Đã xóa template');
        fetchTemplates();
      } else {
        toast.error('Xóa thất bại');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Lỗi khi xóa');
    }
  };

  const handleUseTemplate = (_template: Template) => {
    // Redirect to activities page - user will click "Tạo mới" to open dialog
    router.push(`/teacher/activities`);
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">📋 Mẫu Hoạt Động</h1>
          <p className="text-gray-600 mt-1">Tạo template để tạo hoạt động nhanh hơn</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          {showForm ? '❌ Hủy' : '➕ Tạo Template'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Tạo Template Mới</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tên template *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="VD: Tình nguyện hè"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Loại hoạt động *</label>
                <select
                  required
                  value={formData.activity_type_id}
                  onChange={(e) => setFormData({ ...formData, activity_type_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Chọn loại</option>
                  {activityTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cấp tổ chức *</label>
                <select
                  required
                  value={formData.organization_level_id}
                  onChange={(e) =>
                    setFormData({ ...formData, organization_level_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">Chọn cấp</option>
                  {orgLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Số người tối đa</label>
                <input
                  type="number"
                  value={formData.default_max_participants}
                  onChange={(e) =>
                    setFormData({ ...formData, default_max_participants: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Thời lượng (giờ)</label>
                <input
                  type="number"
                  value={formData.default_duration_hours}
                  onChange={(e) =>
                    setFormData({ ...formData, default_duration_hours: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded"
                  min="1"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.qr_enabled}
                    onChange={(e) => setFormData({ ...formData, qr_enabled: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="font-medium">Bật QR điểm danh</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mô tả mặc định</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={4}
                placeholder="Mô tả chi tiết về hoạt động..."
              />
            </div>

            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-semibold"
            >
              ✓ Lưu Template
            </button>
          </form>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-500 text-lg">Chưa có template nào</p>
            <p className="text-gray-400 text-sm mt-2">
              Tạo template để tái sử dụng cho hoạt động tương tự
            </p>
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow border hover:shadow-lg transition"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold mb-3">{template.name}</h3>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    📋 {template.activity_type_name}
                  </span>
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                    🏆 {template.organization_level_name}
                  </span>
                  {template.qr_enabled && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      📱 QR
                    </span>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{template.description}</p>

                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <div>👥 Tối đa: {template.default_max_participants} người</div>
                  <div>⏱️ Thời lượng: {template.default_duration_hours} giờ</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                  >
                    ✓ Sử dụng
                  </button>
                  <button
                    onClick={() => setTemplateToDelete(template)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={templateToDelete !== null}
        title="Xóa mẫu hoạt động"
        message={
          templateToDelete
            ? `Bạn có chắc chắn muốn xóa template "${templateToDelete.name}" không?`
            : ''
        }
        confirmText="Xóa template"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setTemplateToDelete(null)}
        onConfirm={async () => {
          if (!templateToDelete) return;
          await handleDelete(templateToDelete.id);
          setTemplateToDelete(null);
        }}
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

export interface Config {
  id: number;
  config_key: string;
  config_value: string;
  data_type: string;
  category: string;
  description?: string;
  updated_at: string;
}

const CATEGORIES = [
  { key: 'attendance', label: 'Điểm danh' },
  { key: 'scoring', label: 'Tính điểm' },
  { key: 'warning', label: 'Cảnh báo' },
  { key: 'system', label: 'Hệ thống' },
];

export default function SystemConfigAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('attendance');
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) fetchConfigs(activeTab);
  }, [user, authLoading, router, activeTab]);

  const fetchConfigs = async (category: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/system-config?category=${category}`);
      const data = await res.json();
      if (res.ok) {
        setConfigs(data.configs || []);
        const initial: Record<string, string> = {};
        const configArray = data.configs || [];
        configArray.forEach((c: Config) => {
          initial[c.config_key] = c.config_value;
        });
        setFormValues(initial);
      }
    } catch (e) {
      console.error('Fetch configs error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = configs.map((c) => ({ key: c.config_key, value: formValues[c.config_key] }));
      const res = await fetch('/api/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Đã lưu cấu hình');
        fetchConfigs(activeTab);
      } else {
        toast.error(data.error || 'Lưu thất bại');
      }
    } catch (e) {
      console.error('Save config error:', e);
      toast.error('Lỗi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <ActivitySkeleton count={5} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">⚙️ Cấu Hình Hệ Thống</h1>
      <div className="flex gap-4 border-b mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`pb-2 px-4 font-medium ${activeTab === cat.key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        {configs.length === 0 && (
          <EmptyState
            title="Không tìm thấy dữ liệu"
            message="Hiện chưa có hoạt động nào trong danh sách này."
          />
        )}
        <div className="space-y-6">
          {configs.map((cfg) => (
            <div key={cfg.id} className="border-b pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <label className="block font-medium text-gray-800 mb-1">
                    {cfg.description || cfg.config_key}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Key: {cfg.config_key} | Loại: {cfg.data_type}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  Cập nhật: {formatDate(cfg.updated_at, 'date')}
                </span>
              </div>
              {cfg.data_type === 'number' && (
                <input
                  type="number"
                  value={formValues[cfg.config_key] || ''}
                  onChange={(e) =>
                    setFormValues({ ...formValues, [cfg.config_key]: e.target.value })
                  }
                  className="w-full mt-1 p-2 border rounded"
                />
              )}
              {cfg.data_type === 'string' && (
                <input
                  type="text"
                  value={formValues[cfg.config_key] || ''}
                  onChange={(e) =>
                    setFormValues({ ...formValues, [cfg.config_key]: e.target.value })
                  }
                  className="w-full mt-1 p-2 border rounded"
                />
              )}
              {cfg.data_type === 'boolean' && (
                <select
                  value={formValues[cfg.config_key] || 'false'}
                  onChange={(e) =>
                    setFormValues({ ...formValues, [cfg.config_key]: e.target.value })
                  }
                  className="w-full mt-1 p-2 border rounded"
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              )}
              {cfg.data_type === 'json' && (
                <textarea
                  value={formValues[cfg.config_key] || ''}
                  onChange={(e) =>
                    setFormValues({ ...formValues, [cfg.config_key]: e.target.value })
                  }
                  className="w-full mt-1 p-2 border rounded h-32 font-mono text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : '💾 Lưu Cấu Hình'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from '@/lib/toast';
import TabButton from './TabButton';
import ActivityTypeManager from './ActivityTypeManager';
import LevelMultiplierManager from './LevelMultiplierManager';
import AchievementsTab from './AchievementsTab';
import AwardsTab from './AwardsTab';
import ScoringRulesTab from './ScoringRulesTab';

interface ScoringConfig {
  scoringRules: any[];
  activityTypes: any[];
  organizationLevels: any[];
  achievementMultipliers: any[];
  awardBonuses: any[];
  systemConfig: any[];
}

/**
 * REFACTORED (Phase 6):
 * Original 678-line scoring-config page split into smaller components:
 * - ActivityTypeManager.tsx: Manage activity types
 * - LevelMultiplierManager.tsx: Manage organization level multipliers
 * - AchievementsTab.tsx: Manage achievement ratings
 * - AwardsTab.tsx: Manage award bonuses
 * - ScoringRulesTab.tsx: Manage scoring rules
 * - TabButton.tsx: Reusable tab button component
 * - page.tsx (130L): Main page with state & API management
 *
 * Benefits:
 * ✅ Reduced file complexity (678L → 130L + 5 components)
 * ✅ Each component focuses on one feature
 * ✅ Easier to test and maintain
 * ✅ Better reusability (TabButton used throughout)
 */
export default function ScoringConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'types' | 'levels' | 'achievements' | 'awards' | 'rules'
  >('types');
  const [config, setConfig] = useState<ScoringConfig | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/scoring-config');
      if (!res.ok) throw new Error('Không thể tải cấu hình');
      const data = await res.json();
      setConfig(data);
    } catch (error: any) {
      console.error('Fetch config error:', error);
      toast.error('Không thể tải cấu hình: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (type: string, data: any) => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/scoring-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Update failed');
      }

      toast.success('Cập nhật thành công');
      await fetchConfig();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error('Cập nhật thất bại: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!config) {
    return <div className="p-6">Không có dữ liệu</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">⚙️ Cấu Hình Tính Điểm</h1>
              <p className="text-gray-600 mt-2">
                Tùy chỉnh cách tính điểm rèn luyện cho trường của bạn
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/scoring-config/formula-editor')}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Trình soạn công thức
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <TabButton active={activeTab === 'types'} onClick={() => setActiveTab('types')}>
                📚 Loại Hoạt Động (8)
              </TabButton>
              <TabButton active={activeTab === 'levels'} onClick={() => setActiveTab('levels')}>
                🏛️ Cấp Tổ Chức (5)
              </TabButton>
              <TabButton
                active={activeTab === 'achievements'}
                onClick={() => setActiveTab('achievements')}
              >
                ⭐ Đánh Giá (3)
              </TabButton>
              <TabButton active={activeTab === 'awards'} onClick={() => setActiveTab('awards')}>
                🏆 Giải Thưởng (5)
              </TabButton>
              <TabButton active={activeTab === 'rules'} onClick={() => setActiveTab('rules')}>
                🔢 Công Thức
              </TabButton>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'types' && (
              <ActivityTypeManager
                types={config.activityTypes}
                onUpdate={(data) => handleUpdate('activity_type', data)}
                saving={saving}
              />
            )}
            {activeTab === 'levels' && (
              <LevelMultiplierManager
                levels={config.organizationLevels}
                onUpdate={(data) => handleUpdate('organization_level', data)}
                saving={saving}
              />
            )}
            {activeTab === 'achievements' && (
              <AchievementsTab
                achievements={config.achievementMultipliers}
                onUpdate={(data) => handleUpdate('achievement_multiplier', data)}
                saving={saving}
              />
            )}
            {activeTab === 'awards' && (
              <AwardsTab
                awards={config.awardBonuses}
                onUpdate={(data) => handleUpdate('award_bonus', data)}
                saving={saving}
              />
            )}
            {activeTab === 'rules' && (
              <ScoringRulesTab
                rules={config.scoringRules}
                onUpdate={(data) => handleUpdate('scoring_rule', data)}
                saving={saving}
              />
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Công thức tính điểm hiện tại:</h3>
          <p className="text-blue-800 font-mono">
            Điểm = (Điểm cơ bản × Hệ số cấp độ × Hệ số đánh giá) + Điểm thưởng
          </p>
          <p className="text-blue-700 text-sm mt-2">
            Ví dụ: Hoạt động Học thuật (10 điểm) × Cấp Trường (2.0) × Xuất sắc (1.5) + Giải Nhất
            (20) = <strong>50 điểm</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

type TabKey = 'activities' | 'types' | 'levels' | 'achievements' | 'awards';

interface PointsByActivityItem {
  id: number;
  title: string;
  date_time: string;
  activity_type: string | null;
  organization_level: string | null;
  achievement_level: string | null;
  base_points: number | null;
  type_multiplier: number | null;
  level_multiplier: number | null;
  achievement_multiplier: number | null;
  subtotal: number | null;
  bonus_points: number | null;
  penalty_points: number | null;
  total_points: number | null;
}

interface PointsByTypeItem {
  type_name: string | null;
  type_multiplier: number | null;
  activity_count: number;
  total_points: number;
  avg_points: number;
}

interface PointsByLevelItem {
  level_name: string | null;
  level_multiplier: number | null;
  activity_count: number;
  total_points: number;
  avg_points: number;
}

interface PointsByAchievementItem {
  achievement_level: string | null;
  activity_count: number;
  total_points: number;
  avg_points: number;
}

interface AwardItem {
  id: number;
  award_type: string | null;
  bonus_points: number;
  reason: string | null;
  approved_at: string | null;
  activity_title: string | null;
  approved_by_name: string | null;
}

interface PointsSummary {
  total_base_points: number;
  total_after_multipliers: number;
  total_bonus: number;
  total_penalty: number;
  grand_total: number;
  total_award_points: number;
  final_total: number;
}

interface PointsBreakdown {
  byActivity: PointsByActivityItem[];
  byType: PointsByTypeItem[];
  byLevel: PointsByLevelItem[];
  byAchievement: PointsByAchievementItem[];
  awards: AwardItem[];
  summary: PointsSummary;
}

export default function StudentPointsBreakdownPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PointsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('activities');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }
    if (user) fetchBreakdown();
  }, [user, authLoading, router]);

  const fetchBreakdown = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/points-breakdown');
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || json?.message || 'Không thể tải chi tiết điểm rèn luyện');
      }

      const payload = json?.data || json;
      setData(payload);
    } catch (error) {
      console.error('Error fetching breakdown:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải chi tiết điểm rèn luyện');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <div className="p-6">Không thể tải dữ liệu</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📊 Chi Tiết Điểm Rèn Luyện</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tổng điểm cơ bản</div>
          <div className="text-2xl font-bold text-blue-600">
            {data.summary.total_base_points || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Sau hệ số nhân</div>
          <div className="text-2xl font-bold text-purple-600">
            {data.summary.total_after_multipliers || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Điểm thưởng</div>
          <div className="text-2xl font-bold text-green-600">+{data.summary.total_bonus || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tổng cộng</div>
          <div className="text-3xl font-bold text-orange-600">{data.summary.final_total || 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { key: 'activities', label: 'Theo hoạt động' },
              { key: 'types', label: 'Theo loại' },
              { key: 'levels', label: 'Theo cấp độ' },
              { key: 'achievements', label: 'Theo thành tích' },
              { key: 'awards', label: 'Giải thưởng' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`px-6 py-3 font-medium ${
                  activeTab === tab.key
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* By Activity */}
          {activeTab === 'activities' && (
            <div className="space-y-3">
              {data.byActivity.length === 0 ? (
                <p className="text-gray-500">Chưa có hoạt động nào</p>
              ) : (
                data.byActivity.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{activity.title}</h3>
                        <div className="text-sm text-gray-600">
                          {formatDate(activity.date_time, 'date')} •
                          {activity.activity_type} • {activity.organization_level}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {activity.total_points || 0}
                        </div>
                        {activity.achievement_level && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {activity.achievement_level}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>
                        Base: {activity.base_points} × Type: {activity.type_multiplier} × Level:{' '}
                        {activity.level_multiplier} × Achievement: {activity.achievement_multiplier}{' '}
                        = {activity.subtotal}
                      </div>
                      {activity.bonus_points > 0 && (
                        <div className="text-green-600">+ Bonus: {activity.bonus_points}</div>
                      )}
                      {activity.penalty_points > 0 && (
                        <div className="text-red-600">- Penalty: {activity.penalty_points}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* By Type */}
          {activeTab === 'types' && (
            <div className="space-y-3">
              {data.byType.map((type, idx: number) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{type.type_name}</h3>
                      <div className="text-sm text-gray-600">
                        {type.activity_count} hoạt động • Hệ số: ×{type.type_multiplier}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{type.total_points}</div>
                      <div className="text-sm text-gray-500">
                        TB: {type.avg_points.toFixed(1)}/HĐ
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* By Level */}
          {activeTab === 'levels' && (
            <div className="space-y-3">
              {data.byLevel.map((level, idx: number) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{level.level_name}</h3>
                      <div className="text-sm text-gray-600">
                        {level.activity_count} hoạt động • Hệ số: ×{level.level_multiplier}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">{level.total_points}</div>
                      <div className="text-sm text-gray-500">
                        TB: {level.avg_points.toFixed(1)}/HĐ
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* By Achievement */}
          {activeTab === 'achievements' && (
            <div className="space-y-3">
              {data.byAchievement.map((ach, idx: number) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold capitalize">{ach.achievement_level}</h3>
                      <div className="text-sm text-gray-600">{ach.activity_count} hoạt động</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">{ach.total_points}</div>
                      <div className="text-sm text-gray-500">
                        TB: {ach.avg_points.toFixed(1)}/HĐ
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Awards */}
          {activeTab === 'awards' && (
            <div className="space-y-3">
              {data.awards.length === 0 ? (
                <p className="text-gray-500">Chưa có giải thưởng nào</p>
              ) : (
                data.awards.map((award, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4 bg-yellow-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🏆</span>
                          <h3 className="font-semibold">{award.award_type}</h3>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {award.activity_title && `${award.activity_title} • `}
                          {award.reason}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Phê duyệt: {award.approved_at ? formatDate(award.approved_at, 'date') : '-'} bởi{' '}
                          {award.approved_by_name}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-yellow-600">
                        +{award.bonus_points}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

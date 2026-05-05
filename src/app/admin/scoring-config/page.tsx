'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calculator,
  Layers3,
  ListChecks,
  Medal,
  Scale,
  SlidersHorizontal,
} from 'lucide-react';
import TabButton from './TabButton';
import ActivityTypeManager from './ActivityTypeManager';
import LevelMultiplierManager from './LevelMultiplierManager';
import AchievementsTab from './AchievementsTab';
import AwardsTab from './AwardsTab';
import ScoringRulesTab from './ScoringRulesTab';
import { type ScoringConfig, type ScoringConfigUpdatePayload } from './types';

type TabKey = 'types' | 'levels' | 'achievements' | 'awards' | 'rules';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const TAB_META: Array<{
  key: TabKey;
  label: string;
}> = [
  { key: 'types', label: 'Loai hoat dong' },
  { key: 'levels', label: 'Cap to chuc' },
  { key: 'achievements', label: 'Danh gia' },
  { key: 'awards', label: 'Thuong them' },
  { key: 'rules', label: 'Cong thuc' },
];

export default function ScoringConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('types');
  const [config, setConfig] = useState<ScoringConfig | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/scoring-config');
      if (!response.ok) throw new Error('Khong the tai cau hinh tinh diem');
      const payload = (await response.json()) as ScoringConfig;
      setConfig(payload);
    } catch (error) {
      console.error('Fetch scoring config error:', error);
      toast.error(getErrorMessage(error, 'Khong the tai cau hinh tinh diem'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      void fetchConfig();
    }
  }, [fetchConfig, user]);

  const handleUpdate = async (
    type:
      | 'activity_type'
      | 'organization_level'
      | 'achievement_multiplier'
      | 'award_bonus'
      | 'scoring_rule',
    data: ScoringConfigUpdatePayload
  ) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/scoring-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Cap nhat that bai'
        );
      }

      toast.success('Da cap nhat cau hinh tinh diem');
      await fetchConfig();
    } catch (error) {
      console.error('Update scoring config error:', error);
      toast.error(getErrorMessage(error, 'Cap nhat cau hinh that bai'));
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    if (!config) {
      return {
        activityTypes: 0,
        organizationLevels: 0,
        achievementMultipliers: 0,
        awardBonuses: 0,
        scoringRules: 0,
      };
    }

    return {
      activityTypes: config.activityTypes.length,
      organizationLevels: config.organizationLevels.length,
      achievementMultipliers: config.achievementMultipliers.length,
      awardBonuses: config.awardBonuses.length,
      scoringRules: config.scoringRules.length,
    };
  }, [config]);

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai scoring config..." />;
  }

  if (!config) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-4xl rounded-[1.75rem] bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
          Khong co du lieu scoring config.
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                href="/admin/dashboard"
                className="rounded-xl border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Scoring config
                </div>
                <h1
                  className="mt-3 text-3xl font-bold text-slate-900"
                  data-testid="admin-scoring-config-heading"
                >
                  Dieu phoi cong thuc tinh diem
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Chot diem co ban, he so cap to chuc, muc danh gia va diem thuong de toan bo luong
                  tinh diem trong he thong van hanh nhat quan.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/admin/scoring-config/formula-editor')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Calculator className="h-4 w-4" />
              Mo formula editor
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-[1.5rem] bg-blue-50 px-4 py-4 text-blue-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Loai hoat dong</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.activityTypes}</div>
              </div>
              <Layers3 className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-violet-50 px-4 py-4 text-violet-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Cap to chuc</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.organizationLevels}</div>
              </div>
              <Scale className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-amber-50 px-4 py-4 text-amber-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Muc danh gia</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  {stats.achievementMultipliers}
                </div>
              </div>
              <ListChecks className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-emerald-50 px-4 py-4 text-emerald-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Thuong them</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.awardBonuses}</div>
              </div>
              <Medal className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-slate-100 px-4 py-4 text-slate-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Cong thuc</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.scoringRules}</div>
              </div>
              <SlidersHorizontal className="h-8 w-8" />
            </div>
          </article>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
          <div className="overflow-x-auto">
            <nav className="flex min-w-max gap-2 border-b border-slate-200 pb-3">
              {TAB_META.map((tab) => {
                const count =
                  tab.key === 'types'
                    ? stats.activityTypes
                    : tab.key === 'levels'
                      ? stats.organizationLevels
                      : tab.key === 'achievements'
                        ? stats.achievementMultipliers
                        : tab.key === 'awards'
                          ? stats.awardBonuses
                          : stats.scoringRules;

                return (
                  <TabButton
                    key={tab.key}
                    active={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label} ({count})
                  </TabButton>
                );
              })}
            </nav>
          </div>

          <div className="pt-6">
            {activeTab === 'types' && (
              <ActivityTypeManager
                types={config.activityTypes}
                onUpdate={(data) => void handleUpdate('activity_type', data)}
                saving={saving}
              />
            )}
            {activeTab === 'levels' && (
              <LevelMultiplierManager
                levels={config.organizationLevels}
                onUpdate={(data) => void handleUpdate('organization_level', data)}
                saving={saving}
              />
            )}
            {activeTab === 'achievements' && (
              <AchievementsTab
                achievements={config.achievementMultipliers}
                onUpdate={(data) => void handleUpdate('achievement_multiplier', data)}
                saving={saving}
              />
            )}
            {activeTab === 'awards' && (
              <AwardsTab
                awards={config.awardBonuses}
                onUpdate={(data) => void handleUpdate('award_bonus', data)}
                saving={saving}
              />
            )}
            {activeTab === 'rules' && (
              <ScoringRulesTab
                rules={config.scoringRules}
                onUpdate={(data) => void handleUpdate('scoring_rule', data)}
                saving={saving}
              />
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-blue-200 bg-blue-50 px-5 py-5 text-sm text-blue-900 sm:px-7">
          <div className="font-semibold">Cong thuc chuan hien tai</div>
          <div className="mt-2 font-mono text-blue-800">
            Diem = (base_points x level_multiplier x achievement_multiplier) + bonus_points
          </div>
          <p className="mt-3 text-blue-800">
            Goi y: chi doi he so khi da thong nhat voi quy che hien tai. Neu can thu cong thuc moi,
            chuyen sang formula editor de preview truoc khi ap dung.
          </p>
        </section>
      </div>
    </div>
  );
}

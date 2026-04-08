'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface ScoreDistributionItem {
  range: string;
  count: number;
}

interface ScoreStats {
  average: number;
  median: number;
  max: number;
  min: number;
  distribution: ScoreDistributionItem[];
}

const EMPTY_STATS: ScoreStats = {
  average: 0,
  median: 0,
  max: 0,
  min: 0,
  distribution: [],
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function getScoreStatsFromResponse(payload: unknown): ScoreStats {
  if (!payload || typeof payload !== 'object') {
    return EMPTY_STATS;
  }

  const normalized = payload as {
    data?: { stats?: Partial<ScoreStats> };
    stats?: Partial<ScoreStats>;
  };

  const stats = normalized.data?.stats ?? normalized.stats ?? {};
  const distribution = Array.isArray(stats.distribution)
    ? stats.distribution
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const record = item as Partial<ScoreDistributionItem>;

          return {
            range: typeof record.range === 'string' ? record.range : 'Khác',
            count: toNumber(record.count),
          };
        })
        .filter((item): item is ScoreDistributionItem => item !== null)
    : [];

  return {
    average: toNumber(stats.average),
    median: toNumber(stats.median),
    max: toNumber(stats.max),
    min: toNumber(stats.min),
    distribution,
  };
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const normalized = payload as {
    error?: string;
    message?: string;
  };

  return normalized.error ?? normalized.message ?? fallback;
}

export default function ScoreReportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState<ScoreStats>(EMPTY_STATS);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchReport();
    }
  }, [authLoading, router, user]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await fetch('/api/admin/reports/scores');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data, 'Không thể tải báo cáo điểm.'));
      }

      setStats(getScoreStatsFromResponse(data));
    } catch (error) {
      console.error('Score report fetch error:', error);
      setStats(EMPTY_STATS);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tải báo cáo điểm.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Báo cáo điểm</h1>
          <p className="mt-2 text-sm text-gray-600">
            Theo dõi phân bố điểm tích lũy của sinh viên trên toàn hệ thống.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Điểm trung bình</p>
            <p className="text-3xl font-bold text-blue-600">{formatScore(stats.average)}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Điểm trung vị</p>
            <p className="text-3xl font-bold text-green-600">{formatScore(stats.median)}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Điểm cao nhất</p>
            <p className="text-3xl font-bold text-purple-600">{formatScore(stats.max)}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Điểm thấp nhất</p>
            <p className="text-3xl font-bold text-orange-600">{formatScore(stats.min)}</p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">Phân bố điểm</h2>
          {stats.distribution.length === 0 ? (
            <div className="rounded border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              Chưa có dữ liệu phân bố điểm để hiển thị.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

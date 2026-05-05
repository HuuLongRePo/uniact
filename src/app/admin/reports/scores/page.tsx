'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
            range: typeof record.range === 'string' ? record.range : 'Khac',
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
        throw new Error(getErrorMessage(data, 'Khong the tai bao cao diem.'));
      }

      setStats(getScoreStatsFromResponse(data));
    } catch (error) {
      console.error('Score report fetch error:', error);
      setStats(EMPTY_STATS);
      setErrorMessage(error instanceof Error ? error.message : 'Khong the tai bao cao diem.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai bao cao diem..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Score analytics
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Bao cao diem so</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Theo doi phan bo diem tich luy, mat bang chung cua he thong va do lech giua cac
              nhom hoc vien.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchReport()}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tai lai
            </button>
            <Link
              href="/admin/reports"
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              Ve trung tam bao cao
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-cyan-800">Diem trung binh</div>
            <div className="mt-3 text-3xl font-semibold text-cyan-950">{formatScore(stats.average)}</div>
          </article>
          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-800">Diem trung vi</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-950">{formatScore(stats.median)}</div>
          </article>
          <article className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-800">Diem cao nhat</div>
            <div className="mt-3 text-3xl font-semibold text-violet-950">{formatScore(stats.max)}</div>
          </article>
          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-amber-800">Diem thap nhat</div>
            <div className="mt-3 text-3xl font-semibold text-amber-950">{formatScore(stats.min)}</div>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-slate-950">Phan bo diem</h2>
          <p className="text-sm text-slate-500">
            Doi soat xem he thong dang tap trung o dai diem nao de can bang chinh sach tinh diem.
          </p>
        </div>

        {stats.distribution.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Chua co du lieu phan bo diem de hien thi.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="min-h-[320px] rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0891b2" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              {stats.distribution.map((item) => (
                <article
                  key={item.range}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-semibold text-slate-950">{item.range}</div>
                    <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-cyan-700 shadow-sm">
                      {item.count}
                    </div>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-cyan-600"
                      style={{
                        width: `${Math.max(
                          (item.count / Math.max(...stats.distribution.map((entry) => entry.count), 1)) * 100,
                          8
                        )}%`,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

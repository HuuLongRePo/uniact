'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, BellRing, CheckCircle2, Clock3 } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/formatters';

interface AlertItem {
  id: number;
  type: 'low_attendance' | 'deadline' | 'achievement';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  created_at: string;
}

function resolveAlertTone(severity: AlertItem['severity']) {
  if (severity === 'error') {
    return {
      badge: 'Không thể bỏ qua',
      wrapper: 'border-rose-200 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10',
      text: 'text-rose-800 dark:text-rose-200',
      icon: AlertTriangle,
    };
  }

  if (severity === 'warning') {
    return {
      badge: 'Cần xử lý sớm',
      wrapper: 'border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10',
      text: 'text-amber-900 dark:text-amber-200',
      icon: Clock3,
    };
  }

  return {
    badge: 'Thông tin',
    wrapper: 'border-blue-200 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10',
    text: 'text-blue-800 dark:text-blue-200',
    icon: BellRing,
  };
}

export default function StudentAlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchAlerts();
    }
  }, [authLoading, router, user]);

  async function fetchAlerts() {
    try {
      setLoading(true);
      const response = await fetch('/api/student/alerts');
      const payload = await response.json();
      setAlerts(payload?.alerts || payload?.data?.alerts || []);
    } catch (error) {
      console.error('Fetch alerts error:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }

  const criticalCount = useMemo(
    () => alerts.filter((alert) => alert.severity === 'error' || alert.severity === 'warning').length,
    [alerts]
  );

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                Nhắc nhở cá nhân
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">Cảnh báo và nhắc nhở</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Tổng hợp các cảnh báo về điểm danh, hạn xử lý và những mốc học viên cần chú ý.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[20rem]">
              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                  Cần xử lý
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{criticalCount}</div>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                  Tổng cảnh báo
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{alerts.length}</div>
              </div>
            </div>
          </div>
        </section>

        <StudentDailyQuickActions />

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          {alerts.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center dark:border-slate-600 dark:bg-slate-800/60">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">Không có cảnh báo nào</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Hiện tại không có mục nào cần học viên xử lý thêm.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                const tone = resolveAlertTone(alert.severity);
                const Icon = tone.icon;

                return (
                  <article
                    key={alert.id}
                    className={`rounded-[1.5rem] border p-4 shadow-sm ${tone.wrapper}`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm dark:bg-slate-900 ${tone.text}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {tone.badge}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(alert.created_at)}</span>
                        </div>
                        <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{alert.title}</h2>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{alert.message}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

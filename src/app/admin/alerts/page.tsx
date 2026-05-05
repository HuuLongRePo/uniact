'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleAlert,
  Info,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatVietnamDateTime } from '@/lib/timezone';

type AlertLevel = 'critical' | 'warning' | 'info';

type AlertItem = {
  id: number;
  level: AlertLevel;
  message: string;
  related_table: string | null;
  related_id: number | null;
  is_read: boolean;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

type AlertSummary = {
  total_alerts: number;
  unread_alerts: number;
  unresolved_alerts: number;
  critical_alerts: number;
  warning_alerts: number;
  info_alerts: number;
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'slate' | 'amber' | 'rose' | 'blue';
}) {
  const toneClass =
    tone === 'rose'
      ? 'bg-rose-50 text-rose-700'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'blue'
          ? 'bg-blue-50 text-blue-700'
          : 'bg-slate-100 text-slate-700';

  return (
    <div className={`rounded-[1.5rem] px-4 py-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function getLevelMeta(level: AlertLevel) {
  if (level === 'critical') {
    return {
      label: 'Critical',
      icon: ShieldAlert,
      badgeClass: 'bg-rose-100 text-rose-700',
      cardClass: 'border-rose-200 bg-rose-50',
    };
  }

  if (level === 'warning') {
    return {
      label: 'Warning',
      icon: AlertTriangle,
      badgeClass: 'bg-amber-100 text-amber-700',
      cardClass: 'border-amber-200 bg-amber-50',
    };
  }

  return {
    label: 'Info',
    icon: Info,
    badgeClass: 'bg-blue-100 text-blue-700',
    cardClass: 'border-blue-200 bg-blue-50',
  };
}

const EMPTY_SUMMARY: AlertSummary = {
  total_alerts: 0,
  unread_alerts: 0,
  unresolved_alerts: 0,
  critical_alerts: 0,
  warning_alerts: 0,
  info_alerts: 0,
};

export default function AdminAlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<AlertSummary>(EMPTY_SUMMARY);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [levelFilter, setLevelFilter] = useState<'all' | AlertLevel>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [error, setError] = useState('');
  const [submittingAction, setSubmittingAction] = useState<'read' | 'resolve' | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/alerts');
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai canh bao');
      }

      setAlerts(payload?.alerts || payload?.data?.alerts || []);
      setSummary(payload?.summary || payload?.data?.summary || EMPTY_SUMMARY);
      setSelectedIds([]);
    } catch (fetchError) {
      console.error('Fetch admin alerts error:', fetchError);
      setAlerts([]);
      setSummary(EMPTY_SUMMARY);
      setError(fetchError instanceof Error ? fetchError.message : 'Khong the tai canh bao');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchAlerts();
    }
  }, [authLoading, fetchAlerts, router, user]);

  const visibleAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (showUnreadOnly && alert.is_read) return false;
      if (levelFilter !== 'all' && alert.level !== levelFilter) return false;
      return true;
    });
  }, [alerts, levelFilter, showUnreadOnly]);

  const selectedVisibleIds = useMemo(
    () => visibleAlerts.map((alert) => alert.id).filter((id) => selectedIds.includes(id)),
    [selectedIds, visibleAlerts]
  );

  async function updateAlerts(action: 'read' | 'resolve', ids: number[]) {
    if (ids.length === 0) {
      toast.error('Chon it nhat mot canh bao');
      return;
    }

    try {
      setSubmittingAction(action);

      const results = await Promise.all(
        ids.map(async (alertId) => {
          const response = await fetch('/api/alerts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alertId, action }),
          });

          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(payload?.error || payload?.message || 'Cap nhat canh bao that bai');
          }

          return payload;
        })
      );

      toast.success(
        action === 'read'
          ? `Da danh dau ${results.length} canh bao la da doc`
          : `Da xu ly ${results.length} canh bao`
      );
      await fetchAlerts();
    } catch (updateError) {
      console.error('Update alerts error:', updateError);
      toast.error(
        updateError instanceof Error ? updateError.message : 'Khong the cap nhat canh bao'
      );
    } finally {
      setSubmittingAction(null);
    }
  }

  function toggleSelected(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleSelectVisible() {
    const visibleIds = visibleAlerts.map((alert) => alert.id);
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  if (authLoading || (loading && alerts.length === 0 && !error)) {
    return <LoadingSpinner message="Dang tai canh bao he thong..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Alert operations
              </div>
              <h1
                className="mt-3 text-3xl font-bold text-slate-900"
                data-testid="admin-alerts-heading"
              >
                Canh bao he thong
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Theo doi canh bao chua doc, muc do nghiem trong va xu ly nhanh cac diem nong van
                hanh cua he thong.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchAlerts()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Lam moi
            </button>
          </div>
        </section>

        {error ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="text-sm font-semibold text-rose-700">Co loi khi tai canh bao</div>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Tong canh bao" value={String(summary.total_alerts)} tone="slate" />
          <SummaryCard
            label="Chua doc"
            value={String(summary.unread_alerts)}
            tone="amber"
          />
          <SummaryCard
            label="Critical"
            value={String(summary.critical_alerts)}
            tone="rose"
          />
          <SummaryCard
            label="Chua xu ly"
            value={String(summary.unresolved_alerts)}
            tone="blue"
          />
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(['all', 'critical', 'warning', 'info'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLevelFilter(item)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    levelFilter === item
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item === 'all' ? 'Tat ca' : item}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowUnreadOnly((current) => !current)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  showUnreadOnly
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Chi xem chua doc
              </button>
            </div>

            <div className="text-sm text-slate-500">
              Dang hien thi {visibleAlerts.length} / {alerts.length} canh bao
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <button
              type="button"
              onClick={toggleSelectVisible}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {selectedVisibleIds.length === visibleAlerts.length && visibleAlerts.length > 0
                ? 'Bo chon nhung muc dang hien thi'
                : 'Chon nhung muc dang hien thi'}
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={submittingAction !== null}
                onClick={() => void updateAlerts('read', selectedIds)}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingAction === 'read' ? 'Dang cap nhat...' : 'Danh dau da doc'}
              </button>
              <button
                type="button"
                disabled={submittingAction !== null}
                onClick={() => void updateAlerts('resolve', selectedIds)}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {submittingAction === 'resolve' ? 'Dang xu ly...' : 'Danh dau da xu ly'}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {visibleAlerts.length === 0 ? (
            <div className="page-surface rounded-[1.75rem] border-dashed px-5 py-10 text-center sm:px-7">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
                <Bell className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">Khong co canh bao nao</h2>
              <p className="mt-2 text-sm text-slate-600">
                Dieu chinh bo loc hoac lam moi de kiem tra them su kien moi.
              </p>
            </div>
          ) : (
            visibleAlerts.map((alert) => {
              const levelMeta = getLevelMeta(alert.level);
              const Icon = levelMeta.icon;

              return (
                <article
                  key={alert.id}
                  className={`page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7 ${levelMeta.cardClass}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(alert.id)}
                        onChange={() => toggleSelected(alert.id)}
                        className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300"
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${levelMeta.badgeClass}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {levelMeta.label}
                          </span>
                          {!alert.is_read ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                              Chua doc
                            </span>
                          ) : null}
                          {alert.resolved ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                              Da xu ly
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                              Dang mo
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-base font-semibold text-slate-900">{alert.message}</p>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>{formatVietnamDateTime(alert.created_at)}</span>
                          {alert.related_table ? (
                            <span>
                              Doi tuong: {alert.related_table}
                              {alert.related_id ? ` #${alert.related_id}` : ''}
                            </span>
                          ) : null}
                          {alert.resolved_at ? (
                            <span>Xu ly luc {formatVietnamDateTime(alert.resolved_at)}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      {!alert.is_read ? (
                        <button
                          type="button"
                          onClick={() => void updateAlerts('read', [alert.id])}
                          className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                        >
                          Danh dau da doc
                        </button>
                      ) : null}
                      {!alert.resolved ? (
                        <button
                          type="button"
                          onClick={() => void updateAlerts('resolve', [alert.id])}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Danh dau da xu ly
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-800">
                          <CircleAlert className="h-4 w-4" />
                          Da xu ly
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

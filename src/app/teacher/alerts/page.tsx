'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

type AlertItem = {
  id: number;
  level: 'critical' | 'warning' | 'info';
  message: string;
  is_read: boolean;
  resolved: boolean;
  related_table?: string | null;
  related_id?: number | null;
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

const EMPTY_SUMMARY: AlertSummary = {
  total_alerts: 0,
  unread_alerts: 0,
  unresolved_alerts: 0,
  critical_alerts: 0,
  warning_alerts: 0,
  info_alerts: 0,
};

function resolveAlertTone(level: AlertItem['level']) {
  if (level === 'critical') {
    return {
      badge: 'Khancap',
      wrapper: 'border-rose-200 bg-rose-50',
      text: 'text-rose-800',
      icon: ShieldAlert,
    };
  }

  if (level === 'warning') {
    return {
      badge: 'Can xu ly',
      wrapper: 'border-amber-200 bg-amber-50',
      text: 'text-amber-900',
      icon: AlertTriangle,
    };
  }

  return {
    badge: 'Thong tin',
    wrapper: 'border-blue-200 bg-blue-50',
    text: 'text-blue-800',
    icon: BellRing,
  };
}

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || 'Khong the cap nhat canh bao');
  }
  return payload;
}

export default function TeacherAlertsPage() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<AlertSummary>(EMPTY_SUMMARY);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/alerts');
      const payload = await parseResponse(response);
      const normalizedAlerts = payload?.data?.alerts || payload?.alerts || [];
      const normalizedSummary = payload?.data?.summary || payload?.summary || EMPTY_SUMMARY;
      setAlerts(normalizedAlerts);
      setSummary({ ...EMPTY_SUMMARY, ...normalizedSummary });
    } catch (error) {
      console.error('Fetch teacher alerts error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai canh bao');
      setAlerts([]);
      setSummary(EMPTY_SUMMARY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAlerts();
  }, []);

  const unresolvedAlerts = useMemo(
    () => alerts.filter((alert) => !alert.resolved),
    [alerts]
  );

  const toggleAlert = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === alerts.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(alerts.map((alert) => alert.id));
  };

  const applyAction = async (ids: number[], action: 'read' | 'resolve') => {
    if (ids.length === 0) {
      toast.error('Hay chon it nhat mot canh bao');
      return;
    }

    try {
      setBusy(true);
      await Promise.all(
        ids.map((alertId) =>
          fetch('/api/alerts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alertId, action }),
          }).then(parseResponse)
        )
      );

      setSelectedIds([]);
      await fetchAlerts();
      toast.success(action === 'read' ? 'Da danh dau da doc' : 'Da danh dau da xu ly');
    } catch (error) {
      console.error('Update teacher alerts error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the cap nhat canh bao');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Alert center
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Canh bao cua toi</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Tong hop cac nhac nho, canh bao va hotspot teacher can xu ly trong qua trinh van hanh.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[24rem]">
              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Chua doc
                </div>
                <div
                  className="mt-2 text-3xl font-bold text-slate-900"
                  data-testid="teacher-alert-unread-count"
                >
                  {summary.unread_alerts}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                  Chua xu ly
                </div>
                <div
                  className="mt-2 text-3xl font-bold text-slate-900"
                  data-testid="teacher-alert-unresolved-count"
                >
                  {summary.unresolved_alerts}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Tong canh bao
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{summary.total_alerts}</div>
          </div>
          <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              Critical
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{summary.critical_alerts}</div>
          </div>
          <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Warning
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{summary.warning_alerts}</div>
          </div>
          <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Dang mo
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{unresolvedAlerts.length}</div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Danh sach canh bao</h2>
              <p className="mt-2 text-sm text-slate-600">
                Chon nhieu muc de danh dau da doc, hoac danh dau da xu ly voi cac hotspot da closeout.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={toggleAll}
                disabled={busy || alerts.length === 0}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {selectedIds.length === alerts.length && alerts.length > 0 ? 'Bo chon tat ca' : 'Chon tat ca'}
              </button>
              <button
                type="button"
                onClick={() => void applyAction(selectedIds, 'read')}
                disabled={busy || selectedIds.length === 0}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Danh dau da doc
              </button>
              <button
                type="button"
                onClick={() => void applyAction(selectedIds, 'resolve')}
                disabled={busy || selectedIds.length === 0}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Danh dau da xu ly
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              Dang tai canh bao...
            </div>
          ) : alerts.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-4 text-xl font-bold text-slate-900">Khong co canh bao nao</h3>
              <p className="mt-2 text-sm text-slate-600">
                He thong se cap nhat ngay tai day khi co alert moi cho teacher.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {alerts.map((alert) => {
                const tone = resolveAlertTone(alert.level);
                const Icon = tone.icon;
                const isSelected = selectedIds.includes(alert.id);

                return (
                  <article
                    key={alert.id}
                    className={`rounded-[1.5rem] border p-4 shadow-sm ${tone.wrapper}`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAlert(alert.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm ${tone.text}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {tone.badge}
                            </span>
                            {!alert.is_read ? (
                              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                                Moi
                              </span>
                            ) : null}
                            {!alert.resolved ? (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                                Dang mo
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                                Da xu ly
                              </span>
                            )}
                            <span className="text-xs text-slate-500">{formatDate(alert.created_at)}</span>
                          </div>
                          <p className="mt-3 text-sm font-medium text-slate-900">{alert.message}</p>
                          {(alert.related_table || alert.related_id) && (
                            <p className="mt-2 text-xs text-slate-500">
                              Nguon: {alert.related_table || 'N/A'}
                              {alert.related_id ? ` #${alert.related_id}` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                        {!alert.is_read ? (
                          <button
                            type="button"
                            onClick={() => void applyAction([alert.id], 'read')}
                            disabled={busy}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            Danh dau da doc
                          </button>
                        ) : null}
                        {!alert.resolved ? (
                          <button
                            type="button"
                            onClick={() => void applyAction([alert.id], 'resolve')}
                            disabled={busy}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Da xu ly
                          </button>
                        ) : null}
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

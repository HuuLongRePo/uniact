'use client';

import { FileText } from 'lucide-react';
import { formatVietnamDateTime } from '@/lib/timezone';
import { AuditLog } from './types';

interface AuditTableProps {
  logs: AuditLog[];
  onViewDetails: (log: AuditLog) => void;
}

function getActionBadgeClass(action: string) {
  const upperAction = action.toUpperCase();
  if (upperAction.includes('CREATE')) return 'bg-emerald-100 text-emerald-700';
  if (upperAction.includes('UPDATE') || upperAction.includes('CHANGE'))
    return 'bg-blue-100 text-blue-700';
  if (upperAction.includes('DELETE')) return 'bg-rose-100 text-rose-700';
  if (upperAction.includes('APPROVE') || upperAction.includes('PUBLISH'))
    return 'bg-violet-100 text-violet-700';
  return 'bg-slate-100 text-slate-700';
}

export default function AuditTable({ logs, onViewDetails }: AuditTableProps) {
  if (logs.length === 0) {
    return (
      <div className="page-surface rounded-[1.75rem] border-dashed px-5 py-10 text-center sm:px-7">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
          <FileText className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Khong co audit log nao</h2>
        <p className="mt-2 text-sm text-slate-600">
          Thu mo rong khoang thoi gian hoac bo loc de tim thay su kien can doi soat.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:hidden">
        {logs.map((log) => (
          <article
            key={log.id}
            className="page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Log #{log.id}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getActionBadgeClass(log.action)}`}
                >
                  {log.action}
                </span>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {log.actor_name || `User #${log.actor_id || '-'}`}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {log.actor_email || 'Khong co email'} | {log.actor_role || 'unknown'}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thoi gian
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {formatVietnamDateTime(log.created_at)}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Doi tuong
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {log.target_table || '-'}
                    {log.target_id ? ` #${log.target_id}` : ''}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tom tat
                </div>
                <div className="mt-2 break-words">
                  {log.details || 'Khong co noi dung chi tiet.'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onViewDetails(log)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Xem chi tiet
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="page-surface hidden overflow-x-auto rounded-[1.75rem] border xl:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Log
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actor
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Action
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Doi tuong
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tom tat
              </th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Chi tiet
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {logs.map((log) => (
              <tr key={log.id} className="align-top hover:bg-slate-50">
                <td className="px-5 py-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">#{log.id}</div>
                  <div className="mt-1">{formatVietnamDateTime(log.created_at)}</div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">
                    {log.actor_name || `User #${log.actor_id || '-'}`}
                  </div>
                  <div className="mt-1">{log.actor_email || 'Khong co email'}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                    {log.actor_role || 'unknown'}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getActionBadgeClass(log.action)}`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {log.target_table || '-'}
                  {log.target_id ? ` #${log.target_id}` : ''}
                </td>
                <td className="max-w-sm px-5 py-4 text-sm text-slate-600">
                  <div className="line-clamp-2 break-words">
                    {log.details || 'Khong co noi dung chi tiet.'}
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onViewDetails(log)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

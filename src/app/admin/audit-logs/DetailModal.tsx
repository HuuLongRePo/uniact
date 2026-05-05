'use client';

import { AuditLog } from './types';
import { formatVietnamDateTime } from '@/lib/timezone';

interface DetailModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

export default function DetailModal({ log, onClose }: DetailModalProps) {
  if (!log) return null;

  return (
    <div
      className="app-modal-backdrop p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-audit-log-detail-title"
        className="app-modal-panel app-modal-panel-scroll w-full max-w-3xl p-6 sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Audit detail
            </div>
            <h3 id="admin-audit-log-detail-title" className="mt-2 text-2xl font-bold text-slate-900">
              Log #{log.id}
            </h3>
            <p className="mt-2 text-sm text-slate-500">{formatVietnamDateTime(log.created_at)}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Dong
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actor</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {log.actor_name || `User #${log.actor_id || '-'}`}
            </div>
            <div className="mt-1 text-sm text-slate-500">{log.actor_email || 'Khong co email'}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
              {log.actor_role || 'unknown'}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{log.action}</div>
            <div className="mt-1 text-sm text-slate-500">
              {log.target_table || '-'}
              {log.target_id ? ` #${log.target_id}` : ''}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chi tiet</div>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-sm text-slate-800">
            {log.details || 'Khong co noi dung chi tiet.'}
          </pre>
        </div>
      </div>
    </div>
  );
}

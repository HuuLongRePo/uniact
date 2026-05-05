'use client';

import { useEffect, useState } from 'react';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Download,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { resolveDownloadFilename } from '@/lib/download-filename';
import { formatVietnamDateTime } from '@/lib/timezone';

interface BackupHistory {
  id: number;
  filename: string;
  size_mb: number;
  created_at: string;
  created_by: string;
  status: string;
}

type BackupConfirmState =
  | { action: 'backup' }
  | { action: 'restore'; filename: string }
  | { action: 'delete'; filename: string }
  | null;

type DatabaseStats = {
  size_mb: number;
  tables: number;
  records: number;
  last_backup: string | null;
};

const INITIAL_DB_STATS: DatabaseStats = {
  size_mb: 0,
  tables: 0,
  records: 0,
  last_backup: null,
};

function StatCard({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string;
  meta?: string;
  tone: 'blue' | 'emerald' | 'violet' | 'amber';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'violet'
        ? 'bg-violet-50 text-violet-700'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-blue-50 text-blue-700';

  return (
    <div className={`rounded-[1.5rem] p-4 ${toneClass}`}>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
      {meta ? <div className="mt-2 text-xs text-slate-500">{meta}</div> : null}
    </div>
  );
}

export default function BackupRestorePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [backups, setBackups] = useState<BackupHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmState, setConfirmState] = useState<BackupConfirmState>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats>(INITIAL_DB_STATS);

  const fetchDbStats = useEffectEventCompat(async () => {
    try {
      const response = await fetch('/api/admin/database/stats');
      const data = await response.json();
      if (response.ok) {
        setDbStats((prev) => data.stats || prev);
      }
    } catch (error) {
      console.error('Fetch DB stats error:', error);
    }
  });

  const fetchBackups = useEffectEventCompat(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/database/backups');
      const data = await response.json();
      if (response.ok) {
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Fetch backups error:', error);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchDbStats();
      void fetchBackups();
    }
  }, [authLoading, fetchBackups, fetchDbStats, router, user]);

  const handleBackup = async () => {
    try {
      setBacking(true);
      const response = await fetch('/api/admin/database/backup', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Tao backup that bai');
        return;
      }

      const filename = String(data.filename || '').trim();
      if (!filename) {
        toast.error('Phan hoi tao backup thieu ten file');
        return;
      }

      toast.success('Da tao backup thanh cong');

      const downloadResponse = await fetch(
        `/api/admin/database/download?file=${encodeURIComponent(filename)}`
      );
      if (!downloadResponse.ok) {
        toast.error('Khong the tai xuong file backup vua tao');
        return;
      }

      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        downloadResponse.headers?.get?.('Content-Disposition') ?? null,
        filename
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      void fetchBackups();
      void fetchDbStats();
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Loi khi tao backup');
    } finally {
      setBacking(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(
        `/api/admin/database/download?file=${encodeURIComponent(filename)}`
      );
      if (!response.ok) {
        toast.error('Tai xuong that bai');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        response.headers?.get?.('Content-Disposition') ?? null,
        filename
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Da tai xuong backup');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Loi khi tai xuong');
    }
  };

  const handleRestore = async (filename: string) => {
    try {
      setRestoring(true);
      const response = await fetch('/api/admin/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Khoi phuc that bai');
        return;
      }

      toast.success('Khoi phuc thanh cong. He thong se tai lai...');
      setTimeout(() => {
        router.replace('/admin/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Loi khi khoi phuc');
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      const response = await fetch(`/api/admin/database/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok) {
        toast.success('Da xoa backup');
        void fetchBackups();
      } else {
        toast.error(data.error || 'Xoa that bai');
      }
    } catch (error) {
      console.error('Delete backup error:', error);
      toast.error('Loi khi xoa');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai backup va thong ke database..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Backup and restore
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">
                Sao luu va khoi phuc database
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Quan ly backup, tai xuong file, va khoi phuc du lieu khi co su co. Uu tien tao
                backup moi truoc khi restore.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  void fetchBackups();
                  void fetchDbStats();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Lam moi
              </button>
              <button
                type="button"
                onClick={() => setConfirmState({ action: 'backup' })}
                disabled={backing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Database className="h-4 w-4" />
                {backing ? 'Dang tao backup...' : 'Tao backup ngay'}
              </button>
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
            <ShieldAlert className="h-4 w-4" />
            Canh bao quan trong
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-rose-800">
            <li>Khoi phuc se ghi de hoan toan du lieu hien tai.</li>
            <li>Luon tao backup moi truoc khi khoi phuc.</li>
            <li>Chi thao tac khi he thong da duoc thong bao tam dung van hanh.</li>
            <li>Dam bao khong co nguoi dung dang thao tac tren he thong.</li>
          </ul>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <div className="flex items-center gap-2 text-slate-900">
                <Database className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Thong ke database</h2>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Kich thuoc"
                  value={`${dbStats.size_mb.toFixed(2)} MB`}
                  tone="blue"
                />
                <StatCard label="So bang" value={String(dbStats.tables)} tone="emerald" />
                <StatCard
                  label="Tong records"
                  value={dbStats.records.toLocaleString()}
                  tone="violet"
                />
                <StatCard
                  label="Backup cuoi"
                  value={
                    dbStats.last_backup
                      ? formatVietnamDateTime(dbStats.last_backup, 'date')
                      : 'Chua co'
                  }
                  tone="amber"
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
                <div className="flex items-center gap-2 text-slate-900">
                  <Clock className="h-5 w-5 text-violet-600" />
                  <h2 className="text-xl font-semibold">Lich su backup</h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        File
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Kich thuoc
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Ngay tao
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Nguoi tao
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                        Hanh dong
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                          Chua co backup nao.
                        </td>
                      </tr>
                    ) : (
                      backups.map((backup) => (
                        <tr key={backup.id} className="align-top hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4 text-slate-400" />
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {backup.filename}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Status: {backup.status}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {backup.size_mb.toFixed(2)} MB
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatVietnamDateTime(backup.created_at)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{backup.created_by}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void handleDownload(backup.filename)}
                                className="rounded-xl p-2 text-blue-600 transition hover:bg-blue-50"
                                title="Tai xuong"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmState({ action: 'restore', filename: backup.filename })
                                }
                                disabled={restoring}
                                className="rounded-xl p-2 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
                                title="Khoi phuc"
                              >
                                <Upload className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmState({ action: 'delete', filename: backup.filename })
                                }
                                className="rounded-xl p-2 text-rose-600 transition hover:bg-rose-50"
                                title="Xoa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <div className="flex items-center gap-2 text-slate-900">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Khuyen nghi van hanh</h2>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
                <li>Dat lich backup dinh ky hang ngay hoac truoc moi dot thay doi lon.</li>
                <li>Luu file backup o vi tri tach biet khoi may chu van hanh.</li>
                <li>Kiem thu restore dinh ky de chac chan backup dung duoc.</li>
                <li>Giữ it nhat 3 den 5 ban backup gan nhat de phong su co.</li>
              </ul>
            </section>

            <section className="page-surface rounded-[1.75rem] border-amber-200 bg-amber-50 px-5 py-6 sm:px-7">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Restore checklist
              </div>
              <div className="mt-3 space-y-2 text-sm text-amber-900">
                <p>1. Xac nhan backup muc tieu va tao mot backup moi cua hien trang.</p>
                <p>2. Thong bao tam dung cho nguoi dung dang thao tac.</p>
                <p>3. Restore, sau do doi chieu dashboard va cac route quan trong.</p>
              </div>
            </section>
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={confirmState !== null}
        title={
          confirmState?.action === 'backup'
            ? 'Tao ban sao luu database'
            : confirmState?.action === 'restore'
              ? 'Khoi phuc du lieu tu backup'
              : 'Xoa ban sao luu'
        }
        message={
          confirmState?.action === 'backup'
            ? 'Ban co chac chan muon tao ban sao luu database ngay bay gio khong?'
            : confirmState?.action === 'restore'
              ? `Canh bao: thao tac nay se ghi de toan bo du lieu hien tai. Ban co chac chan muon khoi phuc tu "${confirmState.filename}" khong?`
              : confirmState?.action === 'delete'
                ? `Ban co chac chan muon xoa backup "${confirmState.filename}" khong?`
                : ''
        }
        confirmText={
          confirmState?.action === 'backup'
            ? 'Tao backup'
            : confirmState?.action === 'restore'
              ? 'Khoi phuc du lieu'
              : 'Xoa backup'
        }
        cancelText="Huy"
        variant={confirmState?.action === 'backup' ? 'warning' : 'danger'}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (!confirmState) return;

          if (confirmState.action === 'backup') {
            await handleBackup();
          } else if (confirmState.action === 'restore') {
            await handleRestore(confirmState.filename);
          } else {
            await handleDelete(confirmState.filename);
          }

          setConfirmState(null);
        }}
      />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  Database,
  HardDrive,
  Mail,
  Power,
  RefreshCw,
  Save,
  Send,
  Server,
  Shield,
  Download,
  Wrench,
  Zap,
} from 'lucide-react';
import { resolveDownloadFilename } from '@/lib/download-filename';
import { toVietnamFileTimestamp } from '@/lib/timezone';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

interface SystemStats {
  dbSize: string;
  dbPath: string;
  uptime: string;
  lastBackup: string | null;
}

type EmailConfig = {
  provider: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  enabled: boolean;
};

type BackupConfig = {
  autoBackup: boolean;
  backupTime: string;
  retentionDays: number;
  backupLocation: string;
};

type MaintenanceConfig = {
  enabled: boolean;
  message: string;
};

const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  provider: 'nodemailer',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
  enabled: false,
};

const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  autoBackup: true,
  backupTime: '02:00',
  retentionDays: 7,
  backupLocation: '/backups',
};

const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  enabled: false,
  message: 'He thong dang bao tri. Vui long quay lai sau.',
};

function parseConfigPayload(payload: any) {
  const source = payload?.data || payload || {};
  return {
    email: { ...DEFAULT_EMAIL_CONFIG, ...(source.email || {}) },
    backup: { ...DEFAULT_BACKUP_CONFIG, ...(source.backup || {}) },
    maintenance: { ...DEFAULT_MAINTENANCE_CONFIG, ...(source.maintenance || {}) },
  };
}

function parseStatsPayload(payload: any): SystemStats | null {
  const source = payload?.data || payload || {};
  if (!source.dbSize && !source.uptime && !source.lastBackup && !source.dbPath) {
    return null;
  }

  return {
    dbSize: source.dbSize || '0 MB',
    dbPath: source.dbPath || '',
    uptime: source.uptime || '0h 0m',
    lastBackup: source.lastBackup || null,
  };
}

export default function SystemConfigAdvancedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL_CONFIG);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>(DEFAULT_BACKUP_CONFIG);
  const [maintenanceConfig, setMaintenanceConfig] =
    useState<MaintenanceConfig>(DEFAULT_MAINTENANCE_CONFIG);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      void fetchConfig();
    }
  }, [authLoading, router, user]);

  async function fetchConfig() {
    try {
      setLoading(true);
      const [configResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/system-config/advanced'),
        fetch('/api/admin/system-stats'),
      ]);

      const configBody = await configResponse.json().catch(() => null);
      const statsBody = await statsResponse.json().catch(() => null);

      if (!configResponse.ok) {
        throw new Error(configBody?.error || configBody?.message || 'Khong the tai cau hinh nang cao');
      }

      if (!statsResponse.ok) {
        throw new Error(statsBody?.error || statsBody?.message || 'Khong the tai thong ke he thong');
      }

      const parsedConfig = parseConfigPayload(configBody);
      setEmailConfig(parsedConfig.email);
      setBackupConfig(parsedConfig.backup);
      setMaintenanceConfig(parsedConfig.maintenance);
      setStats(parseStatsPayload(statsBody));
    } catch (error) {
      console.error('Fetch advanced settings error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai cau hinh nang cao');
    } finally {
      setLoading(false);
    }
  }

  async function saveSection(type: 'email' | 'backup' | 'maintenance', data: unknown, successMessage: string) {
    try {
      setSavingSection(type);
      const response = await fetch('/api/admin/system-config/advanced', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong luu duoc cau hinh');
      }

      toast.success(successMessage);
      await fetchConfig();
    } catch (error) {
      console.error(`Save ${type} settings error:`, error);
      toast.error(error instanceof Error ? error.message : 'Khong luu duoc cau hinh');
    } finally {
      setSavingSection(null);
    }
  }

  async function handleBackupNow() {
    try {
      setSavingSection('backup-now');
      toast.loading('Dang tao file backup...', { id: 'backup-now' });

      const response = await fetch('/api/admin/backup', { method: 'POST' });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || body?.message || 'Khong tao duoc backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        response.headers.get('Content-Disposition'),
        `uniact-${toVietnamFileTimestamp(new Date())}.db`
      );
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);

      toast.success('Da tao backup va tai file ve may', { id: 'backup-now' });
      await fetchConfig();
    } catch (error) {
      console.error('Backup now error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong tao duoc backup', {
        id: 'backup-now',
      });
    } finally {
      setSavingSection(null);
    }
  }

  async function handleTestEmail() {
    try {
      if (!emailConfig.smtpHost || !emailConfig.smtpPort || !emailConfig.smtpUser || !emailConfig.smtpPass) {
        toast.error('Can nhap du cau hinh SMTP truoc khi gui email test');
        return;
      }

      setSavingSection('test-email');
      toast.loading('Dang gui email test...', { id: 'test-email' });

      const response = await fetch('/api/admin/system-config/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong gui duoc email test');
      }

      toast.success(body?.message || 'Da gui email test', { id: 'test-email' });
    } catch (error) {
      console.error('Test email error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong gui duoc email test', {
        id: 'test-email',
      });
    } finally {
      setSavingSection(null);
    }
  }

  const maintenanceSummary = useMemo(
    () => (maintenanceConfig.enabled ? 'Dang bao tri' : 'Dang mo he thong'),
    [maintenanceConfig.enabled]
  );

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai cau hinh nang cao..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-cyan-700" />
              <h1 className="text-3xl font-semibold text-slate-950">Cau hinh nang cao</h1>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Dieu phoi email, backup, maintenance mode va cac thao tac van hanh co anh huong
              rong den toan he thong.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/settings"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ve settings
            </Link>
            <button
              type="button"
              onClick={() => void fetchConfig()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Tai lai
            </button>
          </div>
        </div>
      </section>

      {stats ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-cyan-700" />
              <div>
                <div className="text-sm text-slate-500">Dung luong DB</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{stats.dbSize}</div>
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-emerald-600" />
              <div>
                <div className="text-sm text-slate-500">Uptime</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">{stats.uptime}</div>
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-violet-600" />
              <div>
                <div className="text-sm text-slate-500">Backup gan nhat</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">
                  {stats.lastBackup || 'Chua co backup'}
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Shield className={`h-8 w-8 ${maintenanceConfig.enabled ? 'text-rose-600' : 'text-amber-600'}`} />
              <div>
                <div className="text-sm text-slate-500">Trang thai he thong</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{maintenanceSummary}</div>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-cyan-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Email service</h2>
              <p className="mt-1 text-sm text-slate-500">
                Cau hinh SMTP de gui thong bao, reset mat khau va email test.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={emailConfig.enabled}
                onChange={(event) =>
                  setEmailConfig((current) => ({ ...current, enabled: event.target.checked }))
                }
                className="h-4 w-4 text-cyan-700"
              />
              <div>
                <div className="font-medium text-slate-950">Bat email service</div>
                <div className="mt-1 text-sm text-slate-500">
                  Chi bat khi server da san sang ket noi SMTP that.
                </div>
              </div>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Provider
                <select
                  value={emailConfig.provider}
                  onChange={(event) =>
                    setEmailConfig((current) => ({ ...current, provider: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  disabled={!emailConfig.enabled}
                >
                  <option value="nodemailer">Nodemailer</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="local">Local only</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                SMTP port
                <input
                  type="text"
                  value={emailConfig.smtpPort}
                  onChange={(event) =>
                    setEmailConfig((current) => ({ ...current, smtpPort: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  placeholder="587"
                  disabled={!emailConfig.enabled}
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              SMTP host
              <input
                type="text"
                value={emailConfig.smtpHost}
                onChange={(event) =>
                  setEmailConfig((current) => ({ ...current, smtpHost: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                placeholder="smtp.gmail.com"
                disabled={!emailConfig.enabled}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              SMTP username
              <input
                type="text"
                value={emailConfig.smtpUser}
                onChange={(event) =>
                  setEmailConfig((current) => ({ ...current, smtpUser: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                placeholder="noreply@example.com"
                disabled={!emailConfig.enabled}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              SMTP password
              <input
                type="password"
                value={emailConfig.smtpPass}
                onChange={(event) =>
                  setEmailConfig((current) => ({ ...current, smtpPass: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                placeholder="app-password"
                disabled={!emailConfig.enabled}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              From email
              <input
                type="email"
                value={emailConfig.smtpFrom}
                onChange={(event) =>
                  setEmailConfig((current) => ({ ...current, smtpFrom: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                placeholder="UniAct <noreply@example.com>"
                disabled={!emailConfig.enabled}
              />
            </label>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={savingSection !== null || !emailConfig.enabled}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 px-4 py-3 text-sm font-medium text-cyan-700 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Gui email kiem tra
              </button>
              <button
                type="button"
                onClick={() =>
                  void saveSection('email', emailConfig, 'Da luu cau hinh email')
                }
                disabled={savingSection !== null}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Save className="h-4 w-4" />
                {savingSection === 'email' ? 'Dang luu...' : 'Luu email'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-cyan-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Backup va khoi phuc</h2>
              <p className="mt-1 text-sm text-slate-500">
                Dat lich backup va tao file backup tay truoc cac thay doi he thong lon.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={backupConfig.autoBackup}
                onChange={(event) =>
                  setBackupConfig((current) => ({ ...current, autoBackup: event.target.checked }))
                }
                className="h-4 w-4 text-cyan-700"
              />
              <div>
                <div className="font-medium text-slate-950">Bat backup tu dong</div>
                <div className="mt-1 text-sm text-slate-500">
                  He thong se lap lich backup theo gio va retention phia duoi.
                </div>
              </div>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Gio backup
                <input
                  type="time"
                  value={backupConfig.backupTime}
                  onChange={(event) =>
                    setBackupConfig((current) => ({ ...current, backupTime: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  disabled={!backupConfig.autoBackup}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Retention (ngay)
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={backupConfig.retentionDays}
                  onChange={(event) =>
                    setBackupConfig((current) => ({
                      ...current,
                      retentionDays: Number.parseInt(event.target.value || '0', 10),
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Thu muc backup
              <input
                type="text"
                value={backupConfig.backupLocation}
                onChange={(event) =>
                  setBackupConfig((current) => ({ ...current, backupLocation: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
              />
            </label>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleBackupNow}
                disabled={savingSection !== null}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                Tao backup ngay
              </button>
              <button
                type="button"
                onClick={() =>
                  void saveSection('backup', backupConfig, 'Da luu cau hinh backup')
                }
                disabled={savingSection !== null}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Save className="h-4 w-4" />
                {savingSection === 'backup' ? 'Dang luu...' : 'Luu backup'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-cyan-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Maintenance mode</h2>
              <p className="mt-1 text-sm text-slate-500">
                Chu dong khoa truy cap user khong phai admin khi can bao tri hoac hotfix.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <div
              className={`rounded-3xl border p-4 ${
                maintenanceConfig.enabled
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-emerald-200 bg-emerald-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Power
                  className={`h-5 w-5 ${maintenanceConfig.enabled ? 'text-rose-700' : 'text-emerald-700'}`}
                />
                <div>
                  <div className="font-medium text-slate-950">{maintenanceSummary}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {maintenanceConfig.enabled
                      ? 'User thuong se bi chan truy cap cho den khi admin tat maintenance.'
                      : 'He thong dang phuc vu user binh thuong.'}
                  </div>
                </div>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Thong bao maintenance
              <textarea
                value={maintenanceConfig.message}
                onChange={(event) =>
                  setMaintenanceConfig((current) => ({ ...current, message: event.target.value }))
                }
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                placeholder="Noi dung hien thi cho user khi he thong dang bao tri"
              />
            </label>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  void saveSection(
                    'maintenance',
                    { ...maintenanceConfig, enabled: !maintenanceConfig.enabled },
                    !maintenanceConfig.enabled
                      ? 'Da bat maintenance mode'
                      : 'Da tat maintenance mode'
                  )
                }
                disabled={savingSection !== null}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400 ${
                  maintenanceConfig.enabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Power className="h-4 w-4" />
                {maintenanceConfig.enabled ? 'Tat maintenance mode' : 'Bat maintenance mode'}
              </button>
              <button
                type="button"
                onClick={() =>
                  void saveSection('maintenance', maintenanceConfig, 'Da luu thong bao maintenance')
                }
                disabled={savingSection !== null}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                Luu thong bao
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-cyan-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Cong cu van hanh</h2>
              <p className="mt-1 text-sm text-slate-500">
                Di nhanh sang cac man kiem tra suc khoe he thong va doi soat logs.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <Link
              href="/admin/audit-logs"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 hover:border-cyan-200 hover:bg-cyan-50"
            >
              Mo audit logs
            </Link>
            <Link
              href="/admin/system-health"
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-800 hover:border-cyan-200 hover:bg-cyan-50"
            >
              Mo system health
            </Link>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-900">Thong tin DB</div>
              <div className="mt-2 break-all">{stats?.dbPath || 'Chua co du lieu duong dan DB'}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

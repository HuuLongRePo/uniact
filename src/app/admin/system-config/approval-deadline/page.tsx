'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function ApprovalDeadlineConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    approval_deadline_hours: '48',
    warning_threshold_hours: '24',
    enable_notifications: 'true',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) void fetchConfig();
  }, [user, authLoading, router]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system-config?category=approval');
      const data = await response.json();
      if (response.ok && data.configs) {
        const configMap: Record<string, string> = {};
        data.configs.forEach((c: any) => {
          configMap[c.config_key] = c.config_value;
        });
        setConfig((prev) => ({
          ...prev,
          approval_deadline_hours: configMap.approval_deadline_hours || '48',
          warning_threshold_hours: configMap.warning_threshold_hours || '24',
          enable_notifications: configMap.enable_notifications || 'true',
        }));
      }
    } catch (error) {
      console.error('Fetch config error:', error);
      toast.error('Khong tai duoc cau hinh han chot');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const deadlineHours = parseInt(config.approval_deadline_hours, 10);
      const warningThreshold = parseInt(config.warning_threshold_hours, 10);

      if (deadlineHours <= 0 || warningThreshold <= 0) {
        toast.error('So gio phai lon hon 0');
        setSaving(false);
        return;
      }

      if (warningThreshold >= deadlineHours) {
        toast.error('Nguong canh bao phai nho hon deadline');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            { key: 'approval_deadline_hours', value: config.approval_deadline_hours },
            { key: 'warning_threshold_hours', value: config.warning_threshold_hours },
            { key: 'enable_notifications', value: config.enable_notifications },
          ],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Da cap nhat han chot phe duyet');
      } else {
        toast.error(data.error || 'Cap nhat that bai');
      }
    } catch (error) {
      console.error('Save config error:', error);
      toast.error('Khong luu duoc cau hinh');
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(
    () => ({
      deadline: config.approval_deadline_hours,
      warning: config.warning_threshold_hours,
      notifications: config.enable_notifications === 'true' ? 'Bat' : 'Tat',
    }),
    [config]
  );

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai approval deadline..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-cyan-700" />
              <h1 className="text-3xl font-semibold text-slate-950">Han chot phe duyet</h1>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Quan ly thoi han duyet hoat dong va canh bao som truoc khi workflow cham deadline.
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
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              Tai lai
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6">
          <label className="block text-sm font-medium text-slate-700">
            Han chot phe duyet (gio)
            <input
              type="number"
              min="1"
              max="720"
              step="1"
              value={config.approval_deadline_hours}
              onChange={(event) => setConfig({ ...config, approval_deadline_hours: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
              placeholder="48"
            />
            <span className="mt-2 block text-xs text-slate-500">
              Hoat dong phai duoc phe duyet truoc luc bat dau it nhat so gio nay.
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Nguong canh bao (gio)
            <input
              type="number"
              min="1"
              max="720"
              step="1"
              value={config.warning_threshold_hours}
              onChange={(event) => setConfig({ ...config, warning_threshold_hours: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
              placeholder="24"
            />
            <span className="mt-2 block text-xs text-slate-500">
              Khi con it hon nguong nay truoc deadline, he thong se de xuat canh bao.
            </span>
          </label>

          <div>
            <div className="text-sm font-medium text-slate-700">Thong bao nhac deadline</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { value: 'true', label: 'Bat thong bao', helper: 'Gui canh bao khi activity sap cham deadline.' },
                { value: 'false', label: 'Tat thong bao', helper: 'Chi giu deadline va bo qua nhac nho tu dong.' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`rounded-3xl border p-4 ${
                    config.enable_notifications === option.value
                      ? 'border-cyan-200 bg-cyan-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="notifications"
                      value={option.value}
                      checked={config.enable_notifications === option.value}
                      onChange={(event) => setConfig({ ...config, enable_notifications: event.target.value })}
                      className="h-4 w-4 text-cyan-700"
                    />
                    <div>
                      <div className="font-medium text-slate-900">{option.label}</div>
                      <div className="mt-1 text-sm text-slate-500">{option.helper}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-900">
          <CheckCircle className="h-5 w-5" />
          <div className="font-medium">Tom tat cau hinh</div>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-emerald-900">
          <li>
            Han chot phe duyet: <strong>{summary.deadline} gio</strong> truoc khi hoat dong bat dau.
          </li>
          <li>
            Canh bao: <strong>{summary.warning} gio</strong> truoc deadline.
          </li>
          <li>
            Thong bao: <strong>{summary.notifications}</strong>.
          </li>
        </ul>
      </section>

      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex gap-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Nhung cai dat nay se tac dong den workflow duyet cua hoat dong moi va cac luong canh bao
            van hanh sap den han.
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {saving ? 'Dang luu...' : 'Luu cau hinh han chot'}
        </button>
      </div>
    </div>
  );
}

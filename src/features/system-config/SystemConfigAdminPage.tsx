'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/contexts/AuthContext';

export interface Config {
  id?: number;
  config_key: string;
  config_value: string;
  data_type: string;
  category: string;
  description?: string;
  updated_at?: string;
}

const categories = [
  { key: 'attendance', label: 'Diem danh' },
  { key: 'scoring', label: 'Tinh diem' },
  { key: 'warning', label: 'Canh bao' },
  { key: 'system', label: 'He thong' },
];

const quickLinks = [
  {
    href: '/admin/system-config/attendance-policy',
    title: 'Chinh sach diem danh',
    desc: 'Dieu khien fallback QR, pilot khuon mat va cac nguyen tac diem danh.',
  },
  {
    href: '/admin/system-config/qr-settings',
    title: 'Cai dat QR',
    desc: 'Quan ly chu ky QR, thoi han phien va cac tham so su dung hang ngay.',
  },
  {
    href: '/admin/system-config/qr-design',
    title: 'Thiet ke QR',
    desc: 'Dieu chinh hien thi va mau sac ma QR theo van hanh hien tai.',
  },
  {
    href: '/admin/system-config/approval-deadline',
    title: 'Han chot phe duyet',
    desc: 'Dat nguong thoi gian cho workflow duyet va close-out.',
  },
  {
    href: '/admin/system-config/advanced',
    title: 'Cau hinh nang cao',
    desc: 'Xu ly cac tham so he thong co tac dong rong hon den van hanh.',
  },
];

function parseConfigs(payload: any): Config[] {
  const configs = payload?.configs || payload?.data?.configs || payload?.data || [];
  return Array.isArray(configs) ? (configs as Config[]) : [];
}

function ConfigField({
  config,
  value,
  onChange,
}: {
  config: Config;
  value: string;
  onChange: (next: string) => void;
}) {
  const commonClassName =
    'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-300';

  if (config.data_type === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={commonClassName}
      />
    );
  }

  if (config.data_type === 'boolean') {
    return (
      <select value={value || 'false'} onChange={(event) => onChange(event.target.value)} className={commonClassName}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (config.data_type === 'json') {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${commonClassName} min-h-36 font-mono`}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={commonClassName}
    />
  );
}

export default function SystemConfigAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('attendance');
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    void fetchConfigs(activeCategory);
  }, [activeCategory, user]);

  async function fetchConfigs(category: string) {
    setLoading(true);

    try {
      const response = await fetch(`/api/system-config?category=${category}`);
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong the tai cau hinh he thong');
      }

      const nextConfigs = parseConfigs(body);
      setConfigs(nextConfigs);
      const nextValues: Record<string, string> = {};
      nextConfigs.forEach((item) => {
        nextValues[item.config_key] = String(item.config_value ?? '');
      });
      setFormValues(nextValues);
    } catch (error) {
      console.error('Fetch configs error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai cau hinh he thong');
      setConfigs([]);
      setFormValues({});
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);

    try {
      const updates = configs.map((config) => ({
        key: config.config_key,
        value: formValues[config.config_key] ?? '',
      }));

      const response = await fetch('/api/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Luu cau hinh that bai');
      }

      toast.success(body?.message || 'Da luu cau hinh');
      await fetchConfigs(activeCategory);
    } catch (error) {
      console.error('Save config error:', error);
      toast.error(error instanceof Error ? error.message : 'Luu cau hinh that bai');
    } finally {
      setSaving(false);
    }
  }

  const categoryLabel = useMemo(
    () => categories.find((item) => item.key === activeCategory)?.label || activeCategory,
    [activeCategory]
  );

  if (authLoading || loading) {
    return <ActivitySkeleton count={5} />;
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
              System settings
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Cai dat he thong</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Day la hub cau hinh de admin di nhanh toi cac chinh sach van hanh va van con giu
              bo sua raw config khi can doi soat truc tiep.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/dashboard"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ve dashboard
            </Link>
            <button
              type="button"
              onClick={() => void fetchConfigs(activeCategory)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tai lai
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              <div className="text-base font-semibold text-slate-950">{item.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</div>
              <div className="mt-4 text-sm font-medium text-cyan-700">Mo trang cau hinh</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Raw config editor</h2>
            <p className="mt-1 text-sm text-slate-500">
              Su dung khi can chinh truc tiep tung key cau hinh ma khong muon vao tung trang con.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Dang xem nhom <span className="font-semibold text-slate-950">{categoryLabel}</span> ·{' '}
            {configs.length} key
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = category.key === activeCategory;
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => setActiveCategory(category.key)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-cyan-700 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        {configs.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Khong tim thay cau hinh"
              message="Khong co key nao trong nhom nay, hoac route cau hinh chua tra du lieu."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {configs.map((config) => (
              <article
                key={config.config_key}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-slate-950">
                      {config.description || config.config_key}
                    </div>
                    <div className="mt-1 break-all text-xs uppercase tracking-wide text-slate-500">
                      {config.config_key}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700 shadow-sm">
                    {config.data_type}
                  </div>
                </div>

                <ConfigField
                  config={config}
                  value={formValues[config.config_key] ?? ''}
                  onChange={(next) =>
                    setFormValues((current) => ({ ...current, [config.config_key]: next }))
                  }
                />

                {config.updated_at ? (
                  <div className="mt-3 text-xs text-slate-500">Cap nhat lan cuoi: {config.updated_at}</div>
                ) : null}
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || configs.length === 0}
            className="rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Dang luu...' : 'Luu cau hinh'}
          </button>
        </div>
      </section>
    </div>
  );
}

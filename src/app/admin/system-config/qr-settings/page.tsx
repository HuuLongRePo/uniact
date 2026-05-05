'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, ImageIcon, Palette, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

const QRCodeComponent = dynamic(() => import('react-qr-code'), { ssr: false });

type QRSettingsState = {
  qr_expiration_time: string;
  qr_bg_color: string;
  qr_text_color: string;
  qr_logo_enabled: 'true' | 'false';
};

const DEFAULT_CONFIG: QRSettingsState = {
  qr_expiration_time: '5',
  qr_bg_color: '#ffffff',
  qr_text_color: '#000000',
  qr_logo_enabled: 'false',
};

function parseConfigs(payload: any) {
  const configs = payload?.configs || payload?.data?.configs || payload?.data || [];
  return Array.isArray(configs) ? configs : [];
}

function isValidHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function getContrastHint(backgroundColor: string, foregroundColor: string) {
  const background = parseInt(backgroundColor.slice(1), 16);
  const foreground = parseInt(foregroundColor.slice(1), 16);
  return Math.abs(background - foreground) > 0x7f7f7f ? 'Tot' : 'Can tang do tuong phan';
}

export default function QRSettingsConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<QRSettingsState>(DEFAULT_CONFIG);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');

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
      const response = await fetch('/api/system-config?category=attendance');
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong the tai cai dat QR');
      }

      const nextMap: Record<string, string> = {};
      parseConfigs(body).forEach((item: any) => {
        nextMap[item.config_key] = String(item.config_value ?? '');
      });

      setConfig({
        qr_expiration_time: nextMap.qr_expiration_time || DEFAULT_CONFIG.qr_expiration_time,
        qr_bg_color: nextMap.qr_bg_color || DEFAULT_CONFIG.qr_bg_color,
        qr_text_color: nextMap.qr_text_color || DEFAULT_CONFIG.qr_text_color,
        qr_logo_enabled: (nextMap.qr_logo_enabled as 'true' | 'false') || DEFAULT_CONFIG.qr_logo_enabled,
      });
      setLogoPreviewUrl(nextMap.qr_logo_url || '');
      setLogoFile(null);
    } catch (error) {
      console.error('Fetch QR settings error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai cai dat QR');
    } finally {
      setLoading(false);
    }
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Chi nhan tep hinh anh cho logo QR');
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error('Logo QR khong duoc vuot qua 1MB');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreviewUrl(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    const expiration = parseInt(config.qr_expiration_time, 10);

    if (!Number.isFinite(expiration) || expiration < 1 || expiration > 1440) {
      toast.error('Thoi han QR phai nam trong khoang 1 den 1440 phut');
      return;
    }

    if (!isValidHexColor(config.qr_bg_color) || !isValidHexColor(config.qr_text_color)) {
      toast.error('Mau QR phai dung dinh dang hex, vi du #ffffff');
      return;
    }

    setSaving(true);

    try {
      const updates = [
        { key: 'qr_expiration_time', value: config.qr_expiration_time },
        { key: 'qr_bg_color', value: config.qr_bg_color },
        { key: 'qr_text_color', value: config.qr_text_color },
        { key: 'qr_logo_enabled', value: config.qr_logo_enabled },
      ];

      if (logoFile) {
        const uploadPayload = new FormData();
        uploadPayload.append('file', logoFile);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadPayload,
        });
        const uploadBody = await uploadResponse.json().catch(() => null);

        if (!uploadResponse.ok) {
          throw new Error(uploadBody?.error || uploadBody?.message || 'Tai logo QR that bai');
        }

        const uploadedUrl = uploadBody?.url || uploadBody?.data?.url;
        if (uploadedUrl) {
          updates.push({ key: 'qr_logo_url', value: uploadedUrl });
        }
      }

      const response = await fetch('/api/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong luu duoc cai dat QR');
      }

      toast.success('Da cap nhat cai dat QR');
      setLogoFile(null);
      await fetchConfig();
    } catch (error) {
      console.error('Save QR settings error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong luu duoc cai dat QR');
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(
    () => ({
      expiration: `${config.qr_expiration_time} phut`,
      contrast: getContrastHint(config.qr_bg_color, config.qr_text_color),
      logo: config.qr_logo_enabled === 'true' ? 'Bat' : 'Tat',
    }),
    [config]
  );

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai cai dat QR..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <QrCode className="h-8 w-8 text-cyan-700" />
              <h1 className="text-3xl font-semibold text-slate-950">Cai dat QR diem danh</h1>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Quan ly thoi han, mau sac va logo cua ma QR de giao vien van hanh projector va hoc
              vien quet tren thiet bi di dong de dang hon.
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <section className="space-y-6">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-cyan-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Thoi han su dung QR</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Dat thoi gian ton tai cho phien QR truoc khi hoc vien phai quet ma moi.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-end">
              <label className="block text-sm font-medium text-slate-700">
                So phut hieu luc
                <input
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  value={config.qr_expiration_time}
                  onChange={(event) =>
                    setConfig((current) => ({ ...current, qr_expiration_time: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  placeholder="5"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                {['5', '15', '30', '60'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setConfig((current) => ({ ...current, qr_expiration_time: option }))
                    }
                    className={`rounded-2xl px-3 py-2 text-sm font-medium ${
                      config.qr_expiration_time === option
                        ? 'bg-cyan-700 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {option}p
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-cyan-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Mau sac QR</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chon nen va mau module de QR de quet tren man hinh laptop, TV va projector.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                Mau nen
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="color"
                    value={config.qr_bg_color}
                    onChange={(event) =>
                      setConfig((current) => ({ ...current, qr_bg_color: event.target.value }))
                    }
                    className="h-12 w-12 rounded-xl border border-slate-200"
                  />
                  <input
                    type="text"
                    value={config.qr_bg_color}
                    onChange={(event) =>
                      setConfig((current) => ({ ...current, qr_bg_color: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-cyan-300"
                    placeholder="#ffffff"
                  />
                </div>
              </label>

              <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                Mau ky tu
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="color"
                    value={config.qr_text_color}
                    onChange={(event) =>
                      setConfig((current) => ({ ...current, qr_text_color: event.target.value }))
                    }
                    className="h-12 w-12 rounded-xl border border-slate-200"
                  />
                  <input
                    type="text"
                    value={config.qr_text_color}
                    onChange={(event) =>
                      setConfig((current) => ({ ...current, qr_text_color: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-cyan-300"
                    placeholder="#000000"
                  />
                </div>
              </label>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-5 w-5 text-cyan-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Logo trung tam</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Logo la thanh phan tuy chon. Chi bat khi da kiem tra projector van quet tot.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                {
                  value: 'false',
                  title: 'Tat logo',
                  helper: 'Uu tien QR nhe, de quet va it rui ro tren phong hoc sang yeu.',
                },
                {
                  value: 'true',
                  title: 'Bat logo',
                  helper: 'Huu ich khi can nhan dien thuong hieu, nhung can giu logo gon.',
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`rounded-3xl border p-4 ${
                    config.qr_logo_enabled === option.value
                      ? 'border-cyan-200 bg-cyan-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="qr_logo_enabled"
                      value={option.value}
                      checked={config.qr_logo_enabled === option.value}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          qr_logo_enabled: event.target.value as 'true' | 'false',
                        }))
                      }
                      className="mt-1 h-4 w-4 text-cyan-700"
                    />
                    <div>
                      <div className="font-medium text-slate-900">{option.title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">{option.helper}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {config.qr_logo_enabled === 'true' ? (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <label className="block cursor-pointer">
                  <div className="text-sm font-medium text-slate-700">Tai logo moi</div>
                  <div className="mt-2 text-sm text-slate-500">
                    Chap nhan PNG, JPG. Kich thuoc toi da 1MB.
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="mt-4 block w-full text-sm text-slate-600" />
                </label>
              </div>
            ) : null}
          </article>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Dang luu...' : 'Luu cau hinh QR'}
            </button>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6">
            <div className="flex items-center gap-2 text-slate-950">
              <Eye className="h-5 w-5 text-cyan-700" />
              <h2 className="text-lg font-semibold">Preview QR</h2>
            </div>

            <div
              className="relative mt-5 rounded-[1.5rem] border border-slate-200 p-5"
              style={{ backgroundColor: config.qr_bg_color }}
            >
              <div className="flex justify-center">
                <QRCodeComponent
                  value="preview-session:TOKEN"
                  size={220}
                  level="M"
                  bgColor={config.qr_bg_color}
                  fgColor={config.qr_text_color}
                />
              </div>

              {config.qr_logo_enabled === 'true' ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {logoPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreviewUrl} alt="QR logo preview" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Logo
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <span>Thoi han session</span>
                <strong className="text-slate-950">{summary.expiration}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Do tuong phan</span>
                <strong className="text-slate-950">{summary.contrast}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Logo</span>
                <strong className="text-slate-950">{summary.logo}</strong>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Uu tien nen sang, ky tu dam va logo gon de hoc vien quet nhanh tren camera web.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

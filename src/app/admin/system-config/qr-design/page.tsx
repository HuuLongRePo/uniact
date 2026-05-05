'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Download, Eye, ImageIcon, Palette, QrCode, RefreshCw, SlidersHorizontal } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

const QRCodeComponent = dynamic(() => import('react-qr-code'), { ssr: false });

type QRDesign = {
  bgColor: string;
  textColor: string;
  cornerRadius: number;
  dotRadius: number;
  eyeColor: string;
  logoEnabled: boolean;
  logoUrl: string | null;
  logoSize: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  expirationTime: number;
  customText: string;
};

const DEFAULT_DESIGN: QRDesign = {
  bgColor: '#ffffff',
  textColor: '#000000',
  cornerRadius: 0,
  dotRadius: 0,
  eyeColor: '#000000',
  logoEnabled: false,
  logoUrl: null,
  logoSize: 25,
  errorCorrection: 'H',
  expirationTime: 5,
  customText: '',
};

const PRESETS: Record<string, Partial<QRDesign>> = {
  default: {
    bgColor: '#ffffff',
    textColor: '#000000',
    eyeColor: '#000000',
    cornerRadius: 0,
    dotRadius: 0,
  },
  projector: {
    bgColor: '#ffffff',
    textColor: '#0f172a',
    eyeColor: '#0369a1',
    cornerRadius: 1,
    dotRadius: 0,
  },
  vibrant: {
    bgColor: '#fef3c7',
    textColor: '#92400e',
    eyeColor: '#dc2626',
    cornerRadius: 2,
    dotRadius: 1,
  },
  elegant: {
    bgColor: '#f8fafc',
    textColor: '#312e81',
    eyeColor: '#7c3aed',
    cornerRadius: 1,
    dotRadius: 0,
  },
};

function parseDesignPayload(payload: any): QRDesign {
  const source = payload?.data || payload || {};
  return {
    ...DEFAULT_DESIGN,
    ...source,
  };
}

function isValidHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export default function QRDesignCustomizationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [design, setDesign] = useState<QRDesign>(DEFAULT_DESIGN);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'colors' | 'logo' | 'advanced'>('colors');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      void fetchDesign();
    }
  }, [authLoading, router, user]);

  async function fetchDesign() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/qr-design');
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong the tai QR design');
      }

      setDesign(parseDesignPayload(body));
      setLogoFile(null);
    } catch (error) {
      console.error('Fetch QR design error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai QR design');
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset: string) {
    if (!PRESETS[preset]) return;
    setDesign((current) => ({ ...current, ...PRESETS[preset] }));
    toast.success(`Da ap dung preset ${preset}`);
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Chi nhan tep hinh anh cho QR logo');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo QR design khong duoc vuot qua 2MB');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setDesign((current) => ({ ...current, logoUrl: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!isValidHexColor(design.bgColor) || !isValidHexColor(design.textColor) || !isValidHexColor(design.eyeColor)) {
      toast.error('Tat ca mau trong QR design phai dung dinh dang hex');
      return;
    }

    if (design.expirationTime < 1 || design.expirationTime > 1440) {
      toast.error('Thoi han trong QR design phai tu 1 den 1440 phut');
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append(
        'design',
        JSON.stringify({
          bgColor: design.bgColor,
          textColor: design.textColor,
          cornerRadius: design.cornerRadius,
          dotRadius: design.dotRadius,
          eyeColor: design.eyeColor,
          logoEnabled: design.logoEnabled,
          logoSize: design.logoSize,
          errorCorrection: design.errorCorrection,
          expirationTime: design.expirationTime,
          customText: design.customText,
        })
      );

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await fetch('/api/admin/qr-design', {
        method: 'PUT',
        body: formData,
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong luu duoc QR design');
      }

      toast.success('Da luu QR design');
      await fetchDesign();
    } catch (error) {
      console.error('Save QR design error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong luu duoc QR design');
    } finally {
      setSaving(false);
    }
  }

  function downloadQRCode() {
    const svg = document.querySelector('#admin-qr-design-preview svg');
    if (!svg) return;

    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'uniact-qr-preview.svg';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    toast.success('Da tai preview QR');
  }

  const summary = useMemo(
    () => ({
      expiration: `${design.expirationTime} phut`,
      correction: design.errorCorrection,
      logo: design.logoEnabled ? 'Bat' : 'Tat',
    }),
    [design]
  );

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai QR design..." />;
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
              <h1 className="text-3xl font-semibold text-slate-950">QR design</h1>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Tinh chinh giao dien QR theo projector, logo va doi tuong quet thuc te ma khong doi
              luong van hanh chinh.
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
              onClick={() => void fetchDesign()}
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
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'colors', label: 'Mau sac', icon: Palette },
                { key: 'logo', label: 'Logo', icon: ImageIcon },
                { key: 'advanced', label: 'Nang cao', icon: SlidersHorizontal },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as 'colors' | 'logo' | 'advanced')}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium ${
                      active
                        ? 'bg-cyan-700 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'colors' ? (
              <div className="mt-6 space-y-6">
                <div>
                  <div className="text-sm font-medium text-slate-700">Preset nhanh</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Object.keys(PRESETS).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm font-medium text-slate-800 hover:border-cyan-200 hover:bg-cyan-50"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                    Mau nen
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="color"
                        value={design.bgColor}
                        onChange={(event) =>
                          setDesign((current) => ({ ...current, bgColor: event.target.value }))
                        }
                        className="h-12 w-12 rounded-xl border border-slate-200"
                      />
                      <input
                        type="text"
                        value={design.bgColor}
                        onChange={(event) =>
                          setDesign((current) => ({ ...current, bgColor: event.target.value }))
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
                        value={design.textColor}
                        onChange={(event) =>
                          setDesign((current) => ({ ...current, textColor: event.target.value }))
                        }
                        className="h-12 w-12 rounded-xl border border-slate-200"
                      />
                      <input
                        type="text"
                        value={design.textColor}
                        onChange={(event) =>
                          setDesign((current) => ({ ...current, textColor: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-cyan-300"
                        placeholder="#000000"
                      />
                    </div>
                  </label>
                </div>

                <label className="block rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                  Mau mat QR
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="color"
                      value={design.eyeColor}
                      onChange={(event) =>
                        setDesign((current) => ({ ...current, eyeColor: event.target.value }))
                      }
                      className="h-12 w-12 rounded-xl border border-slate-200"
                    />
                    <input
                      type="text"
                      value={design.eyeColor}
                      onChange={(event) =>
                        setDesign((current) => ({ ...current, eyeColor: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-cyan-300"
                      placeholder="#000000"
                    />
                  </div>
                </label>
              </div>
            ) : null}

            {activeTab === 'logo' ? (
              <div className="mt-6 space-y-6">
                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={design.logoEnabled}
                    onChange={(event) =>
                      setDesign((current) => ({ ...current, logoEnabled: event.target.checked }))
                    }
                    className="h-4 w-4 text-cyan-700"
                  />
                  <div>
                    <div className="font-medium text-slate-950">Bat logo trong QR</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Chi bat khi da test projector va camera web van quet nhanh.
                    </div>
                  </div>
                </label>

                {design.logoEnabled ? (
                  <>
                    <label className="block rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
                      <div className="text-sm font-medium text-slate-700">Tai logo QR</div>
                      <div className="mt-2 text-sm text-slate-500">
                        Chap nhan PNG, JPG. Kich thuoc toi da 2MB.
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="mt-4 block w-full text-sm text-slate-600"
                      />
                    </label>

                    <label className="block text-sm font-medium text-slate-700">
                      Kich thuoc logo (%)
                      <input
                        type="range"
                        min="15"
                        max="40"
                        value={design.logoSize}
                        onChange={(event) =>
                          setDesign((current) => ({
                            ...current,
                            logoSize: Number.parseInt(event.target.value, 10),
                          }))
                        }
                        className="mt-3 w-full"
                      />
                      <span className="mt-2 block text-xs text-slate-500">{design.logoSize}% kich thuoc QR</span>
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'advanced' ? (
              <div className="mt-6 grid gap-4">
                <label className="block text-sm font-medium text-slate-700">
                  Error correction
                  <select
                    value={design.errorCorrection}
                    onChange={(event) =>
                      setDesign((current) => ({
                        ...current,
                        errorCorrection: event.target.value as 'L' | 'M' | 'Q' | 'H',
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  >
                    <option value="L">L - nhe nhat</option>
                    <option value="M">M - can bang</option>
                    <option value="Q">Q - uu tien chong loi</option>
                    <option value="H">H - rat cao</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Thoi han preview (phut)
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={design.expirationTime}
                    onChange={(event) =>
                      setDesign((current) => ({
                        ...current,
                        expirationTime: Number.parseInt(event.target.value || '0', 10),
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Corner radius
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={design.cornerRadius}
                    onChange={(event) =>
                      setDesign((current) => ({
                        ...current,
                        cornerRadius: Number.parseInt(event.target.value, 10),
                      }))
                    }
                    className="mt-3 w-full"
                  />
                  <span className="mt-2 block text-xs text-slate-500">{design.cornerRadius} px</span>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Dot radius
                  <input
                    type="range"
                    min="0"
                    max="2"
                    value={design.dotRadius}
                    onChange={(event) =>
                      setDesign((current) => ({
                        ...current,
                        dotRadius: Number.parseInt(event.target.value, 10),
                      }))
                    }
                    className="mt-3 w-full"
                  />
                  <span className="mt-2 block text-xs text-slate-500">{design.dotRadius} muc bo goc</span>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Ghi chu tuy chinh
                  <textarea
                    value={design.customText}
                    onChange={(event) =>
                      setDesign((current) => ({ ...current, customText: event.target.value }))
                    }
                    className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                    placeholder="VD: UniAct | Check-in"
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={downloadQRCode}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Tai preview
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Dang luu...' : 'Luu QR design'}
              </button>
            </div>
          </article>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6">
            <div className="flex items-center gap-2 text-slate-950">
              <Eye className="h-5 w-5 text-cyan-700" />
              <h2 className="text-lg font-semibold">Preview</h2>
            </div>

            <div
              id="admin-qr-design-preview"
              className="relative mt-5 rounded-[1.5rem] border border-slate-200 p-5"
              style={{ backgroundColor: design.bgColor }}
            >
              <div className="flex justify-center">
                <QRCodeComponent
                  value={`preview:${design.expirationTime}:${design.customText || 'session'}`}
                  size={220}
                  level={design.errorCorrection}
                  bgColor={design.bgColor}
                  fgColor={design.textColor}
                />
              </div>

              {design.logoEnabled ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    style={{ width: `${design.logoSize + 18}px`, height: `${design.logoSize + 18}px` }}
                  >
                    {design.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={design.logoUrl} alt="QR design logo preview" className="h-full w-full object-cover" />
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
                <span>Thoi han</span>
                <strong className="text-slate-950">{summary.expiration}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Error correction</span>
                <strong className="text-slate-950">{summary.correction}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Logo</span>
                <strong className="text-slate-950">{summary.logo}</strong>
              </div>
            </div>

            {design.customText ? (
              <div className="mt-4 rounded-3xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
                <div className="font-medium">Custom text</div>
                <div className="mt-2 break-words">{design.customText}</div>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

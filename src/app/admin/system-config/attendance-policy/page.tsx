'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { QrCode, ShieldCheck, Sliders } from 'lucide-react';

type ConfigItem = {
  id: number;
  config_key: string;
  config_value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
};

type FieldType = 'text' | 'number' | 'boolean' | 'textarea' | 'select';

type FieldMeta = {
  key: string;
  label: string;
  type: FieldType;
  description: string;
  section: 'qr' | 'face';
  options?: Array<{ value: string; label: string }>;
};

const FIELD_ORDER: FieldMeta[] = [
  {
    key: 'attendance_policy_version',
    label: 'Phien ban policy',
    type: 'text',
    section: 'qr',
    description: 'Phien ban dang dung de theo doi rollout hien tai.',
  },
  {
    key: 'attendance_qr_fallback_preset',
    label: 'Ten preset QR fallback',
    type: 'text',
    section: 'qr',
    description: 'Ten preset duoc hien thi trong route va UI policy.',
  },
  {
    key: 'attendance_qr_fallback_p95_ms',
    label: 'Nguong p95 response time (ms)',
    type: 'number',
    section: 'qr',
    description: 'Neu p95 response time vuot nguong nay va du mau, he thong de xuat fallback.',
  },
  {
    key: 'attendance_qr_fallback_queue_backlog',
    label: 'Nguong queue backlog',
    type: 'number',
    section: 'qr',
    description: 'Neu backlog quet vuot nguong nay, QR fallback duoc khuyen nghi.',
  },
  {
    key: 'attendance_qr_fallback_scan_failure_rate',
    label: 'Nguong scan failure rate (0-1)',
    type: 'number',
    section: 'qr',
    description: 'Vi du 0.12 tuong duong 12% loi quet.',
  },
  {
    key: 'attendance_qr_fallback_min_sample_size',
    label: 'So mau toi thieu truoc khi auto fallback',
    type: 'number',
    section: 'qr',
    description: 'Tranh fallback som khi so mau quet chua du tin cay.',
  },
  {
    key: 'attendance_qr_fallback_teacher_manual_override',
    label: 'Cho phep teacher manual override QR fallback',
    type: 'boolean',
    section: 'qr',
    description: 'Cho phep giang vien tu chuyen che do ma khong bi khoa cung theo threshold.',
  },
  {
    key: 'attendance_face_pilot_selection_mode',
    label: 'Cach chon activity cho face pilot',
    type: 'select',
    section: 'face',
    description: 'Chon heuristic, danh sach da chon, hoac ket hop ca hai.',
    options: [
      {
        value: 'selected_or_heuristic',
        label: 'selected_or_heuristic - danh sach chon hoac heuristic',
      },
      { value: 'selected_only', label: 'selected_only - chi activity nam trong danh sach chon' },
      { value: 'heuristic_only', label: 'heuristic_only - chi theo nguong heuristic' },
    ],
  },
  {
    key: 'attendance_face_pilot_activity_ids',
    label: 'Danh sach activity pilot (JSON array)',
    type: 'textarea',
    section: 'face',
    description: 'Nhap mang JSON, vi du [101, 205, 309].',
  },
  {
    key: 'attendance_face_pilot_min_participation_count',
    label: 'Nguong participation toi thieu',
    type: 'number',
    section: 'face',
    description: 'Neu so participation dat nguong nay, heuristic xem activity la high-volume.',
  },
  {
    key: 'attendance_face_pilot_min_max_participants',
    label: 'Nguong max_participants toi thieu',
    type: 'number',
    section: 'face',
    description: 'Fallback heuristic dua tren quy mo du kien cua activity.',
  },
  {
    key: 'attendance_face_pilot_require_mandatory_scope',
    label: 'Yeu cau mandatory scope',
    type: 'boolean',
    section: 'face',
    description: 'Neu bat, face pilot chi ap dung cho activity co lop bat buoc.',
  },
  {
    key: 'attendance_face_pilot_require_approved_or_published',
    label: 'Yeu cau approved/published',
    type: 'boolean',
    section: 'face',
    description: 'Neu bat, activity phai approved/published truoc khi duoc xet pilot.',
  },
  {
    key: 'attendance_face_pilot_teacher_manual_override',
    label: 'Cho phep teacher manual override face flow',
    type: 'boolean',
    section: 'face',
    description: 'Cho phep teacher chuyen sang manual confirmation/manual attendance khi can.',
  },
  {
    key: 'attendance_face_pilot_min_confidence_score',
    label: 'Nguong confidence toi thieu',
    type: 'number',
    section: 'face',
    description: 'Neu confidence thap hon nguong nay, route face attendance tra fallback guidance.',
  },
];

function getInitialFormValues(items: ConfigItem[]) {
  const next: Record<string, string> = {};
  items.forEach((item) => {
    next[item.config_key] = item.config_value ?? '';
  });
  return next;
}

function FieldCard({
  item,
  field,
  value,
  onChange,
}: {
  item: ConfigItem;
  field: FieldMeta;
  value: string;
  onChange: (next: string) => void;
}) {
  const inputClassName =
    'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-300';

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2">
        <label className="text-sm font-semibold text-slate-900">{field.label}</label>
        <p className="mt-1 text-xs text-slate-500">{field.description}</p>
        {item.description ? <p className="mt-1 text-xs text-slate-400">DB: {item.description}</p> : null}
      </div>

      {field.type === 'number' ? (
        <input type="number" value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} />
      ) : null}

      {field.type === 'text' ? (
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} />
      ) : null}

      {field.type === 'boolean' ? (
        <select value={value || 'false'} onChange={(event) => onChange(event.target.value)} className={inputClassName}>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : null}

      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClassName} min-h-28 font-mono`}
        />
      ) : null}

      {field.type === 'select' ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName}>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
    </article>
  );
}

export default function AttendancePolicySystemConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      void fetchConfigs();
    }
  }, [authLoading, router, user]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system-config?category=attendance');
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || 'Khong tai duoc attendance policy config');
      }

      const items = (body?.configs || [])
        .filter((item: ConfigItem) => item.config_key.startsWith('attendance_'))
        .sort(
          (a: ConfigItem, b: ConfigItem) =>
            FIELD_ORDER.findIndex((field) => field.key === a.config_key) -
            FIELD_ORDER.findIndex((field) => field.key === b.config_key)
        );

      setConfigs(items);
      setFormValues(getInitialFormValues(items));
    } catch (error) {
      console.error('Fetch attendance policy config error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong tai duoc cau hinh policy');
    } finally {
      setLoading(false);
    }
  };

  const fieldLookup = useMemo(() => new Map(FIELD_ORDER.map((field) => [field.key, field])), []);

  const qrFields = configs.filter((item) => fieldLookup.get(item.config_key)?.section === 'qr');
  const faceFields = configs.filter((item) => fieldLookup.get(item.config_key)?.section === 'face');

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates = configs.map((cfg) => ({
        key: cfg.config_key,
        value: formValues[cfg.config_key] ?? '',
      }));

      const response = await fetch('/api/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || 'Khong luu duoc attendance policy config');
      }

      toast.success('Da luu attendance policy config');
      await fetchConfigs();
    } catch (error) {
      console.error('Save attendance policy config error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong luu duoc cau hinh');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai attendance policy..." />;
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
              <Sliders className="h-8 w-8 text-cyan-700" />
              <h1
                className="text-3xl font-semibold text-slate-950"
                data-testid="admin-attendance-policy-heading"
              >
                Chinh sach diem danh
              </h1>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Cau hinh nguong QR fallback va face pilot ma khong can sua code helper hoac route logic.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/settings"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ve settings
            </Link>
            <Link
              href="/admin/dashboard"
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              Ve dashboard
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-violet-600" />
            <h2 className="text-xl font-semibold text-slate-950">QR fallback policy</h2>
          </div>
          <div className="space-y-4">
            {qrFields.map((item) => {
              const field = fieldLookup.get(item.config_key);
              if (!field) return null;

              return (
                <FieldCard
                  key={item.id}
                  item={item}
                  field={field}
                  value={formValues[item.config_key] ?? ''}
                  onChange={(next) =>
                    setFormValues((prev) => ({ ...prev, [item.config_key]: next }))
                  }
                />
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-slate-950">Face pilot policy</h2>
          </div>
          <div className="space-y-4">
            {faceFields.map((item) => {
              const field = fieldLookup.get(item.config_key);
              if (!field) return null;

              return (
                <FieldCard
                  key={item.id}
                  item={item}
                  field={field}
                  value={formValues[item.config_key] ?? ''}
                  onChange={(next) =>
                    setFormValues((prev) => ({ ...prev, [item.config_key]: next }))
                  }
                />
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
        <div className="font-medium">Luu y van hanh</div>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>`selected_only` chi cho phep face pilot tren activity id nam trong danh sach JSON.</li>
          <li>`selected_or_heuristic` giu kha nang pilot theo activity duoc chon hoac theo heuristic quy mo.</li>
          <li>Sau khi luu, cac route attendance policy va face attendance se doc lai config moi tu DB.</li>
        </ul>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {saving ? 'Dang luu...' : 'Luu chinh sach diem danh'}
        </button>
      </div>
    </div>
  );
}

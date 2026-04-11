'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Sliders, ShieldCheck, QrCode } from 'lucide-react';

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
    label: 'Phiên bản policy',
    type: 'text',
    section: 'qr',
    description: 'Phiên bản đang dùng để theo dõi policy rollout hiện tại.',
  },
  {
    key: 'attendance_qr_fallback_preset',
    label: 'Tên preset QR fallback',
    type: 'text',
    section: 'qr',
    description: 'Tên preset hiển thị trong các route và UI policy.',
  },
  {
    key: 'attendance_qr_fallback_p95_ms',
    label: 'Ngưỡng p95 response time (ms)',
    type: 'number',
    section: 'qr',
    description: 'Nếu p95 response time vượt ngưỡng này và đủ mẫu, hệ thống sẽ đề xuất fallback.',
  },
  {
    key: 'attendance_qr_fallback_queue_backlog',
    label: 'Ngưỡng queue backlog',
    type: 'number',
    section: 'qr',
    description: 'Nếu backlog quét vượt ngưỡng này, QR fallback sẽ được khuyến nghị.',
  },
  {
    key: 'attendance_qr_fallback_scan_failure_rate',
    label: 'Ngưỡng scan failure rate (0-1)',
    type: 'number',
    section: 'qr',
    description: 'Ví dụ 0.12 tương đương 12% lỗi quét.',
  },
  {
    key: 'attendance_qr_fallback_min_sample_size',
    label: 'Số mẫu tối thiểu trước khi auto fallback',
    type: 'number',
    section: 'qr',
    description: 'Tránh fallback sớm khi số mẫu quét chưa đủ tin cậy.',
  },
  {
    key: 'attendance_qr_fallback_teacher_manual_override',
    label: 'Cho phép teacher manual override QR fallback',
    type: 'boolean',
    section: 'qr',
    description: 'Cho phép giảng viên tự chuyển chế độ mà không bị khóa cứng theo threshold.',
  },
  {
    key: 'attendance_face_pilot_selection_mode',
    label: 'Cách chọn activity cho face pilot',
    type: 'select',
    section: 'face',
    description: 'Chọn heuristic, chỉ danh sách đã chọn, hoặc kết hợp cả hai.',
    options: [
      { value: 'selected_or_heuristic', label: 'selected_or_heuristic — danh sách chọn hoặc heuristic' },
      { value: 'selected_only', label: 'selected_only — chỉ activity nằm trong danh sách chọn' },
      { value: 'heuristic_only', label: 'heuristic_only — chỉ theo ngưỡng heuristic' },
    ],
  },
  {
    key: 'attendance_face_pilot_activity_ids',
    label: 'Danh sách activity pilot (JSON array)',
    type: 'textarea',
    section: 'face',
    description: 'Nhập mảng JSON, ví dụ [101, 205, 309].',
  },
  {
    key: 'attendance_face_pilot_min_participation_count',
    label: 'Ngưỡng participation tối thiểu',
    type: 'number',
    section: 'face',
    description: 'Nếu số participation đạt ngưỡng này, heuristic xem activity là high-volume.',
  },
  {
    key: 'attendance_face_pilot_min_max_participants',
    label: 'Ngưỡng max_participants tối thiểu',
    type: 'number',
    section: 'face',
    description: 'Fallback heuristic dựa trên quy mô dự kiến của activity.',
  },
  {
    key: 'attendance_face_pilot_require_mandatory_scope',
    label: 'Yêu cầu mandatory scope',
    type: 'boolean',
    section: 'face',
    description: 'Nếu bật, face pilot chỉ áp dụng cho activity có lớp bắt buộc.',
  },
  {
    key: 'attendance_face_pilot_require_approved_or_published',
    label: 'Yêu cầu approved/published',
    type: 'boolean',
    section: 'face',
    description: 'Nếu bật, activity phải approved/published trước khi được xét pilot.',
  },
  {
    key: 'attendance_face_pilot_teacher_manual_override',
    label: 'Cho phép teacher manual override face flow',
    type: 'boolean',
    section: 'face',
    description: 'Cho phép teacher chuyển sang manual confirmation/manual attendance khi cần.',
  },
  {
    key: 'attendance_face_pilot_min_confidence_score',
    label: 'Ngưỡng confidence tối thiểu',
    type: 'number',
    section: 'face',
    description: 'Nếu confidence thấp hơn ngưỡng này, route face attendance sẽ trả fallback guidance.',
  },
];

function getInitialFormValues(items: ConfigItem[]) {
  const next: Record<string, string> = {};
  items.forEach((item) => {
    next[item.config_key] = item.config_value ?? '';
  });
  return next;
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
        throw new Error(body?.error || 'Không tải được attendance policy config');
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
      toast.error(error instanceof Error ? error.message : 'Không tải được cấu hình policy');
    } finally {
      setLoading(false);
    }
  };

  const fieldLookup = useMemo(
    () => new Map(FIELD_ORDER.map((field) => [field.key, field])),
    []
  );

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
        throw new Error(body?.error || 'Không lưu được attendance policy config');
      }

      toast.success('Đã lưu attendance policy config');
      await fetchConfigs();
    } catch (error) {
      console.error('Save attendance policy config error:', error);
      toast.error(error instanceof Error ? error.message : 'Không lưu được cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (item: ConfigItem) => {
    const field = fieldLookup.get(item.config_key);
    if (!field) return null;

    const value = formValues[item.config_key] ?? '';

    return (
      <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-2">
          <label className="text-sm font-semibold text-gray-900">{field.label}</label>
          <p className="mt-1 text-xs text-gray-500">{field.description}</p>
          {item.description ? <p className="mt-1 text-xs text-gray-400">DB: {item.description}</p> : null}
        </div>

        {field.type === 'number' ? (
          <input
            type="number"
            value={value}
            onChange={(e) => setFormValues((prev) => ({ ...prev, [item.config_key]: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        ) : null}

        {field.type === 'text' ? (
          <input
            type="text"
            value={value}
            onChange={(e) => setFormValues((prev) => ({ ...prev, [item.config_key]: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        ) : null}

        {field.type === 'boolean' ? (
          <select
            value={value || 'false'}
            onChange={(e) => setFormValues((prev) => ({ ...prev, [item.config_key]: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : null}

        {field.type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => setFormValues((prev) => ({ ...prev, [item.config_key]: e.target.value }))}
            className="min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
          />
        ) : null}

        {field.type === 'select' ? (
          <select
            value={value}
            onChange={(e) => setFormValues((prev) => ({ ...prev, [item.config_key]: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    );
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Sliders className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900" data-testid="admin-attendance-policy-heading">
            Chính sách điểm danh
          </h1>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Cấu hình ngưỡng QR fallback và pilot face attendance mà không cần sửa code helper.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">QR fallback policy</h2>
          </div>
          <div className="space-y-4">{qrFields.map(renderField)}</div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900">Face pilot policy</h2>
          </div>
          <div className="space-y-4">{faceFields.map(renderField)}</div>
        </section>
      </div>

      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">Lưu ý vận hành</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>`selected_only` sẽ chỉ cho phép face pilot trên activity id nằm trong danh sách JSON.</li>
          <li>`selected_or_heuristic` giữ khả năng pilot theo activity được chọn hoặc theo heuristic quy mô.</li>
          <li>Sau khi lưu, các route attendance policy / face attendance sẽ đọc lại config mới từ DB.</li>
        </ul>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {saving ? 'Đang lưu...' : 'Lưu chính sách điểm danh'}
        </button>
      </div>
    </div>
  );
}

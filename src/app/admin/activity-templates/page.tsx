'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  BookTemplate,
  Clock3,
  Layers3,
  QrCode,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
  id: number;
  name: string;
  description: string;
  activity_type_id: number;
  activity_type_name: string;
  organization_level_id: number;
  organization_level_name: string;
  default_duration_hours: number;
  default_max_participants: number;
  qr_enabled: boolean;
  created_at: string;
}

interface ActivityTypeOption {
  id: number;
  name: string;
}

interface OrgLevelOption {
  id: number;
  name: string;
}

type TemplateFormState = {
  name: string;
  description: string;
  activity_type_id: string;
  organization_level_id: string;
  default_duration_hours: number;
  default_max_participants: number;
  qr_enabled: boolean;
};

const INITIAL_FORM: TemplateFormState = {
  name: '',
  description: '',
  activity_type_id: '',
  organization_level_id: '',
  default_duration_hours: 2,
  default_max_participants: 50,
  qr_enabled: true,
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
  tone: 'blue' | 'emerald' | 'amber';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700'
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

export default function ActivityTemplatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeOption[]>([]);
  const [orgLevels, setOrgLevels] = useState<OrgLevelOption[]>([]);
  const [formData, setFormData] = useState<TemplateFormState>(INITIAL_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchTemplates();
      void fetchOptions();
    }
  }, [authLoading, router, user]);

  async function fetchTemplates() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/admin/activity-templates');
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai mau hoat dong');
      }

      setTemplates(payload?.templates || []);
    } catch (fetchError) {
      console.error('Fetch activity templates error:', fetchError);
      setError(
        fetchError instanceof Error ? fetchError.message : 'Khong the tai mau hoat dong'
      );
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOptions() {
    try {
      const [typesRes, levelsRes] = await Promise.all([
        fetch('/api/activity-types'),
        fetch('/api/organization-levels'),
      ]);

      const [typesPayload, levelsPayload] = await Promise.all([
        typesRes.json().catch(() => null),
        levelsRes.json().catch(() => null),
      ]);

      if (typesRes.ok) {
        setActivityTypes(typesPayload?.types || []);
      }
      if (levelsRes.ok) {
        setOrgLevels(levelsPayload?.levels || []);
      }
    } catch (fetchError) {
      console.error('Fetch activity template options error:', fetchError);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/activity-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Tao mau hoat dong that bai');
      }

      toast.success('Da tao mau hoat dong thanh cong');
      setShowForm(false);
      setFormData(INITIAL_FORM);
      await fetchTemplates();
    } catch (submitError) {
      console.error('Create activity template error:', submitError);
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : 'Khong the tao mau hoat dong'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const response = await fetch(`/api/admin/activity-templates/${id}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Xoa mau that bai');
      }

      toast.success('Da xoa mau hoat dong');
      await fetchTemplates();
    } catch (deleteError) {
      console.error('Delete activity template error:', deleteError);
      toast.error(deleteError instanceof Error ? deleteError.message : 'Khong the xoa mau');
    }
  }

  const stats = useMemo(() => {
    const qrEnabledCount = templates.filter((template) => template.qr_enabled).length;
    const avgDuration =
      templates.length === 0
        ? 0
        : templates.reduce((sum, template) => sum + template.default_duration_hours, 0) /
          templates.length;

    return {
      qrEnabledCount,
      avgDuration,
    };
  }, [templates]);

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai mau hoat dong..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                Activity presets
              </div>
              <h1
                className="mt-3 text-3xl font-bold text-slate-900"
                data-testid="admin-activity-templates-heading"
              >
                Mau hoat dong
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Quan ly bo preset de teacher va admin giu thong so hoat dong dong nhat:
                loai hoat dong, cap to chuc, thoi luong, quy mo va che do QR.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setShowForm((current) => !current);
                  setFormData(INITIAL_FORM);
                }}
                data-testid="toggle-activity-template-form"
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {showForm ? 'Dong form' : 'Tao mau moi'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/activities')}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Mo quan ly hoat dong
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="text-sm font-semibold text-rose-700">Co loi khi tai du lieu</div>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Tong mau"
            value={String(templates.length)}
            meta="So preset dang san sang"
            tone="blue"
          />
          <StatCard
            label="QR bat san"
            value={String(stats.qrEnabledCount)}
            meta="Mau mac dinh co QR diem danh"
            tone="emerald"
          />
          <StatCard
            label="Thoi luong TB"
            value={`${stats.avgDuration.toFixed(1)} gio`}
            meta="Tinh tren toan bo mau"
            tone="amber"
          />
        </section>

        {showForm ? (
          <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
            <div className="flex items-center gap-2 text-slate-900">
              <Sparkles className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-semibold">Tao mau moi</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Mau nay se duoc dung lam preset thong so khi can lap nhanh hoat dong moi.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Ten mau *</span>
                  <input
                    data-testid="activity-template-name-input"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    placeholder="Vi du: Tinh nguyen he cap truong"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Loai hoat dong *
                  </span>
                  <select
                    data-testid="activity-template-type-select"
                    required
                    value={formData.activity_type_id}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        activity_type_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="">Chon loai hoat dong</option>
                    {activityTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Cap to chuc *
                  </span>
                  <select
                    data-testid="activity-template-org-level-select"
                    required
                    value={formData.organization_level_id}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        organization_level_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="">Chon cap to chuc</option>
                    {orgLevels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    So nguoi toi da
                  </span>
                  <input
                    data-testid="activity-template-max-participants-input"
                    type="number"
                    min="1"
                    value={formData.default_max_participants}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        default_max_participants: Number(event.target.value || 1),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Thoi luong mac dinh (gio)
                  </span>
                  <input
                    data-testid="activity-template-duration-input"
                    type="number"
                    min="1"
                    value={formData.default_duration_hours}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        default_duration_hours: Number(event.target.value || 1),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={formData.qr_enabled}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, qr_enabled: event.target.checked }))
                    }
                    className="h-5 w-5"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Bat QR diem danh</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Mac dinh uu tien QR khi tao activity tu mau nay.
                    </div>
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Mo ta mac dinh
                </span>
                <textarea
                  data-testid="activity-template-description-input"
                  rows={4}
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, description: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  placeholder="Mo ta tong quan, muc tieu va cac ghi chu van hanh cho mau nay..."
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData(INITIAL_FORM);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Huy
                </button>
                <button
                  type="submit"
                  data-testid="submit-activity-template-form"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Dang luu...' : 'Luu mau hoat dong'}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="space-y-4">
          {templates.length === 0 ? (
            <div className="page-surface rounded-[1.75rem] border-dashed px-5 py-10 text-center sm:px-7">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
                <BookTemplate className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">Chua co mau hoat dong</h2>
              <p className="mt-2 text-sm text-slate-600">
                Tao preset dau tien de giu cau truc activity nhat quan cho toan he thong.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {templates.map((template) => (
                <article
                  key={template.id}
                  className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{template.name}</h2>
                        <p className="mt-2 text-sm text-slate-600">
                          {template.description || 'Chua co mo ta mac dinh cho mau nay.'}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Mau #{template.id}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {template.activity_type_name}
                      </span>
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                        {template.organization_level_name}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          template.qr_enabled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {template.qr_enabled ? 'QR bat san' : 'QR tat san'}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <Clock3 className="h-4 w-4" />
                          Thoi luong
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {template.default_duration_hours} gio
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <Users className="h-4 w-4" />
                          Quy mo
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {template.default_max_participants} nguoi
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <Layers3 className="h-4 w-4" />
                          Van hanh
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {template.qr_enabled ? 'Co QR' : 'Khong QR'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => router.push('/admin/activities')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <QrCode className="h-4 w-4" />
                        Mo quan ly hoat dong
                      </button>
                      <button
                        type="button"
                        data-testid={`delete-template-${template.id}`}
                        onClick={() => setTemplateToDelete(template)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xoa mau
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <ConfirmDialog
          isOpen={templateToDelete !== null}
          title="Xoa mau hoat dong"
          message={
            templateToDelete
              ? `Ban co chac chan muon xoa mau "${templateToDelete.name}" khong?`
              : ''
          }
          confirmText="Xoa mau"
          cancelText="Huy"
          variant="danger"
          onCancel={() => setTemplateToDelete(null)}
          onConfirm={async () => {
            if (!templateToDelete) return;
            await handleDelete(templateToDelete.id);
            setTemplateToDelete(null);
          }}
        />
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { toVietnamDatetimeLocalValue } from '@/lib/timezone';

type ActivityRecord = {
  id: number;
  title: string;
  description?: string | null;
  date_time: string;
  end_time?: string | null;
  location?: string | null;
  activity_type_id?: number | null;
  organization_level_id?: number | null;
  max_participants?: number | null;
  status?: string | null;
};

type ActivityType = {
  id: number;
  name: string;
};

type OrganizationLevel = {
  id: number;
  name: string;
};

type FormState = {
  title: string;
  description: string;
  date_time: string;
  end_time: string;
  location: string;
  activity_type_id: string;
  organization_level_id: string;
  max_participants: string;
};

type FieldKey = keyof FormState;

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  date_time: '',
  end_time: '',
  location: '',
  activity_type_id: '',
  organization_level_id: '',
  max_participants: '',
};

function parseActivityPayload(payload: any): ActivityRecord | null {
  return payload?.activity || payload?.data?.activity || null;
}

function parseActivityTypesPayload(payload: any): ActivityType[] {
  const source = payload?.types || payload?.data?.types || payload?.data || [];
  return Array.isArray(source) ? source : [];
}

function parseOrganizationLevelsPayload(payload: any): OrganizationLevel[] {
  const source = payload?.levels || payload?.data?.levels || payload?.data || [];
  return Array.isArray(source) ? source : [];
}

function normalizeFormFromActivity(activity: ActivityRecord): FormState {
  return {
    title: activity.title || '',
    description: activity.description || '',
    date_time: toVietnamDatetimeLocalValue(activity.date_time),
    end_time: toVietnamDatetimeLocalValue(activity.end_time || null),
    location: activity.location || '',
    activity_type_id: activity.activity_type_id ? String(activity.activity_type_id) : '',
    organization_level_id: activity.organization_level_id
      ? String(activity.organization_level_id)
      : '',
    max_participants:
      typeof activity.max_participants === 'number' && activity.max_participants > 0
        ? String(activity.max_participants)
        : '',
  };
}

function getFieldLabel(field: FieldKey) {
  switch (field) {
    case 'title':
      return 'Tieu de';
    case 'description':
      return 'Mo ta';
    case 'date_time':
      return 'Bat dau';
    case 'end_time':
      return 'Ket thuc';
    case 'location':
      return 'Dia diem';
    case 'activity_type_id':
      return 'Loai hoat dong';
    case 'organization_level_id':
      return 'Cap to chuc';
    case 'max_participants':
      return 'Gioi han tham gia';
    default:
      return field;
  }
}

export default function AdminEditActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const activityId = String(params?.id || '');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [organizationLevels, setOrganizationLevels] = useState<OrganizationLevel[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<FormState>(EMPTY_FORM);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const fetchEditContext = useCallback(async () => {
    try {
      setLoading(true);
      const [activityResponse, typesResponse, levelsResponse] = await Promise.all([
        fetch(`/api/admin/activities/${activityId}`),
        fetch('/api/admin/activity-types'),
        fetch('/api/admin/organization-levels'),
      ]);

      const activityPayload = await activityResponse.json().catch(() => null);
      if (!activityResponse.ok) {
        throw new Error(activityPayload?.error || activityPayload?.message || 'Khong the tai hoat dong');
      }

      const nextActivity = parseActivityPayload(activityPayload);
      if (!nextActivity) {
        throw new Error('Khong tim thay du lieu hoat dong');
      }

      const normalizedForm = normalizeFormFromActivity(nextActivity);
      setActivity(nextActivity);
      setForm(normalizedForm);
      setInitialForm(normalizedForm);

      if (typesResponse.ok) {
        setActivityTypes(
          parseActivityTypesPayload(await typesResponse.json().catch(() => null))
        );
      }

      if (levelsResponse.ok) {
        setOrganizationLevels(
          parseOrganizationLevelsPayload(await levelsResponse.json().catch(() => null))
        );
      }
    } catch (error) {
      console.error('Fetch admin activity edit context error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai du lieu chinh sua');
      router.push('/admin/activities');
    } finally {
      setLoading(false);
    }
  }, [activityId, router]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user && activityId) {
      void fetchEditContext();
    }
  }, [activityId, authLoading, fetchEditContext, router, user]);

  const changedFields = useMemo(() => {
    const nextChanges: Array<{ field: FieldKey; from: string; to: string }> = [];

    (Object.keys(form) as FieldKey[]).forEach((field) => {
      if (form[field] !== initialForm[field]) {
        nextChanges.push({
          field,
          from: initialForm[field],
          to: form[field],
        });
      }
    });

    return nextChanges;
  }, [form, initialForm]);

  function updateField(field: FieldKey, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildPayload() {
    const payload: Record<string, string | number | null> = {};

    changedFields.forEach(({ field }) => {
      const value = form[field];

      if (field === 'activity_type_id' || field === 'organization_level_id') {
        payload[field] = value ? Number(value) : null;
        return;
      }

      if (field === 'max_participants') {
        payload[field] = value ? Number(value) : null;
        return;
      }

      payload[field] = value || null;
    });

    return payload;
  }

  async function saveChanges() {
    if (changedFields.length === 0) {
      toast.error('Khong co thay doi de luu');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/activities/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the cap nhat hoat dong');
      }

      const nextActivity = parseActivityPayload(payload);
      if (nextActivity) {
        const normalized = normalizeFormFromActivity(nextActivity);
        setActivity(nextActivity);
        setForm(normalized);
        setInitialForm(normalized);
      }

      toast.success(payload?.message || 'Da cap nhat hoat dong');
      setShowSaveConfirm(false);
      router.push(`/admin/activities/${activityId}`);
    } catch (error) {
      console.error('Save admin activity error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the cap nhat hoat dong');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai du lieu chinh sua..." />;
  }

  if (!activity) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-3xl">
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-6 sm:px-7">
            <div className="text-sm font-semibold text-rose-700">Khong tim thay hoat dong</div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => router.push(`/admin/activities/${activityId}`)}
                className="rounded-xl border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Activity edit
                </div>
                <h1
                  className="mt-3 text-3xl font-bold text-slate-900"
                  data-testid="admin-activity-edit-heading"
                >
                  Chinh sua hoat dong
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  ID {activity.id} | Trang thai hien tai: {activity.status || 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowSaveConfirm(true)}
                disabled={changedFields.length === 0 || saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Luu thay doi
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">Tieu de</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">Mo ta</span>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Bat dau</span>
                <input
                  type="datetime-local"
                  value={form.date_time}
                  onChange={(event) => updateField('date_time', event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Ket thuc</span>
                <input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(event) => updateField('end_time', event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">Dia diem</span>
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Loai hoat dong</span>
                <select
                  value={form.activity_type_id}
                  onChange={(event) => updateField('activity_type_id', event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                >
                  <option value="">Chon loai</option>
                  {activityTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Cap to chuc</span>
                <select
                  value={form.organization_level_id}
                  onChange={(event) => updateField('organization_level_id', event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                >
                  <option value="">Chon cap</option>
                  {organizationLevels.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Gioi han tham gia</span>
                <input
                  type="number"
                  min="0"
                  value={form.max_participants}
                  onChange={(event) => updateField('max_participants', event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                />
              </label>
            </div>
          </section>

          <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
            <h2 className="text-lg font-semibold text-slate-900">Preview thay doi</h2>
            <p className="mt-2 text-sm text-slate-600">
              Kiem tra cac truong sap cap nhat truoc khi ghi vao he thong.
            </p>

            {changedFields.length === 0 ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                Chua co thay doi nao so voi ban hien tai.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {changedFields.map((change) => (
                  <div
                    key={change.field}
                    className="rounded-[1.5rem] border border-blue-200 bg-blue-50 px-4 py-4"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      {getFieldLabel(change.field)}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">Cu: {change.from || '(trong)'}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      Moi: {change.to || '(trong)'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
                <div>
                  <div className="text-sm font-semibold text-amber-900">Luu y van hanh</div>
                  <p className="mt-1 text-sm text-amber-800">
                    Hoat dong sau khi sua van giu nguyen workflow hien tai. Neu can doi quy trinh phe
                    duyet, hay thao tac o man chi tiet.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Luu thay doi hoat dong"
        message={`Ban sap cap nhat ${changedFields.length} truong trong hoat dong nay.`}
        confirmText="Xac nhan luu"
        cancelText="Dong"
        variant="info"
        onCancel={() => setShowSaveConfirm(false)}
        onConfirm={async () => {
          await saveChanges();
        }}
      />
    </div>
  );
}

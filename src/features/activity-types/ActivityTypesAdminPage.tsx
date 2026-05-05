'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Layers3,
  Palette,
  Pencil,
  Plus,
  Trash2,
  Trophy,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatVietnamDateTime } from '@/lib/timezone';

export interface ActivityType {
  id: number;
  name: string;
  base_points: number;
  color: string;
  created_at: string;
  updated_at?: string;
}

function getActivityTypesFromPayload(payload: unknown): ActivityType[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as {
    activityTypes?: ActivityType[];
    activity_types?: ActivityType[];
    types?: ActivityType[];
    data?: { activityTypes?: ActivityType[] };
  };

  return (
    record.activityTypes ??
    record.activity_types ??
    record.types ??
    record.data?.activityTypes ??
    []
  );
}

function getActivityTypeFormTitle(editingType: ActivityType | null) {
  return editingType ? 'Cap nhat loai hoat dong' : 'Them loai hoat dong';
}

export default function ActivityTypesAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<ActivityType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<ActivityType | null>(null);
  const [formData, setFormData] = useState({ name: '', base_points: 10, color: '#3B82F6' });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      void fetchActivityTypes();
    }
  }, [authLoading, router, user]);

  const stats = useMemo(() => {
    const highestBasePoints =
      activityTypes.length > 0
        ? Math.max(...activityTypes.map((type) => Number(type.base_points || 0)))
        : 0;

    return {
      total: activityTypes.length,
      highestBasePoints,
      uniqueColors: new Set(activityTypes.map((type) => type.color || '#3B82F6')).size,
    };
  }, [activityTypes]);

  const fetchActivityTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/activity-types');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the tai loai hoat dong'
        );
      }

      setActivityTypes(getActivityTypesFromPayload(payload));
    } catch (error) {
      console.error('Fetch activity types error:', error);
      toast.error('Khong the tai loai hoat dong');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type?: ActivityType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        base_points: Number(type.base_points || 0),
        color: type.color || '#3B82F6',
      });
    } else {
      setEditingType(null);
      setFormData({ name: '', base_points: 10, color: '#3B82F6' });
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({ name: '', base_points: 10, color: '#3B82F6' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      const response = await fetch(
        editingType ? `/api/activity-types/${editingType.id}` : '/api/activity-types',
        {
          method: editingType ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the luu loai hoat dong'
        );
      }

      toast.success(
        editingType ? 'Da cap nhat loai hoat dong' : 'Da tao loai hoat dong moi'
      );
      handleCloseModal();
      await fetchActivityTypes();
    } catch (error) {
      console.error('Submit activity type error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the luu loai hoat dong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;

    try {
      const response = await fetch(`/api/activity-types/${typeToDelete.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the xoa loai hoat dong'
        );
      }

      toast.success('Da xoa loai hoat dong');
      setTypeToDelete(null);
      await fetchActivityTypes();
    } catch (error) {
      console.error('Delete activity type error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the xoa loai hoat dong');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai loai hoat dong..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                href="/admin/dashboard"
                className="rounded-xl border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Activity types
                </div>
                <h1
                  className="mt-3 text-3xl font-bold text-slate-900"
                  data-testid="admin-activity-types-heading"
                >
                  Cau hinh loai hoat dong
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Quan ly nhom hoat dong, diem co ban va mau nhan de teacher/admin tao su kien
                  nhat quan trong toan he thong.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Them loai hoat dong
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] bg-blue-50 px-4 py-4 text-blue-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Tong loai</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.total}</div>
              </div>
              <Layers3 className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-emerald-50 px-4 py-4 text-emerald-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Diem co ban cao nhat</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  {stats.highestBasePoints}
                </div>
              </div>
              <Trophy className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-violet-50 px-4 py-4 text-violet-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Mau dang dung</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.uniqueColors}</div>
              </div>
              <Palette className="h-8 w-8" />
            </div>
          </article>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 xl:hidden">
            {activityTypes.length === 0 ? (
              <div className="page-surface rounded-[1.75rem] px-5 py-8 text-center text-sm text-slate-500 sm:px-7">
                Chua co loai hoat dong nao.
              </div>
            ) : (
              activityTypes.map((type) => (
                <article key={type.id} className="page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Loai #{type.id}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">{type.name}</div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-600">
                        <span
                          className="h-3 w-3 rounded-full border border-slate-300"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.color}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-blue-700">{type.base_points}</div>
                      <div className="text-xs text-slate-500">diem co ban</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-500">
                    Tao luc {formatVietnamDateTime(type.created_at, 'datetime')}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(type)}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Sua
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeToDelete(type)}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Xoa
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="page-surface hidden overflow-x-auto rounded-[1.75rem] border xl:block">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    ID
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ten loai
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Diem co ban
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mau nhan
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tao luc
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thao tac
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {activityTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                      Chua co loai hoat dong nao.
                    </td>
                  </tr>
                ) : (
                  activityTypes.map((type) => (
                    <tr key={type.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm text-slate-600">{type.id}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">{type.name}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-blue-700">{type.base_points}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                          <span
                            className="h-3 w-3 rounded-full border border-slate-300"
                            style={{ backgroundColor: type.color }}
                          />
                          {type.color}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatVietnamDateTime(type.created_at, 'datetime')}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(type)}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Sua
                          </button>
                          <button
                            type="button"
                            onClick={() => setTypeToDelete(type)}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Xoa
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

        {showModal && (
          <div className="app-modal-backdrop px-4 py-6" onClick={handleCloseModal}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-activity-type-dialog-title"
              className="app-modal-panel app-modal-panel-scroll w-full max-w-xl p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="admin-activity-type-dialog-title" className="text-2xl font-semibold text-slate-900">
                {getActivityTypeFormTitle(editingType)}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Cap nhat ten loai, diem co ban va mau nhan de danh sach hoat dong duoc nhat quan.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Ten loai hoat dong</span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Diem co ban</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.base_points}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        base_points: Number.parseInt(event.target.value || '0', 10),
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    <span>Mau</span>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(event) => setFormData({ ...formData, color: event.target.value })}
                      className="h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                    />
                  </label>

                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    <span>Ma mau</span>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(event) => setFormData({ ...formData, color: event.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editingType ? 'Luu thay doi' : 'Tao loai moi'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Dong
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={typeToDelete !== null}
          title="Xoa loai hoat dong"
          message={
            typeToDelete
              ? `Loai "${typeToDelete.name}" se bi go khoi danh sach cau hinh neu khong con duoc hoat dong nao su dung.`
              : ''
          }
          confirmText="Xoa ngay"
          cancelText="Bo qua"
          variant="danger"
          onCancel={() => setTypeToDelete(null)}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}

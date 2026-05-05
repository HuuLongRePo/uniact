'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Building2,
  Pencil,
  Plus,
  Scale,
  Trash2,
  Waves,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatVietnamDateTime } from '@/lib/timezone';

export interface OrgLevel {
  id: number;
  name: string;
  multiplier: number;
  description?: string;
  created_at: string;
}

function getLevelsFromPayload(payload: unknown): OrgLevel[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as {
    organization_levels?: OrgLevel[];
    levels?: OrgLevel[];
    data?: { organization_levels?: OrgLevel[] };
  };

  return record.organization_levels ?? record.levels ?? record.data?.organization_levels ?? [];
}

function getFormTitle(editing: OrgLevel | null) {
  return editing ? 'Cap nhat cap do to chuc' : 'Them cap do to chuc';
}

export default function OrganizationLevelsAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [levels, setLevels] = useState<OrgLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OrgLevel | null>(null);
  const [levelToDelete, setLevelToDelete] = useState<OrgLevel | null>(null);
  const [form, setForm] = useState({ name: '', multiplier: 1.0, description: '' });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      void fetchLevels();
    }
  }, [authLoading, router, user]);

  const stats = useMemo(() => {
    const highestMultiplier =
      levels.length > 0 ? Math.max(...levels.map((level) => Number(level.multiplier || 0))) : 0;
    const averageMultiplier =
      levels.length > 0
        ? levels.reduce((sum, level) => sum + Number(level.multiplier || 0), 0) / levels.length
        : 0;

    return {
      total: levels.length,
      highestMultiplier,
      averageMultiplier,
    };
  }, [levels]);

  const fetchLevels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organization-levels');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the tai cap do to chuc'
        );
      }

      setLevels(getLevelsFromPayload(payload));
    } catch (error) {
      console.error('Fetch organization levels error:', error);
      toast.error('Khong the tai cap do to chuc');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (level?: OrgLevel) => {
    if (level) {
      setEditing(level);
      setForm({
        name: level.name,
        multiplier: Number(level.multiplier || 1),
        description: level.description || '',
      });
    } else {
      setEditing(null);
      setForm({ name: '', multiplier: 1, description: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm({ name: '', multiplier: 1, description: '' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      const response = await fetch(
        editing ? `/api/organization-levels/${editing.id}` : '/api/organization-levels',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the luu cap do to chuc'
        );
      }

      toast.success(editing ? 'Da cap nhat cap do to chuc' : 'Da tao cap do to chuc moi');
      closeModal();
      await fetchLevels();
    } catch (error) {
      console.error('Submit organization level error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the luu cap do to chuc');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!levelToDelete) return;

    try {
      const response = await fetch(`/api/organization-levels/${levelToDelete.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the xoa cap do to chuc'
        );
      }

      toast.success('Da xoa cap do to chuc');
      setLevelToDelete(null);
      await fetchLevels();
    } catch (error) {
      console.error('Delete organization level error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the xoa cap do to chuc');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai cap do to chuc..." />;
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
                <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                  Organization levels
                </div>
                <h1
                  className="mt-3 text-3xl font-bold text-slate-900"
                  data-testid="admin-organization-levels-heading"
                >
                  Cau hinh cap do to chuc
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Quan ly he so cap do de cong thuc tinh diem phan biet ro hoat dong cap lop, cap
                  khoa, cap truong va cap lien ket ben ngoai.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openModal()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Them cap do
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] bg-violet-50 px-4 py-4 text-violet-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Tong cap do</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.total}</div>
              </div>
              <Building2 className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-blue-50 px-4 py-4 text-blue-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">He so cao nhat</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  x{stats.highestMultiplier.toFixed(2)}
                </div>
              </div>
              <Scale className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-emerald-50 px-4 py-4 text-emerald-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">He so trung binh</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  x{stats.averageMultiplier.toFixed(2)}
                </div>
              </div>
              <Waves className="h-8 w-8" />
            </div>
          </article>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 xl:hidden">
            {levels.length === 0 ? (
              <div className="page-surface rounded-[1.75rem] px-5 py-8 text-center text-sm text-slate-500 sm:px-7">
                Chua co cap do to chuc nao.
              </div>
            ) : (
              levels.map((level) => (
                <article key={level.id} className="page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Cap do #{level.id}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">{level.name}</div>
                      <div className="mt-2 text-sm text-slate-600">
                        {level.description || 'Khong co mo ta'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-violet-700">
                        x{Number(level.multiplier || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">he so</div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-500">
                    Tao luc {formatVietnamDateTime(level.created_at, 'datetime')}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openModal(level)}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Sua
                    </button>
                    <button
                      type="button"
                      onClick={() => setLevelToDelete(level)}
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
                    Ten cap do
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    He so
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mo ta
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
                {levels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                      Chua co cap do to chuc nao.
                    </td>
                  </tr>
                ) : (
                  levels.map((level) => (
                    <tr key={level.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm text-slate-600">{level.id}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">{level.name}</td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-violet-700">
                        x{Number(level.multiplier || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {level.description || 'Khong co mo ta'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatVietnamDateTime(level.created_at, 'datetime')}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => openModal(level)}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Sua
                          </button>
                          <button
                            type="button"
                            onClick={() => setLevelToDelete(level)}
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
          <div className="app-modal-backdrop px-4 py-6" onClick={closeModal}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-organization-level-dialog-title"
              className="app-modal-panel app-modal-panel-scroll w-full max-w-xl p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="admin-organization-level-dialog-title" className="text-2xl font-semibold text-slate-900">
                {getFormTitle(editing)}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Cap nhat ten cap do, he so nhan va mo ta de cong thuc scoring phan biet dung quy mo
                su kien.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Ten cap do</span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>He so nhan</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    required
                    value={form.multiplier}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        multiplier: Number.parseFloat(event.target.value || '0') || 0,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Mo ta</span>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                  />
                </label>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                  >
                    {editing ? 'Luu thay doi' : 'Tao cap do moi'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
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
          isOpen={levelToDelete !== null}
          title="Xoa cap do to chuc"
          message={
            levelToDelete
              ? `Cap do "${levelToDelete.name}" se bi go khoi cong thuc neu ban xac nhan thao tac nay.`
              : ''
          }
          confirmText="Xoa ngay"
          cancelText="Bo qua"
          variant="danger"
          onCancel={() => setLevelToDelete(null)}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}

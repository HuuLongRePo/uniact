'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Award,
  Medal,
  Pencil,
  Plus,
  Scale,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatVietnamDateTime } from '@/lib/timezone';

export interface AwardType {
  id: number;
  name: string;
  description: string;
  min_points: number;
  award_count?: number;
  created_at: string;
}

function getAwardTypesFromPayload(payload: unknown): AwardType[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as {
    data?: AwardType[];
    awardTypes?: AwardType[];
    award_types?: AwardType[];
  };

  return record.data ?? record.awardTypes ?? record.award_types ?? [];
}

function getAwardTypeFormTitle(editingType: AwardType | null) {
  return editingType ? 'Cap nhat loai danh hieu' : 'Them loai danh hieu';
}

export default function AwardTypesAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [awardTypes, setAwardTypes] = useState<AwardType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<AwardType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<AwardType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    min_points: 100,
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      void fetchAwardTypes();
    }
  }, [authLoading, router, user]);

  const stats = useMemo(() => {
    const highestThreshold =
      awardTypes.length > 0
        ? Math.max(...awardTypes.map((type) => Number(type.min_points || 0)))
        : 0;

    const issuedTotal = awardTypes.reduce((sum, type) => sum + Number(type.award_count || 0), 0);

    return {
      total: awardTypes.length,
      highestThreshold,
      issuedTotal,
    };
  }, [awardTypes]);

  const fetchAwardTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/award-types');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the tai loai danh hieu'
        );
      }

      setAwardTypes(getAwardTypesFromPayload(payload));
    } catch (error) {
      console.error('Fetch award types error:', error);
      toast.error('Khong the tai loai danh hieu');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type?: AwardType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description || '',
        min_points: Number(type.min_points || 0),
      });
    } else {
      setEditingType(null);
      setFormData({ name: '', description: '', min_points: 100 });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({ name: '', description: '', min_points: 100 });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      const response = await fetch(
        editingType ? `/api/admin/award-types/${editingType.id}` : '/api/admin/award-types',
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
            'Khong the luu loai danh hieu'
        );
      }

      toast.success(editingType ? 'Da cap nhat loai danh hieu' : 'Da tao loai danh hieu moi');
      handleCloseModal();
      await fetchAwardTypes();
    } catch (error) {
      console.error('Submit award type error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the luu loai danh hieu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;

    try {
      const response = await fetch(`/api/admin/award-types/${typeToDelete.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the xoa loai danh hieu'
        );
      }

      toast.success('Da xoa loai danh hieu');
      setTypeToDelete(null);
      await fetchAwardTypes();
    } catch (error) {
      console.error('Delete award type error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the xoa loai danh hieu');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai loai danh hieu..." />;
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
                <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Award types
                </div>
                <h1
                  className="mt-3 text-3xl font-bold text-slate-900"
                  data-testid="admin-award-types-heading"
                >
                  Cau hinh loai danh hieu
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Quan ly nguong diem, mo ta va tan suat su dung cua tung loai danh hieu trong he
                  thong xet thuong.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              <Plus className="h-4 w-4" />
              Them loai danh hieu
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] bg-amber-50 px-4 py-4 text-amber-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Tong loai</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.total}</div>
              </div>
              <Award className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-blue-50 px-4 py-4 text-blue-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Nguong diem cao nhat</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">
                  {stats.highestThreshold}
                </div>
              </div>
              <Scale className="h-8 w-8" />
            </div>
          </article>
          <article className="rounded-[1.5rem] bg-emerald-50 px-4 py-4 text-emerald-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide">Da cap</div>
                <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.issuedTotal}</div>
              </div>
              <Medal className="h-8 w-8" />
            </div>
          </article>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 xl:hidden">
            {awardTypes.length === 0 ? (
              <div className="page-surface rounded-[1.75rem] px-5 py-8 text-center text-sm text-slate-500 sm:px-7">
                Chua co loai danh hieu nao.
              </div>
            ) : (
              awardTypes.map((type) => (
                <article key={type.id} className="page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Danh hieu #{type.id}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">{type.name}</div>
                      <div className="mt-2 text-sm text-slate-600">{type.description || 'Khong co mo ta'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-amber-700">{type.min_points}</div>
                      <div className="text-xs text-slate-500">diem toi thieu</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Da cap</div>
                      <div className="mt-1 font-semibold text-slate-900">{type.award_count || 0}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Tao luc</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatVietnamDateTime(type.created_at, 'date')}
                      </div>
                    </div>
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
                    Mo ta
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Diem toi thieu
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Da cap
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
                {awardTypes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                      Chua co loai danh hieu nao.
                    </td>
                  </tr>
                ) : (
                  awardTypes.map((type) => (
                    <tr key={type.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm text-slate-600">{type.id}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">{type.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{type.description || 'Khong co mo ta'}</td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-amber-700">
                        {type.min_points}
                      </td>
                      <td className="px-5 py-4 text-right text-sm text-slate-600">{type.award_count || 0}</td>
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
              aria-labelledby="admin-award-type-dialog-title"
              className="app-modal-panel app-modal-panel-scroll w-full max-w-2xl p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="admin-award-type-dialog-title" className="text-2xl font-semibold text-slate-900">
                {getAwardTypeFormTitle(editingType)}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Dinh nghia ten goi, nguong diem va mo ta de quy trinh de xuat danh hieu duoc ro rang.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Ten loai danh hieu</span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Mo ta va dieu kien</span>
                  <textarea
                    required
                    rows={5}
                    value={formData.description}
                    onChange={(event) =>
                      setFormData({ ...formData, description: event.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </label>

                <label className="block space-y-2 text-sm font-medium text-slate-700">
                  <span>Diem toi thieu</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.min_points}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        min_points: Number.parseInt(event.target.value || '0', 10),
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </label>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
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
          title="Xoa loai danh hieu"
          message={
            typeToDelete
              ? `Loai "${typeToDelete.name}" chi nen xoa khi khong con ho so khen thuong nao dang su dung.`
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

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import UserDialog from './UserDialog';
import UserFilters from './UserFilters';
import UserTable from './UserTable';
import { User } from './types';
import { useDebounce } from '@/lib/debounce-hooks';
import { formatVietnamDateTime, toVietnamDateStamp } from '@/lib/timezone';
import { getRoleBadgeClass, getRoleLabel } from './roles';

type UserTab = 'all' | 'teacher' | 'student';

function parseUsersPayload(payload: any) {
  return {
    users: (payload?.users || payload?.data?.users || payload?.data || []) as User[],
    totalPages: Number(payload?.pagination?.totalPages || payload?.data?.pagination?.totalPages || 1),
    total: Number(payload?.pagination?.total || payload?.data?.pagination?.total || 0),
  };
}

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCounts, setTotalCounts] = useState({ all: 0, teacher: 0, student: 0 });
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [userToView, setUserToView] = useState<User | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const effectiveSearch = debouncedSearch.trim();

  const tabParam = searchParams.get('tab') as UserTab | null;
  const activeTab: UserTab =
    tabParam && ['all', 'teacher', 'student'].includes(tabParam) ? tabParam : 'all';
  const roleFilter = activeTab === 'teacher' ? 'teacher' : activeTab === 'student' ? 'student' : '';

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user?.id, user?.role]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (effectiveSearch.length === 1) return;
    void fetchUsers();
    void fetchTotalCounts();
  }, [effectiveSearch, page, roleFilter, user?.id, user?.role]);

  useEffect(() => {
    setSelectedUsers(new Set());
  }, [users]);

  async function fetchUsers() {
    try {
      setIsListLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (effectiveSearch.length >= 2) params.set('search', effectiveSearch);
      if (roleFilter) params.set('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai danh sach nguoi dung');
      }

      const parsed = parseUsersPayload(payload);
      setUsers(parsed.users);
      setTotalPages(parsed.totalPages);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai danh sach nguoi dung');
      setUsers([]);
      setTotalPages(1);
    } finally {
      setIsListLoading(false);
    }
  }

  async function fetchTotalCounts() {
    try {
      const [allRes, teacherRes, studentRes] = await Promise.all([
        fetch('/api/admin/users?page=1&limit=1'),
        fetch('/api/admin/users?page=1&limit=1&role=teacher'),
        fetch('/api/admin/users?page=1&limit=1&role=student'),
      ]);

      const [allData, teacherData, studentData] = await Promise.all([
        allRes.json(),
        teacherRes.json(),
        studentRes.json(),
      ]);

      setTotalCounts({
        all: parseUsersPayload(allData).total,
        teacher: parseUsersPayload(teacherData).total,
        student: parseUsersPayload(studentData).total,
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }

  function handleTabChange(tab: UserTab) {
    router.push(`/admin/users?tab=${tab}`);
    setPage(1);
  }

  function toggleSelectAll() {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
      return;
    }
    setSelectedUsers(new Set(users.map((item) => item.id)));
  }

  function toggleSelectUser(userId: number) {
    const nextSelected = new Set(selectedUsers);
    if (nextSelected.has(userId)) {
      nextSelected.delete(userId);
    } else {
      nextSelected.add(userId);
    }
    setSelectedUsers(nextSelected);
  }

  async function handleBulkDelete() {
    if (selectedUsers.size === 0) return;

    try {
      const requests = Array.from(selectedUsers).map((id) =>
        fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      );
      const results = await Promise.all(requests);
      const successCount = results.filter((result) => result.ok).length;

      toast.success(`Da xu ly xoa ${successCount}/${selectedUsers.size} tai khoan.`);
      setSelectedUsers(new Set());
      setShowBulkDeleteDialog(false);
      await fetchUsers();
      await fetchTotalCounts();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Loi khi xoa hang loat tai khoan');
      setShowBulkDeleteDialog(false);
    }
  }

  function handleBulkExport() {
    if (selectedUsers.size === 0) {
      toast.error('Chua chon tai khoan nao de xuat.');
      return;
    }

    const selectedData = users.filter((item) => selectedUsers.has(item.id));
    const headers = ['ID', 'Ho ten', 'Email', 'Vai tro', 'Lop', 'Ngay tao'].join(',');
    const rows = selectedData.map((item) => {
      const values = [
        item.id,
        `"${(item.full_name ?? '').replaceAll('"', '""')}"`,
        item.email ?? '',
        `"${getRoleLabel(item.role).replaceAll('"', '""')}"`,
        `"${(item.class_name ?? item.teaching_class_name ?? '').replaceAll('"', '""')}"`,
        item.created_at ?? '',
      ];
      return values.join(',');
    });

    const csv = ['\ufeff' + headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${toVietnamDateStamp(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Da xuat ${selectedUsers.size} tai khoan.`);
  }

  async function handleDelete() {
    if (!userToDelete) return;

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.details?.message || data?.error || 'Khong the xoa nguoi dung');
      }

      toast.success(data?.message || 'Da vo hieu hoa tai khoan');
      setShowDeleteDialog(false);
      setUserToDelete(null);
      await fetchUsers();
      await fetchTotalCounts();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi xoa nguoi dung');
    }
  }

  if (authLoading) {
    return <LoadingSpinner message="Dang tai khu quan tri nguoi dung..." />;
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
              Identity control
            </p>
            <h1 data-testid="users-heading" className="mt-3 text-3xl font-semibold text-slate-950">
              Quan ly nguoi dung
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Gom toan bo hoc vien, giang vien va tai khoan he thong vao mot surface de admin loc,
              cap nhat va khoa nhanh.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void fetchUsers();
              void fetchTotalCounts();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Users className="h-4 w-4" />
            Tai lai
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-cyan-800">Tong tai khoan</div>
            <div className="mt-3 text-3xl font-semibold text-cyan-950">{totalCounts.all}</div>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-800">Giang vien</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-950">{totalCounts.teacher}</div>
          </div>
          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-800">Hoc vien</div>
            <div className="mt-3 text-3xl font-semibold text-violet-950">{totalCounts.student}</div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {([
            { id: 'all', label: 'Tat ca', count: totalCounts.all },
            { id: 'teacher', label: 'Giang vien', count: totalCounts.teacher },
            { id: 'student', label: 'Hoc vien', count: totalCounts.student },
          ] as const).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium whitespace-nowrap ${
                  active
                    ? 'bg-cyan-700 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? 'bg-white/15 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <UserFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            roleFilter={roleFilter}
            onRoleFilterChange={() => {}}
            onCreateNew={() => setShowCreateForm(true)}
            hideRoleFilter
          />
        </div>

        {selectedUsers.size > 0 && (
          <div className="mt-4 rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-cyan-950">
                  Da chon {selectedUsers.size} tai khoan
                </div>
                <p className="mt-1 text-sm text-cyan-800">
                  Co the xuat CSV hoac xu ly xoa theo batch.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleBulkExport}
                  className="rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-50"
                >
                  Xuat CSV
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUsers(new Set())}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Bo chon
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteDialog(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Xoa hang loat
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <UserTable
            users={users}
            loading={isListLoading}
            selectedUsers={selectedUsers}
            onToggleSelect={toggleSelectUser}
            onToggleSelectAll={toggleSelectAll}
            onView={(nextUser) => {
              setUserToView(nextUser);
              setShowViewDialog(true);
            }}
            onEdit={(nextUser) => {
              setUserToEdit(nextUser);
              setShowEditForm(true);
            }}
            onDelete={(nextUser) => {
              setUserToDelete(nextUser);
              setShowDeleteDialog(true);
            }}
          />
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang truoc
            </button>
            <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        )}
      </section>

      <UserDialog
        isOpen={showCreateForm}
        user={null}
        onClose={() => setShowCreateForm(false)}
        onSave={async (formData) => {
          try {
            setIsSavingUser(true);
            const res = await fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
              throw new Error(data?.error || 'Khong the tao nguoi dung');
            }

            const temporaryPassword = data?.temporaryPassword || data?.data?.temporaryPassword;
            toast.success(data?.message || 'Da tao tai khoan moi');
            if (temporaryPassword) {
              toast.success(`Mat khau tam thoi: ${temporaryPassword}`, { duration: 10000 });
            }
            setShowCreateForm(false);
            await fetchUsers();
            await fetchTotalCounts();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Loi khi tao nguoi dung');
          } finally {
            setIsSavingUser(false);
          }
        }}
        loading={isSavingUser}
      />

      <UserDialog
        isOpen={showEditForm}
        user={userToEdit}
        onClose={() => {
          setShowEditForm(false);
          setUserToEdit(null);
        }}
        onSave={async (formData) => {
          try {
            setIsSavingUser(true);
            const res = await fetch(`/api/admin/users/${userToEdit?.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
              throw new Error(data?.error || 'Khong the cap nhat nguoi dung');
            }

            toast.success(data?.message || 'Da cap nhat tai khoan');
            setShowEditForm(false);
            setUserToEdit(null);
            await fetchUsers();
            await fetchTotalCounts();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Loi khi cap nhat nguoi dung');
          } finally {
            setIsSavingUser(false);
          }
        }}
        loading={isSavingUser}
      />

      <ConfirmDialog
        isOpen={showBulkDeleteDialog}
        title="Xoa hang loat tai khoan"
        message={`Ban co chac muon xu ly xoa ${selectedUsers.size} tai khoan da chon? He thong se thu xoa tung tai khoan hop le trong batch nay.`}
        confirmText="Xoa hang loat"
        cancelText="Huy"
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteDialog(false)}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Vo hieu hoa tai khoan"
        message={`Ban co chac muon xu ly tai khoan ${userToDelete?.full_name || ''}? He thong se kiem tra va giu nhat quan du lieu lien quan.`}
        confirmText="Xac nhan"
        cancelText="Huy"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setUserToDelete(null);
        }}
      />

      {showViewDialog && userToView && (
        <div
          className="app-modal-backdrop px-4 py-6"
          onClick={() => {
            setShowViewDialog(false);
            setUserToView(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-user-detail-dialog-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-4xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="admin-user-detail-dialog-title" className="text-2xl font-semibold text-slate-950">
                  Chi tiet nguoi dung
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Kiem tra vai tro, lop va thong tin co ban truoc khi sua.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowViewDialog(false);
                  setUserToView(null);
                }}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Dong
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Ho ten</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">{userToView.full_name}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Email</div>
                <div className="mt-2 text-sm text-slate-800">{userToView.email}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Vai tro</div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(
                      userToView.role
                    )}`}
                  >
                    {getRoleLabel(userToView.role)}
                  </span>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Ma</div>
                <div className="mt-2 text-sm text-slate-800">{userToView.code || userToView.student_code || '-'}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Lop hoc</div>
                <div className="mt-2 text-sm text-slate-800">
                  {userToView.class_name || userToView.teaching_class_name || '-'}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">So dien thoai</div>
                <div className="mt-2 text-sm text-slate-800">{userToView.phone || '-'}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 p-4 md:col-span-2">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Ngay tao</div>
                <div className="mt-2 text-sm text-slate-800">
                  {formatVietnamDateTime(userToView.created_at, 'date')}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowViewDialog(false);
                  setUserToView(null);
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Dong
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowViewDialog(false);
                  setUserToEdit(userToView);
                  setShowEditForm(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
              >
                <ShieldCheck className="h-4 w-4" />
                Chinh sua tai khoan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

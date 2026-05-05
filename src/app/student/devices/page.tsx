'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';
import { Laptop, ShieldCheck, Smartphone, Tablet, Trash2 } from 'lucide-react';

interface Device {
  id: number;
  device_name: string;
  mac_address: string;
  approved: number;
  last_seen: string;
  created_at: string;
}

function resolveDeviceIcon(deviceName: string | null | undefined) {
  const normalized = (deviceName || '').toLowerCase();
  if (normalized.includes('tablet') || normalized.includes('ipad')) return Tablet;
  if (
    normalized.includes('mobile') ||
    normalized.includes('iphone') ||
    normalized.includes('android') ||
    normalized.includes('phone')
  ) {
    return Smartphone;
  }
  return Laptop;
}

export default function DeviceManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }
    if (user) {
      void fetchDevices();
    }
  }, [user, authLoading, router]);

  async function fetchDevices() {
    try {
      setLoading(true);
      const res = await fetch('/api/user/devices');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Không thể tải danh sách thiết bị');
      }
      setDevices(data.devices || data.data?.devices || []);
    } catch (error) {
      console.error('Fetch devices error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải danh sách thiết bị');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(deviceId: number) {
    try {
      setRemoving(true);
      const res = await fetch(`/api/user/devices?deviceId=${deviceId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Không thể xóa thiết bị');
      }

      toast.success(data?.message || 'Đã xóa thiết bị');
      setDeviceToDelete(null);
      await fetchDevices();
    } catch (error) {
      console.error('Delete device error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể xóa thiết bị');
    } finally {
      setRemoving(false);
    }
  }

  const approvedCount = useMemo(
    () => devices.filter((device) => device.approved === 1).length,
    [devices]
  );

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Bảo mật tài khoản
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">Thiết bị đăng nhập</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Theo dõi các thiết bị đã đăng nhập vào tài khoản, xóa thiết bị cũ và kiểm soát truy
                cập bất thường.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[20rem]">
              <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/40 dark:bg-blue-500/10">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Tổng thiết bị
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{devices.length}</div>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Đã phê duyệt
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{approvedCount}</div>
              </div>
            </div>
          </div>
        </section>

        <StudentDailyQuickActions />

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
            Chỉ giữ lại các thiết bị bạn đang sử dụng. Nếu phát hiện thiết bị lạ, hãy xóa ngay và
            đổi mật khẩu trong trang hồ sơ.
          </div>

          {devices.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center dark:border-slate-600 dark:bg-slate-800/60">
              <Laptop className="mx-auto h-14 w-14 text-slate-400 dark:text-slate-500" />
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">Chưa có thiết bị nào</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Danh sách sẽ hiện ra sau khi tài khoản đăng nhập trên các thiết bị khác nhau.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {devices.map((device) => {
                const DeviceIcon = resolveDeviceIcon(device.device_name);
                const approved = device.approved === 1;

                return (
                  <article
                    key={device.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <DeviceIcon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {device.device_name || 'Thiết bị không xác định'}
                            </h2>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                                approved
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
                              }`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {approved ? 'Đã phê duyệt' : 'Chờ phê duyệt'}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                MAC
                              </div>
                              <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                {device.mac_address}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Lần truy cập cuối
                              </div>
                              <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                {device.last_seen ? formatDate(device.last_seen) : 'Chưa có'}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70 sm:col-span-2">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Ngày ghi nhận
                              </div>
                              <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                                {formatDate(device.created_at, 'date')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeviceToDelete(device)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20 sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa thiết bị
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mẹo bảo mật</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60">
              Xóa các thiết bị cũ không còn sử dụng để tránh giữ session không cần thiết.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60">
              Nếu thấy thiết bị lạ, hãy xóa thiết bị và đổi mật khẩu ngay trong hồ sơ cá nhân.
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={deviceToDelete !== null}
        title="Xóa thiết bị"
        message={
          deviceToDelete
            ? `Bạn có chắc chắn muốn xóa thiết bị "${deviceToDelete.device_name || deviceToDelete.mac_address}" không? Thiết bị này sẽ phải đăng nhập lại nếu muốn truy cập tiếp.`
            : ''
        }
        confirmText={removing ? 'Đang xóa...' : 'Xóa thiết bị'}
        cancelText="Hủy"
        variant="danger"
        onCancel={() => {
          if (!removing) {
            setDeviceToDelete(null);
          }
        }}
        onConfirm={async () => {
          if (!deviceToDelete) return;
          await handleDelete(deviceToDelete.id);
        }}
      />
    </div>
  );
}

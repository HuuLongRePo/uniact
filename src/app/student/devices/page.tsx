'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/formatters';

interface Device {
  id: number;
  device_name: string;
  mac_address: string;
  approved: number;
  last_seen: string;
  created_at: string;
}

export default function DeviceManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) fetchDevices();
  }, [user, authLoading, router]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/devices');
      const data = await res.json();
      if (res.ok) {
        setDevices(data.data || []);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách thiết bị:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deviceId: number) => {
    try {
      const res = await fetch(`/api/user/devices?deviceId=${deviceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Đã xóa thiết bị');
        fetchDevices();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Không thể xóa thiết bị');
      }
    } catch (error) {
      console.error('Delete device error:', error);
      toast.error('Lỗi khi xóa thiết bị');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🖥️ Quản Lý Thiết Bị</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Lưu ý:</strong> Đây là danh sách các thiết bị đã đăng nhập vào tài khoản của bạn.
          Bạn có thể xóa các thiết bị không còn sử dụng để tăng cường bảo mật.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        {devices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-6xl mb-4">📱</div>
            <p>Chưa có thiết bị nào được đăng ký</p>
          </div>
        ) : (
          <div className="divide-y">
            {devices.map((device) => (
              <div key={device.id} className="p-5 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {device.device_name?.toLowerCase().includes('mobile')
                          ? '📱'
                          : device.device_name?.toLowerCase().includes('tablet')
                            ? '📱'
                            : '💻'}
                      </span>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {device.device_name || 'Thiết bị không xác định'}
                        </h3>
                        <div className="text-sm text-gray-600">MAC: {device.mac_address}</div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 ml-11">
                      <div>
                        <span className="font-medium">Lần truy cập cuối:</span>{' '}
                        {device.last_seen ? formatDate(device.last_seen) : 'Chưa có'}
                      </div>
                      <div>
                        <span className="font-medium">Đăng ký:</span>{' '}
                        {formatDate(device.created_at, 'date')}
                      </div>
                    </div>
                    <div className="mt-2 ml-11">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${
                          device.approved === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {device.approved === 1 ? '✓ Đã phê duyệt' : '⏳ Chờ phê duyệt'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeviceToDelete(device)}
                    className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">💡 Mẹo bảo mật</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Xóa các thiết bị bạn không còn sử dụng</li>
          <li>• Kiểm tra danh sách thiết bị thường xuyên</li>
          <li>• Nếu phát hiện thiết bị lạ, hãy xóa ngay và đổi mật khẩu</li>
          <li>• Không chia sẻ thông tin đăng nhập với người khác</li>
        </ul>
      </div>

      <ConfirmDialog
        isOpen={deviceToDelete !== null}
        title="Xóa thiết bị"
        message={
          deviceToDelete
            ? `Bạn có chắc chắn muốn xóa thiết bị "${deviceToDelete.device_name || deviceToDelete.mac_address}" không? Bạn sẽ cần đăng nhập lại trên thiết bị này.`
            : ''
        }
        confirmText="Xóa thiết bị"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setDeviceToDelete(null)}
        onConfirm={async () => {
          if (!deviceToDelete) return;
          await handleDelete(deviceToDelete.id);
          setDeviceToDelete(null);
        }}
      />
    </div>
  );
}

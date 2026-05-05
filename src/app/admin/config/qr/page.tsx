import { redirect } from 'next/navigation';

export default function AdminLegacyQrConfigPage() {
  redirect('/admin/system-config/qr-settings');
}

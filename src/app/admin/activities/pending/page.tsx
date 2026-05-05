import { redirect } from 'next/navigation';

export default function AdminPendingActivitiesLegacyPage() {
  redirect('/admin/approvals');
}

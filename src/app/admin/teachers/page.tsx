import { redirect } from 'next/navigation';

export default function AdminTeachersLegacyPage() {
  redirect('/admin/users?tab=teacher');
}

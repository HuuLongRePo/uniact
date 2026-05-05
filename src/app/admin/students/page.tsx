import { redirect } from 'next/navigation';

export default function AdminStudentsLegacyPage() {
  redirect('/admin/users?tab=student');
}

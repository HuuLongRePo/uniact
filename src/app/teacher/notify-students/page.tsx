import { redirect } from 'next/navigation';

export default function TeacherNotifyStudentsLegacyPage() {
  redirect('/teacher/notifications/broadcast');
}

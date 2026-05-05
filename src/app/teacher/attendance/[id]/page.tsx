import { redirect } from 'next/navigation';

export default async function TeacherAttendanceLegacyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/teacher/activities/${id}/attendance/bulk`);
}

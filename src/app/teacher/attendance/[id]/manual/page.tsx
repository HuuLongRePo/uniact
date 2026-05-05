import { redirect } from 'next/navigation';

export default async function TeacherAttendanceLegacyManualPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/teacher/activities/${id}/attendance/bulk`);
}

import { redirect } from 'next/navigation';
import { dbGet } from '@/lib/database';

type ParticipationRow = {
  id: number;
  activity_id: number;
};

export default async function TeacherAttendanceLegacyEvaluatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const participationId = Number(id);

  if (!Number.isFinite(participationId)) {
    return redirect('/teacher/activities');
  }

  const participation = (await dbGet('SELECT id, activity_id FROM participations WHERE id = ?', [
    participationId,
  ])) as ParticipationRow | undefined;

  if (!participation?.activity_id) {
    return redirect('/teacher/activities');
  }

  return redirect(`/teacher/activities/${participation.activity_id}/participants`);
}

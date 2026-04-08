// Simple OFFLINE recommendation engine (frequency + recency weighting)
// Does not require external services; can evolve to matrix factorization later.

import { dbAll, dbGet } from './database';

export interface Recommendation {
  activity_id: number;
  title: string;
  score: number;
  reason: string;
}

interface ParticipationRow {
  activity_id: number;
  student_id: number;
  recorded_at: string;
  achievement?: string | null;
}

// Basic weights (can be tuned offline)
const ACHIEVEMENT_WEIGHT: Record<string, number> = {
  excellent: 3,
  good: 2,
  participated: 1,
};

export async function recommendActivitiesForStudent(
  studentId: number,
  limit = 5
): Promise<Recommendation[]> {
  // Get student class_id to filter relevant activities
  const student = (await dbGet('SELECT id, class_id FROM users WHERE id = ?', [studentId])) as {
    id: number;
    class_id?: number | null;
  };
  if (!student) return [];

  // Fetch recent activities (published/registration/in_progress)
  const activities = await dbAll(`
    SELECT a.id, a.title, a.date_time, a.status, a.max_participants,
      (SELECT COUNT(*) FROM participations WHERE activity_id = a.id) as participant_count,
      (SELECT GROUP_CONCAT(class_id) FROM activity_classes WHERE activity_id = a.id) as class_ids_junction
    FROM activities a
    WHERE status IN ('published','registration','in_progress')
    ORDER BY date_time DESC
    LIMIT 200
  `);

  // Fetch student's past participations
  const past = (await dbAll(
    `
    SELECT p.activity_id, p.student_id, p.achievement_level, p.attendance_status
    FROM participations p
    WHERE p.student_id = ?
  `,
    [studentId]
  )) as ParticipationRow[];

  const participatedActivityIds = new Set(past.map((p) => p.activity_id));

  // Score logic:
  // - Exclude already participated
  // - Base score: recency (newer activities higher)
  // - Add class relevance if class_ids includes student's class
  // - Penalize near-full activities
  // - Boost if similar achievement history matches activity type (future enhancement)

  const now = Date.now();

  const scored = activities
    .filter((a: any) => !participatedActivityIds.has(a.id))
    .map((a: any) => {
      const recencyDays = Math.max(
        1,
        (now - new Date(a.date_time).getTime()) / (1000 * 60 * 60 * 24)
      );
      let score = 100 / recencyDays; // Newer -> higher

      if (student.class_id) {
        const classIdsList = a.class_ids_junction
          ? a.class_ids_junction.split(',').map(Number)
          : [];

        if (classIdsList.length === 0)
          score += 5; // Open to all
        else if (classIdsList.includes(student.class_id)) score += 15; // Matches class
      }

      const fillRatio = a.max_participants > 0 ? a.participant_count / a.max_participants : 0;
      if (fillRatio > 0.8) score -= 10; // nearly full

      return {
        activity_id: a.id,
        title: a.title,
        score,
        reason: buildReason(score, a, student.class_id, fillRatio),
      };
    })
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

function buildReason(score: number, a: any, classId?: number | null, fillRatio?: number): string {
  const reasons: string[] = [];

  // Parse class_ids from junction table
  const classIdsList = a.class_ids_junction ? a.class_ids_junction.split(',').map(Number) : [];

  if (classId && classIdsList.includes(classId)) reasons.push('Phù hợp lớp của bạn');
  if (classIdsList.length === 0) reasons.push('Mở cho toàn trường');
  if (fillRatio && fillRatio < 0.5) reasons.push('Nhiều chỗ trống');
  if (fillRatio && fillRatio > 0.8) reasons.push('Sắp đầy, cân nhắc nhanh');
  if (reasons.length === 0) reasons.push('Hoạt động mới nổi bật');
  return reasons.join(' · ');
}

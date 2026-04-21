import { NextRequest } from 'next/server';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';
import { dbAll, dbGet, dbHelpers } from '@/lib/database';
import { teacherCanAccessActivity } from '@/lib/activity-access';
import { ensureStudentBiometricSchema } from '@/infrastructure/db/student-biometric-schema';
import { decryptEmbedding } from '@/lib/biometrics/encryption';
import { cosineDistance } from '@/lib/biometrics/face-runtime';

const MIN_CANDIDATE_EMBEDDING_LENGTH = 3;
const MAX_CANDIDATE_EMBEDDING_LENGTH = 2048;
const DEFAULT_MAX_CANDIDATES = 5;
const MAX_MAX_CANDIDATES = 20;
const FACE_EMBEDDING_DISTANCE_THRESHOLD = 0.18;

function normalizeEmbedding(input: unknown): number[] {
  if (!Array.isArray(input)) {
    throw ApiError.validation('candidate_embedding phai la mang so hop le');
  }

  const normalized = input.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (normalized.length !== input.length) {
    throw ApiError.validation('candidate_embedding chua gia tri khong hop le');
  }

  if (normalized.length < MIN_CANDIDATE_EMBEDDING_LENGTH) {
    throw ApiError.validation('candidate_embedding qua ngan', {
      min_length: MIN_CANDIDATE_EMBEDDING_LENGTH,
    });
  }

  if (normalized.length > MAX_CANDIDATE_EMBEDDING_LENGTH) {
    throw ApiError.validation('candidate_embedding vuot qua kich thuoc cho phep', {
      max_length: MAX_CANDIDATE_EMBEDDING_LENGTH,
    });
  }

  return normalized;
}

function similarityPercent(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin', 'teacher']);
    const body = await request.json().catch(() => ({}));
    const activityId = Number(body?.activity_id);
    const maxCandidates = Math.max(
      1,
      Math.min(MAX_MAX_CANDIDATES, Number(body?.max_candidates ?? DEFAULT_MAX_CANDIDATES))
    );
    const candidateEmbedding = normalizeEmbedding(body?.candidate_embedding);

    if (!Number.isFinite(activityId)) {
      throw ApiError.validation('activity_id khong hop le');
    }

    const activity = await dbGet(
      `SELECT id, title
       FROM activities
       WHERE id = ?`,
      [activityId]
    );

    if (!activity) {
      throw ApiError.notFound('Khong tim thay hoat dong');
    }

    if (user.role === 'teacher') {
      const canAccess = await teacherCanAccessActivity(Number(user.id), activityId);
      if (!canAccess) {
        try {
          await dbHelpers.createAuditLog({
            actor_id: Number(user.id),
            action: 'biometric_identify_denied_out_of_scope',
            target_table: 'activities',
            target_id: activityId,
            details: {
              actor_role: user.role,
              reason: 'teacher_activity_scope_denied',
            },
          });
        } catch (auditError) {
          console.warn('Failed to write biometric identify denied audit log:', auditError);
        }

        throw ApiError.forbidden('Ban khong co quyen identify hoc vien cho hoat dong nay');
      }
    }

    await ensureStudentBiometricSchema();

    const participantRows = (await dbAll(
      `SELECT
         p.student_id,
         u.name as student_name,
         sbp.enrollment_status,
         sbp.training_status,
         sbp.sample_image_count,
         sbp.face_embedding_encrypted,
         sbp.face_embedding_iv,
         sbp.face_embedding_salt
       FROM participations p
       JOIN users u ON u.id = p.student_id AND u.role = 'student'
       LEFT JOIN student_biometric_profiles sbp ON sbp.student_id = p.student_id
       WHERE p.activity_id = ?
         AND p.attendance_status IN ('registered', 'attended')`,
      [activityId]
    )) as Array<{
      student_id: number;
      student_name: string;
      enrollment_status: string | null;
      training_status: string | null;
      sample_image_count: number | null;
      face_embedding_encrypted: string | null;
      face_embedding_iv: string | null;
      face_embedding_salt: string | null;
    }>;

    const readyRows = participantRows.filter(
      (row) =>
        String(row.enrollment_status || '') === 'ready' &&
        String(row.training_status || '') === 'trained' &&
        Number(row.sample_image_count || 0) > 0 &&
        Boolean(row.face_embedding_encrypted && row.face_embedding_iv && row.face_embedding_salt)
    );

    if (readyRows.length === 0) {
      try {
        await dbHelpers.createAuditLog({
          actor_id: Number(user.id),
          action: 'biometric_identify_no_match',
          target_table: 'activities',
          target_id: activityId,
          details: {
            actor_role: user.role,
            evaluated_count: 0,
            reason: 'no_ready_biometric_profiles',
          },
        });
      } catch (auditError) {
        console.warn('Failed to write biometric identify no-match audit log:', auditError);
      }

      return successResponse({
        matched: false,
        activity_id: activityId,
        activity_title: String(activity.title || ''),
        threshold: FACE_EMBEDDING_DISTANCE_THRESHOLD,
        evaluated_count: 0,
        reason: 'no_ready_biometric_profiles',
        candidate: null,
        candidates: [],
      });
    }

    const scoredCandidates: Array<{
      student_id: number;
      student_name: string;
      distance: number;
    }> = [];

    for (const row of readyRows) {
      try {
        const storedEmbedding = await decryptEmbedding(
          String(row.face_embedding_encrypted),
          String(row.face_embedding_iv),
          String(row.face_embedding_salt),
          Number(row.student_id)
        );
        const distance = cosineDistance(Array.from(storedEmbedding), candidateEmbedding);
        if (Number.isFinite(distance)) {
          scoredCandidates.push({
            student_id: Number(row.student_id),
            student_name: String(row.student_name || ''),
            distance,
          });
        }
      } catch (decryptError) {
        console.warn('Skipping candidate due to embedding decode error:', decryptError);
      }
    }

    scoredCandidates.sort((left, right) => left.distance - right.distance);
    const topCandidates = scoredCandidates.slice(0, maxCandidates).map((candidate) => ({
      student_id: candidate.student_id,
      student_name: candidate.student_name,
      distance: Number(candidate.distance.toFixed(6)),
      similarity_percent: similarityPercent(candidate.distance),
    }));

    const bestCandidate = topCandidates[0] || null;
    const matched = Boolean(
      bestCandidate && Number(bestCandidate.distance) <= FACE_EMBEDDING_DISTANCE_THRESHOLD
    );

    try {
      await dbHelpers.createAuditLog({
        actor_id: Number(user.id),
        action: matched ? 'biometric_identify_success' : 'biometric_identify_no_match',
        target_table: 'activities',
        target_id: activityId,
        details: {
          actor_role: user.role,
          evaluated_count: scoredCandidates.length,
          threshold: FACE_EMBEDDING_DISTANCE_THRESHOLD,
          best_student_id: bestCandidate?.student_id ?? null,
          best_distance: bestCandidate?.distance ?? null,
        },
      });
    } catch (auditError) {
      console.warn('Failed to write biometric identify audit log:', auditError);
    }

    return successResponse({
      matched,
      activity_id: activityId,
      activity_title: String(activity.title || ''),
      threshold: FACE_EMBEDDING_DISTANCE_THRESHOLD,
      evaluated_count: scoredCandidates.length,
      reason: matched
        ? null
        : scoredCandidates.length > 0
          ? 'distance_threshold_not_met'
          : 'no_valid_embeddings',
      candidate: matched ? bestCandidate : null,
      candidates: topCandidates,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextRequest } from 'next/server';
import { requireApiAuth } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

const MIN_CANDIDATE_EMBEDDING_LENGTH = 3;
const MAX_CANDIDATE_EMBEDDING_LENGTH = 2048;
const MIN_QUALITY_SCORE = 60;
const MIN_LIVENESS_SCORE = 0.7;

function normalizeEmbedding(input: unknown): number[] {
  if (!Array.isArray(input)) {
    throw ApiError.validation('embedding phải là mảng số hợp lệ');
  }

  const normalized = input.map((value) => Number(value)).filter((value) => Number.isFinite(value));

  if (normalized.length !== input.length) {
    throw ApiError.validation('embedding chứa giá trị không hợp lệ');
  }

  if (normalized.length < MIN_CANDIDATE_EMBEDDING_LENGTH) {
    throw ApiError.validation('embedding quá ngắn để tạo candidate payload', {
      min_length: MIN_CANDIDATE_EMBEDDING_LENGTH,
    });
  }

  if (normalized.length > MAX_CANDIDATE_EMBEDDING_LENGTH) {
    throw ApiError.validation('embedding vượt quá kích thước cho phép', {
      max_length: MAX_CANDIDATE_EMBEDDING_LENGTH,
    });
  }

  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    await requireApiAuth(request);

    const body = await request.json().catch(() => ({}));
    const embedding = normalizeEmbedding(body?.embedding);
    const qualityScore = Number(body?.qualityScore ?? body?.quality_score ?? 0);
    const livenessScore = Number(body?.livenessScore ?? body?.liveness_score ?? 0);
    const deviceId = body?.deviceId ?? body?.device_id ?? null;

    if (qualityScore < MIN_QUALITY_SCORE) {
      throw ApiError.validation('Chất lượng ảnh chưa đủ để tạo candidate embedding', {
        quality_score: qualityScore,
        min_quality_score: MIN_QUALITY_SCORE,
      });
    }

    if (livenessScore < MIN_LIVENESS_SCORE) {
      throw ApiError.validation('Liveness score chưa đủ để tạo candidate embedding', {
        liveness_score: livenessScore,
        min_liveness_score: MIN_LIVENESS_SCORE,
      });
    }

    return successResponse({
      candidate_embedding: embedding,
      quality_score: qualityScore,
      liveness_score: livenessScore,
      device_id: deviceId,
      verification_method: 'candidate_embedding',
      upstream_verified: false,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

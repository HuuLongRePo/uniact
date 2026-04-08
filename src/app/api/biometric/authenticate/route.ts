/**
 * Biometric Authentication API
 * POST /api/biometric/authenticate - Verify face/iris against stored template
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { decryptEmbedding } from '@/lib/biometrics/encryption';
import { cosineDistance } from '@/lib/biometrics/face';
import { getJwtSecret } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { rateLimit } from '@/lib/rateLimit';
import jwt from 'jsonwebtoken';

const MATCH_THRESHOLDS = {
  face: 0.4, // Normal face matching
  face_masked: 0.5, // Masked face (upper face only) - more lenient
  iris_left: 0.25, // Iris matching (tighter threshold)
  iris_right: 0.25,
};

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(request, 15, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(
        new ApiError('RATE_LIMITED', 'Thử xác thực quá nhiều lần. Vui lòng thử lại sau 1 phút.', 429)
      );
    }

    const body = await request.json();
    const { email, embedding, templateType, hasMask, qualityScore, livenessCheck } = body;

    // Validate inputs
    if (!email || !embedding || !templateType) {
      return errorResponse(ApiError.validation('Thiếu trường bắt buộc: email, embedding, templateType'));
    }

    if (!Array.isArray(embedding)) {
      return errorResponse(ApiError.validation('Embedding phải là mảng hợp lệ'));
    }

    // Check liveness (if provided)
    if (livenessCheck && !livenessCheck.passed) {
      await logAuthAttempt(null, templateType, 'liveness_fail', 0, request);

      return errorResponse(
        new ApiError(
          'LIVENESS_CHECK_FAILED',
          'Không phát hiện chuyển động tự nhiên. Vui lòng thử lại.',
          403,
          { livenessDetails: livenessCheck.details }
        )
      );
    }

    // Check quality
    if (qualityScore && qualityScore < 50) {
      await logAuthAttempt(null, templateType, 'quality_fail', 0, request);

      return errorResponse(
        ApiError.validation(
          'Chất lượng ảnh không đủ tốt. Vui lòng đảm bảo ánh sáng tốt và camera rõ nét.',
          { qualityScore }
        )
      );
    }

    // Find user by email
    const user = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id, email, full_name, role FROM users WHERE email = ?',
        [email],
        (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      await logAuthAttempt(null, templateType, 'fail', 0, request);

      return errorResponse(ApiError.notFound('Không tìm thấy người dùng với email này'));
    }

    // Determine template type to match against
    let matchTemplateType = templateType;

    // If current capture has mask, prefer masked template
    if (hasMask && templateType === 'face') {
      matchTemplateType = 'face_masked';
    }

    // Fetch stored template
    const storedTemplate = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT 
          id,
          template_type,
          encrypted_embedding,
          encryption_iv,
          encryption_salt,
          quality_score
         FROM biometric_templates
         WHERE user_id = ? AND template_type = ? AND is_active = 1`,
        [user.id, matchTemplateType],
        (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // If no masked template, try normal face template
    let template = storedTemplate;
    if (!template && matchTemplateType === 'face_masked') {
      template = await new Promise<any>((resolve, reject) => {
        db.get(
          `SELECT 
            id,
            template_type,
            encrypted_embedding,
            encryption_iv,
            encryption_salt,
            quality_score
           FROM biometric_templates
           WHERE user_id = ? AND template_type = 'face' AND is_active = 1`,
          [user.id],
          (err: Error | null, row: any) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }

    if (!template) {
      await logAuthAttempt(user.id, templateType, 'fail', 0, request);

      return errorResponse(
        ApiError.notFound('Bạn chưa đăng ký sinh trắc học. Vui lòng đăng ký trước khi xác thực.')
      );
    }

    // Decrypt stored embedding
    const storedEmbedding = await decryptEmbedding(
      template.encrypted_embedding,
      template.encryption_iv,
      template.encryption_salt,
      user.id
    );

    // Calculate distance
    const maskMode = hasMask || template.template_type === 'face_masked';
    const distance = cosineDistance(embedding, Array.from(storedEmbedding));

    // Get threshold for template type
    const threshold =
      MATCH_THRESHOLDS[template.template_type as keyof typeof MATCH_THRESHOLDS] || 0.4;
    const matched = distance < threshold;

    // Log authentication attempt
    await logAuthAttempt(
      user.id,
      template.template_type,
      matched ? 'success' : 'fail',
      distance,
      request,
      livenessCheck
    );

    if (!matched) {
      return errorResponse(
        new ApiError('BIOMETRIC_NO_MATCH', 'Không khớp với dữ liệu đã đăng ký', 403, {
          distance,
          threshold,
          similarityPercent: Math.round((1 - distance) * 100),
        })
      );
    }

    // Update template usage
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE biometric_templates 
         SET last_used = CURRENT_TIMESTAMP,
             usage_count = usage_count + 1
         WHERE id = ?`,
        [template.id],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });

    // Generate auth token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    // Set cookie
    const response = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        matchDetails: {
          distance,
          threshold,
          similarityPercent: Math.round((1 - distance) * 100),
          templateType: template.template_type,
          maskMode,
        },
      },
      'Xác thực thành công'
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Biometric authentication error:', error);
    return errorResponse(
      error instanceof ApiError ? error : ApiError.internalError('Authentication failed', error?.message)
    );
  }
}

/**
 * Log authentication attempt to database
 */
async function logAuthAttempt(
  userId: number | null,
  templateType: string,
  result: string,
  matchScore: number,
  request: NextRequest,
  livenessCheck?: any
) {
  try {
    const deviceInfo = {
      userAgent: request.headers.get('user-agent'),
      platform: request.headers.get('sec-ch-ua-platform'),
    };

    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO biometric_auth_logs (
          user_id,
          template_type,
          auth_result,
          match_score,
          threshold,
          liveness_checks,
          device_info,
          ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          templateType,
          result,
          matchScore,
          MATCH_THRESHOLDS[templateType as keyof typeof MATCH_THRESHOLDS] || 0.4,
          livenessCheck ? JSON.stringify(livenessCheck) : null,
          JSON.stringify(deviceInfo),
          ipAddress,
        ],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  } catch (error) {
    console.error('Failed to log auth attempt:', error);
    // Don't throw - logging failure shouldn't break authentication
  }
}

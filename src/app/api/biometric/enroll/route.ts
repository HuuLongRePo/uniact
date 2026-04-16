/**
 * Biometric Enrollment API
 * POST /api/biometric/enroll - Enroll face/iris template
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { encryptEmbedding } from '@/lib/biometrics/encryption';
import { requireApiAuth } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiAuth(request);
    const userId = user.id;

    // Parse request body
    const body = await request.json();
    const { templateType, embedding, qualityScore, metadata } = body;

    // Validate inputs
    if (!templateType || !embedding) {
      return errorResponse(ApiError.validation('Thiếu trường bắt buộc: templateType, embedding'));
    }

    const validTypes = ['face', 'face_masked', 'iris_left', 'iris_right'];
    if (!validTypes.includes(templateType)) {
      return errorResponse(
        ApiError.validation(`templateType không hợp lệ. Chấp nhận: ${validTypes.join(', ')}`)
      );
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      return errorResponse(ApiError.validation('Embedding phải là mảng không rỗng'));
    }

    // Check quality score
    const quality = qualityScore || 0;
    if (quality < 60) {
      return errorResponse(
        ApiError.validation(
          'Chất lượng ảnh không đủ tốt. Vui lòng chụp lại trong điều kiện ánh sáng tốt hơn.',
          { qualityScore: quality, minRequired: 60 }
        )
      );
    }

    // Encrypt embedding
    const { encryptedData, iv, salt } = await encryptEmbedding(embedding, userId);

    // Check if template already exists
    const existing = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id, is_active FROM biometric_templates WHERE user_id = ? AND template_type = ?',
        [userId, templateType],
        (err: Error | null, row: any) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    let result: any;

    if (existing) {
      // Update existing template
      result = await new Promise((resolve, reject) => {
        db.run(
          `UPDATE biometric_templates 
           SET encrypted_embedding = ?,
               encryption_iv = ?,
               encryption_salt = ?,
               quality_score = ?,
               enrollment_date = CURRENT_TIMESTAMP,
               is_active = 1,
               metadata = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND template_type = ?`,
          [
            encryptedData,
            iv,
            salt,
            quality,
            metadata ? JSON.stringify(metadata) : null,
            userId,
            templateType,
          ],
          function (this: any, err: Error | null) {
            if (err) reject(err);
            else resolve({ id: existing.id, changes: this.changes });
          }
        );
      });
    } else {
      // Insert new template
      result = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO biometric_templates (
            user_id,
            template_type,
            encrypted_embedding,
            encryption_iv,
            encryption_salt,
            quality_score,
            metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            templateType,
            encryptedData,
            iv,
            salt,
            quality,
            metadata ? JSON.stringify(metadata) : null,
          ],
          function (this: any, err: Error | null) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
          }
        );
      });
    }

    return successResponse(
      {
        templateId: result.id,
        templateType,
        qualityScore: quality,
        isUpdate: !!existing,
      },
      existing ? 'Template updated' : 'Template enrolled'
    );
  } catch (error: any) {
    console.error('Biometric enrollment error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Enrollment failed', error?.message)
    );
  }
}

/**
 * GET /api/biometric/enroll - Get user's enrolled templates
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiAuth(request);

    const templates = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT 
          id,
          template_type,
          quality_score,
          enrollment_date,
          last_used,
          usage_count,
          is_active
         FROM biometric_templates
         WHERE user_id = ? AND is_active = 1
         ORDER BY template_type`,
        [user.id],
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    return successResponse({
      templates,
      hasAnyTemplate: templates.length > 0,
      hasFace: templates.some((t) => t.template_type === 'face'),
      hasFaceMasked: templates.some((t) => t.template_type === 'face_masked'),
      hasIrisLeft: templates.some((t) => t.template_type === 'iris_left'),
      hasIrisRight: templates.some((t) => t.template_type === 'iris_right'),
    });
  } catch (error: any) {
    console.error('Get templates error:', error);
    return errorResponse(
      error instanceof ApiError ? error : ApiError.internalError('Failed to get templates')
    );
  }
}

/**
 * DELETE /api/biometric/enroll - Delete specific template
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireApiAuth(request);

    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type');

    if (templateType) {
      // Delete specific template type
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM biometric_templates WHERE user_id = ? AND template_type = ?',
          [user.id, templateType],
          (err: Error | null) => {
            if (err) reject(err);
            else resolve(true);
          }
        );
      });

      return successResponse({ templateType }, `${templateType} template deleted`);
    } else {
      // Delete all templates
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM biometric_templates WHERE user_id = ?',
          [user.id],
          (err: Error | null) => {
            if (err) reject(err);
            else resolve(true);
          }
        );
      });

      return successResponse({ deletedAll: true }, 'All templates deleted');
    }
  } catch (error: any) {
    console.error('Delete template error:', error);
    return errorResponse(
      error instanceof ApiError ? error : ApiError.internalError('Failed to delete template')
    );
  }
}

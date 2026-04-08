/**
 * Các schema validate dùng chung với Zod.
 *
 * Tái sử dụng validate cho frontend.
 */

import { z } from 'zod';

/**
 * Auth schemas
 */
export const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});

export const RegisterSchema = z
  .object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(8, 'Mật khẩu ít nhất 8 ký tự'),
    confirm_password: z.string(),
    full_name: z.string().min(2, 'Tên ít nhất 2 ký tự'),
    role: z.enum(['admin', 'teacher', 'student']),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Mật khẩu không khớp',
    path: ['confirm_password'],
  });

export const PasswordResetSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export const NewPasswordSchema = z
  .object({
    new_password: z.string().min(8, 'Mật khẩu ít nhất 8 ký tự'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Mật khẩu không khớp',
    path: ['confirm_password'],
  });

/**
 * Activity schemas
 */
export const ActivitySchema = z.object({
  title: z.string().min(3, 'Tiêu đề ít nhất 3 ký tự').max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z.string().min(10, 'Mô tả ít nhất 10 ký tự'),
  activity_type_id: z.number().int().positive(),
  organization_level_id: z.number().int().positive(),
  date_time: z.string().datetime('Ngày giờ không hợp lệ'),
  location: z.string().optional(),
  max_participants: z.number().int().positive('Số lượng phải > 0').optional(),
});

export const ActivityUpdateSchema = ActivitySchema.partial();

/**
 * Score schemas
 */
export const ScoreEvaluationSchema = z.object({
  achievement_level: z
    .enum(['excellent', 'good', 'participated'])
    .refine((val) => ['excellent', 'good', 'participated'].includes(val), {
      message: 'Mức đánh giá không hợp lệ',
    }),
  bonus_points: z.number().int().min(0).max(1000).optional().default(0),
  penalty_points: z.number().int().min(0).max(1000).optional().default(0),
  notes: z.string().optional(),
});

/**
 * Award schemas
 */
export const AwardSchema = z.object({
  student_id: z.number().int().positive(),
  award_type: z.string().min(1),
  award_name: z.string().min(3, 'Tên giải thưởng ít nhất 3 ký tự'),
  points: z.number().int().positive('Điểm phải > 0'),
  description: z.string().optional(),
  issue_date: z.string().date('Ngày cấp không hợp lệ').optional(),
});

/**
 * Schema tìm kiếm / lọc
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const SearchSchema = z.object({
  q: z.string().min(1).max(200).optional(),
  ...PaginationSchema.shape,
});

/**
 * Utility function: Validate and return errors
 */
export function validateForm<T>(
  schema: z.ZodSchema<any>,
  data: unknown
): {
  success: boolean;
  errors?: Record<string, string>;
  data?: T;
} {
  try {
    const result = schema.parse(data) as T;
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Dữ liệu không hợp lệ' } };
  }
}

/**
 * Hook: useFormValidation
 */
('use client');

import { useState, useCallback } from 'react';

export function useFormValidation<T>(schema: z.ZodSchema<any>) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(
    (data: unknown): data is T => {
      const result = validateForm<T>(schema, data);
      if (result.success) {
        setErrors({});
        return true;
      }
      setErrors(result.errors || {});
      return false;
    },
    [schema]
  );

  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return { errors, validate, clearError, clearAllErrors };
}

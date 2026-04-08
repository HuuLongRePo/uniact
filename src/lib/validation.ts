// Zod Validation Schemas
// Schema validation cho forms và API endpoints

import { z } from 'zod';

// User schemas
export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export const registerSchema = z
  .object({
    email: z.string().email('Email không hợp lệ'),
    name: z.string().min(1, 'Tên không được để trống').max(100, 'Tên quá dài'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    confirmPassword: z.string(),
    role: z.enum(['student', 'teacher', 'admin']).optional(),
    class_id: z.number().int().positive().optional(),
    gender: z.enum(['nam', 'nữ']).optional(),
    date_of_birth: z.string().optional(),
    citizen_id: z.string().max(20).optional(),
    province: z.string().max(100).optional(),
    district: z.string().max(100).optional(),
    ward: z.string().max(100).optional(),
    address_detail: z.string().max(200).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  class_id: z.number().int().positive().optional(),
  gender: z.enum(['nam', 'nữ']).optional(),
  date_of_birth: z.string().optional(),
  citizen_id: z.string().max(20).optional(),
  province: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  ward: z.string().max(100).optional(),
  address_detail: z.string().max(200).optional(),
});

// Class schemas
// ANND class naming rules: D30–D34 cohorts, letter group A–Z, optional digit (e.g., D30A, D30A1, D30B2).
const cohortPattern = /^(D(30|31|32|33|34))$/;
const classNamePattern = /^(D(30|31|32|33|34))[A-Z](\d)?$/;

export const createClassSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên lớp không được để trống')
    .max(100)
    .regex(classNamePattern, 'Tên lớp phải theo dạng D30A, D30A1, D30B2… (D30–D34)'),
  grade: z
    .string()
    .min(1, 'Khối không được để trống')
    .regex(cohortPattern, 'Khối phải là D30, D31, D32, D33 hoặc D34'),
  teacher_id: z.number().int().positive('Giảng viên không hợp lệ').optional(),
  description: z.string().max(500, 'Mô tả quá dài').optional(),
});

export const updateClassSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(classNamePattern, 'Tên lớp phải theo dạng D30A, D30A1, D30B2… (D30–D34)')
    .optional(),
  grade: z
    .string()
    .min(1)
    .regex(cohortPattern, 'Khối phải là D30, D31, D32, D33 hoặc D34')
    .optional(),
  teacher_id: z.number().int().positive().optional(),
  description: z.string().max(500).optional(),
});

// Activity schemas
export const createActivitySchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').max(200),
  description: z.string().max(2000, 'Mô tả quá dài').optional(),
  date_time: z
    .string()
    .datetime('Thời gian không hợp lệ')
    .refine((date) => {
      return new Date(date) > new Date();
    }, 'Thời gian phải trong tương lai'),
  location: z.string().min(1, 'Địa điểm không được để trống').max(100),
  max_participants: z.number().int().positive().max(1000, 'Số lượng quá lớn').default(30),
  class_ids: z.array(z.number().int().positive()).optional(),
  teacher_id: z.number().int().positive(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']).optional(),
});

export const updateActivitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  date_time: z.string().datetime().optional(),
  location: z.string().min(1).max(100).optional(),
  max_participants: z.number().int().positive().max(1000).optional(),
  class_ids: z.array(z.number().int().positive()).optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']).optional(),
});

// Participation schemas
export const registerParticipationSchema = z.object({
  activity_id: z.number().int().positive(),
  student_id: z.number().int().positive(),
});

export const updateParticipationSchema = z.object({
  attendance_status: z.enum(['registered', 'attended', 'absent']).optional(),
  achievement_level: z.enum(['excellent', 'good', 'participated']).optional(),
  feedback: z.string().max(500).optional(),
});

// QR Session schemas
export const createQRSessionSchema = z.object({
  activity_id: z.number().int().positive(),
  expires_minutes: z.number().int().positive().max(60).default(5),
  single_use: z.boolean().default(false),
  max_scans: z.number().int().positive().optional(),
});

// Alert schemas
export const createAlertSchema = z.object({
  level: z.enum(['info', 'warning', 'critical']),
  message: z.string().min(1).max(500),
  related_table: z.string().max(50).optional(),
  related_id: z.number().int().positive().optional(),
});

// Award schemas
export const createAwardSchema = z.object({
  award_type_id: z.number().int().positive(),
  student_id: z.number().int().positive(),
  awarded_by: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

// System Config schemas
export const updateSystemConfigSchema = z.object({
  config_value: z.string().min(1),
});

// Poll schemas
export const createPollSchema = z.object({
  question: z.string().min(1, 'Câu hỏi không được để trống').max(500),
  options: z.array(z.string().min(1).max(200)).min(2, 'Phải có ít nhất 2 lựa chọn'),
  target_role: z.enum(['student', 'teacher', 'all']).default('all'),
  target_class_id: z.number().int().positive().optional(),
  expires_at: z
    .string()
    .datetime()
    .refine((date) => {
      return new Date(date) > new Date();
    }, 'Thời gian phải trong tương lai'),
});

export const votePollSchema = z.object({
  poll_id: z.number().int().positive(),
  option_index: z.number().int().nonnegative(),
});

// Notification schemas
export const createNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  target_role: z.enum(['student', 'teacher', 'all']).default('all'),
  target_user_ids: z.array(z.number().int().positive()).optional(),
  target_class_id: z.number().int().positive().optional(),
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type CreateQRSessionInput = z.infer<typeof createQRSessionSchema>;

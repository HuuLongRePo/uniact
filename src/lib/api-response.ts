/**
 * Bộ khung phản hồi API chuẩn.
 * Đảm bảo mọi API endpoint trả về cấu trúc nhất quán.
 *
 * Thành công: { success: true, data: T, message?: string }
 * Lỗi: { success: false, error: string, code: string, details?: any }
 */

import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: string;
  code: string;
  details?: any;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

function mergeLegacyTopLevel<T>(payload: Record<string, any>, data: T): Record<string, any> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return payload;

  const reserved = new Set(['success', 'data', 'message', 'error', 'code', 'details']);
  for (const [key, value] of Object.entries(data as any)) {
    if (!reserved.has(key)) payload[key] = value;
  }

  return payload;
}

function normalizeCommonMessage(message: string): string {
  const m = String(message ?? '').trim();
  if (!m) return message;

  switch (m) {
    case 'Unauthorized':
      return 'Chưa đăng nhập';
    case 'Forbidden':
      return 'Không có quyền truy cập';
    case 'Not found':
    case 'Not Found':
      return 'Không tìm thấy';
    case 'Internal server error':
      return 'Lỗi máy chủ nội bộ';
    case 'Validation failed':
      return 'Dữ liệu không hợp lệ';
    case 'Request timeout':
      return 'Hết thời gian chờ';
    default:
      return message;
  }
}

// Mã lỗi tương ứng HTTP status
export const ERROR_CODES = {
  // 400
  INVALID_REQUEST: 'INVALID_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',

  // 401
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // 403
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',

  // 404
  NOT_FOUND: 'NOT_FOUND',

  // 409
  CONFLICT: 'CONFLICT',
  DUPLICATE: 'DUPLICATE',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // 500
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  FILE_ERROR: 'FILE_ERROR',

  // Custom
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export class ApiError extends Error {
  constructor(
    public code: string = ERROR_CODES.INTERNAL_ERROR,
    message: string = 'Lỗi máy chủ nội bộ',
    public status: number = 500,
    public details?: any
  ) {
    super(normalizeCommonMessage(message));
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: any): ApiError {
    return new ApiError(ERROR_CODES.INVALID_REQUEST, message, 400, details);
  }

  static validation(message: string, details?: any): ApiError {
    return new ApiError(ERROR_CODES.VALIDATION_ERROR, message, 400, details);
  }

  static unauthorized(message: string = 'Chưa đăng nhập'): ApiError {
    return new ApiError(ERROR_CODES.UNAUTHORIZED, message, 401);
  }

  static forbidden(message: string = 'Không có quyền truy cập'): ApiError {
    return new ApiError(ERROR_CODES.FORBIDDEN, message, 403);
  }

  static notFound(message: string = 'Không tìm thấy'): ApiError {
    return new ApiError(ERROR_CODES.NOT_FOUND, message, 404);
  }

  static conflict(message: string, details?: any): ApiError {
    return new ApiError(ERROR_CODES.CONFLICT, message, 409, details);
  }

  static duplicate(entity: string): ApiError {
    return new ApiError(ERROR_CODES.DUPLICATE, `${entity} đã tồn tại`, 409);
  }

  static internalError(message: string = 'Lỗi máy chủ nội bộ', details?: any): ApiError {
    return new ApiError(ERROR_CODES.INTERNAL_ERROR, message, 500, details);
  }

  static databaseError(message: string, details?: any): ApiError {
    return new ApiError(ERROR_CODES.DATABASE_ERROR, message, 500, details);
  }

  static fileError(message: string, details?: any): ApiError {
    return new ApiError(ERROR_CODES.FILE_ERROR, message, 400, details);
  }

  static timeout(message: string = 'Hết thời gian chờ'): ApiError {
    return new ApiError(ERROR_CODES.TIMEOUT, message, 504);
  }
}

/**
 * Helper trả về response thành công
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  const payload: Record<string, any> = {
    success: true,
    data,
    ...(message && { message }),
  };

  return NextResponse.json(mergeLegacyTopLevel(payload, data) as any, { status });
}

/**
 * Success response helper with extra top-level fields.
 * Useful when legacy clients expect `data` to stay an array, but you still
 * need to return metadata (e.g. range_days, ids) at top-level.
 */
export function successResponseWithExtra<T>(
  data: T,
  extra?: Record<string, any>,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  const payload: Record<string, any> = {
    success: true,
    data,
    ...(message && { message }),
    ...(extra || {}),
  };

  return NextResponse.json(mergeLegacyTopLevel(payload, data) as any, { status });
}

/**
 * Helper trả về response lỗi
 */
export function errorResponse(
  error: Error | ApiError | string,
  status: number = 500
): NextResponse<ApiErrorResponse> {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        error: error.message,
        code: error.code,
        ...(error.details && { details: error.details }),
      },
      { status: error.status }
    );
  }

  // Handle Error instances
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        message: normalizeCommonMessage(error.message),
        error: normalizeCommonMessage(error.message),
        code: ERROR_CODES.INTERNAL_ERROR,
      },
      { status }
    );
  }

  // Handle string errors
  return NextResponse.json(
    {
      success: false,
      message: normalizeCommonMessage(String(error)),
      error: normalizeCommonMessage(String(error)),
      code: ERROR_CODES.INTERNAL_ERROR,
    },
    { status }
  );
}

/**
 * Try-catch wrapper for API handlers
 * Automatically converts errors to ApiError format
 */
export function apiHandler<T = any>(handler: (req: any) => Promise<NextResponse<any>>) {
  return async (req: any): Promise<NextResponse<any>> => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('🔴 API Error:', error);

      if (error instanceof ApiError) {
        return errorResponse(error);
      }

      if (error instanceof SyntaxError) {
        return errorResponse(ApiError.badRequest('Invalid JSON'), 400);
      }

      return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
    }
  };
}

/**
 * Validate required fields
 */
export function validateRequired(data: Record<string, any>, fields: string[]): void {
  const missing = fields.filter((f) => !data[f]);
  if (missing.length > 0) {
    throw ApiError.validation(`Missing required fields: ${missing.join(', ')}`, { missing });
  }
}

/**
 * Validate enum value
 */
export function validateEnum(value: any, validValues: any[], fieldName: string = 'value'): void {
  if (!validValues.includes(value)) {
    throw ApiError.validation(`Invalid ${fieldName}: must be one of ${validValues.join(', ')}`, {
      value,
      valid: validValues,
    });
  }
}

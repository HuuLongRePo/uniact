/**
 * Standardized Error Handling
 *
 * Convert various error types to consistent format
 */

export interface AppError {
  code: string;
  message: string;
  status: number;
  details?: any;
  timestamp: string;
}

/**
 * Error codes standardized
 */
export const ERROR_CODES = {
  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  OFFLINE: 'OFFLINE',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Server
  SERVER_ERROR: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',

  // Business logic
  DUPLICATE: 'DUPLICATE',
  INVALID_STATE: 'INVALID_STATE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Unknown
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * Normalize any error to AppError
 */
export function normalizeError(error: unknown): AppError {
  const timestamp = new Date().toISOString();

  // Already normalized
  if (error && typeof error === 'object' && 'code' in error) {
    return error as AppError;
  }

  // Fetch error
  if (error instanceof TypeError) {
    if (error.message.includes('fetch')) {
      return {
        code: ERROR_CODES.NETWORK_ERROR,
        message: 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.',
        status: 0,
        timestamp,
      };
    }
    if (error.message.includes('abort')) {
      return {
        code: ERROR_CODES.TIMEOUT,
        message: 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.',
        status: 0,
        timestamp,
      };
    }
  }

  // Response error
  if (error instanceof Response) {
    const message = getErrorMessageByStatus(error.status);
    return {
      code: getErrorCodeByStatus(error.status),
      message,
      status: error.status,
      timestamp,
    };
  }

  // Error instance
  if (error instanceof Error) {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error.message || 'Có lỗi xảy ra',
      status: 500,
      timestamp,
    };
  }

  // String message
  if (typeof error === 'string') {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error,
      status: 500,
      timestamp,
    };
  }

  // Default
  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: 'Có lỗi không mong muốn xảy ra',
    status: 500,
    timestamp,
  };
}

function getErrorCodeByStatus(status: number): string {
  if (status === 401) return ERROR_CODES.UNAUTHORIZED;
  if (status === 403) return ERROR_CODES.FORBIDDEN;
  if (status === 404) return ERROR_CODES.NOT_FOUND;
  if (status === 409) return ERROR_CODES.CONFLICT;
  if (status === 422) return ERROR_CODES.VALIDATION_ERROR;
  if (status === 429) return ERROR_CODES.RATE_LIMIT;
  if (status >= 500) return ERROR_CODES.SERVER_ERROR;
  return ERROR_CODES.UNKNOWN_ERROR;
}

function getErrorMessageByStatus(status: number): string {
  const messages: Record<number, string> = {
    400: 'Yêu cầu không hợp lệ',
    401: 'Bạn cần đăng nhập',
    403: 'Bạn không có quyền thực hiện hành động này',
    404: 'Không tìm thấy',
    409: 'Xung đột dữ liệu',
    422: 'Dữ liệu không hợp lệ',
    429: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    500: 'Lỗi máy chủ',
    503: 'Dịch vụ không khả dụng',
  };
  return messages[status] || 'Có lỗi xảy ra';
}

/**
 * Hook: useErrorHandler
 * Standardize error handling in components
 */
import { useCallback } from 'react';
import toast from 'react-hot-toast';

export function useErrorHandler() {
  const handleError = useCallback(
    (
      error: unknown,
      options?: {
        showToast?: boolean;
        logToServer?: boolean;
        context?: string;
      }
    ) => {
      const appError = normalizeError(error);

      // Log to server in production
      if (options?.logToServer !== false) {
        fetch('/api/error-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...appError,
            context: options?.context,
          }),
        }).catch(console.error);
      }

      // Show toast notification
      if (options?.showToast !== false) {
        toast.error(appError.message);
      }

      console.error(`[${appError.code}]`, appError.message);

      return appError;
    },
    []
  );

  return { handleError };
}

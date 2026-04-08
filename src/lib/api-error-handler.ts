/**
 * API Error Handler - Middleware kiểm soát lỗi tập trung
 * Xử lý tất cả lỗi từ API responses
 */

export interface ApiError {
  statusCode: number;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Kiểm tra xem response có lỗi không
 */
export function isErrorResponse(response: any): response is { error: ApiError } {
  return response && response.error && !response.success;
}

/**
 * Xử lý lỗi HTTP
 */
export async function handleApiError(response: Response): Promise<ApiError> {
  const statusCode = response.status;
  const contentType = response.headers.get('content-type');

  let data: any = {};
  try {
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }
  } catch (e) {
    data = {};
  }

  const error: ApiError = {
    statusCode,
    message: getErrorMessage(statusCode, data),
    details: data.details || data,
    timestamp: new Date().toISOString(),
  };

  return error;
}

/**
 * Lấy thông báo lỗi phù hợp theo status code
 */
function getErrorMessage(statusCode: number, data: any): string {
  // Kiểm tra message custom từ server
  if (data.message) {
    return data.message;
  }
  if (data.error) {
    return typeof data.error === 'string' ? data.error : data.error.message || 'Lỗi không xác định';
  }

  // Status code default messages
  switch (statusCode) {
    case 400:
      return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra dữ liệu nhập vào.';
    case 401:
      return 'Bạn cần đăng nhập để thực hiện hành động này.';
    case 403:
      return 'Bạn không có quyền thực hiện hành động này.';
    case 404:
      return 'Tài nguyên không được tìm thấy.';
    case 409:
      return 'Xung đột với dữ liệu hiện tại. Vui lòng làm mới và thử lại.';
    case 422:
      return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
    case 429:
      return 'Quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.';
    case 500:
      return 'Lỗi máy chủ. Vui lòng thử lại sau.';
    case 502:
    case 503:
      return 'Máy chủ tạm thời không khả dụng. Vui lòng thử lại sau.';
    case 504:
      return 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.';
    default:
      return `Lỗi ${statusCode}: Không thể hoàn thành yêu cầu.`;
  }
}

/**
 * Wrapper cho fetch với xử lý lỗi
 */
export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await handleApiError(response);
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err: any) {
    const error: ApiError = {
      statusCode: 0,
      message: err.message || 'Lỗi kết nối. Vui lòng kiểm tra đường truyền.',
      timestamp: new Date().toISOString(),
    };
    return { success: false, error };
  }
}

/**
 * Xác thực lỗi validation
 */
export interface ValidationError {
  field: string;
  message: string;
}

export function extractValidationErrors(error: any): ValidationError[] {
  if (!error.details) return [];

  const details = error.details;

  // Nếu là array lỗi validation
  if (Array.isArray(details)) {
    return details.map((err: any) => ({
      field: err.field || err.path || 'unknown',
      message: err.message || 'Lỗi validation',
    }));
  }

  // Nếu là object lỗi validation
  if (typeof details === 'object') {
    return Object.entries(details).map(([field, message]: [string, any]) => ({
      field,
      message: typeof message === 'string' ? message : JSON.stringify(message),
    }));
  }

  return [];
}

/**
 * Retry logic cho failed requests
 */
export async function apiFetchWithRetry<T = any>(
  url: string,
  options?: RequestInit & { retries?: number; retryDelay?: number }
): Promise<ApiResponse<T>> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options || {};

  let lastError: ApiError | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await apiFetch<T>(url, fetchOptions);

      if (result.success) {
        return result;
      }

      lastError = result.error ?? null;

      // Không retry nếu là lỗi client
      if (result.error?.statusCode && result.error.statusCode < 500) {
        return result;
      }

      // Chờ trước khi retry
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (i + 1)));
      }
    } catch (err) {
      lastError = {
        statusCode: 0,
        message: 'Lỗi không xác định',
        timestamp: new Date().toISOString(),
      };
    }
  }

  return {
    success: false,
    error: lastError || {
      statusCode: 0,
      message: 'Không thể kết nối sau nhiều lần thử.',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Rate limiting - ngăn chặn spam requests
 */
class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.timestamps.get(key) || [];

    // Xóa timestamps cũ
    const recentTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);

    if (recentTimestamps.length >= this.maxRequests) {
      return false;
    }

    recentTimestamps.push(now);
    this.timestamps.set(key, recentTimestamps);
    return true;
  }

  reset(key: string): void {
    this.timestamps.delete(key);
  }
}

export const rateLimiter = new RateLimiter(10, 60000);

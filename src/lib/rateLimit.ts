// Rate Limiting cho API endpoints
// Bảo vệ server khỏi spam requests

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry>;

  constructor() {
    this.limits = new Map();

    // Dọn dẹp entries hết hạn mỗi phút
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Kiểm tra xem request có vượt quá giới hạn không
   * @param identifier Định danh (IP, user ID, etc.)
   * @param max Số request tối đa
   * @param windowMs Thời gian window (ms)
   * @returns true nếu cho phép, false nếu vượt quá
   */
  check(identifier: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || entry.resetAt < now) {
      // Tạo entry mới
      this.limits.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    if (entry.count >= max) {
      // Vượt quá giới hạn
      return false;
    }

    // Tăng count
    entry.count++;
    return true;
  }

  /**
   * Reset rate limit cho identifier
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Dọn dẹp entries hết hạn
   */
  private cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.limits.keys());

    keys.forEach((key) => {
      const entry = this.limits.get(key);
      if (entry && entry.resetAt < now) {
        this.limits.delete(key);
      }
    });
  }

  /**
   * Thống kê
   */
  stats(): { size: number; identifiers: string[] } {
    return {
      size: this.limits.size,
      identifiers: Array.from(this.limits.keys()),
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Helper function để áp dụng rate limiting cho API route
 * @param req Request object
 * @param max Số request tối đa
 * @param windowMs Thời gian window (ms)
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function rateLimit(
  req: Request | { headers?: Headers | { get?: (name: string) => string | null | undefined } } | null | undefined,
  max: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 phút
): { allowed: boolean; remaining?: number; resetAt?: number } {
  // Lấy IP từ headers, nhưng giữ hàm an toàn với request mock tối giản trong test
  const forwarded = req?.headers?.get?.('x-forwarded-for') ?? null;
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  const identifier = ip;
  const allowed = rateLimiter.check(identifier, max, windowMs);

  if (!allowed) {
    const entry = (rateLimiter as any).limits.get(identifier);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry?.resetAt || Date.now() + windowMs,
    };
  }

  const entry = (rateLimiter as any).limits.get(identifier);
  return {
    allowed: true,
    remaining: max - (entry?.count || 0),
    resetAt: entry?.resetAt || Date.now() + windowMs,
  };
}

// Preset rate limits
export const RATE_LIMITS = {
  // API đọc dữ liệu
  READ: { max: 100, window: 15 * 60 * 1000 }, // 100 requests / 15 phút

  // API ghi dữ liệu
  WRITE: { max: 50, window: 15 * 60 * 1000 }, // 50 requests / 15 phút

  // Login
  LOGIN: { max: 5, window: 15 * 60 * 1000 }, // 5 attempts / 15 phút

  // Upload
  UPLOAD: { max: 10, window: 60 * 60 * 1000 }, // 10 uploads / 1 giờ

  // Export
  EXPORT: { max: 20, window: 60 * 60 * 1000 }, // 20 exports / 1 giờ
};

// In-Memory Cache cho hệ thống Intranet
// Tối ưu hiệu suất truy vấn database

interface CacheEntry<T> {
  data: T;
  expires: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;

  constructor() {
    this.cache = new Map();

    // Dọn dẹp cache mỗi 5 phút
    setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Lấy dữ liệu từ cache hoặc gọi function nếu cache hết hạn
   * @param key Cache key
   * @param ttl Time to live (milliseconds)
   * @param fn Function để lấy data mới nếu cache miss
   */
  async get<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }

    const data = await fn();
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    });

    return data;
  }

  /**
   * Xóa một cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Xóa tất cả cache có prefix
   */
  invalidatePrefix(prefix: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Xóa toàn bộ cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Dọn dẹp cache hết hạn
   */
  private cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.cache.keys());

    keys.forEach((key) => {
      const entry = this.cache.get(key);
      if (entry && entry.expires < now) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Thống kê cache
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache TTL constants (milliseconds)
export const CACHE_TTL = {
  CLASSES: 5 * 60 * 1000, // 5 phút
  ACTIVITY_TYPES: 10 * 60 * 1000, // 10 phút
  ORGANIZATION_LEVELS: 10 * 60 * 1000, // 10 phút
  USER_PROFILE: 2 * 60 * 1000, // 2 phút
  SCOREBOARD: 1 * 60 * 1000, // 1 phút
  SYSTEM_CONFIG: 5 * 60 * 1000, // 5 phút
  TEACHERS: 5 * 60 * 1000, // 5 phút
  AWARD_TYPES: 10 * 60 * 1000, // 10 phút
};

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SWRCache {
  data?: any;
  timestamp: number;
  error?: Error;
}

// Global cache store
const swrCache = new Map<string, SWRCache>();

interface SWROptions {
  /** Revalidation interval in ms (default: 0 = manual revalidation only) */
  revalidateInterval?: number;
  /** Cache duration in ms (default: 60000 = 1 minute) */
  cacheDuration?: number;
  /** Deduplicate requests within this time (default: 5000 = 5 seconds) */
  dedupingInterval?: number;
  /** Show cache while fetching new data (default: true) */
  staleWhileRevalidate?: boolean;
  /** Only fetch if cache is expired (default: false) */
  revalidateIfStale?: boolean;
  /** Disable auto revalidation on focus (default: false) */
  focusRevalidateDisabled?: boolean;
  /** Custom comparator for cache key */
  compare?: (a: any, b: any) => boolean;
}

const DEFAULT_OPTIONS: SWROptions = {
  revalidateInterval: 0,
  cacheDuration: 60000, // 1 minute
  dedupingInterval: 5000,
  staleWhileRevalidate: true,
  revalidateIfStale: false,
  focusRevalidateDisabled: false,
};

// Track pending requests to prevent duplication
const pendingRequests = new Map<string, Promise<any>>();

/**
 * SWR (Stale-While-Revalidate) Hook
 *
 * Provides efficient data fetching with caching:
 * - Returns cached data immediately (stale)
 * - Revalidates in background
 * - Deduplicates concurrent requests
 * - Auto-refetch on interval/focus/error
 *
 * @example
 * const { data, error, isLoading, mutate } = useSWR(
 *   '/api/activities',
 *   (url) => fetch(url).then(r => r.json()),
 *   { revalidateInterval: 30000 }
 * )
 *
 * if (isLoading && !data) return <LoadingSpinner />
 * if (error) return <Error error={error} />
 * return <ActivityList activities={data} />
 */
export function useSWR<T = any>(
  key: string | null,
  fetcher: (key: string) => Promise<T>,
  options: SWROptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const mounted = useRef(true);
  const revalidateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastFetchRef = useRef<number>(0);

  // Get cached data
  const getCachedData = useCallback(
    (cacheKey: string) => {
      const cached = swrCache.get(cacheKey);
      if (!cached) return null;

      const isExpired = Date.now() - cached.timestamp > (config.cacheDuration || 0);

      return {
        data: cached.data,
        error: cached.error,
        isExpired,
      };
    },
    [config.cacheDuration]
  );

  // Revalidate (fetch new data)
  const revalidate = useCallback(async () => {
    if (!key) return;

    try {
      setIsValidating(true);

      // Check if request is already pending (deduplication)
      const pending = pendingRequests.get(key);
      if (pending && Date.now() - lastFetchRef.current < (config.dedupingInterval || 0)) {
        return await pending;
      }

      // Make request
      lastFetchRef.current = Date.now();
      const promise = fetcher(key);
      pendingRequests.set(key, promise);

      const newData = await promise;

      if (mounted.current) {
        setData(newData);
        setError(null);

        // Update cache
        swrCache.set(key, {
          data: newData,
          timestamp: Date.now(),
        });
      }

      return newData;
    } catch (err) {
      if (mounted.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Cache error
        swrCache.set(key, {
          timestamp: Date.now(),
          error,
        });
      }

      throw err;
    } finally {
      if (mounted.current) {
        setIsValidating(false);
      }
      pendingRequests.delete(key);
    }
  }, [key, fetcher, config.dedupingInterval]);

  // Initial data load
  useEffect(() => {
    if (!key) return;

    mounted.current = true;
    let isMounted = true;

    (async () => {
      try {
        const cached = getCachedData(key);

        if (cached) {
          if (isMounted) {
            setData(cached.data);
            if (cached.error) setError(cached.error);
          }

          if (!cached.isExpired && !config.revalidateIfStale) {
            // Cache is still valid, no need to revalidate
            return;
          }

          // Show cached data while revalidating (stale-while-revalidate)
          if (config.staleWhileRevalidate && cached.data) {
            if (isMounted) setIsValidating(true);
            try {
              await revalidate();
            } finally {
              if (isMounted) setIsValidating(false);
            }
            return;
          }
        }

        // No cache, fetch immediately
        if (isMounted) setIsLoading(true);
        try {
          await revalidate();
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } catch (err) {
        console.error('useSWR error:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [key, revalidate, getCachedData, config.revalidateIfStale, config.staleWhileRevalidate]);

  // Revalidation interval
  useEffect(() => {
    if (!key || !config.revalidateInterval || config.revalidateInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      revalidate();
    }, config.revalidateInterval);

    return () => clearInterval(interval);
  }, [key, config.revalidateInterval, revalidate]);

  // Revalidate on window focus
  useEffect(() => {
    if (!key || config.focusRevalidateDisabled) return;

    const handleFocus = () => {
      // Only revalidate if cache is old enough
      const cached = swrCache.get(key);
      if (!cached || Date.now() - cached.timestamp > (config.dedupingInterval || 0)) {
        revalidate();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, config.focusRevalidateDisabled, config.dedupingInterval, getCachedData, revalidate]);

  // Cleanup
  useEffect(
    () => () => {
      mounted.current = false;
      if (revalidateTimeoutRef.current) {
        clearTimeout(revalidateTimeoutRef.current);
      }
    },
    []
  );

  // Manually mutate cache
  const mutate = useCallback(
    async (
      newData?: T | Promise<T> | ((data: T | undefined) => T | Promise<T>),
      shouldRevalidate = true
    ) => {
      if (!key) return;

      // Update local state immediately (optimistic)
      if (newData !== undefined) {
        const updated = typeof newData === 'function' ? await (newData as any)(data) : newData;

        if (mounted.current) {
          setData(updated);
        }

        // Update cache
        swrCache.set(key, {
          data: updated,
          timestamp: Date.now(),
        });
      }

      // Revalidate if requested
      if (shouldRevalidate) {
        return revalidate();
      }
    },
    [key, data, revalidate]
  );

  return {
    data,
    error,
    isLoading: isLoading && !data, // Only show loading if no data at all
    isValidating,
    mutate,
    revalidate,
  };
}

/**
 * Clear SWR cache (for testing or manual cache invalidation)
 */
export function clearSWRCache(key?: string) {
  if (key) {
    swrCache.delete(key);
  } else {
    swrCache.clear();
  }
}

/**
 * Manually set SWR cache
 */
export function setSWRCache(key: string, data: any) {
  swrCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Get SWR cache (for debugging)
 */
export function getSWRCache(key?: string) {
  if (key) {
    return swrCache.get(key);
  }
  return Object.fromEntries(swrCache);
}

/**
 * Hook to batch multiple SWR requests
 * @example
 * const { data: [activities, users], isLoading } = useSWRBatch([
 *   ['/api/activities', fetchActivities],
 *   ['/api/users', fetchUsers]
 * ])
 */
export function useSWRBatch<T extends any[]>(
  requests: Array<[string | null, (key: string) => Promise<any>]>,
  options?: SWROptions
) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const results = requests.map(([key, fetcher]) => useSWR(key, fetcher, options));

  const data = results.map((r) => r.data) as T;
  const errors = results.filter((r) => r.error).map((r) => r.error);
  const isLoading = results.some((r) => r.isLoading);
  const isValidating = results.some((r) => r.isValidating);

  return { data, errors, isLoading, isValidating };
}

/**
 * Common fetch hooks - Eliminate code duplication
 *
 * Reusable data fetching patterns with caching
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounceCallback } from './debounce-hooks';
import { normalizeError } from './error-handling';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: any;
  timestamp: number | null;
}

/**
 * useQuery - Fetch data on mount/deps change
 */
export function useQuery<T>(
  url: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    cache?: boolean;
    cacheTime?: number;
  }
) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
    timestamp: null,
  });

  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const fetchData = useCallback(async () => {
    // Check cache
    const cached = cacheRef.current.get(url);
    if (options?.cache && cached) {
      const age = Date.now() - cached.timestamp;
      if (age < (options.cacheTime || 5 * 60 * 1000)) {
        setState({ data: cached.data, loading: false, error: null, timestamp: cached.timestamp });
        return;
      }
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await globalThis.fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      const timestamp = Date.now();

      // Cache result
      if (options?.cache) {
        cacheRef.current.set(url, { data, timestamp });
      }

      setState({ data, loading: false, error: null, timestamp });
    } catch (error) {
      setState({ data: null, loading: false, error: normalizeError(error), timestamp: null });
    }
  }, [url, options?.cache, options?.cacheTime]);

  useEffect(() => {
    if (options?.enabled === false) return;
    fetchData();

    if (options?.refetchInterval) {
      const interval = setInterval(fetchData, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options?.enabled, options?.refetchInterval]);

  return { ...state, refetch: fetchData };
}

/**
 * useMutation - POST/PUT/DELETE operations
 */
export function useMutation<T, D = any>(
  method: 'POST' | 'PUT' | 'DELETE',
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
  }
) {
  const [state, setState] = useState({
    loading: false,
    error: null as any,
    data: null as T | null,
  });

  const mutate = useCallback(
    async (url: string, data?: D) => {
      setState({ loading: true, error: null, data: null });

      try {
        const response = await globalThis.fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: data ? JSON.stringify(data) : undefined,
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Request failed');
        }

        const result = await response.json();
        setState({ loading: false, error: null, data: result });
        options?.onSuccess?.(result);
        return result;
      } catch (error) {
        const appError = normalizeError(error);
        setState({ loading: false, error: appError, data: null });
        options?.onError?.(appError);
        throw appError;
      }
    },
    [method, options]
  );

  return { ...state, mutate };
}

/**
 * useSearch - Debounced search queries
 */
export function useSearch<T>(
  searchUrl: (query: string) => string,
  options?: {
    debounceMs?: number;
    minChars?: number;
  }
) {
  const [state, setState] = useState<FetchState<T[]>>({
    data: null,
    loading: false,
    error: null,
    timestamp: null,
  });

  const performSearch = useCallback(
    async (query: string) => {
      if (!query || query.length < (options?.minChars || 2)) {
        setState({ data: null, loading: false, error: null, timestamp: null });
        return;
      }

      setState((prev) => ({ ...prev, loading: true }));

      try {
        const response = await globalThis.fetch(searchUrl(query), { credentials: 'include' });
        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        setState({ data, loading: false, error: null, timestamp: Date.now() });
      } catch (error) {
        setState({ data: null, loading: false, error: normalizeError(error), timestamp: null });
      }
    },
    [searchUrl, options?.minChars]
  );

  const debouncedSearch = useDebounceCallback(performSearch, options?.debounceMs || 300);

  return { ...state, search: debouncedSearch };
}

/**
 * usePagination - Paginated data fetching
 */
export function usePagination<T>(
  urlBuilder: (page: number, limit: number) => string,
  options?: {
    initialPage?: number;
    pageSize?: number;
  }
) {
  const [page, setPage] = useState(options?.initialPage || 1);
  const pageSize = options?.pageSize || 20;

  const { data, loading, error, refetch } = useQuery<{
    items: T[];
    total: number;
    page: number;
    pages: number;
  }>(urlBuilder(page, pageSize), { cache: false });

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const nextPage = useCallback(() => {
    if (data && page < data.pages) {
      setPage(page + 1);
    }
  }, [page, data]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  return {
    items: data?.items || [],
    total: data?.total || 0,
    page,
    pages: data?.pages || 0,
    loading,
    error,
    goToPage,
    nextPage,
    prevPage,
    refetch,
  };
}

/**
 * useInfiniteQuery - Infinite scroll
 */
export function useInfiniteQuery<T>(
  urlBuilder: (page: number) => string,
  options?: {
    pageSize?: number;
  }
) {
  const pageSize = options?.pageSize || 20;
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await globalThis.fetch(urlBuilder(page), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load');

      const data = await response.json();
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.items.length === pageSize);
      setPage((p) => p + 1);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, urlBuilder, pageSize]);

  return { items, loading, hasMore, loadMore };
}

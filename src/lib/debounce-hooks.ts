/**
 * Debounce hooks for React
 *
 * Prevents excessive function calls
 * Commonly used for search, autocomplete, resize handlers
 */

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * useDebounce - Debounce a value
 * @example
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebounce(search, 300)
 *
 * useEffect(() => {
 *   handleSearch(debouncedSearch)
 * }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * useDebounceCallback - Debounce a callback function
 * @example
 * const handleSearch = useDebounceCallback(async (query) => {
 *   const results = await fetch(`/api/search?q=${query}`)
 *   setResults(results)
 * }, 300)
 *
 * <input onChange={(e) => handleSearch(e.target.value)} />
 */
export function useDebounceCallback<Args extends any[], Return>(
  callback: (...args: Args) => Return | Promise<Return>,
  delayMs: number = 300
): (...args: Args) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delayMs);
    },
    [callback, delayMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * useThrottle - Throttle a value (call at most once per interval)
 */
export function useThrottle<T>(value: T, delayMs: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdatedRef = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now >= lastUpdatedRef.current + delayMs) {
      lastUpdatedRef.current = now;
      setThrottledValue(value);
    } else {
      const handler = setTimeout(
        () => {
          lastUpdatedRef.current = Date.now();
          setThrottledValue(value);
        },
        delayMs - (now - lastUpdatedRef.current)
      );

      return () => clearTimeout(handler);
    }
  }, [value, delayMs]);

  return throttledValue;
}

/**
 * useThrottleCallback - Throttle a callback
 */
export function useThrottleCallback<Args extends any[], Return>(
  callback: (...args: Args) => Return | Promise<Return>,
  delayMs: number = 300
): (...args: Args) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef<number>(0);

  const throttledCallback = useCallback(
    (...args: Args) => {
      const now = Date.now();

      if (now - lastCallRef.current >= delayMs) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(
          () => {
            lastCallRef.current = Date.now();
            callback(...args);
          },
          delayMs - (now - lastCallRef.current)
        );
      }
    },
    [callback, delayMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

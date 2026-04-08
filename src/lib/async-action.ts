/**
 * useAsyncAction - Prevent double submissions
 *
 * Automatically disables submit buttons while request is in progress
 *
 * @example
 * const { loading, error, execute } = useAsyncAction(async (formData) => {
 *   return fetch('/api/submit', { method: 'POST', body: formData })
 * })
 *
 * const handleSubmit = async (e) => {
 *   e.preventDefault()
 *   await execute(new FormData(e.target))
 * }
 *
 * <button disabled={loading}>
 *   {loading ? 'Loading...' : 'Submit'}
 * </button>
 */

import { useState, useCallback } from 'react';

interface UseAsyncActionOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  resetErrorTimeout?: number;
}

export function useAsyncAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: UseAsyncActionOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: T): Promise<R | null> => {
      // Prevent double submit
      if (loading) {
        console.warn('⚠️ Action already in progress');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await action(...args);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [action, loading, options]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { loading, error, execute, clearError };
}

/**
 * useFormSubmit - Submit form with debounce + async handling
 */
export function useFormSubmit<Data>(
  onSubmit: (data: Data) => Promise<any>,
  options: UseAsyncActionOptions = {}
) {
  const { loading, error, execute } = useAsyncAction(onSubmit, options);

  const handleSubmit = useCallback(
    async (data: Data) => {
      return execute(data);
    },
    [execute]
  );

  return { loading, error, handleSubmit };
}

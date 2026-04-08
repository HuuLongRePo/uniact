'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Options for useSubmit hook
 */
export interface UseSubmitOptions {
  /**
   * Delay between allowed submissions (ms). Default: 300ms
   * Prevents accidental double-clicks
   */
  debounceMs?: number;

  /**
   * Cooldown period after successful submission (ms). Default: 500ms
   * Prevents rapid resubmission
   */
  cooldownMs?: number;

  /**
   * Callback when submission starts
   */
  onStart?: () => void;

  /**
   * Callback when submission succeeds
   */
  onSuccess?: (data?: any) => void;

  /**
   * Callback when submission fails
   */
  onError?: (error: Error) => void;

  /**
   * Callback when submission completes (success or error)
   */
  onFinally?: () => void;
}

/**
 * State returned by useSubmit hook
 */
export interface UseSubmitState {
  /**
   * Whether submission is in progress
   */
  isSubmitting: boolean;

  /**
   * Whether submit button should be disabled
   */
  isDisabled: boolean;

  /**
   * Error from last submission, if any
   */
  error: Error | null;

  /**
   * Button text to display (e.g., "Saving..." when submitting)
   */
  buttonText: string;

  /**
   * CSS class for button state (e.g., "disabled", "loading", "success", "error")
   */
  buttonClass: string;
}

/**
 * Hook to prevent double submission with debounce and cooldown
 *
 * Usage:
 * ```tsx
 * const { isSubmitting, isDisabled, buttonText } = useSubmit(async () => {
 *   const res = await fetch('/api/submit', { method: 'POST', body: data })
 *   return res.json()
 * })
 *
 * <button
 *   disabled={isDisabled}
 *   onClick={() => handleSubmit()}
 *   className={state.buttonClass}
 * >
 *   {state.buttonText}
 * </button>
 * ```
 *
 * @param submitFn - Async function to execute on submit
 * @param options - Configuration options
 * @returns Object with submission state and handler
 */
export function useSubmit(submitFn: () => Promise<any>, options: UseSubmitOptions = {}) {
  const {
    debounceMs = 300,
    cooldownMs = 500,
    onStart = () => {},
    onSuccess = () => {},
    onError = () => {},
    onFinally = () => {},
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [successState, setSuccessState] = useState(false);

  const lastSubmitTimeRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Determine button state
  const isDisabled = isSubmitting || successState;
  const buttonText = isSubmitting ? 'Đang xử lý...' : successState ? '✓ Thành công' : 'Gửi';
  const buttonClass = isSubmitting
    ? 'opacity-70 cursor-not-allowed'
    : successState
      ? 'bg-green-500 text-white'
      : error
        ? 'bg-red-500 text-white'
        : '';

  // Handler with debounce and cooldown protection
  const handleSubmit = useCallback(async () => {
    const now = Date.now();

    // Debounce: ignore if called again within debounceMs
    if (now - lastSubmitTimeRef.current < debounceMs) {
      return;
    }

    // Prevent concurrent submissions
    if (isSubmitting) {
      return;
    }

    // Clear previous timers
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Update last submit time
    lastSubmitTimeRef.current = now;

    try {
      setIsSubmitting(true);
      setError(null);
      onStart?.();

      const result = await submitFn();

      setSuccessState(true);
      onSuccess?.(result);

      // Auto-reset success state after cooldown
      cooldownTimeoutRef.current = setTimeout(() => {
        setSuccessState(false);
      }, cooldownMs);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsSubmitting(false);
      onFinally?.();
    }
  }, [submitFn, debounceMs, cooldownMs, isSubmitting, onStart, onSuccess, onError, onFinally]);

  // Reset function for manual control
  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
    setSuccessState(false);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
  }, []);

  return {
    handleSubmit,
    isSubmitting,
    isDisabled,
    error,
    buttonText,
    buttonClass,
    reset,
    state: { isSubmitting, isDisabled, error, buttonText, buttonClass },
  };
}

/**
 * Wrapper for form submissions with validation
 *
 * Usage:
 * ```tsx
 * const { handleSubmit, state } = useFormSubmit(
 *   async (formData) => {
 *     const res = await fetch('/api/submit', {
 *       method: 'POST',
 *       body: JSON.stringify(formData)
 *     })
 *     if (!res.ok) throw new Error('Failed to submit')
 *     return res.json()
 *   },
 *   {
 *     onSuccess: () => toast.success('Saved!'),
 *     onError: (err) => toast.error(err.message)
 *   }
 * )
 *
 * const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
 *   e.preventDefault()
 *   const formData = new FormData(e.currentTarget)
 *   await handleSubmit(Object.fromEntries(formData))
 * }
 * ```
 */
export function useFormSubmit(
  submitFn: (formData: Record<string, any>) => Promise<any>,
  options: UseSubmitOptions = {}
) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const wrappedSubmitFn = useCallback(async () => {
    return submitFn(formData);
  }, [submitFn, formData]);

  const { handleSubmit, ...rest } = useSubmit(wrappedSubmitFn, options);

  return {
    handleSubmit: async (data: Record<string, any>) => {
      setFormData(data);
      // Use setTimeout to ensure state is updated before submission
      return new Promise((resolve) => {
        setTimeout(async () => {
          await handleSubmit();
          resolve(undefined);
        }, 0);
      });
    },
    setFormData,
    ...rest,
  };
}

/**
 * Hook to add debounce to any async action
 *
 * Usage:
 * ```tsx
 * const debouncedSave = useDebouncedAction(async (data) => {
 *   await fetch('/api/save', { method: 'POST', body: JSON.stringify(data) })
 * }, 500)
 *
 * <input
 *   onChange={(e) => debouncedSave(e.target.value)}
 * />
 * ```
 */
export function useDebouncedAction<T extends any[]>(
  action: (...args: T) => Promise<void>,
  delayMs: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedAction = useCallback(
    (...args: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          await action?.(...args);
        } catch (err) {
          console.error('Debounced action error:', err);
        }
      }, delayMs);
    },
    [action, delayMs]
  );

  return debouncedAction;
}

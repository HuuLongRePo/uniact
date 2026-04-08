import { useState, useCallback } from 'react';

/**
 * Hook to prevent double submissions
 * Usage:
 * const { isSubmitting, withSubmit } = useSubmitGuard()
 *
 * const handleSubmit = withSubmit(async () => {
 *   await api.post(...)
 * })
 *
 * <button disabled={isSubmitting} onClick={handleSubmit}>Submit</button>
 */
export function useSubmitGuard() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const withSubmit = useCallback(
    <T extends (...args: any[]) => Promise<any>>(fn: T) => {
      return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
        if (isSubmitting) {
          console.warn('⚠️ Duplicate submission prevented');
          return;
        }

        setIsSubmitting(true);
        try {
          const result = await fn(...args);
          return result;
        } finally {
          setIsSubmitting(false);
        }
      };
    },
    [isSubmitting]
  );

  return {
    isSubmitting,
    withSubmit,
  };
}

/**
 * Alternative: Component-based submit guard
 * Prevents multiple clicks on buttons
 */
export function useButtonGuard() {
  const [clickedButtons, setClickedButtons] = useState<Set<string>>(new Set());

  const guardClick = useCallback(
    (buttonId: string, callback: () => void | Promise<void>) => {
      return async () => {
        if (clickedButtons.has(buttonId)) {
          console.warn(`⚠️ Button ${buttonId} already clicked`);
          return;
        }

        setClickedButtons((prev) => new Set(prev).add(buttonId));

        try {
          await callback();
        } finally {
          // Remove after 1 second to allow retry on errors
          setTimeout(() => {
            setClickedButtons((prev) => {
              const next = new Set(prev);
              next.delete(buttonId);
              return next;
            });
          }, 1000);
        }
      };
    },
    [clickedButtons]
  );

  const isButtonDisabled = useCallback(
    (buttonId: string) => clickedButtons.has(buttonId),
    [clickedButtons]
  );

  return {
    guardClick,
    isButtonDisabled,
  };
}

/**
 * Hook for form submissions with validation
 */
export function useFormSubmit<T = any>() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useCallback(
    async (
      data: T,
      onSubmit: (data: T) => Promise<void>,
      validate?: (data: T) => Record<string, string> | null
    ) => {
      if (isSubmitting) return;

      // Client-side validation
      if (validate) {
        const validationErrors = validate(data);
        if (validationErrors && Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }

      setErrors({});
      setIsSubmitting(true);

      try {
        await onSubmit(data);
      } catch (error) {
        console.error('Form submission error:', error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting]
  );

  return {
    isSubmitting,
    errors,
    setErrors,
    submit,
  };
}

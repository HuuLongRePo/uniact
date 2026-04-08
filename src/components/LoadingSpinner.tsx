import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'green' | 'blue' | 'white' | 'gray' | 'indigo';
  variant?: 'inline' | 'centered' | 'fullscreen';
  fullScreen?: boolean; // Deprecated, use variant="fullscreen"
  className?: string;
}

export default function LoadingSpinner({
  message = 'Đang tải...',
  size = 'md',
  color = 'green',
  variant,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  // Map size to Tailwind classes
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  // Map color to Tailwind classes
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600',
    indigo: 'text-indigo-600',
  };

  // Text size based on spinner size
  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  // Backward compatibility
  const effectiveVariant = variant || (fullScreen ? 'fullscreen' : 'centered');

  const spinnerElement = (
    <Loader2
      className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin ${className}`}
      aria-label="Loading"
    />
  );

  // Inline variant - just spinner, no container
  if (effectiveVariant === 'inline') {
    return message ? (
      <div className="flex items-center gap-2">
        {spinnerElement}
        <span className={`${textSizeClasses[size]} ${colorClasses[color]}`}>{message}</span>
      </div>
    ) : (
      spinnerElement
    );
  }

  // Centered variant - centered in container
  if (effectiveVariant === 'centered') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          {spinnerElement}
          {message && <p className={`mt-4 ${textSizeClasses[size]} text-gray-600`}>{message}</p>}
        </div>
      </div>
    );
  }

  // Fullscreen variant - overlay with backdrop
  if (effectiveVariant === 'fullscreen') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[200px]">
          {spinnerElement}
          {message && (
            <p className={`${textSizeClasses[size]} text-gray-700 font-medium text-center`}>
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return spinnerElement;
}

/**
 * Convenience components for common use cases
 */

export function PageLoader({ message = 'Đang tải dữ liệu...' }: { message?: string }) {
  return <LoadingSpinner variant="centered" size="lg" color="green" message={message} />;
}

export function FullScreenLoader({ message = 'Đang xử lý...' }: { message?: string }) {
  return <LoadingSpinner variant="fullscreen" size="xl" color="green" message={message} />;
}

export function ButtonSpinner({ message }: { message?: string }) {
  return <LoadingSpinner size="sm" color="white" variant="inline" message={message} />;
}

export function InlineSpinner({ message }: { message?: string }) {
  return <LoadingSpinner size="sm" color="green" variant="inline" message={message} />;
}

export function TableLoader({ message = 'Đang tải...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingSpinner size="lg" color="green" variant="inline" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}

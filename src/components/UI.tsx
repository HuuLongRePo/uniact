/**
 * Reusable UI Components for Common Patterns
 * Eliminates duplication for buttons and status displays
 */

import React from 'react';
import { Eye, Edit, Trash2, Copy, Download } from 'lucide-react';

/**
 * Standard action button set
 * Used in table rows and detail pages
 */
export interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
  custom?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'success' | 'danger' | 'warning';
  }>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'text-blue-600 hover:text-blue-800',
  success: 'text-green-600 hover:text-green-800',
  danger: 'text-red-600 hover:text-red-800',
  warning: 'text-yellow-600 hover:text-yellow-800',
};

const sizeStyles = {
  sm: 'text-sm gap-1',
  md: 'text-base gap-2',
  lg: 'text-lg gap-3',
};

export function ActionButtons({
  onView,
  onEdit,
  onDelete,
  onCopy,
  onDownload,
  custom = [],
  className = '',
  size = 'md',
}: ActionButtonsProps) {
  return (
    <div className={`flex ${sizeStyles[size]} items-center ${className}`}>
      {onView && (
        <button onClick={onView} className={`${variantStyles.default} transition`} title="View">
          <Eye size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
        </button>
      )}

      {onEdit && (
        <button onClick={onEdit} className={`${variantStyles.success} transition`} title="Edit">
          <Edit size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
        </button>
      )}

      {onCopy && (
        <button onClick={onCopy} className={`${variantStyles.default} transition`} title="Copy">
          <Copy size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
        </button>
      )}

      {onDownload && (
        <button
          onClick={onDownload}
          className={`${variantStyles.success} transition`}
          title="Download"
        >
          <Download size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
        </button>
      )}

      {onDelete && (
        <button onClick={onDelete} className={`${variantStyles.danger} transition`} title="Delete">
          <Trash2 size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
        </button>
      )}

      {custom.map((action, i) => (
        <button
          key={i}
          onClick={action.onClick}
          className={`${variantStyles[action.variant || 'default']} transition`}
          title={action.label}
        >
          {action.icon || action.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Status Badge Component
 * For displaying user/activity/attendance status
 */
export interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusVariants = {
  success: 'bg-green-100 text-green-800 border-green-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  danger: 'bg-red-100 text-red-800 border-red-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  default: 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusSizes = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1.5',
  lg: 'text-base px-4 py-2',
};

export function StatusBadge({
  status,
  variant = 'default',
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-block border rounded-full font-medium ${statusVariants[variant]} ${statusSizes[size]} ${className}`}
    >
      {status}
    </span>
  );
}

/**
 * Auto-select status variant based on status value
 */
export function StatusBadgeAuto({
  status,
  size = 'md',
  className = '',
}: Omit<StatusBadgeProps, 'variant'>) {
  let variant: StatusBadgeProps['variant'] = 'default';

  if (typeof status === 'string') {
    const lower = status.toLowerCase();
    if (lower.includes('approved') || lower.includes('accepted') || lower.includes('completed')) {
      variant = 'success';
    } else if (lower.includes('pending') || lower.includes('waiting')) {
      variant = 'warning';
    } else if (
      lower.includes('rejected') ||
      lower.includes('cancelled') ||
      lower.includes('failed')
    ) {
      variant = 'danger';
    } else if (lower.includes('active') || lower.includes('ongoing')) {
      variant = 'info';
    }
  }

  return <StatusBadge status={status} variant={variant} size={size} className={className} />;
}

/**
 * Loading Button Component
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const buttonVariants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function LoadingButton({
  isLoading = false,
  loadingText = 'Loading...',
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    >
      {isLoading ? loadingText : children}
    </button>
  );
}

/**
 * Button group for grouped actions
 */
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ButtonGroup({ children, className = '' }: ButtonGroupProps) {
  return <div className={`flex gap-2 items-center ${className}`}>{children}</div>;
}

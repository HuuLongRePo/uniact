/**
 * Reusable Filter Components
 * Eliminates 8+ filter implementations across the codebase
 */

import React from 'react';

export interface FilterSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Standard select filter component
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
}: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="font-medium text-sm text-gray-700">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Text search filter component
 */
interface FilterSearchProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function FilterSearch({
  label,
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: FilterSearchProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="font-medium text-sm text-gray-700">{label}</label>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
    </div>
  );
}

/**
 * Date range filter component
 */
interface FilterDateRangeProps {
  label?: string;
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  className?: string;
}

export function FilterDateRange({
  label,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  className = '',
}: FilterDateRangeProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <label className="font-medium text-sm text-gray-700">{label}</label>}
      <div className="flex gap-2">
        <input
          type="date"
          value={startValue}
          onChange={(e) => onStartChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="flex items-center text-gray-400">to</span>
        <input
          type="date"
          value={endValue}
          onChange={(e) => onEndChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

/**
 * Filter bar container
 */
interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
  className?: string;
}

export function FilterBar({ children, onReset, className = '' }: FilterBarProps) {
  return (
    <div className={`bg-gray-50 p-4 rounded-lg border border-gray-200 ${className}`}>
      <div className="flex gap-4 flex-wrap items-end">
        {children}
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

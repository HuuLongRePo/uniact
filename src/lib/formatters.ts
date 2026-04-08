/**
 * Formatters - Utilities for formatting database values to display format
 * Contains shared formatting logic used across API routes and components
 */

/**
 * Format attendance status from database format to display format
 * Maps database values (attended, absent, registered) to UI display values
 *
 * @param status - Attendance status from database: 'attended' | 'absent' | 'registered'
 * @returns Formatted status string: 'present' | 'absent' | 'not_participated'
 *
 * @example
 * formatAttendanceStatus('attended') // 'present'
 * formatAttendanceStatus('registered') // 'not_participated'
 */
export function formatAttendanceStatus(
  status: 'attended' | 'absent' | 'registered' | null
): string {
  if (!status) return 'not_participated';

  switch (status.toLowerCase()) {
    case 'attended':
      return 'present';
    case 'absent':
      return 'absent';
    case 'registered':
      return 'not_participated';
    default:
      return 'not_participated';
  }
}

/**
 * Format attendance status for Vietnamese display
 * Maps database values to Vietnamese labels
 *
 * @param status - Attendance status from database
 * @returns Vietnamese display label
 *
 * @example
 * formatAttendanceStatusVN('attended') // 'Có mặt'
 */
export function formatAttendanceStatusVN(status: 'attended' | 'absent' | 'registered' | null): string {
  if (!status) return 'Chưa tham gia';

  switch (status.toLowerCase()) {
    case 'attended':
      return 'Có mặt';
    case 'absent':
      return 'Vắng mặt';
    case 'registered':
      return 'Chưa tham gia';
    default:
      return 'Chưa tham gia';
  }
}

/**
 * Format boolean to Vietnamese yes/no
 *
 * @param value - Boolean or truthy/falsy value
 * @returns Vietnamese "Có" or "Không"
 */
export function formatBooleanVN(value: any): string {
  return value ? 'Có' : 'Không';
}

/**
 * Format date to Vietnamese locale format
 *
 * @param date - Date string or Date object
 * @param format - Format type: 'date', 'time', 'datetime' (default: 'datetime')
 * @returns Formatted date string in Vietnamese locale
 *
 * @example
 * formatDateVN('2026-03-24') // '24/3/2026'
 * formatDateVN('2026-03-24T10:30:00', 'datetime') // '24/3/2026 10:30'
 */
export function formatDateVN(date: string | Date, format: 'date' | 'time' | 'datetime' = 'datetime'): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  switch (format) {
    case 'date':
      return `${day}/${month}/${year}`;
    case 'time':
      return `${hours}:${minutes}`;
    case 'datetime':
    default:
      return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}

/**
 * Alias of formatDateVN for generic usage across app
 */
export function formatDate(date: string | Date, format: 'date' | 'time' | 'datetime' = 'datetime'): string {
  return formatDateVN(date, format);
}

/**
 * Format number as currency (Vietnamese Đồng)
 *
 * @param value - Number to format
 * @returns Formatted currency string with 3-digit separators
 *
 * @example
 * formatCurrencyVND(1500000) // '1.500.000 ₫'
 */
export function formatCurrencyVND(value: number): string {
  if (!Number.isFinite(value)) return '0 ₫';
  return value.toLocaleString('vi-VN') + ' ₫';
}

/**
 * Alias of formatCurrencyVND for generic usage across app
 */
export function formatCurrency(value: number): string {
  return formatCurrencyVND(value);
}

/**
 * Format percentage with 1 decimal place
 *
 * @param value - Number (0-100 or 0.0-1.0)
 * @param isDecimal - If true, treats value as 0-1 range
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(85.5) // '85.5%'
 * formatPercentage(0.855, true) // '85.5%'
 */
export function formatPercentage(value: number, isDecimal = false): string {
  if (!Number.isFinite(value)) return '0%';

  const percent = isDecimal ? value * 100 : value;
  return Number(percent.toFixed(1)) + '%';
}

/**
 * Truncate text to specified length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before ellipsis
 * @param suffix - Suffix to append (default: '...')
 * @returns Truncated text
 *
 * @example
 * truncateText('Hello World', 8) // 'Hello...'
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + suffix;
}

export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const ISO_WITH_TIMEZONE_RE = /(z|[+-]\d{2}:\d{2})$/i;
const PLAIN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PLAIN_DATETIME_RE = /^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/i;

function parseDateLike(date: string | Date | null | undefined): Date | null {
  if (!date) return null;

  if (date instanceof Date) {
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const normalized = String(date).trim();
  if (!normalized) return null;

  if (PLAIN_DATE_RE.test(normalized)) {
    const parsed = new Date(`${normalized}T00:00:00+07:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (PLAIN_DATETIME_RE.test(normalized) && !ISO_WITH_TIMEZONE_RE.test(normalized)) {
    const parsed = new Date(`${normalized}+07:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatParts(date: string | Date, options: Intl.DateTimeFormatOptions) {
  const parsed = parseDateLike(date);
  if (!parsed) return null;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    ...options,
  });

  return formatter.formatToParts(parsed).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
}

export function toVietnamDatetimeLocalValue(date: string | Date | null | undefined): string {
  const parts = formatParts(date || null, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  if (!parts) return '';

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatVietnamDateTime(
  date: string | Date | null | undefined,
  format: 'date' | 'time' | 'datetime' = 'datetime'
): string {
  const parts = formatParts(date || null, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  if (!parts) return '-';

  const datePart = `${parts.day}/${parts.month}/${parts.year}`;
  const timePart = `${parts.hour}:${parts.minute}`;

  if (format === 'date') {
    return datePart;
  }

  if (format === 'time') {
    return timePart;
  }

  return `${datePart} ${timePart}`;
}

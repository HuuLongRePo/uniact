import { describe, expect, it } from 'vitest';
import { formatDate } from '@/lib/formatters';
import {
  formatVietnamWithOptions,
  parseVietnamDate,
  toVietnamDatetimeLocalValue,
} from '@/lib/timezone';

describe('Vietnam timezone formatting', () => {
  it('formats UTC ISO timestamps in Vietnam local time', () => {
    expect(formatDate('2026-04-25T01:30:00.000Z')).toBe('25/04/2026 08:30');
  });

  it('keeps naive datetime values aligned to Vietnam time', () => {
    expect(formatDate('2026-04-25T08:30')).toBe('25/04/2026 08:30');
  });

  it('converts UTC timestamps to datetime-local values without timezone drift', () => {
    expect(toVietnamDatetimeLocalValue('2026-04-25T01:30:00.000Z')).toBe('2026-04-25T08:30');
  });

  it('parses naive datetimes as Vietnam local time instead of browser local time', () => {
    expect(parseVietnamDate('2026-04-25T08:30')?.toISOString()).toBe('2026-04-25T01:30:00.000Z');
  });

  it('formats long localized strings in Vietnam timezone with shared helper', () => {
    expect(
      formatVietnamWithOptions('2026-04-25T01:30:00.000Z', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    ).toContain('08:30');
  });
});

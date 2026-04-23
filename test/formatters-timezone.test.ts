import { describe, expect, it } from 'vitest';
import { formatDate } from '@/lib/formatters';
import { toVietnamDatetimeLocalValue } from '@/lib/timezone';

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
});


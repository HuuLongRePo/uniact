import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockDbGet: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  dbGet: mocks.mockDbGet,
}));

import { teacherCanAccessActivity } from '../src/lib/activity-access';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('teacherCanAccessActivity', () => {
  it('returns false without querying when ids are invalid', async () => {
    await expect(teacherCanAccessActivity(Number.NaN, 10)).resolves.toBe(false);
    await expect(teacherCanAccessActivity(5, Number.NaN)).resolves.toBe(false);
    expect(mocks.mockDbGet).not.toHaveBeenCalled();
  });

  it('queries owner or class-linked access through activity_classes and class_teachers', async () => {
    mocks.mockDbGet.mockResolvedValue({ id: 77 });

    await expect(teacherCanAccessActivity(12, 77)).resolves.toBe(true);

    const [query, params] = mocks.mockDbGet.mock.calls[0] as [string, number[]];
    expect(query).toContain('FROM activity_classes ac');
    expect(query).toContain('LEFT JOIN class_teachers ct');
    expect(query).toContain('a.teacher_id = ?');
    expect(params).toEqual([77, 12, 12, 12]);
  });

  it('returns false when the teacher has no related activity scope', async () => {
    mocks.mockDbGet.mockResolvedValue(undefined);

    await expect(teacherCanAccessActivity(21, 88)).resolves.toBe(false);
  });
});

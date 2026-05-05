import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();
const dbGetMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/lib/database', () => ({
  dbGet: dbGetMock,
}));

describe('TeacherAttendanceLegacyEvaluatePage', () => {
  beforeEach(() => {
    redirectMock.mockReset();
    dbGetMock.mockReset();
  });

  it('redirects a participation legacy evaluate route to the canonical participants page', async () => {
    dbGetMock.mockResolvedValue({ id: 88, activity_id: 17 });

    const Page = (await import('../src/app/teacher/attendance/[id]/evaluate/page')).default;
    await Page({ params: Promise.resolve({ id: '88' }) });

    expect(dbGetMock).toHaveBeenCalledWith(
      'SELECT id, activity_id FROM participations WHERE id = ?',
      [88]
    );
    expect(redirectMock).toHaveBeenCalledWith('/teacher/activities/17/participants');
  });

  it('falls back to the teacher activities list when the participation is missing', async () => {
    dbGetMock.mockResolvedValue(undefined);

    const Page = (await import('../src/app/teacher/attendance/[id]/evaluate/page')).default;
    await Page({ params: Promise.resolve({ id: '999' }) });

    expect(redirectMock).toHaveBeenCalledWith('/teacher/activities');
  });
});

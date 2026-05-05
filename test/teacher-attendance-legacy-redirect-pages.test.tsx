import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('Teacher attendance legacy redirects', () => {
  it('redirects /teacher/attendance/[id] to the canonical bulk attendance route', async () => {
    redirectMock.mockReset();
    const Page = (await import('../src/app/teacher/attendance/[id]/page')).default;
    await Page({ params: Promise.resolve({ id: '42' }) });
    expect(redirectMock).toHaveBeenCalledWith('/teacher/activities/42/attendance/bulk');
  });

  it('redirects /teacher/attendance/[id]/manual to the canonical bulk attendance route', async () => {
    redirectMock.mockReset();
    const Page = (await import('../src/app/teacher/attendance/[id]/manual/page')).default;
    await Page({ params: Promise.resolve({ id: '42' }) });
    expect(redirectMock).toHaveBeenCalledWith('/teacher/activities/42/attendance/bulk');
  });
});

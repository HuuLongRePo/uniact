import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  usePathname: () => '/student/activities/77/check-in',
}));

describe('StudentActivityCheckInPage', () => {
  it('redirects activity-scoped check-in route to canonical student qr page', async () => {
    const Page = (await import('../src/app/student/activities/[id]/check-in/page')).default;
    await Page({
      params: Promise.resolve({
        id: '77',
      }),
    });

    expect(redirectMock).toHaveBeenCalledWith('/student/check-in?activityId=77');
  });
});

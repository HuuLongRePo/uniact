import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('TeacherNotifyStudentsLegacyPage', () => {
  it('redirects to the canonical teacher broadcast notifications page', async () => {
    redirectMock.mockReset();

    const Page = (await import('../src/app/teacher/notify-students/page')).default;
    Page();

    expect(redirectMock).toHaveBeenCalledWith('/teacher/notifications/broadcast');
  });
});

import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('AdminLegacyStudentsPage', () => {
  it('redirects the old students route to the canonical admin users student tab', async () => {
    redirectMock.mockReset();

    const Page = (await import('../src/app/admin/students/page')).default;
    Page();

    expect(redirectMock).toHaveBeenCalledWith('/admin/users?tab=student');
  });
});

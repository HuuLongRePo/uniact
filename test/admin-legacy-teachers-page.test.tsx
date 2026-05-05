import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('AdminLegacyTeachersPage', () => {
  it('redirects the old teachers route to the canonical admin users teacher tab', async () => {
    redirectMock.mockReset();

    const Page = (await import('../src/app/admin/teachers/page')).default;
    Page();

    expect(redirectMock).toHaveBeenCalledWith('/admin/users?tab=teacher');
  });
});

import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('AdminLegacyOrgLevelsConfigPage', () => {
  it('redirects the old organization-level config route to the canonical admin organization-levels page', async () => {
    redirectMock.mockReset();

    const Page = (await import('../src/app/admin/config/org-levels/page')).default;
    Page();

    expect(redirectMock).toHaveBeenCalledWith('/admin/organization-levels');
  });
});

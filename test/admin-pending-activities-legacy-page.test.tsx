import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('AdminPendingActivitiesLegacyPage', () => {
  it('redirects the old pending activities page to the canonical approvals flow', async () => {
    redirectMock.mockReset();

    const Page = (await import('../src/app/admin/activities/pending/page')).default;
    Page();

    expect(redirectMock).toHaveBeenCalledWith('/admin/approvals');
  });
});

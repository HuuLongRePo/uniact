import { describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('Admin legacy audit page', () => {
  it('redirects to canonical audit logs page', async () => {
    const Page = (await import('../src/app/admin/audit/page')).default;
    Page();

    expect(redirectMock).toHaveBeenCalledWith('/admin/audit-logs');
  });
});

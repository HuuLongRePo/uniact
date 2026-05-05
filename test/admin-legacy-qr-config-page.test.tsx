import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('AdminLegacyQrConfigPage', () => {
  it('redirects the old QR config route to the canonical admin QR settings page', async () => {
    redirectMock.mockReset();

    const Page = (await import('../src/app/admin/config/qr/page')).default;
    Page();

    expect(redirectMock).toHaveBeenCalledWith('/admin/system-config/qr-settings');
  });
});

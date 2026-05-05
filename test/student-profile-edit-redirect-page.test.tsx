import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  usePathname: () => '/student/profile/edit',
}));

describe('StudentProfileEditRedirectPage', () => {
  it('redirects legacy student profile edit route to canonical profile page', async () => {
    const Page = (await import('../src/app/student/profile/edit/page')).default;
    Page();
    expect(redirectMock).toHaveBeenCalledWith('/student/profile');
  });
});

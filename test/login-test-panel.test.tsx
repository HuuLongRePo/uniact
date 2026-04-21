import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

describe('LoginTestPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (rawUrl.includes('/api/auth/demo-accounts?')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                email: 'teacher.nguyen@school.edu',
                role: 'teacher',
                name: 'Nguyen Van Digital',
              },
            ],
            search: {
              hasMore: false,
            },
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          data: [
            {
              email: 'teacher.demo@school.edu',
              password: 'teacher123',
              role: 'teacher',
              name: 'Teacher Demo',
            },
          ],
        }),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders launcher and keeps token-based colors on copy/search controls', async () => {
    const Panel = (await import('../src/components/LoginTestPanel')).default;
    render(<Panel />);

    const launcher = screen.getByRole('button', { name: /open quick login account list/i });
    expect(launcher.className).toContain('bg-[var(--quick-login-fab-bg)]');
    expect(launcher.className).toContain('cursor-pointer');

    fireEvent.click(launcher);

    expect(await screen.findByText('Quick Login Account List')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Teacher Demo')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('searchbox', { name: /search user name across system/i });
    expect(searchInput.className).toContain('bg-[var(--quick-login-search-bg)]');
    expect(searchInput.className).toContain('border-[var(--quick-login-search-border)]');

    const emailButton = screen.getByRole('button', { name: /copy email teacher.demo@school.edu/i });
    const passButton = screen.getByRole('button', {
      name: /copy password teacher.demo@school.edu/i,
    });

    expect(emailButton.className).toContain('bg-[var(--quick-login-copy-bg)]');
    expect(passButton.className).toContain('border-[var(--quick-login-copy-border)]');
    expect(emailButton.className).toContain('cursor-pointer');
  });

  it('triggers quick login callback when selecting account card', async () => {
    const onSelectAccount = vi.fn();
    const Panel = (await import('../src/components/LoginTestPanel')).default;
    render(<Panel onSelectAccount={onSelectAccount} />);

    fireEvent.click(screen.getByRole('button', { name: /open quick login account list/i }));

    const accountCard = await screen.findByRole('button', { name: /quick login teacher demo/i });
    fireEvent.click(accountCard);

    expect(onSelectAccount).toHaveBeenCalledWith('teacher.demo@school.edu', 'teacher123');
  });

  it('searches system users and supports quick login from search results', async () => {
    const onSelectAccount = vi.fn();
    const Panel = (await import('../src/components/LoginTestPanel')).default;
    render(<Panel onSelectAccount={onSelectAccount} />);

    fireEvent.click(screen.getByRole('button', { name: /open quick login account list/i }));
    await screen.findByText('Teacher Demo');

    const searchInput = screen.getByRole('searchbox', { name: /search user name across system/i });
    fireEvent.change(searchInput, { target: { value: 'Nguyen' } });

    await waitFor(
      () => {
        expect(screen.getByText('Nguyen Van Digital')).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    const searchCard = screen.getByRole('button', { name: /quick login nguyen van digital/i });
    fireEvent.click(searchCard);

    expect(onSelectAccount).toHaveBeenCalledWith('teacher.nguyen@school.edu', 'teacher123');
  });
});

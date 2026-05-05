import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/database';
import { expectNoMojibake } from './helpers/mojibake';

const { pushMock, routerMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  routerMock: { push: vi.fn() },
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: ({ message }: { message?: string }) => <div>{message || 'Loading'}</div>,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

function createAuthState(role: string = 'admin') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('Admin scoring formula editor page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders formula editor with clean text', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        formula: {
          formula: '(base * type * level * achievement) + bonus - penalty',
          description: '{}',
        },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/scoring-config/formula-editor/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-scoring-formula-heading')).toHaveTextContent(
      'Trinh soan cong thuc tinh diem'
    );
    expect(screen.getByText('Preview ket qua')).toBeInTheDocument();
    expectNoMojibake(container.textContent || '');
  });

  it('saves the scoring formula', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/scoring-config/formula' && options?.method === 'POST') {
        return { ok: true, json: async () => ({ success: true }) };
      }

      if (url === '/api/admin/scoring-config/formula') {
        return {
          ok: true,
          json: async () => ({
            formula: {
              formula: '(base * type * level * achievement) + bonus - penalty',
              description: '{}',
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/scoring-config/formula-editor/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-scoring-formula-heading')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Luu cong thuc' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da luu formula scoring');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/scoring-config/formula',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/scoring-config/formula-editor/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Admin awards page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('renders canonical award suggestions with clean text', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/admin/awards?status=pending') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              suggestions: [
                {
                  id: 9,
                  student_id: 12,
                  student_name: 'Le Minh Thu',
                  student_email: 'thu@uniact.local',
                  class_name: 'CNTT K66B',
                  award_type_id: 3,
                  award_type_name: 'Sinh vien tich cuc',
                  award_min_points: 75,
                  score_snapshot: 92,
                  suggested_at: '2026-05-01T08:00:00.000Z',
                  status: 'pending',
                  note: null,
                },
              ],
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/awards/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-awards-heading')).toHaveTextContent(
      'Duyet de xuat khen thuong'
    );
    expect(screen.getAllByText('Le Minh Thu').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sinh vien tich cuc').length).toBeGreaterThan(0);
    expect(screen.getAllByText('92').length).toBeGreaterThan(0);
    expectNoMojibake(container.textContent || '');
  });

  it('approves a pending award suggestion from the review modal', async () => {
    let approved = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);

      if (url === '/api/admin/awards' && options?.method === 'PUT') {
        approved = true;
        return {
          ok: true,
          json: async () => ({ success: true, message: 'Da phe duyet' }),
        };
      }

      if (url === '/api/admin/awards?status=pending') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            suggestions: approved
              ? []
              : [
                  {
                    id: 9,
                    student_id: 12,
                    student_name: 'Le Minh Thu',
                    student_email: 'thu@uniact.local',
                    class_name: 'CNTT K66B',
                    award_type_id: 3,
                    award_type_name: 'Sinh vien tich cuc',
                    award_min_points: 75,
                    score_snapshot: 92,
                    suggested_at: '2026-05-01T08:00:00.000Z',
                    status: 'pending',
                    note: null,
                  },
                ],
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/awards/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-awards-heading')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Xem/i })[0]);
    expect(await screen.findByRole('dialog', { name: 'Le Minh Thu' })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Nhap ly do neu can...'), {
      target: { value: 'Dat nguong hoc ky nay' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Phe duyet' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da phe duyet de xuat khen thuong');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/awards',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          suggestion_id: 9,
          action: 'approve',
          note: 'Dat nguong hoc ky nay',
        }),
      })
    );
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/awards/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});

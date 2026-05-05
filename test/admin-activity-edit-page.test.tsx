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
  useParams: () => ({ id: '42' }),
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

describe('Admin activity edit page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('renders canonical edit payload and saves changed fields', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/admin/activities/42' && !init?.method) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              activity: {
                id: 42,
                title: 'Ngay hoi huong nghiep',
                description: 'Mo ta ban dau',
                date_time: '2026-05-02T01:00:00.000Z',
                end_time: '2026-05-02T04:00:00.000Z',
                location: 'Hoi truong A',
                activity_type_id: 3,
                organization_level_id: 2,
                max_participants: 200,
                status: 'pending',
              },
            },
          }),
        };
      }

      if (url === '/api/admin/activity-types') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              types: [
                { id: 3, name: 'Huong nghiep' },
                { id: 4, name: 'Tinh nguyen' },
              ],
            },
          }),
        };
      }

      if (url === '/api/admin/organization-levels') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              { id: 2, name: 'Cap truong' },
              { id: 5, name: 'Cap khoa' },
            ],
          }),
        };
      }

      if (url === '/api/admin/activities/42' && init?.method === 'PUT') {
        expect(JSON.parse(String(init.body))).toEqual({
          title: 'Ngay hoi huong nghiep 2026',
          max_participants: 250,
        });

        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              activity: {
                id: 42,
                title: 'Ngay hoi huong nghiep 2026',
                description: 'Mo ta ban dau',
                date_time: '2026-05-02T01:00:00.000Z',
                end_time: '2026-05-02T04:00:00.000Z',
                location: 'Hoi truong A',
                activity_type_id: 3,
                organization_level_id: 2,
                max_participants: 250,
                status: 'pending',
              },
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/activities/[id]/edit/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-activity-edit-heading')).toHaveTextContent(
      'Chinh sua hoat dong'
    );

    fireEvent.change(screen.getByDisplayValue('Ngay hoi huong nghiep'), {
      target: { value: 'Ngay hoi huong nghiep 2026' },
    });

    fireEvent.change(screen.getByDisplayValue('200'), {
      target: { value: '250' },
    });

    expect(screen.getAllByText(/Tieu de/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Luu thay doi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xac nhan luu' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da cap nhat hoat dong');
    });

    expect(pushMock).toHaveBeenCalledWith('/admin/activities/42');
    expectNoMojibake(container.textContent || '');
  });
});

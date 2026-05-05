import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
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
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({
    isOpen,
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
  }: {
    isOpen: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
  }) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <button onClick={() => void onConfirm()}>{confirmText || 'Confirm'}</button>
        <button onClick={onCancel}>{cancelText || 'Cancel'}</button>
      </div>
    ) : null,
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

function buildTemplate(id: number, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    name: `Template ${id}`,
    description: 'Mo ta mau hoat dong',
    activity_type_id: 2,
    activity_type_name: 'Tinh nguyen',
    organization_level_id: 3,
    organization_level_name: 'Cap truong',
    default_duration_hours: 4,
    default_max_participants: 120,
    qr_enabled: true,
    created_at: '2026-05-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('Admin activity templates page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('loads templates with clean text and summary cards', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/admin/activity-templates') {
        return {
          ok: true,
          json: async () => ({
            templates: [buildTemplate(8)],
          }),
        };
      }

      if (url === '/api/activity-types') {
        return {
          ok: true,
          json: async () => ({
            types: [{ id: 2, name: 'Tinh nguyen' }],
          }),
        };
      }

      if (url === '/api/organization-levels') {
        return {
          ok: true,
          json: async () => ({
            levels: [{ id: 3, name: 'Cap truong' }],
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/activity-templates/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-activity-templates-heading')).toHaveTextContent(
      'Mau hoat dong'
    );
    expect(screen.getByText('Template 8')).toBeInTheDocument();
    expect(screen.getByText('Tong mau')).toBeInTheDocument();
    expect(screen.getAllByText('QR bat san').length).toBeGreaterThan(0);
    expectNoMojibake(container.textContent || '');
  });

  it('creates a new template and refreshes the list', async () => {
    let created = false;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);

      if (url === '/api/admin/activity-templates' && options?.method === 'POST') {
        created = true;
        return {
          ok: true,
          json: async () => ({ success: true, template_id: 15 }),
        };
      }

      if (url === '/api/admin/activity-templates') {
        return {
          ok: true,
          json: async () => ({
            templates: created
              ? [
                  buildTemplate(15, {
                    name: 'Mau chien dich he',
                    default_duration_hours: 6,
                    default_max_participants: 90,
                  }),
                ]
              : [],
          }),
        };
      }

      if (url === '/api/activity-types') {
        return {
          ok: true,
          json: async () => ({
            types: [{ id: 2, name: 'Tinh nguyen' }],
          }),
        };
      }

      if (url === '/api/organization-levels') {
        return {
          ok: true,
          json: async () => ({
            levels: [{ id: 3, name: 'Cap truong' }],
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/activity-templates/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-activity-templates-heading')).toHaveTextContent(
      'Mau hoat dong'
    );

    fireEvent.click(screen.getByTestId('toggle-activity-template-form'));
    fireEvent.change(screen.getByTestId('activity-template-name-input'), {
      target: { value: 'Mau chien dich he' },
    });
    fireEvent.change(screen.getByTestId('activity-template-type-select'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByTestId('activity-template-org-level-select'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByTestId('activity-template-max-participants-input'), {
      target: { value: '90' },
    });
    fireEvent.change(screen.getByTestId('activity-template-duration-input'), {
      target: { value: '6' },
    });

    fireEvent.click(screen.getByTestId('submit-activity-template-form'));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da tao mau hoat dong thanh cong');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/activity-templates',
      expect.objectContaining({ method: 'POST' })
    );
    expect(await screen.findByText('Mau chien dich he')).toBeInTheDocument();
  });

  it('deletes a template after confirmation', async () => {
    let deleted = false;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);

      if (url === '/api/admin/activity-templates/8' && options?.method === 'DELETE') {
        deleted = true;
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      }

      if (url === '/api/admin/activity-templates') {
        return {
          ok: true,
          json: async () => ({
            templates: deleted ? [] : [buildTemplate(8)],
          }),
        };
      }

      if (url === '/api/activity-types') {
        return {
          ok: true,
          json: async () => ({ types: [] }),
        };
      }

      if (url === '/api/organization-levels') {
        return {
          ok: true,
          json: async () => ({ levels: [] }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/activity-templates/page')).default;
    render(<Page />);

    expect(await screen.findByText('Template 8')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('delete-template-8'));
    expect(await screen.findByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Xoa mau' })[1]);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da xoa mau hoat dong');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/activity-templates/8',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/activity-templates/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});

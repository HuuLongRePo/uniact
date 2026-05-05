import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types/database';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CustomReportsPage from '@/app/admin/reports/custom/page';
import { useAuth } from '@/contexts/AuthContext';

const { pushMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

type MockResponse = Pick<Response, 'ok' | 'status' | 'json' | 'text'>;

function createAuthState(role: string = 'admin') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

function createTextResponse(
  text: string,
  init: {
    ok?: boolean;
    status?: number;
  } = {}
): MockResponse {
  return {
    ok: init.ok ?? true,
    status: init.status ?? (init.ok === false ? 500 : 200),
    text: vi.fn().mockResolvedValue(text),
    json: vi.fn().mockResolvedValue({}),
  };
}

function createErrorResponse(message: string): MockResponse {
  return {
    ok: false,
    status: 500,
    text: vi.fn().mockResolvedValue(''),
    json: vi.fn().mockResolvedValue({ error: message }),
  };
}

function installFetchMock(response: MockResponse | Promise<MockResponse>) {
  const fetchMock = vi.fn(() => response);

  vi.stubGlobal('fetch', fetchMock);
  window.fetch = fetchMock as typeof fetch;

  return fetchMock;
}

describe('CustomReportsPage', () => {
  beforeAll(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url') as any;
    global.URL.revokeObjectURL = vi.fn() as any;
  });

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the select step and moves into configure mode with default columns', async () => {
    const { container } = render(<CustomReportsPage />);

    const typeButtons = screen.getAllByRole('button');
    expect(typeButtons).toHaveLength(4);

    fireEvent.click(typeButtons[0]);

    await waitFor(() => {
      expect(container.querySelector('input[type="text"]')).not.toBeNull();
    });

    expect(container.querySelectorAll('button.text-red-600')).toHaveLength(3);
    expect(container.querySelector('button.bg-purple-600')).not.toBeNull();
    expect(container.querySelector('.max-h-48')).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('shows a preview table when preview request succeeds', async () => {
    installFetchMock(Promise.resolve(createTextResponse('id,title\n1,Alpha report\n2,Beta report')));

    const { container } = render(<CustomReportsPage />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => {
      expect(container.querySelector('button.bg-purple-600')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('button.bg-purple-600') as HTMLButtonElement);

    expect(await screen.findByText('Alpha report')).toBeInTheDocument();
    expect(screen.getByText('Beta report')).toBeInTheDocument();
    expect(container.querySelector('.max-h-48')).not.toBeNull();
  });

  it('shows a preview error banner when preview request fails', async () => {
    installFetchMock(Promise.resolve(createErrorResponse('Preview fetch failed')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { container } = render(<CustomReportsPage />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => {
      expect(container.querySelector('button.bg-purple-600')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('button.bg-purple-600') as HTMLButtonElement);

    expect(await screen.findByText('Preview fetch failed')).toBeInTheDocument();
    expect(container.querySelector('.max-h-48')).toBeNull();
  });

  it('shows export error from canonical api payload', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createTextResponse('id,title\n1,Alpha report'))
      .mockResolvedValueOnce(createErrorResponse('Khong co quyen truy cap'));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { container } = render(<CustomReportsPage />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => {
      expect(container.querySelector('button.bg-purple-600')).not.toBeNull();
    });

    fireEvent.click(container.querySelector('button.bg-purple-600') as HTMLButtonElement);
    await screen.findByText('Alpha report');

    const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Bao-cao-test' } });

    const exportButton = screen.getByRole('button', { name: /xuat bao cao/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Khong co quyen truy cap');
    });
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
let searchParamsValue = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/student/check-in',
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

vi.mock('@/components/StudentQRScanner', () => ({
  StudentQRScanner: () => <div data-testid="student-qr-scanner" />,
}));

describe('StudentCheckInPage', () => {
  beforeEach(() => {
    searchParamsValue = '';
    pushMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('redirects to login when deep-link is opened by unauthenticated user', async () => {
    searchParamsValue = 's=321&t=token-321';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/profile/me') {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Chưa đăng nhập' }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/check-in/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login?next=%2Fstudent%2Fcheck-in%3Fs%3D321%26t%3Dtoken-321');
    });
  });

  it('does not auto-attend even when deep-link is opened by authenticated user', async () => {
    searchParamsValue = 's=123&t=token-123';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/profile/me') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { id: 10 } }),
        } as Response;
      }
      if (String(input) === '/api/attendance/validate') {
        throw new Error('Attendance validate must not be called automatically');
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/check-in/page')).default;
    render(<Page />);

    await waitFor(() =>
      expect(screen.getByText(/bạn đã mở liên kết qr từ ứng dụng bên ngoài/i)).toBeInTheDocument()
    );
    expect(pushMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith('/api/profile/me', { method: 'GET' });
    expect(
      fetchMock.mock.calls.some(([url]) => String(url) === '/api/attendance/validate')
    ).toBe(false);
  });

  it('shows scanner and policy summary even without deep-link payload', async () => {
    searchParamsValue = '';

    const fetchMock = vi.fn(async () => {
      throw new Error('No network call expected without deep-link payload');
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/check-in/page')).default;
    render(<Page />);

    expect(screen.getByTestId('student-qr-scanner')).toBeInTheDocument();
    expect(screen.getByText(/chỉ ghi nhận điểm danh sau khi quét qr bằng camera web/i)).toBeInTheDocument();
    expect(screen.queryByText(/chẩn đoán kỹ thuật/i)).not.toBeInTheDocument();
  });

  it('does not redirect-loop to login when auth check endpoint returns 500', async () => {
    searchParamsValue = 's=123&t=token-123';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/profile/me') {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'internal error' }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/check-in/page')).default;
    render(<Page />);

    await waitFor(() =>
      expect(
        screen.getByText(/tạm thời chưa xác minh được phiên đăng nhập/i)
      ).toBeInTheDocument()
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('shows diagnostics panel when qr debug mode is requested explicitly', async () => {
    searchParamsValue = 'debug=qr';

    const fetchMock = vi.fn(async () => {
      throw new Error('No network call expected without deep-link payload');
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/check-in/page')).default;
    render(<Page />);

    expect(screen.getByTestId('student-qr-scanner')).toBeInTheDocument();
    expect(screen.getByText(/chẩn đoán kỹ thuật/i)).toBeInTheDocument();
  });
});

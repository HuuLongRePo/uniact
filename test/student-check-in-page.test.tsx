import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastSuccessMock = vi.fn();
let searchParamsValue = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/student/check-in',
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
  },
}));

vi.mock('@/components/StudentQRScanner', () => ({
  StudentQRScanner: () => <div data-testid="student-qr-scanner" />,
}));

describe('StudentCheckInPage', () => {
  beforeEach(() => {
    searchParamsValue = '';
    pushMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('auto-checks in from deep-link payload when API validates successfully', async () => {
    searchParamsValue = 's=123&t=token-123';

    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ message: 'Điểm danh thành công' }),
      } as Response;
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/check-in/page')).default;
    render(<Page />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url) === '/api/attendance/validate' &&
          typeof init === 'object' &&
          init !== null &&
          (init as RequestInit).method === 'POST'
      )
    ).toBe(true);
    expect(pushMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it('redirects to login with canonical next url when validate API returns 401', async () => {
    searchParamsValue = 's=321&t=token-321';

    const fetchMock = vi.fn(async () => {
      return {
        ok: false,
        status: 401,
        json: async () => ({ message: 'Chưa đăng nhập' }),
      } as Response;
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/check-in/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login?next=%2Fstudent%2Fcheck-in%3Fs%3D321%26t%3Dtoken-321');
    });
  });

  it('shows forbidden account error instead of redirect loop when validate API returns 403', async () => {
    searchParamsValue = 's=456&t=token-456';

    const fetchMock = vi.fn(async () => {
      return {
        ok: false,
        status: 403,
        json: async () => ({ message: 'Không có quyền truy cập' }),
      } as Response;
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/check-in/page')).default;
    render(<Page />);

    await waitFor(() =>
      expect(
        screen.getByText('Tài khoản hiện tại không đủ quyền điểm danh phiên QR này.')
      ).toBeInTheDocument()
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/database';
import { expectNoMojibake } from './helpers/mojibake';

const { clickMock, pushMock, routerMock, revokeObjectURLMock, toastErrorMock, toastSuccessMock } =
  vi.hoisted(() => ({
    clickMock: vi.fn(),
    pushMock: vi.fn(),
    routerMock: { push: vi.fn() },
    revokeObjectURLMock: vi.fn(),
    toastErrorMock: vi.fn(),
    toastSuccessMock: vi.fn(),
  }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={typeof href === 'string' ? href : String(href)} {...props}>
      {children}
    </a>
  ),
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

describe('Admin bonus reports page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    clickMock.mockReset();
    revokeObjectURLMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();

    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:bonus'),
        revokeObjectURL: revokeObjectURLMock,
      })
    );
  });

  it('renders bonus report summary with clean text', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('type=statistics')) {
        return {
          ok: true,
          json: async () => ({
            total: { proposals: 6, points: 40 },
            byStatus: { approved: 4, pending: 1, rejected: 1 },
            averages: { pointsPerApprovedProposal: 10, approvalRate: 66.6 },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          semester: 'Hoc ky 1',
          academicYear: '2026',
          totalPoints: 40,
          totalStudents: 12,
          averagePointsPerStudent: 3.33,
          classReports: [
            {
              className: '12A1',
              studentCount: 6,
              totalApprovedPoints: 20,
              averagePointsPerStudent: 3.3,
              proposals: { total: 3, pending: 1, approved: 2, rejected: 0 },
            },
          ],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/bonus-reports/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-bonus-reports-heading')).toHaveTextContent(
      'Bao cao cong diem'
    );
    expect(screen.getAllByText('12A1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tong de xuat').length).toBeGreaterThan(0);
    expectNoMojibake(container.textContent || '');
  });

  it('exports bonus report csv', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('format=csv')) {
        return {
          ok: true,
          blob: async () => new Blob(['csv']),
          headers: { get: () => null },
        };
      }
      if (url.includes('type=statistics')) {
        return {
          ok: true,
          json: async () => ({
            total: { proposals: 6, points: 40 },
            byStatus: { approved: 4, pending: 1, rejected: 1 },
            averages: { pointsPerApprovedProposal: 10, approvalRate: 66.6 },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          semester: 'Hoc ky 1',
          academicYear: '2026',
          totalPoints: 40,
          totalStudents: 12,
          averagePointsPerStudent: 3.33,
          classReports: [],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/bonus-reports/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-bonus-reports-heading')).toBeInTheDocument();

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        return {
          click: clickMock,
          href: '',
          download: '',
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    fireEvent.click(screen.getByRole('button', { name: 'CSV' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da xuat bao cao CSV');
    });
    expect(clickMock).toHaveBeenCalled();
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/bonus-reports/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});

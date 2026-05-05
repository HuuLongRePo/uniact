import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: '17' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('TeacherQrSessionsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('renders canonical QR sessions payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/activities/17') {
        return {
          ok: true,
          json: async () => ({
            data: {
              activity: {
                id: 17,
                title: 'Hoat dong ky nang song',
                date_time: '2026-04-22T08:00:00.000Z',
                location: 'Hoi truong',
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/activities/17/qr-sessions') {
        return {
          ok: true,
          json: async () => ({
            data: {
              sessions: [
                {
                  id: 700,
                  session_code: 'ABC123',
                  date_time: '2026-04-22T08:05:00.000Z',
                  end_time: null,
                  status: 'active',
                  attendance_count: 12,
                  duration_minutes: 15,
                },
                {
                  id: 699,
                  session_code: 'OLD999',
                  date_time: '2026-04-21T08:05:00.000Z',
                  end_time: '2026-04-21T08:20:00.000Z',
                  status: 'ended',
                  attendance_count: 8,
                  duration_minutes: 15,
                },
              ],
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/activities/[id]/qr-sessions/page')).default;
    render(<Page />);

    expect(await screen.findByText('Lich su phien QR')).toBeInTheDocument();
    expect(screen.getByText('Ma phien: ABC123')).toBeInTheDocument();
    expect(screen.getByText('Ma phien: OLD999')).toBeInTheDocument();
    expect(screen.getAllByText('Dang hoat dong').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Tao phien moi' })).toHaveAttribute(
      'href',
      '/teacher/qr?activity_id=17'
    );
  });
});

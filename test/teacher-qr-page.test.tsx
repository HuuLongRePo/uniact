import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
let searchParamsValue = '';

vi.mock('next/dynamic', () => ({
  default: () => () => <div>QR Code</div>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('TeacherQRPage', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    searchParamsValue = '';
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('reads canonical payload and hydrates active qr session for selected activity', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities?scope=operational&status=ongoing') {
        return {
          ok: true,
          json: async () => ({ data: { activities: [{ id: 1, title: 'QR Activity' }] } }),
        } as Response;
      }

      if (url === '/api/qr-sessions/active?activity_id=1') {
        return {
          ok: true,
          json: async () => ({
            data: {
              session: {
                session_id: 11,
                session_token: 'reuse-token-11',
                options: { single_use: false, max_scans: null },
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/activities/1/participants') {
        return {
          ok: true,
          json: async () => ({
            data: {
              participations: [
                {
                  id: 101,
                  student_id: 3001,
                  student_name: 'Nguyễn Văn A',
                  student_code: 'HV001',
                  class_name: 'D1',
                  attendance_status: 'registered',
                },
                {
                  id: 102,
                  student_id: 3002,
                  student_name: 'Nguyễn Văn B',
                  student_code: 'HV002',
                  class_name: 'D1',
                  attendance_status: 'attended',
                },
              ],
            },
          }),
        } as Response;
      }

      if (url === '/api/qr-sessions') {
        return {
          ok: true,
          json: async () => ({
            data: {
              sessions: [
                {
                  id: 11,
                  activity_id: 1,
                  session_token: 'token',
                  created_at: '2026-01-01',
                  expires_at: '2026-01-01',
                  metadata: '{}',
                  activity_title: 'QR Activity',
                  activity_date: '2026-01-01',
                  attendance_count: 3,
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

    const Page = (await import('../src/app/teacher/qr/page')).default;
    render(<Page />);

    expect(await screen.findByText('QR Activity')).toBeInTheDocument();
    expect(await screen.findByText('reuse-token-11')).toBeInTheDocument();
    expect(await screen.findByTestId('pending-attendance-count')).toHaveTextContent('1');
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('D1')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/qr-sessions/active?activity_id=1');
  });

  it('surfaces load errors for activity options', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities?scope=operational&status=ongoing') {
        return {
          ok: false,
          json: async () => ({}),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/qr/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
      const firstMessage = String(toastErrorMock.mock.calls[0]?.[0] || '');
      expect(firstMessage).toContain('danh');
    });
  });

  it('auto-opens projector mode when query requests fullscreen', async () => {
    searchParamsValue = 'activity_id=1&projector=1';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities?scope=operational&status=ongoing') {
        return {
          ok: true,
          json: async () => ({ data: { activities: [{ id: 1, title: 'QR Activity' }] } }),
        } as Response;
      }

      if (url === '/api/qr-sessions/active?activity_id=1') {
        return {
          ok: true,
          json: async () => ({
            data: {
              session: {
                session_id: 11,
                session_token: 'reuse-token-11',
                options: { single_use: false, max_scans: null },
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/activities/1/participants') {
        return {
          ok: true,
          json: async () => ({ data: { participations: [] } }),
        } as Response;
      }

      if (url === '/api/qr-sessions') {
        return {
          ok: true,
          json: async () => ({ data: { sessions: [] } }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/qr/page')).default;
    render(<Page />);

    expect(await screen.findByText('Trình chiếu QR')).toBeInTheDocument();
    expect(screen.getByText('Giảng viên chiếu mã để học viên quét')).toBeInTheDocument();
  });

  it('keeps projector visible and shows manual fullscreen CTA when auto fullscreen is blocked', async () => {
    searchParamsValue = 'activity_id=1&projector=1';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities?scope=operational&status=ongoing') {
        return {
          ok: true,
          json: async () => ({ data: { activities: [{ id: 1, title: 'QR Activity' }] } }),
        } as Response;
      }

      if (url === '/api/qr-sessions/active?activity_id=1') {
        return {
          ok: true,
          json: async () => ({
            data: {
              session: {
                session_id: 11,
                session_token: 'reuse-token-11',
                options: { single_use: false, max_scans: null },
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/activities/1/participants') {
        return {
          ok: true,
          json: async () => ({ data: { participations: [] } }),
        } as Response;
      }

      if (url === '/api/qr-sessions') {
        return {
          ok: true,
          json: async () => ({ data: { sessions: [] } }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const requestFullscreenMock = vi.fn(async () => {
      throw new Error('fullscreen blocked');
    });
    const previousDescriptor = Object.getOwnPropertyDescriptor(
      HTMLDivElement.prototype,
      'requestFullscreen'
    );
    Object.defineProperty(HTMLDivElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreenMock,
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    try {
      const Page = (await import('../src/app/teacher/qr/page')).default;
      render(<Page />);

      expect(await screen.findByText('Trình chiếu QR')).toBeInTheDocument();
      await waitFor(() => {
        expect(requestFullscreenMock).toHaveBeenCalled();
      });
      expect(screen.getByTestId('projector-fullscreen-cta')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('projector-fullscreen-hint').textContent).toContain('chặn');
      });
    } finally {
      if (previousDescriptor) {
        Object.defineProperty(HTMLDivElement.prototype, 'requestFullscreen', previousDescriptor);
      } else {
        delete (HTMLDivElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
      }
    }
  });

  it('offers quick actions to copy and open the student check-in link', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities?scope=operational&status=ongoing') {
        return {
          ok: true,
          json: async () => ({ data: { activities: [{ id: 1, title: 'QR Activity' }] } }),
        } as Response;
      }

      if (url === '/api/qr-sessions/active?activity_id=1') {
        return {
          ok: true,
          json: async () => ({
            data: {
              session: {
                session_id: 11,
                session_token: 'reuse-token-11',
                options: { single_use: false, max_scans: null },
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/activities/1/participants') {
        return {
          ok: true,
          json: async () => ({ data: { participations: [] } }),
        } as Response;
      }

      if (url === '/api/qr-sessions') {
        return {
          ok: true,
          json: async () => ({ data: { sessions: [] } }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const windowOpenMock = vi.fn();
    const previousWindowOpen = window.open;
    window.open = windowOpenMock as typeof window.open;

    try {
      const Page = (await import('../src/app/teacher/qr/page')).default;
      render(<Page />);

      const expectedCheckInLink =
        `${window.location.origin}/student/check-in?s=11&t=reuse-token-11`;

      const copyButton = await screen.findByRole('button', {
        name: /sao ch.+p link/i,
      });
      const openButton = screen.getByRole('button', {
        name: /ki.+m tra/i,
      });

      fireEvent.click(copyButton);
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedCheckInLink);
      });
      expect(toastSuccessMock).toHaveBeenCalled();

      fireEvent.click(openButton);
      expect(windowOpenMock).toHaveBeenCalledWith(expectedCheckInLink, '_blank', 'noopener,noreferrer');
    } finally {
      window.open = previousWindowOpen;
    }
  });
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeacherAlertsPage from '@/app/teacher/alerts/page';

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe('TeacherAlertsPage', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('renders alerts summary and marks selected alerts as read', async () => {
    let listVersion = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/alerts' && !init?.method) {
        listVersion += 1;
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              alerts: [
                {
                  id: 1,
                  level: 'warning',
                  message: 'Lop A con 3 hoc vien chua diem danh',
                  is_read: listVersion > 1,
                  resolved: false,
                  related_table: 'participations',
                  related_id: 18,
                  created_at: '2026-05-01T08:00:00.000Z',
                },
              ],
              summary: {
                total_alerts: 1,
                unread_alerts: listVersion > 1 ? 0 : 1,
                unresolved_alerts: 1,
                critical_alerts: 0,
                warning_alerts: 1,
                info_alerts: 0,
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/alerts' && init?.method === 'PUT') {
        expect(JSON.parse(String(init.body))).toMatchObject({
          alertId: 1,
          action: 'read',
        });
        return {
          ok: true,
          json: async () => ({ success: true, data: { success: true } }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<TeacherAlertsPage />);

    expect(await screen.findByText('Canh bao cua toi')).toBeInTheDocument();
    expect(screen.getByText('Lop A con 3 hoc vien chua diem danh')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('checkbox')[0] as HTMLInputElement);
    fireEvent.click(screen.getAllByRole('button', { name: 'Danh dau da doc' })[0] as HTMLButtonElement);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da danh dau da doc');
    });

    expect(await screen.findByTestId('teacher-alert-unread-count')).toHaveTextContent('0');
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url) === '/api/alerts' && init?.method === 'PUT'
      )
    ).toBe(true);
  });

  it('shows empty state when there are no alerts', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          alerts: [],
          summary: {
            total_alerts: 0,
            unread_alerts: 0,
            unresolved_alerts: 0,
            critical_alerts: 0,
            warning_alerts: 0,
            info_alerts: 0,
          },
        },
      }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<TeacherAlertsPage />);

    expect(await screen.findByText('Khong co canh bao nao')).toBeInTheDocument();
  });
});

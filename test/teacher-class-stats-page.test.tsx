import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
const router = { push: pushMock, back: vi.fn() };

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('ClassStatsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('surfaces class detail fetch errors', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/classes') {
        return { ok: true, json: async () => ({ classes: [{ id: 1, name: 'CNTT K18A' }] }) } as Response;
      }

      if (url === '/api/teacher/reports/class-stats') {
        return {
          ok: true,
          json: async () => ({
            stats: [
              {
                class_id: 1,
                class_name: 'CNTT K18A',
                total_students: 40,
                total_activities: 5,
                avg_participation_rate: 80,
                avg_score: 8,
                total_points: 320,
                attendance_trends: [],
                score_distribution: [],
              },
            ],
          }),
        } as Response;
      }

      if (url === '/api/teacher/reports/class-stats/1') {
        return { ok: false, json: async () => ({ error: 'Khong the tai chi tiet lop' }) } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/reports/class-stats/page')).default;
    render(<Page />);

    expect(await screen.findByText('Thong ke lop hoc')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('CNTT K18A'), { target: { value: '1' } });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Khong the tai chi tiet lop');
    });
  });
});

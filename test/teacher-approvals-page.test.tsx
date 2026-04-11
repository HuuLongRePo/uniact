import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ApprovalsPage from '@/app/teacher/approvals/page';

const { toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

function jsonResponse(body: any, ok: boolean = true, status: number = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('ApprovalsPage', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders pending approvals with details action and allows rejected activities to resubmit', async () => {
    let fetchCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/teacher/activities/approvals?status=all' && !init?.method) {
        fetchCount += 1;
        return jsonResponse({
          activities: [
            {
              id: 10,
              title: 'Hoat dong dang cho',
              description: 'Mo ta pending',
              date_time: '2026-04-20T08:00:00.000Z',
              location: 'Phong 201',
              status: 'pending',
              approval_status: 'requested',
              teacher_name: 'Teacher One',
              created_at: '2026-04-10T08:00:00.000Z',
              submitted_at: '2026-04-10T09:00:00.000Z',
              approved_at: null,
              rejected_at: null,
              rejection_reason: null,
              max_participants: 30,
              class_count: 2,
            },
            {
              id: 11,
              title: 'Hoat dong bi tu choi',
              description: 'Mo ta rejected',
              date_time: '2026-04-21T08:00:00.000Z',
              location: 'Phong 202',
              status: 'rejected',
              approval_status: 'rejected',
              teacher_name: 'Teacher One',
              created_at: '2026-04-11T08:00:00.000Z',
              submitted_at: '2026-04-11T09:00:00.000Z',
              approved_at: null,
              rejected_at: '2026-04-11T10:00:00.000Z',
              rejection_reason: 'Can bo sung thong tin',
              max_participants: 25,
              class_count: 1,
            },
          ],
          fetchCount,
        });
      }

      if (url === '/api/teacher/activities/11/resubmit' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body).toMatchObject({
          message: 'Da cap nhat day du',
        });

        return jsonResponse({}, true, 200);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<ApprovalsPage />);

    expect(await screen.findByText('Hoat dong dang cho')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chi tiet' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Chi tiet' }));
    expect(await screen.findByText('Chi tiet hoat dong')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dong' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Gui lai' })[0] as HTMLButtonElement);
    expect(await screen.findByText('Ly do tu choi')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Da cap nhat day du' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Gui lai' })[1] as HTMLButtonElement);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Gui duyet thanh cong');
    });

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url) === '/api/teacher/activities/11/resubmit' && init?.method === 'POST'
      )
    ).toBe(true);
  });
});

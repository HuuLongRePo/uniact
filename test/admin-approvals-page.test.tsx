import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminApprovalsPage from '@/app/admin/approvals/page';

const { toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock('@/components/ActivitySkeleton', () => ({
  default: () => <div>Loading approvals...</div>,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title, message }: { title: string; message: string }) => (
    <div>
      <div>{title}</div>
      <div>{message}</div>
    </div>
  ),
}));

vi.mock('@/app/admin/approvals/ApprovalDialog', () => ({
  default: () => null,
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AdminApprovalsPage', () => {
  it('renders activities from canonical successResponse payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          activities: [
            {
              id: 101,
              title: 'Hoat dong cho duyet',
              description: 'Mo ta',
              date_time: '2026-04-21T08:00:00.000Z',
              location: 'Phong A1',
              max_participants: 40,
              teacher_id: 8,
              teacher_name: 'Teacher One',
              status: 'pending',
              approval_status: 'requested',
              created_at: '2026-04-20T08:00:00.000Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          },
        },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<AdminApprovalsPage />);

    expect(await screen.findByText('Hoat dong cho duyet')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u')).not.toBeInTheDocument();
    });
  });
});

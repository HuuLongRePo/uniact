import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentScoresPage from '@/app/student/scores/page';

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

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/student/scores',
}));

describe('StudentScoresPage', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads canonical nested payload and shows score details', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          scores: [
            {
              participation_id: 1,
              activity_title: 'Hoat dong A',
              activity_type_name: 'Ky nang',
              organization_level_name: 'Cap truong',
              achievement_level: 'good',
              award_type: null,
              base_points: 10,
              type_multiplier: 1,
              level_multiplier: 1,
              achievement_multiplier: 1.2,
              subtotal: 12,
              bonus_points: 1,
              penalty_points: 0,
              total_points: 13,
              formula: '(10 x 1 x 1 x 1.2) + 1 - 0 = 13',
              calculated_at: '2026-04-18T01:00:00.000Z',
              evaluated_at: '2026-04-18T00:50:00.000Z',
            },
          ],
          summary: {
            total_activities: 1,
            total_points: 16,
            final_total: 16,
            activity_points: 13,
            award_points: 4,
            adjustment_points: -1,
            average_points: 13,
            excellent_count: 0,
            good_count: 1,
            participated_count: 0,
          },
        },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<StudentScoresPage />);

    expect((await screen.findAllByText('Hoat dong A')).length).toBeGreaterThan(0);
    expect(screen.getByText('Bảng điểm của tôi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Điểm rèn luyện' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xếp hạng' })).toBeInTheDocument();
    expect(screen.getAllByText('16.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('13.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Ky nang')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Xem công thức')[0]);
    expect(await screen.findByRole('dialog', { name: 'Chi tiết tính điểm' })).toBeInTheDocument();
    expect(screen.getByText('(10 x 1 x 1 x 1.2) + 1 - 0 = 13')).toBeInTheDocument();
  });
});

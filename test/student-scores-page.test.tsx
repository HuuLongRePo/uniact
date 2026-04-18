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
              activity_title: 'Hoạt động A',
              activity_type_name: 'Kỹ năng',
              organization_level_name: 'Cấp trường',
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
              formula: '(10 × 1 × 1 × 1.2) + 1 - 0 = 13',
              calculated_at: '2026-04-18T01:00:00.000Z',
              evaluated_at: '2026-04-18T00:50:00.000Z',
            },
          ],
          summary: {
            total_activities: 1,
            total_points: 13,
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

    expect(await screen.findByText('Hoạt động A')).toBeInTheDocument();
    expect(screen.getAllByText('13.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Kỹ năng')).toBeInTheDocument();

    fireEvent.click(screen.getByText('📊 Xem'));
    expect(await screen.findByText('Chi tiết tính điểm')).toBeInTheDocument();
    expect(screen.getByText('(10 × 1 × 1 × 1.2) + 1 - 0 = 13')).toBeInTheDocument();
  });
});

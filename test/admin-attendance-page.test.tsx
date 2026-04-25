import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = {
  back: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Admin attendance page timezone rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          records: [
            {
              id: 1,
              activityId: 77,
              activityName: 'Sinh hoat dau tuan',
              activityDate: '2026-04-20T20:00:00.000Z',
              userId: 501,
              userName: 'Nguyen Van A',
              userEmail: 'a@example.com',
              status: 'present',
              pointsAwarded: 5,
            },
          ],
        }),
      } as Response;
    }) as any;
  });

  it('renders activity date with Vietnam date formatter', async () => {
    const Page = (await import('../src/app/admin/attendance/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Sinh hoat dau tuan')).toBeInTheDocument();
    });

    expect(screen.getByText('21/04/2026')).toBeInTheDocument();
  });
});

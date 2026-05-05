import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = {
  back: vi.fn(),
  push: vi.fn(),
};
const authState = {
  user: { id: 1, role: 'admin', full_name: 'System Admin' },
  loading: false,
};
let currentActivityId: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => ({
    get: (key: string) =>
      key === 'activityId' || key === 'activity_id' ? currentActivityId : null,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
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
    currentActivityId = null;
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
      expect(screen.getAllByText('Sinh hoat dau tuan').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('21/04/2026').length).toBeGreaterThan(0);
  });

  it('prefills the activity filter from search params', async () => {
    currentActivityId = '77';
    const Page = (await import('../src/app/admin/attendance/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('77')).toBeInTheDocument();
    });
  });
});

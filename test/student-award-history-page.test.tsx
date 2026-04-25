import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = {
  back: vi.fn(),
  push: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

describe('Student award history page timezone rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          awards: [
            {
              id: 1,
              awardName: 'Sinh vien xuat sac',
              awardedAt: '2026-04-20T20:00:00.000Z',
              points: 20,
              reason: 'Hoan thanh xuat sac',
              activityTitle: 'Hoi thao hoc thuat',
            },
          ],
          totalPoints: 20,
        }),
      } as Response;
    }) as any;
  });

  it('renders awarded date in Vietnam timezone with en-US locale', async () => {
    const Page = (await import('../src/app/student/awards/history/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Sinh vien xuat sac')).toBeInTheDocument();
    });

    expect(screen.getByText('April 21, 2026')).toBeInTheDocument();
  });
});

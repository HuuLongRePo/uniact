import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const authState = {
  user: { id: 1, role: 'admin', full_name: 'System Admin' },
  loading: false,
};
const toast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: '20' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: toast,
}));

describe('Admin student detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost');

      if (url.pathname === '/api/students/20/profile') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              student: {
                id: 20,
                name: 'Nguyen Thanh An',
                email: 'an@example.com',
                class_id: 66,
                class_name: 'CNTT K66A',
                created_at: '2026-01-10T00:00:00.000Z',
                stats: {
                  total_activities: 8,
                  attended_count: 6,
                  total_points: 125,
                  class_rank: 2,
                  awards_count: 1,
                },
              },
              activities: [
                {
                  id: 301,
                  title: 'Hoi thao CNTT',
                  date_time: '2026-04-15T08:00:00.000Z',
                  location: 'Hoi truong A',
                  activity_type: 'Workshop',
                  org_level: 'Faculty',
                  attendance_status: 'attended',
                  points: 20,
                  bonus_points: 5,
                  penalty_points: 0,
                },
              ],
              awards: [
                {
                  id: 401,
                  award_type: 'Hoc vien tich cuc',
                  reason: 'Dong gop noi bat',
                  awarded_date: '2026-04-20T00:00:00.000Z',
                  awarded_by_name: 'Teacher One',
                },
              ],
              monthlyStats: [
                {
                  month: '2026-04',
                  activity_count: 3,
                  attended_count: 3,
                  points_earned: 45,
                },
              ],
              notes: [
                {
                  id: 501,
                  content: 'Can theo doi them ky nang nhom.',
                  created_at: '2026-04-21T09:00:00.000Z',
                  created_by_name: 'Teacher One',
                },
              ],
            },
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url.toString()}`);
    }) as any;
  });

  it('renders the student profile panels from canonical payload data', async () => {
    const Page = (await import('../src/app/admin/students/[id]/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-student-detail-heading')).toHaveTextContent(
      'Nguyen Thanh An'
    );
    expect(screen.getAllByText('Hoi thao CNTT').length).toBeGreaterThan(0);
    expect(screen.getByText('Hoc vien tich cuc')).toBeInTheDocument();
    expect(screen.getByText('Can theo doi them ky nang nhom.')).toBeInTheDocument();
  });

  it('routes to score adjustment from the student profile header', async () => {
    const Page = (await import('../src/app/admin/students/[id]/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-student-detail-heading')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dieu chinh diem/i }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/admin/scores/20/adjust');
    });
  });
});

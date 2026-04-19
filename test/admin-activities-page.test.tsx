import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const router = { push };
const authState = {
  user: { id: 1, role: 'admin', name: 'Admin' },
  loading: false,
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Admin activities page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/admin/activities')) {
        return {
          ok: true,
          json: async () => ({
            activities: [
              {
                id: 1,
                title: 'Pending Activity',
                description: 'Awaiting review',
                teacher_id: 10,
                teacher_name: 'Teacher A',
                activity_type: 'Workshop',
                organization_level: 'Faculty',
                date_time: '2099-01-01T08:00:00.000Z',
                end_time: '2099-01-01T10:00:00.000Z',
                location: 'Hall A',
                max_participants: 50,
                participant_count: 12,
                status: 'pending',
                approval_status: 'requested',
                points: 5,
                created_at: '2098-12-01T00:00:00.000Z',
              },
              {
                id: 2,
                title: 'Rejected Activity',
                description: 'Needs fixes',
                teacher_id: 11,
                teacher_name: 'Teacher B',
                activity_type: 'Seminar',
                organization_level: 'University',
                date_time: '2099-01-02T08:00:00.000Z',
                end_time: '2099-01-02T10:00:00.000Z',
                location: 'Hall B',
                max_participants: 50,
                participant_count: 4,
                status: 'rejected',
                approval_status: 'rejected',
                points: 3,
                created_at: '2098-12-02T00:00:00.000Z',
              },
              {
                id: 3,
                title: 'Approved Published Activity',
                description: 'Just approved by admin',
                teacher_id: 12,
                teacher_name: 'Teacher C',
                activity_type: 'Campaign',
                organization_level: 'University',
                date_time: '2099-01-03T08:00:00.000Z',
                end_time: '2099-01-03T10:00:00.000Z',
                location: 'Hall C',
                max_participants: 80,
                participant_count: 18,
                status: 'published',
                approval_status: 'approved',
                points: 6,
                created_at: '2098-12-03T00:00:00.000Z',
              },
            ],
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url}`);
    }) as any;
  });

  it('shows approved activities in admin activities and lets them be found by both workflow and review filters', async () => {
    const Page = (await import('../src/app/admin/activities/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Approved Published Activity')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');

    fireEvent.change(selects[0], { target: { value: 'published' } });
    await waitFor(() => {
      expect(screen.getByText('Approved Published Activity')).toBeInTheDocument();
      expect(screen.queryByText('Pending Activity')).not.toBeInTheDocument();
    });

    fireEvent.change(selects[0], { target: { value: 'all' } });
    fireEvent.change(selects[1], { target: { value: 'approved' } });

    await waitFor(() => {
      expect(screen.getByText('Approved Published Activity')).toBeInTheDocument();
      expect(screen.queryByText('Pending Activity')).not.toBeInTheDocument();
      expect(screen.queryByText('Rejected Activity')).not.toBeInTheDocument();
    });
  });

  it('filters workflow and review semantics separately on admin activities page', async () => {
    const Page = (await import('../src/app/admin/activities/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Pending Activity')).toBeInTheDocument();
      expect(screen.getByText('Rejected Activity')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'pending' } });

    await waitFor(() => {
      expect(screen.getByText('Pending Activity')).toBeInTheDocument();
      expect(screen.queryByText('Rejected Activity')).not.toBeInTheDocument();
    });

    fireEvent.change(selects[0], { target: { value: 'all' } });
    fireEvent.change(selects[1], { target: { value: 'rejected' } });

    await waitFor(() => {
      expect(screen.queryByText('Pending Activity')).not.toBeInTheDocument();
      expect(screen.getByText('Rejected Activity')).toBeInTheDocument();
    });
  });
});

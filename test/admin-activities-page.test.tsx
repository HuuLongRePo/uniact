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
              {
                id: 4,
                title: 'Past Published Activity',
                description: 'Already happened but not closed manually',
                teacher_id: 13,
                teacher_name: 'Teacher D',
                activity_type: 'Seminar',
                organization_level: 'Faculty',
                date_time: '2020-01-03T08:00:00.000Z',
                end_time: '2020-01-03T10:00:00.000Z',
                location: 'Hall D',
                max_participants: 35,
                participant_count: 21,
                status: 'published',
                approval_status: 'approved',
                points: 4,
                created_at: '2019-12-03T00:00:00.000Z',
              },
            ],
          }),
        } as Response;
      }

      if (url.includes('/api/qr-sessions/active')) {
        const parsed = new URL(url, 'http://localhost');
        const activityId = parsed.searchParams.get('activity_id') ?? '';

        return {
          ok: true,
          json: async () => ({
            data: {
              session:
                activityId === '3'
                  ? {
                      id: 9001,
                      session_id: 9001,
                      expires_at: '2099-01-01T09:00:00.000Z',
                    }
                  : null,
            },
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
      expect(screen.getAllByText('Approved Published Activity').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('01/01/2099').length).toBeGreaterThan(0);

    const selects = screen.getAllByRole('combobox');

    fireEvent.change(selects[0], { target: { value: 'published' } });
    await waitFor(() => {
      expect(screen.getAllByText('Approved Published Activity').length).toBeGreaterThan(0);
      expect(screen.queryByText('Pending Activity')).not.toBeInTheDocument();
    });

    fireEvent.change(selects[0], { target: { value: 'all' } });
    fireEvent.change(selects[1], { target: { value: 'approved' } });

    await waitFor(() => {
      expect(screen.getAllByText('Approved Published Activity').length).toBeGreaterThan(0);
      expect(screen.queryByText('Pending Activity')).not.toBeInTheDocument();
      expect(screen.queryByText('Rejected Activity')).not.toBeInTheDocument();
    });
  });

  it('shows archived lifecycle summary for past published activities', async () => {
    const Page = (await import('../src/app/admin/activities/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getAllByText('Past Published Activity').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Da gui duyet').length).toBeGreaterThan(0);
    expect(screen.getByText('Da khep lai')).toBeInTheDocument();
    expect(
      screen.getAllByText('Da qua hoac da khep lai, can ra lai viec hoan thanh thuc te.').length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText((_, element) =>
        element?.textContent === 'Trong toan bo danh sach hien co 1 hoat dong da qua hoac da khep lai.'
      )
    ).toBeInTheDocument();
  });

  it('allows admin to refresh the activities list manually', async () => {
    const Page = (await import('../src/app/admin/activities/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getAllByText('Pending Activity').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /Tai lai/i }));

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls as Array<[RequestInfo | URL]>;
      const activityCalls = calls.filter(([input]) =>
        String(input).includes('/api/admin/activities')
      );
      expect(activityCalls).toHaveLength(2);
    });
  });

  it('filters workflow and review semantics separately on admin activities page', async () => {
    const Page = (await import('../src/app/admin/activities/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getAllByText('Pending Activity').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Rejected Activity').length).toBeGreaterThan(0);
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'pending' } });

    expect(screen.getByDisplayValue('Da gui duyet')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Pending Activity').length).toBeGreaterThan(0);
      expect(screen.queryByText('Rejected Activity')).not.toBeInTheDocument();
    });

    fireEvent.change(selects[0], { target: { value: 'all' } });
    fireEvent.change(selects[1], { target: { value: 'rejected' } });

    await waitFor(() => {
      expect(screen.queryByText('Pending Activity')).not.toBeInTheDocument();
      expect(screen.getAllByText('Rejected Activity').length).toBeGreaterThan(0);
    });
  });

  it('shows attendance shortcut when a published activity has an active QR session', async () => {
    const Page = (await import('../src/app/admin/activities/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getAllByText('Approved Published Activity').length).toBeGreaterThan(0);
    });

    const links = await screen.findAllByLabelText('Diem danh');
    expect(
      links.some(
        (link) => (link as HTMLAnchorElement).getAttribute('href') === '/admin/attendance?activityId=3'
      )
    ).toBeTruthy();
  });
});

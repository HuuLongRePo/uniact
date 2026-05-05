import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const pushMock = vi.fn();

type LinkMockProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: React.ReactNode;
  href: string;
};

type DialogMockProps = { isOpen: boolean };
type EmptyStateMockProps = { title: string; message: string };
type ConfirmDialogMockProps = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
};

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: LinkMockProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ActivityDialog', () => ({
  default: ({ isOpen }: DialogMockProps) => (isOpen ? <div>Activity dialog</div> : null),
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div>Loading...</div>,
}));

vi.mock('@/components/ActivitySkeleton', () => ({
  default: () => <div>Loading skeleton...</div>,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title, message }: EmptyStateMockProps) => (
    <div>
      <div>{title}</div>
      <div>{message}</div>
    </div>
  ),
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, title, message, onConfirm }: ConfirmDialogMockProps) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <div>{message}</div>
        <button onClick={onConfirm}>Confirm action</button>
      </div>
    ) : null,
}));

describe('TeacherActivitiesPage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('reads canonical nested payload from activities API', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/activities?')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              activities: [
                {
                  id: 7,
                  title: 'Hoat dong A',
                  description: 'Mo ta',
                  date_time: '2026-04-21T08:00:00.000Z',
                  location: 'Hoi truong A',
                  max_participants: 100,
                  status: 'draft',
                  participant_count: 12,
                  attended_count: 0,
                  teacher_name: 'Teacher A',
                },
              ],
              total: 1,
            },
          }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { default: TeacherActivitiesPage } = await import('../src/app/teacher/activities/page');
    render(<TeacherActivitiesPage />);

    expect(await screen.findByText('Hoat dong A')).toBeInTheDocument();
    expect(screen.getByText('Teacher A')).toBeInTheDocument();
    expect(screen.getByText('12/100')).toBeInTheDocument();
  });

  it('surfaces upcoming published activities in dedicated section', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/activities?')) {
        return {
          ok: true,
          json: async () => ({
            activities: [
              {
                id: 21,
                title: 'Hoat dong sap dien ra',
                description: 'Sap bat dau',
                date_time: '2099-04-21T08:00:00.000Z',
                location: 'Hoi truong B',
                max_participants: 50,
                status: 'published',
                participant_count: 20,
                attended_count: 0,
              },
              {
                id: 22,
                title: 'Hoat dong nhap',
                description: 'Chua gui duyet',
                date_time: '2099-04-22T08:00:00.000Z',
                location: 'Phong 101',
                max_participants: 40,
                status: 'draft',
                participant_count: 0,
                attended_count: 0,
              },
            ],
            total: 2,
          }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { default: TeacherActivitiesPage } = await import('../src/app/teacher/activities/page');
    render(<TeacherActivitiesPage />);

    expect(await screen.findByText('Sắp diễn ra')).toBeInTheDocument();
    expect(screen.getByText('Hoat dong sap dien ra')).toBeInTheDocument();
  });

  it('renders QR attendance shortcuts with canonical query params when active session exists', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/activities?')) {
        return {
          ok: true,
          json: async () => ({
            activities: [
              {
                id: 31,
                title: 'Hoat dong mo diem danh',
                description: 'Mo ta',
                date_time: '2099-04-21T08:00:00.000Z',
                location: 'Phong 301',
                max_participants: 60,
                status: 'published',
                participant_count: 33,
                attended_count: 11,
              },
            ],
            total: 1,
          }),
        } as Response;
      }

      if (url === '/api/qr-sessions/active?activity_id=31') {
        return {
          ok: true,
          json: async () => ({
            data: {
              session: {
                id: 9001,
                session_id: 9001,
                expires_at: '2099-04-21T10:00:00.000Z',
              },
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { default: TeacherActivitiesPage } = await import('../src/app/teacher/activities/page');
    const { container } = render(<TeacherActivitiesPage />);

    await waitFor(() => {
      const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') || '');
      expect(hrefs.some((href) => href.includes('/teacher/qr?activity_id=31&session_id=9001'))).toBe(
        true
      );
      expect(
        hrefs.some((href) =>
          href.includes('/teacher/qr?activity_id=31&session_id=9001&projector=1')
        )
      ).toBe(true);
    });
  });

});

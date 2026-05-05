import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
  useParams: () => ({ id: '17' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}));

describe('TeacherActivityOverviewPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('renders canonical activity hub links', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          activity: {
            id: 17,
            title: 'Hoat dong huong nghiep',
            description: 'Mo ta dieu phoi',
            date_time: '2026-04-22T08:00:00.000Z',
            location: 'Hoi truong',
            status: 'published',
            approval_status: 'approved',
            registration_deadline: '2026-04-20T23:59:59.000Z',
            max_participants: 120,
            participant_count: 54,
            available_slots: 66,
            teacher_name: 'Nguyen Van A',
            activity_type: 'Ngoai khoa',
            organization_level: 'Cap khoa',
            base_points: 5,
            qr_enabled: true,
            classes: [
              { id: 1, name: 'CNTT 1', participation_mode: 'mandatory' },
              { id: 2, name: 'CNTT 2', participation_mode: 'voluntary' },
            ],
          },
        },
      }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/activities/[id]/page')).default;
    render(<Page />);

    expect(await screen.findByText('Hoat dong huong nghiep')).toBeInTheDocument();
    expect(screen.getByText('Ngoai khoa')).toBeInTheDocument();
    expect(screen.getByText('Cap khoa')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
    expect(screen.getByText('66')).toBeInTheDocument();
    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    expect(screen.getByText('Lop bat buoc')).toBeInTheDocument();
    expect(screen.getByText(/CNTT 1/)).toBeInTheDocument();
    expect(screen.getByText('Lop duoc dang ky')).toBeInTheDocument();
    expect(screen.getByText(/CNTT 2/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nguoi tham gia/i })).toHaveAttribute(
      'href',
      '/teacher/activities/17/participants'
    );
    expect(screen.getByRole('link', { name: /Diem danh nhanh/i })).toHaveAttribute(
      'href',
      '/teacher/activities/17/attendance/bulk'
    );
    expect(screen.getByRole('link', { name: /Lich su diem danh/i })).toHaveAttribute(
      'href',
      '/teacher/activities/17/attendance/history'
    );
  });
});

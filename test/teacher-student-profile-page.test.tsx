import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();
const searchParamsGetMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
  useParams: () => ({ id: '12' }),
  useSearchParams: () => ({ get: searchParamsGetMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: toastErrorMock },
}));

describe('StudentProfilePage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    searchParamsGetMock.mockReset();
    searchParamsGetMock.mockReturnValue(null);
  });

  it('reads canonical nested student profile payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          student: {
            id: 12,
            name: 'Nguyen Van A',
            email: 'a@student.edu.vn',
            class_name: 'CNTT K18A',
            major: 'CNTT',
            academic_year: '18',
            stats: {
              total_activities: 4,
              attended_count: 3,
              cancelled_count: 0,
              total_points: 25,
              class_rank: 2,
              awards_count: 1,
            },
          },
          activities: [],
          awards: [],
          monthlyStats: [],
          notes: [],
        },
      }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/students/[id]/page')).default;
    render(<Page />);

    expect(await screen.findByText('Nguyen Van A')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('opens notes tab when requested by query string', async () => {
    searchParamsGetMock.mockImplementation((key: string) => (key === 'tab' ? 'notes' : null));

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          student: {
            id: 12,
            name: 'Nguyen Van A',
            email: 'a@student.edu.vn',
            class_name: 'CNTT K18A',
            stats: {
              total_activities: 1,
              attended_count: 1,
              total_points: 5,
              class_rank: 1,
              awards_count: 0,
            },
          },
          activities: [],
          awards: [],
          monthlyStats: [],
          notes: [
            {
              id: 1,
              content: 'Can follow-up ho so mien giam.',
              created_at: '2026-04-25T08:00:00.000Z',
              created_by_name: 'Teacher A',
            },
          ],
        },
      }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/students/[id]/page')).default;
    render(<Page />);

    expect(await screen.findByText('Ghi chu noi bo')).toBeInTheDocument();
    expect(screen.getByText('Can follow-up ho so mien giam.')).toBeInTheDocument();
  });
});

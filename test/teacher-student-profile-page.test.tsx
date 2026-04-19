import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
  useParams: () => ({ id: '12' }),
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
  });

  it('reads canonical nested student profile payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          student: {
            id: 12,
            name: 'Nguyễn Văn A',
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

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });
});

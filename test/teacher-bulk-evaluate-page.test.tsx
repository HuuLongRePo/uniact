import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: '17' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('@/components/AchievementEvaluation', () => ({
  default: ({ value }: { value: string }) => <div>AchievementEvaluation:{value}</div>,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('TeacherBulkEvaluatePage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('renders attended participants for batch evaluation', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/activities/17') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              activity: {
                id: 17,
                title: 'Hoat dong ky nang song',
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/teacher/activities/17/participants') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 1001,
                student_id: 81,
                student_name: 'Nguyen Van A',
                student_code: 'SV001',
                class_name: '12A1',
                attended: 1,
                achievement_level: null,
                feedback: null,
              },
              {
                id: 1002,
                student_id: 82,
                student_name: 'Nguyen Van B',
                student_code: 'SV002',
                class_name: '12A1',
                attended: 0,
                achievement_level: null,
                feedback: null,
              },
            ],
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/activities/[id]/evaluate/page')).default;
    render(<Page />);

    expect(await screen.findByText('Danh gia hang loat')).toBeInTheDocument();
    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    expect(screen.queryByText('Nguyen Van B')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Luu danh gia (1)' })).toBeInTheDocument();
  });
});

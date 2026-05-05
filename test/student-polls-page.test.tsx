import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/database';
import StudentPollsPage from '@/app/student/polls/page';
import { useAuth } from '@/contexts/AuthContext';
import { expectNoMojibake } from './helpers/mojibake';

const { pushMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

const routerMock = {
  push: pushMock,
  replace: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  usePathname: () => '/student/polls',
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

function createAuthState(role: string = 'student') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('StudentPollsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('renders clean poll list labels without mojibake', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        polls: [
          {
            id: 7,
            title: 'Khảo sát học kỳ',
            description: 'Đánh giá học kỳ',
            class_name: 'CNTT K18A',
            status: 'active',
            response_count: 8,
            has_voted: 0,
            allow_multiple: true,
            created_at: '2026-04-25T00:00:00.000Z',
          },
        ],
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(<StudentPollsPage />);

    expect(await screen.findByText('Khảo sát và bình chọn')).toBeInTheDocument();
    expect(await screen.findByText('Lớp: CNTT K18A')).toBeInTheDocument();
    expect(screen.getByText('Tác vụ nhanh')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tham gia khảo sát' })).toBeInTheDocument();
    expectNoMojibake(container.textContent || '');
  });

  it('opens poll detail and submits vote with canonical endpoint', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/polls' && !init?.method) {
        return {
          ok: true,
          json: async () => ({
            polls: [
              {
                id: 7,
                title: 'Khảo sát học kỳ',
                description: '',
                class_name: 'CNTT K18A',
                status: 'active',
                response_count: 2,
                has_voted: 0,
                allow_multiple: false,
                created_at: '2026-04-25T00:00:00.000Z',
              },
            ],
          }),
        };
      }

      if (url === '/api/polls/7' && !init?.method) {
        return {
          ok: true,
          json: async () => ({
            poll: {
              id: 7,
              title: 'Khảo sát học kỳ',
              description: '',
              allow_multiple: false,
              status: 'active',
            },
            options: [{ id: 1, option_text: 'Đồng ý', vote_count: 0, percentage: '0' }],
            total_votes: 2,
            user_votes: [],
            has_voted: false,
          }),
        };
      }

      if (url === '/api/polls/7' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body.option_ids).toEqual([1]);
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<StudentPollsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Tham gia khảo sát' }));
    fireEvent.click(await screen.findByRole('radio'));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Đã ghi nhận phản hồi của bạn');
    });

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url) === '/api/polls/7' && init?.method === 'POST'
      )
    ).toBe(true);
  });
});

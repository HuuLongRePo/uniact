import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

Object.assign(globalThis.navigator, {
  clipboard: {
    writeText: vi.fn(async () => undefined),
  },
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 33, role: 'teacher', name: 'Teacher A' },
    loading: false,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('TeacherPollSettingsPage', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    vi.mocked(globalThis.navigator.clipboard.writeText).mockClear();
  });

  it('renders canonical settings payload and copies template text', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/teacher/polls/settings') {
        return {
          ok: true,
          json: async () => ({
            data: {
              settings: {
                id: 9,
                default_duration_minutes: 45,
                allow_multiple_answers: true,
                show_results_before_closing: false,
                allow_anonymous_responses: true,
                default_visibility: 'student',
                templates: [
                  {
                    id: 101,
                    name: 'Danh gia buoi hoc',
                    category: 'assessment',
                    poll_type: 'single_choice',
                    default_options: ['Tot', 'Can cai thien'],
                    description: 'Mau nhanh',
                    created_at: '2026-04-24T10:00:00.000Z',
                  },
                ],
              },
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/polls/settings/page')).default;
    render(<Page />);

    expect(await screen.findByText('Cấu hình khảo sát')).toBeInTheDocument();
    expect(screen.getByDisplayValue('45')).toBeInTheDocument();
    expect(screen.getByText('Danh gia buoi hoc')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Sao chép mẫu Danh gia buoi hoc'));

    await waitFor(() => {
      expect(globalThis.navigator.clipboard.writeText).toHaveBeenCalled();
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Đã sao chép nội dung mẫu khảo sát');
  });
});

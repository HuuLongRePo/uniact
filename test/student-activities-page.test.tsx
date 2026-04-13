import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentActivitiesPage from '@/app/student/activities/page';
import { useAuth } from '@/contexts/AuthContext';

const { pushMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock('@/components/ActivitySkeleton', () => ({
  default: () => <div data-testid="activity-skeleton">Loading</div>,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

function createAuthState() {
  return {
    user: { id: 1, role: 'student', class_id: 1, name: 'Student One' },
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

function jsonResponse(body: any, ok: boolean = true, status: number = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

function installFetchMock(fetchMock: typeof fetch) {
  vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: fetchMock,
  });
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    writable: true,
    value: fetchMock,
  });
}

function normalizeUrl(input: RequestInfo | URL) {
  const value = String(input);
  return value.startsWith('http://') || value.startsWith('https://') ? new URL(value).pathname : value;
}

describe('StudentActivitiesPage registration conflict flow', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState() as any);
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows conflict details and resubmits with force_register when confirmed', async () => {
    let activitiesFetchCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = normalizeUrl(input);

      if (url === '/api/activity-types') {
        return jsonResponse({ activityTypes: [] });
      }

      if (url === '/api/activities' && !init?.method) {
        activitiesFetchCount += 1;
        return jsonResponse({
          activities: [
            {
              id: 10,
              title: 'Hoạt động A',
              description: 'Mô tả A',
              date_time: '2099-04-12T08:00:00.000Z',
              location: 'Hội trường A',
              teacher_name: 'Teacher A',
              participant_count: 5,
              max_participants: 20,
              status: 'published',
              is_registered: activitiesFetchCount > 1,
              activity_type: 'Tinh nguyen',
              organization_level: 'Cap truong',
            },
          ],
        });
      }

      if (url === '/api/activities/10/register' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));

        if (body.force_register === true) {
          return jsonResponse({ participation_id: 999 }, true, 201);
        }

        return jsonResponse(
          {
            success: false,
            error: 'Bạn đã đăng ký hoạt động khác trùng giờ bắt đầu. Xác nhận để tiếp tục.',
            code: 'CONFLICT',
            details: {
              can_override: true,
              conflicts: [
                {
                  id: 77,
                  title: 'Hoạt động bị trùng',
                  date_time: '2099-04-12T08:00:00.000Z',
                  location: 'Phong B',
                },
              ],
            },
          },
          false,
          409
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    installFetchMock(fetchMock as typeof fetch);

    render(<StudentActivitiesPage />);

    expect(await screen.findByText('Hoạt động A')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký ngay' }));

    expect(await screen.findByText('Xung đột giờ bắt đầu')).toBeInTheDocument();
    expect(screen.getByText('Hoạt động bị trùng')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Vẫn đăng ký' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Đăng ký thành công!');
    });

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          normalizeUrl(url as any) === '/api/activities/10/register' &&
          init?.method === 'POST' &&
          String(init?.body).includes('"force_register":true')
      )
    ).toBe(true);
  });

  it('separates non-applicable activities into their own tab and blocks self-registration there', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = normalizeUrl(input);

      if (url === '/api/activity-types') {
        return jsonResponse({ activityTypes: [] });
      }

      if (url === '/api/activities' && !init?.method) {
        return jsonResponse({
          activities: [
            {
              id: 10,
              title: 'Hoạt động áp dụng',
              description: 'Mô tả A',
              date_time: '2099-04-12T08:00:00.000Z',
              location: 'Hội trường A',
              teacher_name: 'Teacher A',
              participant_count: 5,
              max_participants: 20,
              status: 'published',
              is_registered: false,
              applies_to_student: true,
              applicability_reason: 'Áp dụng vì lớp của bạn nằm trong phạm vi hoạt động.',
              activity_type: 'Tình nguyện',
              organization_level: 'Cấp trường',
            },
            {
              id: 11,
              title: 'Hoạt động lớp khác',
              description: 'Mô tả B',
              date_time: '2099-04-13T08:00:00.000Z',
              location: 'Phong B',
              teacher_name: 'Teacher B',
              participant_count: 3,
              max_participants: 20,
              status: 'published',
              is_registered: false,
              applies_to_student: false,
              applicability_reason:
                'Không thuộc phạm vi của bạn vì hoạt động đang dành riêng cho lớp khác.',
              activity_type: 'Học thuật',
              organization_level: 'Cấp khoa',
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    installFetchMock(fetchMock as typeof fetch);

    render(<StudentActivitiesPage />);

    expect(await screen.findByText('Hoạt động áp dụng')).toBeInTheDocument();
    expect(screen.queryByText('Hoạt động lớp khác')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Không thuộc phạm vi của bạn' }));

    expect(await screen.findByText('Hoạt động lớp khác')).toBeInTheDocument();
    expect(
      screen.getByText('Không thể đăng ký vì hoạt động này không áp dụng cho bạn')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng ký ngay' })).not.toBeInTheDocument();
  });

  it('shows mandatory registrations without offering self-cancel', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = normalizeUrl(input);

      if (url === '/api/activity-types') {
        return jsonResponse({ activityTypes: [] });
      }

      if (url === '/api/activities' && !init?.method) {
        return jsonResponse({
          activities: [
            {
              id: 12,
              title: 'Mandatory Activity',
              description: 'Mô tả M',
              date_time: '2099-04-20T08:00:00.000Z',
              location: 'Hall M',
              teacher_name: 'Teacher M',
              participant_count: 5,
              max_participants: 20,
              status: 'published',
              is_registered: true,
              participation_source: 'assigned',
              is_mandatory: true,
              can_cancel: false,
              applies_to_student: true,
              applicability_reason: 'Áp dụng vì lớp của bạn nằm trong phạm vi hoạt động.',
              activity_type: 'Tình nguyện',
              organization_level: 'Cấp trường',
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    installFetchMock(fetchMock as typeof fetch);

    render(<StudentActivitiesPage />);

    expect(await screen.findByText('Mandatory Activity')).toBeInTheDocument();
    expect(screen.getAllByText('Bắt buộc tham gia').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Bạn đã được xếp vào danh sách tham gia bắt buộc nên không thể tự hủy đăng ký')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy đăng ký' })).not.toBeInTheDocument();
  });
});


import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentActivityDetailPage from '@/app/student/activities/[id]/page';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';

const { pushMock, backMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backMock: vi.fn(),
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
    back: backMock,
    prefetch: vi.fn(),
  }),
  useParams: () => ({
    id: '20',
  }),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

vi.mock('@/components/Countdown', () => ({
  default: ({ label }: { label: string }) => <div data-testid="countdown">{label}</div>,
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

function normalizeUrl(input: RequestInfo | URL) {
  const value = String(input);
  return value.startsWith('http://') || value.startsWith('https://') ? new URL(value).pathname : value;
}

describe('StudentActivityDetailPage registration conflict flow', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState() as any);
    pushMock.mockReset();
    backMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows conflict modal and resubmits with force_register after confirmation', async () => {
    let activityFetchCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = normalizeUrl(input);

      if (url === '/api/activities/20' && !init?.method) {
        activityFetchCount += 1;
        return jsonResponse({
          data: {
            activity: {
              id: 20,
              title: 'Chi tiet hoat dong',
              description: 'Mo ta chi tiet',
              date_time: '2099-04-15T08:00:00.000Z',
              location: 'Hoi truong C',
              max_participants: 30,
              participant_count: 10,
              available_slots: 20,
              status: 'published',
              approval_status: 'approved',
              qr_enabled: false,
              teacher_id: 9,
              teacher_name: 'Teacher Detail',
              activity_type: 'Tinh nguyen',
              organization_level: 'Cap truong',
              class_ids: [1],
              class_names: ['CNTT K18A'],
              is_registered: activityFetchCount > 1,
              registration_status: null,
              can_cancel: false,
              can_register: true,
              base_points: 10,
              registration_deadline: '2099-04-14T08:00:00.000Z',
            },
          },
        });
      }

      if (url === '/api/activities/20/register' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));

        if (body.force_register === true) {
          return jsonResponse({ message: 'Đăng ký thành công!', participation_id: 1001 }, true, 201);
        }

        return jsonResponse(
          {
            success: false,
            error: 'Ban da dang ky hoat dong khac trung gio bat dau. Xac nhan de tiep tuc.',
            code: 'CONFLICT',
            details: {
              can_override: true,
              conflicts: [
                {
                  id: 88,
                  title: 'Hoat dong xung dot',
                  date_time: '2099-04-15T08:00:00.000Z',
                  location: 'Phong D',
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

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<StudentActivityDetailPage />);

    expect(await screen.findByText('Chi tiet hoat dong')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Đăng ký ngay/i));

    expect(await screen.findByText('Xung đột giờ bắt đầu')).toBeInTheDocument();
    expect(screen.getByText('Hoat dong xung dot')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Vẫn đăng ký' }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Đăng ký thành công!');
    });

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          normalizeUrl(url as any) === '/api/activities/20/register' &&
          init?.method === 'POST' &&
          String(init?.body).includes('"force_register":true')
      )
    ).toBe(true);
  });

  it('shows scope reason and blocks self-registration when the activity does not apply to the student', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = normalizeUrl(input);

      if (url === '/api/activities/20' && !init?.method) {
        return jsonResponse({
          data: {
            activity: {
              id: 20,
              title: 'Hoat dong lop khac',
              description: 'Mo ta chi tiet',
              date_time: '2099-04-15T08:00:00.000Z',
              location: 'Hoi truong C',
              max_participants: 30,
              participant_count: 10,
              available_slots: 20,
              status: 'published',
              approval_status: 'approved',
              qr_enabled: false,
              teacher_id: 9,
              teacher_name: 'Teacher Detail',
              activity_type: 'Tinh nguyen',
              organization_level: 'Cap truong',
              class_ids: [2],
              class_names: ['Lop 2A'],
              is_registered: false,
              registration_status: null,
              can_cancel: false,
              can_register: false,
              applies_to_student: false,
              applicability_scope: 'class_scope_mismatch',
              applicability_reason:
                'Khong thuoc pham vi cua ban vi hoat dong dang danh rieng cho lop khac.',
              base_points: 10,
              registration_deadline: '2099-04-14T08:00:00.000Z',
            },
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<StudentActivityDetailPage />);

    expect(await screen.findByText('Hoat dong lop khac')).toBeInTheDocument();
    expect(screen.getByText('Khong thuoc pham vi cua ban')).toBeInTheDocument();
    expect(
      screen.getByText('Khong thuoc pham vi cua ban vi hoat dong dang danh rieng cho lop khac.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đăng ký ngay/i })).not.toBeInTheDocument();
  });

  it('shows open-scope reason and still allows registration for globally open activities', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = normalizeUrl(input);

      if (url === '/api/activities/20' && !init?.method) {
        return jsonResponse({
          data: {
            activity: {
              id: 20,
              title: 'Hoạt động mở toàn cục',
              description: 'Mô tả chi tiết',
              date_time: '2099-04-15T08:00:00.000Z',
              location: 'Hội trường mở',
              max_participants: 50,
              participant_count: 10,
              available_slots: 40,
              status: 'published',
              approval_status: 'approved',
              qr_enabled: false,
              teacher_id: 9,
              teacher_name: 'Teacher Detail',
              activity_type: 'Tình nguyện',
              organization_level: 'Cấp trường',
              class_ids: [],
              class_names: [],
              is_registered: false,
              registration_status: null,
              can_cancel: false,
              can_register: true,
              applies_to_student: true,
              applicability_scope: 'open_scope',
              applicability_reason: 'Hoạt động mở cho tất cả học viên.',
              base_points: 10,
              registration_deadline: '2099-04-14T08:00:00.000Z',
            },
          },
        });
      }

      if (url === '/api/activities/20/register' && init?.method === 'POST') {
        return jsonResponse({ message: 'Đăng ký thành công!' }, true, 201);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<StudentActivityDetailPage />);

    expect(await screen.findByText('Hoạt động mở toàn cục')).toBeInTheDocument();
    expect(screen.getByText('Hoạt động mở cho tất cả học viên.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đăng ký ngay/i })).toBeInTheDocument();
  });

  it('shows mandatory participation state and hides self-cancel actions', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = normalizeUrl(input);

      if (url === '/api/activities/20' && !init?.method) {
        return jsonResponse({
          data: {
            activity: {
              id: 20,
              title: 'Mandatory Detail Activity',
              description: 'Mo ta chi tiet',
              date_time: '2099-04-15T08:00:00.000Z',
              location: 'Hoi truong C',
              max_participants: 30,
              participant_count: 10,
              available_slots: 20,
              status: 'published',
              approval_status: 'approved',
              qr_enabled: false,
              teacher_id: 9,
              teacher_name: 'Teacher Detail',
              activity_type: 'Tinh nguyen',
              organization_level: 'Cap truong',
              class_ids: [1],
              class_names: ['CNTT K18A'],
              is_registered: true,
              registration_status: 'registered',
              can_cancel: false,
              can_register: false,
              participation_source: 'assigned',
              is_mandatory: true,
              applies_to_student: true,
              applicability_scope: 'class_scope_match',
              applicability_reason: 'Ap dung vi lop cua ban nam trong pham vi hoat dong.',
              base_points: 10,
              registration_deadline: '2099-04-14T08:00:00.000Z',
            },
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<StudentActivityDetailPage />);

    expect(await screen.findByText('Mandatory Detail Activity')).toBeInTheDocument();
    expect(screen.getAllByText('Bắt buộc với bạn').length).toBeGreaterThan(0);
    expect(screen.getByText('Ap dung vi lop cua ban nam trong pham vi hoat dong.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy đăng ký' })).not.toBeInTheDocument();
  });
});


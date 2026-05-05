import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
const authState = {
  user: { id: 1, role: 'admin', full_name: 'System Admin' },
  loading: false,
};
const toast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: '15' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: toast,
}));

describe('Admin user detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');

      if (url.pathname === '/api/admin/users/15' && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              user: {
                id: 15,
                full_name: 'Tran Thi Student',
                email: 'student@example.com',
                username: 'student15',
                role: 'student',
                student_code: 'SV015',
                phone: '0909000000',
                class_id: 66,
                class_name: 'CNTT K66A',
                gender: 'female',
                date_of_birth: '2005-09-10',
                created_at: '2026-01-10T00:00:00.000Z',
                is_active: 1,
                province: 'HCM',
                district: 'Thu Duc',
                ward: 'Linh Trung',
                address_detail: 'KTX khu A',
                stats: {
                  total_participations: 7,
                  attended: 5,
                },
                recentActivities: [
                  {
                    id: 101,
                    title: 'Sinh hoat cong dan',
                    date_time: '2026-04-21T08:00:00.000Z',
                    attendance_status: 'attended',
                    status: 'published',
                  },
                ],
                awards: [
                  {
                    id: 201,
                    award_type_id: 3,
                    awarded_at: '2026-04-25T00:00:00.000Z',
                    reason: 'Tham gia tich cuc',
                  },
                ],
              },
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/users/15/reset-password' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: 'Mat khau da duoc dat lai',
            data: {
              new_password: 'tmp123',
            },
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url.toString()} ${init?.method || 'GET'}`);
    }) as any;
  });

  it('renders canonical user detail data and recent activity', async () => {
    const Page = (await import('../src/app/admin/users/[id]/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-user-detail-heading')).toHaveTextContent(
      'Tran Thi Student'
    );
    expect(screen.getAllByText('Hoc vien').length).toBeGreaterThan(0);
    expect(screen.getByText('Sinh hoat cong dan')).toBeInTheDocument();
    expect(screen.getByText('Tham gia tich cuc')).toBeInTheDocument();
  });

  it('resets password through the canonical admin endpoint and copies the temporary password', async () => {
    const Page = (await import('../src/app/admin/users/[id]/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-user-detail-heading')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dat lai mat khau/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Dat lai$/i }));

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('tmp123');
    });

    const fetchCalls = (global.fetch as any).mock.calls as Array<[RequestInfo | URL, RequestInit | undefined]>;
    expect(
      fetchCalls.some(
        ([input, init]) =>
          String(input).includes('/api/admin/users/15/reset-password') && init?.method === 'POST'
      )
    ).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('Mat khau da duoc dat lai');
    expect(toast.success.mock.calls.some((call: any[]) => String(call[0]).includes('tmp123'))).toBe(
      true
    );
  });
});

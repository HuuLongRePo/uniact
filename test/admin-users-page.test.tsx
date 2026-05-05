import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const authState = {
  user: { id: 1, role: 'admin', full_name: 'System Admin' },
  loading: false,
};
const toast = {
  success: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
};
let currentTab: 'all' | 'teacher' | 'student' | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'tab' ? currentTab : null),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: toast,
}));

describe('Admin users page', () => {
  beforeEach(() => {
    currentTab = null;
    vi.clearAllMocks();

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost');
      const role = url.searchParams.get('role') || '';
      const limit = url.searchParams.get('limit') || '';

      if (url.pathname === '/api/admin/users' && limit === '1') {
        const totals = {
          '': 12,
          teacher: 4,
          student: 7,
        };

        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              users: [],
              pagination: {
                page: 1,
                limit: 1,
                total: totals[role as '' | 'teacher' | 'student'] ?? 0,
                totalPages: 1,
              },
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/users') {
        const teacherUsers = [
          {
            id: 10,
            full_name: 'Nguyen Van Teacher',
            email: 'teacher@example.com',
            role: 'teacher',
            teaching_class_name: 'CNTT K66A',
            created_at: '2026-04-01T00:00:00.000Z',
          },
        ];
        const studentUsers = [
          {
            id: 20,
            full_name: 'Tran Thi Student',
            email: 'student@example.com',
            role: 'student',
            class_name: 'CNTT K66A',
            student_code: 'SV001',
            created_at: '2026-04-02T00:00:00.000Z',
          },
        ];
        const allUsers = [...teacherUsers, ...studentUsers];
        const users = role === 'teacher' ? teacherUsers : role === 'student' ? studentUsers : allUsers;

        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              users,
              pagination: {
                page: 1,
                limit: 20,
                total: users.length,
                totalPages: 1,
              },
            },
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url.toString()}`);
    }) as any;
  });

  it('renders summary cards and user rows for admin operations', async () => {
    const Page = (await import('../src/app/admin/users/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('users-heading')).toHaveTextContent('Quan ly nguoi dung');
    expect((await screen.findAllByText('Nguyen Van Teacher')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tran Thi Student').length).toBeGreaterThan(0);
    expect(
      within(screen.getByText('Tong tai khoan').parentElement as HTMLElement).getByText('12')
    ).toBeInTheDocument();
    expect(
      within(screen.getAllByText('Giang vien')[0].parentElement as HTMLElement).getByText('4')
    ).toBeInTheDocument();
    expect(
      within(screen.getAllByText('Hoc vien')[0].parentElement as HTMLElement).getByText('7')
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Xem' })[0]);
    expect(await screen.findByRole('dialog', { name: 'Chi tiet nguoi dung' })).toBeInTheDocument();
  });

  it('applies the teacher tab from search params and refreshes the route when tabs change', async () => {
    currentTab = 'teacher';

    const Page = (await import('../src/app/admin/users/page')).default;
    render(<Page />);

    expect((await screen.findAllByText('Nguyen Van Teacher')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Tran Thi Student')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hoc vien/i }));

    expect(push).toHaveBeenCalledWith('/admin/users?tab=student');

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls as Array<[RequestInfo | URL]>;
      expect(
        calls.some(([input]) => String(input).includes('/api/admin/users?page=1&limit=20&role=teacher'))
      ).toBe(true);
    });
  });
});

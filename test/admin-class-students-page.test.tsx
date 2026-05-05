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
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ id: '66' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: toast,
}));

describe('Admin class students roster page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');

      if (url.pathname === '/api/admin/classes/66') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              class: {
                id: 66,
                name: 'CNTT K66A',
                grade: 'K66',
                teachers: [{ id: 9, name: 'Pham Van GV', email: 'gv@example.com' }],
              },
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/students' && url.searchParams.get('class_id') === '66') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              students: [
                {
                  id: 20,
                  name: 'Nguyen Thanh An',
                  email: 'an@example.com',
                  student_code: 'SV020',
                  created_at: '2026-01-10T00:00:00.000Z',
                  activity_count: 5,
                  attended_count: 4,
                  total_points: 80,
                  award_count: 1,
                },
              ],
              classSummary: {
                total: 1,
                activity_count: 5,
                attended_count: 4,
                total_points: 80,
                avg_points: 80,
                award_count: 1,
              },
              pagination: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
              },
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/classes' && url.searchParams.get('limit') === '1000') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              classes: [
                { id: 66, name: 'CNTT K66A', grade: 'K66' },
                { id: 77, name: 'ATTT K67A', grade: 'K67' },
              ],
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/students/transfer' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: '1 student(s) transferred successfully',
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url.toString()} ${init?.method || 'GET'}`);
    }) as any;
  });

  it('renders canonical roster payload and class summary', async () => {
    const Page = (await import('../src/app/admin/classes/[id]/students/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-class-students-heading')).toHaveTextContent(
      'Roster hoc vien'
    );
    expect(screen.getAllByText('Nguyen Thanh An').length).toBeGreaterThan(0);
    expect(screen.getByText('Pham Van GV')).toBeInTheDocument();
    expect(screen.getAllByText('80').length).toBeGreaterThan(0);
  });

  it('transfers the selected student to another class through the bulk action', async () => {
    const Page = (await import('../src/app/admin/classes/[id]/students/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-class-students-heading')).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText(/Chon hoc vien Nguyen Thanh An/i)[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Chuyen lop/i })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Chuyen hoc vien da chon' });
    fireEvent.change(within(dialog).getByLabelText('Chon lop dich'), {
      target: { value: '77' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Chuyen lop$/i }));

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls as Array<[RequestInfo | URL, RequestInit | undefined]>;
      const transferCall = calls.find(
        ([input, requestInit]) =>
          String(input).includes('/api/admin/students/transfer') && requestInit?.method === 'POST'
      );
      expect(transferCall).toBeTruthy();
      expect(JSON.parse(String(transferCall?.[1]?.body))).toEqual({
        studentIds: [20],
        targetClassId: 77,
      });
    });
  });
});

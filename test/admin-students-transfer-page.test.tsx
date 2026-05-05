import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const authState = {
  user: { id: 1, role: 'admin', name: 'System Admin', email: 'admin@uniact.local' },
  loading: false,
};
const toast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: ({ message }: { message?: string }) => <div>{message || 'Loading'}</div>,
}));

vi.mock('react-hot-toast', () => ({
  default: toast,
}));

describe('Admin student transfer page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');

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
                  total_points: 80,
                  activity_count: 5,
                },
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

  it('renders canonical class and roster payloads', async () => {
    const Page = (await import('../src/app/admin/students/transfer/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-student-transfer-heading')).toHaveTextContent(
      'Dieu chuyen hoc vien giua cac lop'
    );

    fireEvent.change(screen.getByLabelText('Lop nguon'), { target: { value: '66' } });
    await waitFor(() => {
      expect(screen.queryByText('Dang tai roster...')).toBeNull();
    });

    expect(await screen.findAllByText('Nguyen Thanh An')).toHaveLength(2);
    expect(screen.getByText(/80 diem/i)).toBeInTheDocument();
  });

  it('transfers selected students to the target class', async () => {
    const Page = (await import('../src/app/admin/students/transfer/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-student-transfer-heading')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Lop nguon'), { target: { value: '66' } });
    await waitFor(() => {
      expect(screen.queryByText('Dang tai roster...')).toBeNull();
    });
    fireEvent.change(await screen.findByLabelText('Lop dich'), { target: { value: '77' } });
    fireEvent.click(screen.getAllByLabelText(/Chon hoc vien Nguyen Thanh An/i)[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Chuyen roster da chon' }));

    fireEvent.click(screen.getByRole('button', { name: 'Xac nhan chuyen' }));

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

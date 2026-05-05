import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  useParams: () => ({ id: '15' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: toast,
}));

describe('Admin user edit page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
                username: 'student15',
                full_name: 'Tran Thi Student',
                email: 'student@example.com',
                role: 'student',
                class_id: 66,
                phone: '0909',
                gender: 'female',
              },
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/classes') {
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

      if (url.pathname === '/api/admin/users/15' && init?.method === 'PUT') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: 'Da cap nhat tai khoan',
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url.toString()} ${init?.method || 'GET'}`);
    }) as any;
  });

  it('loads canonical data into the edit form and saves changes', async () => {
    const Page = (await import('../src/app/admin/users/[id]/edit/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-user-edit-heading')).toHaveTextContent(
      'Chinh sua tai khoan'
    );

    fireEvent.change(screen.getByDisplayValue('Tran Thi Student'), {
      target: { value: 'Tran Thi Student Updated' },
    });
    fireEvent.change(screen.getByDisplayValue('student@example.com'), {
      target: { value: 'updated@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Lop hoc'), { target: { value: '77' } });
    fireEvent.click(screen.getByRole('button', { name: /Luu thay doi/i }));

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls as Array<[RequestInfo | URL, RequestInit | undefined]>;
      const putCall = calls.find(
        ([input, requestInit]) =>
          String(input).includes('/api/admin/users/15') && requestInit?.method === 'PUT'
      );
      expect(putCall).toBeTruthy();
      expect(JSON.parse(String(putCall?.[1]?.body))).toMatchObject({
        full_name: 'Tran Thi Student Updated',
        email: 'updated@example.com',
        class_id: 77,
        role: 'student',
      });
      expect(push).toHaveBeenCalledWith('/admin/users/15');
    });
  });
});

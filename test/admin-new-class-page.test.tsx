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
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: toast,
}));

describe('Admin new class page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');

      if (url.pathname === '/api/admin/users') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              users: [
                {
                  id: 9,
                  full_name: 'Pham Van GV',
                  email: 'gv@example.com',
                },
              ],
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/classes' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: 'Da tao lop hoc moi',
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url.toString()} ${init?.method || 'GET'}`);
    }) as any;
  });

  it('creates a new class and routes back to the class list', async () => {
    const Page = (await import('../src/app/admin/classes/new/page')).default;
    render(<Page />);

    expect(await screen.findByText('Tao lop hoc moi')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Ten lop'), { target: { value: 'ATTT K67A' } });
    fireEvent.change(screen.getByLabelText('Khoi / khoa'), { target: { value: 'K67' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText('Mo ta'), { target: { value: 'Lop an toan thong tin' } });
    fireEvent.click(screen.getByRole('button', { name: /Tao lop hoc/i }));

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls as Array<[RequestInfo | URL, RequestInit | undefined]>;
      const postCall = calls.find(
        ([input, requestInit]) =>
          String(input).includes('/api/admin/classes') && requestInit?.method === 'POST'
      );
      expect(postCall).toBeTruthy();
      expect(requestInitBody(postCall?.[1])).toEqual({
        name: 'ATTT K67A',
        grade: 'K67',
        description: 'Lop an toan thong tin',
        teacher_id: 9,
      });
      expect(push).toHaveBeenCalledWith('/admin/classes');
    });
  });
});

function requestInitBody(init?: RequestInit) {
  return init?.body ? JSON.parse(String(init.body)) : null;
}

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
  useParams: () => ({ id: '66' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: toast,
}));

describe('Admin class edit page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');

      if (url.pathname === '/api/admin/classes/66' && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              class: {
                id: 66,
                name: 'CNTT K66A',
                grade: 'K66',
                teacher_id: 9,
                teacher_name: 'Pham Van GV',
                description: 'Lop he chuan',
              },
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/users') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              users: [
                { id: 9, full_name: 'Pham Van GV', email: 'gv@example.com' },
                { id: 10, full_name: 'Tran Van GV', email: 'gv2@example.com' },
              ],
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/classes/66' && init?.method === 'PUT') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: 'Da cap nhat lop hoc',
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url.toString()} ${init?.method || 'GET'}`);
    }) as any;
  });

  it('loads canonical class detail data and submits the updated class payload', async () => {
    const Page = (await import('../src/app/admin/classes/[id]/edit/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-class-edit-heading')).toHaveTextContent(
      'Chinh sua lop hoc'
    );

    fireEvent.change(screen.getByDisplayValue('CNTT K66A'), {
      target: { value: 'CNTT K66A - Updated' },
    });
    fireEvent.change(screen.getByDisplayValue('K66'), {
      target: { value: 'K66+1' },
    });
    fireEvent.change(screen.getByLabelText('Giang vien chu nhiem'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByDisplayValue('Lop he chuan'), {
      target: { value: 'Mo ta moi' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Luu thay doi/i }));

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls as Array<[RequestInfo | URL, RequestInit | undefined]>;
      const putCall = calls.find(
        ([input, requestInit]) =>
          String(input).includes('/api/admin/classes/66') && requestInit?.method === 'PUT'
      );
      expect(putCall).toBeTruthy();
      expect(JSON.parse(String(putCall?.[1]?.body))).toEqual({
        name: 'CNTT K66A - Updated',
        grade: 'K66+1',
        description: 'Mo ta moi',
        teacher_id: 10,
      });
      expect(push).toHaveBeenCalledWith('/admin/classes/66');
    });
  });
});

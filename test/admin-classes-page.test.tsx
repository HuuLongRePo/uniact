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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: toast,
}));

describe('Admin classes page', () => {
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
                  id: 7,
                  full_name: 'Le Thi Co Van',
                  email: 'covan@example.com',
                },
              ],
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/classes' && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              classes: [
                {
                  id: 1,
                  name: 'CNTT K66A',
                  grade: 'K66',
                  teacher_id: null,
                  teacher_name: null,
                  student_count: 42,
                  description: 'Lop he chuan',
                  created_at: '2026-04-10T00:00:00.000Z',
                },
              ],
              pagination: {
                page: 1,
                limit: 30,
                total: 1,
                totalPages: 1,
              },
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/classes/1' && init?.method === 'PUT') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: 'Da gan GVCN cho lop hoc',
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url.toString()} ${init?.method || 'GET'}`);
    }) as any;
  });

  it('renders class operations summary and class roster table', async () => {
    const Page = (await import('../src/app/admin/classes/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('classes-heading')).toHaveTextContent('Quan ly lop hoc');
    expect((await screen.findAllByText('CNTT K66A')).length).toBeGreaterThan(0);
    expect(
      within(screen.getByText('Hoc vien dang hien thi').parentElement as HTMLElement).getByText('42')
    ).toBeInTheDocument();
    expect(screen.getByText('Le Thi Co Van')).toBeInTheDocument();
  });

  it('assigns a homeroom teacher from the inline dialog and reloads the list', async () => {
    const Page = (await import('../src/app/admin/classes/page')).default;
    render(<Page />);

    expect((await screen.findAllByText('CNTT K66A')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /Gan GVCN/i })[0]);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[selects.length - 1], { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: /Xac nhan gan/i }));

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls as Array<[RequestInfo | URL, RequestInit | undefined]>;
      const assignCall = calls.find(
        ([input, requestInit]) =>
          String(input).includes('/api/admin/classes/1') && requestInit?.method === 'PUT'
      );
      expect(assignCall).toBeTruthy();
      expect(requestInitBody(assignCall?.[1])).toEqual({ teacher_id: 7 });
      expect(toast.success).toHaveBeenCalledWith('Da gan GVCN cho lop hoc');
    });
  });
});

function requestInitBody(init?: RequestInit) {
  return init?.body ? JSON.parse(String(init.body)) : null;
}

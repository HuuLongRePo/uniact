import { render, screen, within } from '@testing-library/react';
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

describe('Admin class detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
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
                description: 'Lop he chuan',
                created_at: '2026-04-10T00:00:00.000Z',
                student_count: 2,
                teachers: [{ id: 7, name: 'Le Thi Co Van', email: 'covan@example.com' }],
              },
            },
          }),
        } as Response;
      }

      if (url.pathname === '/api/admin/students') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              students: [
                {
                  id: 20,
                  full_name: 'Nguyen Thanh An',
                  student_code: 'SV001',
                  email: 'an@example.com',
                  activity_count: 5,
                  attended_count: 4,
                  total_points: 80,
                  award_count: 1,
                  created_at: '2026-03-01T00:00:00.000Z',
                },
                {
                  id: 21,
                  full_name: 'Tran Minh Chau',
                  student_code: 'SV002',
                  email: 'chau@example.com',
                  activity_count: 4,
                  attended_count: 3,
                  total_points: 65,
                  award_count: 0,
                  created_at: '2026-03-02T00:00:00.000Z',
                },
              ],
              classSummary: {
                total: 2,
                activity_count: 9,
                attended_count: 7,
                total_points: 145,
                avg_points: 72.5,
                award_count: 1,
              },
            },
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url.toString()}`);
    }) as any;
  });

  it('renders class detail summary and roster from canonical payloads', async () => {
    const Page = (await import('../src/app/admin/classes/[id]/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-class-detail-heading')).toHaveTextContent('CNTT K66A');
    expect(screen.getByText('Le Thi Co Van')).toBeInTheDocument();
    expect(screen.getAllByText('Nguyen Thanh An').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tran Minh Chau').length).toBeGreaterThan(0);

    expect(
      within(screen.getByText('Tong diem tich luy').parentElement?.parentElement as HTMLElement).getByText('145')
    ).toBeInTheDocument();
    expect(
      within(screen.getByText('Diem trung binh').parentElement?.parentElement as HTMLElement).getByText('72,5')
    ).toBeInTheDocument();
  });
});

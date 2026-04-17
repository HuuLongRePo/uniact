import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '@/app/dashboard/page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'admin', name: 'Admin Demo' },
    loading: false,
  }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', null, children),
  LineChart: ({ children }: any) => React.createElement('div', null, children),
  Line: () => React.createElement('div'),
  BarChart: ({ children }: any) => React.createElement('div', null, children),
  Bar: () => React.createElement('div'),
  PieChart: ({ children }: any) => React.createElement('div', null, children),
  Pie: ({ children }: any) => React.createElement('div', null, children),
  Cell: () => React.createElement('div'),
  XAxis: () => React.createElement('div'),
  YAxis: () => React.createElement('div'),
  CartesianGrid: () => React.createElement('div'),
  Tooltip: () => React.createElement('div'),
  Legend: () => React.createElement('div'),
}));

function jsonResponse(body: any, ok: boolean = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('reads canonical admin users payload to compute teacher and student counts', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/classes')) {
        return jsonResponse({ data: { classes: [{ id: 1 }, { id: 2 }] } });
      }

      if (url.endsWith('/api/activities')) {
        return jsonResponse({
          data: {
            activities: [
              {
                id: 1,
                title: 'Hoạt động 1',
                date_time: '2099-04-20T08:00:00.000Z',
                location: 'Hall A',
                status: 'pending',
                participant_count: 10,
                activity_type: 'Tình nguyện',
                average_score: 80,
              },
            ],
          },
        });
      }

      if (url.endsWith('/api/admin/users')) {
        return jsonResponse({
          data: {
            users: [
              { id: 11, role: 'teacher' },
              { id: 12, role: 'teacher' },
              { id: 21, role: 'student' },
              { id: 22, role: 'student' },
              { id: 23, role: 'student' },
            ],
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(React.createElement(DashboardPage));

    const teacherLink = await screen.findByRole('link', { name: /Quản lý giảng viên/i });
    const studentLink = await screen.findByRole('link', { name: /Quản lý học viên/i });

    expect(teacherLink).toBeInTheDocument();
    expect(studentLink).toBeInTheDocument();
    expect(teacherLink.parentElement?.textContent).toContain('2');
    expect(studentLink.parentElement?.textContent).toContain('3');
  });
});

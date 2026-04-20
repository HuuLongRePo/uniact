import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
const createObjectURLMock = vi.fn(() => 'blob:mock');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('AttendanceReportsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    createObjectURLMock.mockClear();
    (globalThis.URL as any).createObjectURL = createObjectURLMock;
    vi.restoreAllMocks();
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as any;
      if (tagName === 'a') {
        element.click = vi.fn();
      }
      return element;
    }) as any);
  });

  it('renders face attendance badge from canonical records payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/classes') {
        return { ok: true, json: async () => ({ data: { classes: [{ id: 1, name: 'CNTT K18A' }] } }) } as Response;
      }
      if (url === '/api/teacher/reports/attendance/records') {
        return {
          ok: true,
          json: async () => ({
            data: {
              records: [
                {
                  student_id: 1,
                  student_name: 'Nguyễn Văn A',
                  student_code: 'SV001',
                  class_name: 'CNTT K18A',
                  activity_name: 'Sinh hoạt công dân',
                  activity_date: '2026-04-20T00:00:00.000Z',
                  status: 'present',
                  method: 'face',
                  check_in_time: '08:00',
                  notes: 'runtime_bridge',
                },
              ],
            },
          }),
        } as Response;
      }
      if (url === '/api/teacher/reports/attendance/class-summary') {
        return { ok: true, json: async () => ({ data: { summary: [] } }) } as Response;
      }
      if (url === '/api/teacher/reports/attendance/student-summary') {
        return { ok: true, json: async () => ({ data: { summary: [] } }) } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/reports/attendance/page')).default;
    render(<Page />);

    expect(await screen.findByText('Báo cáo điểm danh')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chi tiết' }));
    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getAllByText('Face').length).toBeGreaterThan(0);
    expect(screen.getByText('Sinh hoạt công dân')).toBeInTheDocument();
  });

  it('surfaces canonical export failure message', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/classes') {
        return { ok: true, json: async () => ({ classes: [{ id: 1, name: 'CNTT K18A' }] }) } as Response;
      }
      if (url === '/api/teacher/reports/attendance/records') {
        return { ok: true, json: async () => ({ records: [] }) } as Response;
      }
      if (url === '/api/teacher/reports/attendance/class-summary') {
        return { ok: true, json: async () => ({ summary: [] }) } as Response;
      }
      if (url === '/api/teacher/reports/attendance/student-summary') {
        return { ok: true, json: async () => ({ summary: [] }) } as Response;
      }
      if (url === '/api/teacher/reports/attendance/export' && init?.method === 'POST') {
        return { ok: false, blob: async () => new Blob() } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/reports/attendance/page')).default;
    render(<Page />);

    expect(await screen.findByText('Báo cáo điểm danh')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Xuất Excel/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Không thể xuất báo cáo');
    });
  });
});

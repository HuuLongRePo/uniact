import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateActivityPage from '@/app/teacher/activities/new/page';

const { toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

function jsonResponse(body: any, ok: boolean = true, status: number = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('CreateActivityPage participation preview', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads grouped mandatory participation preview only after the preview button is clicked', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({
          has_class_schedule_conflict: false,
          class_schedule_conflicts: [],
        });
      }

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });
      if (url === '/api/teacher/students') {
        return jsonResponse({
          students: [{ id: 201, name: 'Student Direct', class_name: 'CNTT K18B' }],
        });
      }

      if (url === '/api/activities/participation-preview' && init?.method === 'POST') {
        expect(JSON.parse(String(init.body || '{}'))).toEqual({
          class_ids: [1],
          mandatory_class_ids: [1],
          voluntary_class_ids: [],
          mandatory_student_ids: [],
          voluntary_student_ids: [],
        });
        return jsonResponse({
          preview: {
            total_classes: 1,
            mandatory_participants: 2,
            voluntary_participants: 1,
            conflict_count: 0,
            direct_students: [
              {
                id: 201,
                name: 'Student Direct',
                email: 'direct@example.com',
                resolved_mode: 'voluntary',
              },
            ],
            groups: [
              {
                class_id: 1,
                class_name: 'CNTT K18A',
                mandatory_count: 2,
                voluntary_count: 0,
                conflict_count: 0,
                students: [
                  { id: 100, name: 'Student A', email: 'a@example.com' },
                  { id: 101, name: 'Student B', email: 'b@example.com' },
                ],
              },
            ],
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(React.createElement(CreateActivityPage));
    expect((await screen.findAllByText('CNTT K18A')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Chọn tất cả đang lọc' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước danh sách tham gia' }));

    await waitFor(() => {
      expect(screen.getByText('Xem trước danh sách tham gia hiện tại')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/CNTT K18A/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Student A')).toBeInTheDocument();
    expect(screen.getByText(/Học viên chọn trực tiếp/i)).toBeInTheDocument();
    expect(screen.getByText('Student Direct')).toBeInTheDocument();
    expect(screen.getAllByText('Tự nguyện').length).toBeGreaterThan(0);
  });
});

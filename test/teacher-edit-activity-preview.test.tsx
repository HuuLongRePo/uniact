import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditActivityPage from '@/app/teacher/activities/[id]/edit/page';

const { pushMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
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

describe('EditActivityPage participation preview', () => {
  let reactUseSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    reactUseSpy = vi.spyOn(React, 'use').mockReturnValue({ id: '55' } as any);
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    reactUseSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('loads grouped mandatory participation preview for selected classes', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/55' && !init?.method) {
        return jsonResponse({
          activity: {
            id: 55,
            title: 'Hoạt động cũ',
            description: 'Mô tả cũ',
            date_time: '2026-04-25T08:30:00.000Z',
            location: 'Phong A1',
            status: 'draft',
            approval_status: 'rejected',
            rejected_reason: 'Cần bổ sung thông tin',
            max_participants: null,
            activity_type_id: 5,
            organization_level_id: 7,
            class_ids: [1],
            mandatory_class_ids: [1],
            voluntary_class_ids: [],
            classes: [{ id: 1, name: 'CNTT K18A', participation_mode: 'mandatory' }],
          },
        });
      }

      if (url === '/api/classes?mine=1') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [{ id: 5, name: 'Tình nguyện' }] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [{ id: 7, name: 'Cấp trường' }] });

      if (url === '/api/activities/participation-preview' && init?.method === 'POST') {
        expect(JSON.parse(String(init.body || '{}'))).toEqual({
          class_ids: [1],
          mandatory_class_ids: [1],
          voluntary_class_ids: [],
        });
        return jsonResponse({
          preview: {
            total_classes: 1,
            mandatory_participants: 2,
            voluntary_participants: 0,
            conflict_count: 0,
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

    render(React.createElement(EditActivityPage, { params: Promise.resolve({ id: '55' }) }));

    expect(await screen.findByText('Hoạt động bị từ chối')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước danh sách tham gia' }));

    await waitFor(() => {
      expect(screen.getByText('Xem trước danh sách tham gia hiện tại')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/CNTT K18A/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Student B')).toBeInTheDocument();
  });
});

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

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });

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

    const { container } = render(React.createElement(CreateActivityPage));
    expect((await screen.findAllByText('CNTT K18A')).length).toBeGreaterThan(0);

    const classSelects = container.querySelectorAll('select[multiple]');
    const mandatorySelect = classSelects[0] as HTMLSelectElement;
    mandatorySelect.options[0].selected = true;
    fireEvent.change(mandatorySelect);

    fireEvent.click(screen.getByRole('button', { name: 'Xem trước danh sách tham gia' }));

    await waitFor(() => {
      expect(screen.getByText('Xem trước danh sách tham gia hiện tại')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/CNTT K18A/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Student A')).toBeInTheDocument();
  });
});

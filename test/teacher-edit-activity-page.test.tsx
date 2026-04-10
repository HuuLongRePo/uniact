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

describe('EditActivityPage', () => {
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

  it('updates a rejected draft, uses default capacity when blank, and submits for approval', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/55' && !init?.method) {
        return jsonResponse({
          activity: {
            id: 55,
            title: 'Hoat dong cu',
            description: 'Mo ta cu',
            date_time: '2026-04-25T08:30:00.000Z',
            location: 'Phong A1',
            status: 'draft',
            approval_status: 'rejected',
            rejected_reason: 'Can bo sung thong tin',
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

      if (url === '/api/classes?mine=1') {
        return jsonResponse({
          classes: [{ id: 1, name: 'CNTT K18A' }],
        });
      }

      if (url === '/api/activity-types') {
        return jsonResponse({
          types: [{ id: 5, name: 'Tinh nguyen' }],
        });
      }

      if (url === '/api/organization-levels') {
        return jsonResponse({
          levels: [{ id: 7, name: 'Cap truong' }],
        });
      }

      if (url === '/api/activities/55' && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body || '{}'));

        expect(body).toMatchObject({
          title: 'Hoat dong da sua',
          description: 'Mo ta da cap nhat',
          date_time: '2026-04-25T08:30',
          location: 'Phong B2',
          max_participants: 30,
          activity_type_id: 5,
          organization_level_id: 7,
          class_ids: [1],
        });
        expect(body).not.toHaveProperty('status');

        return jsonResponse({
          activity: { id: 55, title: body.title },
        });
      }

      if (url === '/api/activities/55/submit-approval' && init?.method === 'POST') {
        return jsonResponse({
          activity_id: 55,
          new_status: 'draft',
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<EditActivityPage params={{ id: '55' }} />);

    expect(await screen.findByText('Hoat dong bi tu choi')).toBeInTheDocument();
    expect(screen.getByText('Tinh nguyen')).toBeInTheDocument();
    expect(screen.getByText('Cap truong')).toBeInTheDocument();

    const textInputs = screen.getAllByRole('textbox');
    fireEvent.change(textInputs[0] as HTMLInputElement, {
      target: { value: 'Hoat dong da sua' },
    });
    fireEvent.change(textInputs[1] as HTMLTextAreaElement, {
      target: { value: 'Mo ta da cap nhat' },
    });
    fireEvent.change(textInputs[2] as HTMLInputElement, {
      target: { value: 'Phong B2' },
    });

    const numberInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(numberInput, {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Gui duyet' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Gui duyet thanh cong');
    });

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url) === '/api/activities/55/submit-approval' && init?.method === 'POST'
      )
    ).toBe(true);

    expect(pushMock).toHaveBeenCalledWith('/teacher/activities');
  });
});

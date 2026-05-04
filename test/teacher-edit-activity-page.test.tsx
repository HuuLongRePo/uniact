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

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({
          has_class_schedule_conflict: false,
          class_schedule_conflicts: [],
        });
      }

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

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [{ id: 5, name: 'Tình nguyện' }] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [{ id: 7, name: 'Cấp trường' }] });

      if (url === '/api/activities/55' && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body).toMatchObject({
          title: 'Hoạt động đã sửa',
          description: 'Mô tả đã cập nhật',
          date_time: '2026-04-25T08:30',
          end_time: null,
          location: 'Phòng B2',
          max_participants: 30,
          activity_type_id: 5,
          organization_level_id: 7,
          class_ids: [1],
          mandatory_class_ids: [1],
          voluntary_class_ids: [],
          applies_to_all_students: false,
        });
        expect(body).not.toHaveProperty('status');
        return jsonResponse({ activity: { id: 55, title: body.title } });
      }

      if (url === '/api/activities/55/submit-approval' && init?.method === 'POST') {
        return jsonResponse({ activity_id: 55, new_status: 'draft' });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(React.createElement(EditActivityPage, { params: { id: '55' } as any }));

    expect(await screen.findByText('Hoat dong bi tu choi')).toBeInTheDocument();
    expect(screen.getByText('Tình nguyện')).toBeInTheDocument();
    expect(screen.getByText('Cấp trường')).toBeInTheDocument();

    const textInputs = screen.getAllByRole('textbox');
    fireEvent.change(textInputs[0] as HTMLInputElement, { target: { value: 'Hoạt động đã sửa' } });
    fireEvent.change(textInputs[1] as HTMLTextAreaElement, { target: { value: 'Mô tả đã cập nhật' } });
    fireEvent.change(textInputs[2] as HTMLInputElement, { target: { value: 'Phòng B2' } });

    const numberInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(numberInput, { target: { value: '' } });

    expect(screen.getByRole('button', { name: 'Den buoc 3 de gui duyet' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Buoc 3: Kiem tra va gui' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gui duyet' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da gui duyet hoat dong');
    });

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url) === '/api/activities/55/submit-approval' && init?.method === 'POST'
      )
    ).toBe(true);

    expect(pushMock).toHaveBeenCalledWith('/teacher/activities');
  });

  it('disables update and submit actions when class schedule conflicts are detected', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({
          has_class_schedule_conflict: true,
          class_schedule_conflicts: [
            {
              activity_id: 99,
              title: 'Hoat dong trung',
              class_id: 1,
              class_name: 'CNTT K18A',
              date_time: '2026-04-25T08:30:00.000Z',
              overlap_minutes: 45,
            },
          ],
        });
      }

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
            max_participants: 30,
            activity_type_id: 5,
            organization_level_id: 7,
            class_ids: [1],
            mandatory_class_ids: [1],
            voluntary_class_ids: [],
            classes: [{ id: 1, name: 'CNTT K18A', participation_mode: 'mandatory' }],
          },
        });
      }

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [{ id: 5, name: 'Tinh nguyen' }] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [{ id: 7, name: 'Cap truong' }] });

      if (url === '/api/activities/55' && init?.method === 'PUT') {
        throw new Error('Update API must not be called when conflicts exist');
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(React.createElement(EditActivityPage, { params: { id: '55' } as any }));

    expect(await screen.findByText(/Hoat dong bi tu choi/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Buoc 3: Kiem tra va gui/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Luu nhap/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Gui duyet/i })).toBeDisabled();
    });

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url) === '/api/activities/55' && init?.method === 'PUT'
      )
    ).toBe(false);
  });

  it('blocks beforeunload when form has unsaved changes', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({
          has_class_schedule_conflict: false,
          class_schedule_conflicts: [],
        });
      }

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
            max_participants: 30,
            activity_type_id: 5,
            organization_level_id: 7,
            class_ids: [1],
            mandatory_class_ids: [1],
            voluntary_class_ids: [],
            classes: [{ id: 1, name: 'CNTT K18A', participation_mode: 'mandatory' }],
          },
        });
      }

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [{ id: 5, name: 'Tinh nguyen' }] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [{ id: 7, name: 'Cap truong' }] });

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    render(React.createElement(EditActivityPage, { params: { id: '55' } as any }));

    expect(await screen.findByText(/Hoat dong bi tu choi/i)).toBeInTheDocument();

    const textInputs = screen.getAllByRole('textbox');
    fireEvent.change(textInputs[0] as HTMLInputElement, { target: { value: 'Hoat dong moi' } });

    const beforeUnloadHandlers = addEventListenerSpy.mock.calls
      .filter(([eventName]) => eventName === 'beforeunload')
      .map(([, handler]) => handler as EventListener);
    const latestBeforeUnload = beforeUnloadHandlers[beforeUnloadHandlers.length - 1];
    expect(latestBeforeUnload).toBeTypeOf('function');

    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined as unknown,
    } as BeforeUnloadEvent;
    latestBeforeUnload(event as unknown as Event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.returnValue).toBe('');
    addEventListenerSpy.mockRestore();
  });

  it('does not block beforeunload when form has no changes', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({
          has_class_schedule_conflict: false,
          class_schedule_conflicts: [],
        });
      }

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
            max_participants: 30,
            activity_type_id: 5,
            organization_level_id: 7,
            class_ids: [1],
            mandatory_class_ids: [1],
            voluntary_class_ids: [],
            classes: [{ id: 1, name: 'CNTT K18A', participation_mode: 'mandatory' }],
          },
        });
      }

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [{ id: 5, name: 'Tinh nguyen' }] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [{ id: 7, name: 'Cap truong' }] });

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    render(React.createElement(EditActivityPage, { params: { id: '55' } as any }));

    expect(await screen.findByText(/Hoat dong bi tu choi/i)).toBeInTheDocument();

    const beforeUnloadHandlers = addEventListenerSpy.mock.calls
      .filter(([eventName]) => eventName === 'beforeunload')
      .map(([, handler]) => handler as EventListener);
    const latestBeforeUnload = beforeUnloadHandlers[beforeUnloadHandlers.length - 1];
    expect(latestBeforeUnload).toBeTypeOf('function');

    const event = {
      preventDefault: vi.fn(),
      returnValue: undefined as unknown,
    } as BeforeUnloadEvent;
    latestBeforeUnload(event as unknown as Event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.returnValue).toBeUndefined();
    addEventListenerSpy.mockRestore();
  });
});

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

describe('CreateActivityPage', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates the activity first, uploads files to the created activity, and then submits for approval', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/classes') {
        return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      }

      if (url === '/api/activity-types') {
        return jsonResponse({ types: [{ id: 5, name: 'Tình nguyện' }] });
      }

      if (url === '/api/organization-levels') {
        return jsonResponse({ levels: [{ id: 7, name: 'Cấp trường' }] });
      }

      if (url === '/api/activities' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body).toMatchObject({
          title: 'Hoạt động legacy',
          date_time: '2026-04-20T08:30',
          location: 'Phòng 101',
          max_participants: 30,
          class_ids: [1],
          mandatory_class_ids: [1],
          voluntary_class_ids: [],
          mandatory_student_ids: [],
          voluntary_student_ids: [],
          applies_to_all_students: false,
        });
        expect(body.end_time).toBeUndefined();
        expect(body).not.toHaveProperty('files');
        expect(body).not.toHaveProperty('status');

        return jsonResponse({ activity: { id: 321, title: body.title } }, true, 201);
      }

      if (url === '/api/activities/321/files' && init?.method === 'POST') {
        expect(init?.body).toBeInstanceOf(FormData);
        return jsonResponse({ files: [{ id: 801, file_name: 'guide.pdf' }] }, true, 201);
      }

      if (url === '/api/activities/321/submit-approval' && init?.method === 'POST') {
        return jsonResponse({ activity_id: 321, new_status: 'draft' });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));

    expect((await screen.findAllByText('CNTT K18A')).length).toBeGreaterThan(0);

    const textInputs = container.querySelectorAll('input[type="text"]');
    fireEvent.change(textInputs[0] as HTMLInputElement, { target: { value: 'Hoạt động legacy' } });
    fireEvent.change(container.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: '2026-04-20' },
    });
    const timeInputs = container.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0] as HTMLInputElement, {
      target: { value: '08:30' },
    });
    fireEvent.change(textInputs[1] as HTMLInputElement, { target: { value: 'Phòng 101' } });

    const classSelects = container.querySelectorAll('select[multiple]');
    const mandatorySelect = classSelects[0] as HTMLSelectElement;
    mandatorySelect.options[0].selected = true;
    fireEvent.change(mandatorySelect);

    expect(screen.getByRole('button', { name: 'Đến bước 3 để gửi duyệt' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Bước 3: Tài liệu và gửi' }));

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf-content'], 'guide.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Gửi duyệt/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    });

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url) === '/api/activities/321/files' && init?.method === 'POST'
      )
    ).toBe(true);

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url) === '/api/activities/321/submit-approval' && init?.method === 'POST'
      )
    ).toBe(true);
  });

  it('treats an empty scope as open for all students when creating an activity', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });

      if (url === '/api/activities' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body).toMatchObject({
          title: 'Mở toàn trường',
          date_time: '2026-05-01T09:00',
          location: 'Hội trường lớn',
          class_ids: [],
          mandatory_class_ids: [],
          voluntary_class_ids: [],
          mandatory_student_ids: [],
          voluntary_student_ids: [],
          applies_to_all_students: true,
        });

        return jsonResponse({ activity: { id: 500, title: body.title } }, true, 201);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));

    const textInputs = container.querySelectorAll('input[type="text"]');
    fireEvent.change(textInputs[0] as HTMLInputElement, { target: { value: 'Mở toàn trường' } });
    fireEvent.change(container.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: '2026-05-01' },
    });
    const timeInputs = container.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0] as HTMLInputElement, {
      target: { value: '09:00' },
    });
    fireEvent.change(textInputs[1] as HTMLInputElement, { target: { value: 'Hội trường lớn' } });

    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Tài liệu và gửi/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lưu nháp/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it('allows bulk-picking filtered direct students into the mandatory bucket', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });
      if (url === '/api/teacher/students') {
        return jsonResponse({
          students: [
            { id: 201, name: 'Nguyễn Văn A', email: 'a@example.com', class_name: 'CNTT K18A' },
            { id: 202, name: 'Trần Văn B', email: 'b@example.com', class_name: 'CNTT K18B' },
          ],
        });
      }

      if (url === '/api/activities' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body).toMatchObject({
          title: 'Chọn trực tiếp học viên',
          date_time: '2026-05-02T07:30',
          location: 'Sân trường',
          mandatory_student_ids: [201],
          voluntary_student_ids: [],
          applies_to_all_students: false,
        });

        return jsonResponse({ activity: { id: 700, title: body.title } }, true, 201);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));

    const textInputs = container.querySelectorAll('input[type="text"]');
    fireEvent.change(textInputs[0] as HTMLInputElement, {
      target: { value: 'Chọn trực tiếp học viên' },
    });
    fireEvent.change(container.querySelector('input[type="date"]') as HTMLInputElement, {
      target: { value: '2026-05-02' },
    });
    const timeInputs = container.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0] as HTMLInputElement, {
      target: { value: '07:30' },
    });
    fireEvent.change(textInputs[1] as HTMLInputElement, { target: { value: 'Sân trường' } });

    fireEvent.click(screen.getByRole('button', { name: /Tải danh sách học viên/i }));
    expect(await screen.findByText(/Đã nạp 2 học viên/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Lọc theo tên, email hoặc lớp/i), {
      target: { value: 'Nguyễn Văn A' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Chọn tất cả đang lọc' })[0]);

    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Tài liệu và gửi/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lưu nháp/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });
});

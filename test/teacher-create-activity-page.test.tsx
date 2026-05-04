import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateActivityPage from '@/app/teacher/activities/new/page';

const { toastErrorMock, toastSuccessMock, routerPushMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  routerPushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
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

function fillRequiredFields(container: HTMLElement, values?: Partial<Record<string, string>>) {
  const title = values?.title ?? 'Hoat dong test';
  const date = values?.date ?? '2026-05-06';
  const time = values?.time ?? '08:00';
  const location = values?.location ?? 'Phong 101';

  const textInputs = container.querySelectorAll('input[type="text"]');
  fireEvent.change(textInputs[0] as HTMLInputElement, { target: { value: title } });
  fireEvent.change(container.querySelector('input[type="date"]') as HTMLInputElement, {
    target: { value: date },
  });
  const timeInputs = container.querySelectorAll('input[type="time"]');
  fireEvent.change(timeInputs[0] as HTMLInputElement, { target: { value: time } });
  fireEvent.change(textInputs[1] as HTMLInputElement, { target: { value: location } });
}

function getClassSearchInput() {
  const input = screen
    .getAllByRole('textbox')
    .find((element) => {
      const placeholder = ((element as HTMLInputElement).placeholder || '').toLowerCase();
      const hasFilterWord =
        placeholder.includes('loc') || placeholder.includes('lọc') || placeholder.includes('lá»c');
      const hasClassWord =
        placeholder.includes('lop') || placeholder.includes('lớp') || placeholder.includes('lá»›p');
      return hasFilterWord && hasClassWord;
    }) as HTMLInputElement | undefined;

  if (!input) {
    throw new Error('Class search input not found');
  }
  return input;
}

function clickPickAllFilteredClassMandatory() {
  const button = screen.getAllByRole('button').find((element) => {
    const text = (element.textContent || '').toLowerCase();
    return (
      text.includes('chon tat ca dang loc') ||
      text.includes('chọn tất cả đang lọc') ||
      text.includes('chá»n táº¥t cáº£ ä‘ang lá»c')
    );
  }) as HTMLButtonElement | undefined;

  if (!button) {
    throw new Error('Mandatory quick-pick button not found');
  }
  fireEvent.click(button);
}

function clickLoadStudentsButton() {
  fireEvent.click(
    screen.getByRole('button', {
      name: /tải danh sách học viên|tai danh sach hoc vien/i,
    })
  );
}

describe('CreateActivityPage', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    routerPushMock.mockReset();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates the activity, uploads files, then submits approval', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({ has_class_schedule_conflict: false, class_schedule_conflicts: [] });
      }

      if (url === '/api/classes') {
        return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      }
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });

      if (url === '/api/activities' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body).toMatchObject({
          title: 'Legacy activity',
          date_time: '2026-04-20T08:30',
          location: 'Phong 101',
          max_participants: 30,
          class_ids: [1],
          mandatory_class_ids: [1],
          voluntary_class_ids: [],
          mandatory_student_ids: [],
          voluntary_student_ids: [],
          applies_to_all_students: false,
        });
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

    fillRequiredFields(container, {
      title: 'Legacy activity',
      date: '2026-04-20',
      time: '08:30',
      location: 'Phong 101',
    });

    clickPickAllFilteredClassMandatory();
    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Tài liệu và gửi|Buoc 3: Tai lieu va gui/i }));

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf-content'], 'guide.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Gửi duyệt|Gui duyet/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledTimes(1);
    });
  });

  it('blocks submit when class schedule conflicts are detected', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({
          has_class_schedule_conflict: true,
          class_schedule_conflicts: [
            {
              activity_id: 10,
              title: 'Conflict activity',
              class_id: 1,
              class_name: 'CNTT K18A',
              date_time: '2026-04-20T08:30:00.000Z',
              overlap_minutes: 60,
            },
          ],
        });
      }

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });

      if (url === '/api/activities' && init?.method === 'POST') {
        throw new Error('Create API must not be called when conflicts exist');
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));
    expect((await screen.findAllByText('CNTT K18A')).length).toBeGreaterThan(0);

    fillRequiredFields(container, {
      title: 'Blocked activity',
      date: '2026-04-20',
      time: '08:30',
      location: 'Phong 101',
    });
    clickPickAllFilteredClassMandatory();

    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Tài liệu và gửi|Buoc 3: Tai lieu va gui/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Lưu nháp|Luu nhap/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Gửi duyệt|Gui duyet/i })).toBeDisabled();
    });
  });

  it('treats empty scope as applies-to-all students', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({ has_class_schedule_conflict: false, class_schedule_conflicts: [] });
      }

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });

      if (url === '/api/activities' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body.applies_to_all_students).toBe(true);
        expect(body.class_ids).toEqual([]);
        return jsonResponse({ activity: { id: 500, title: body.title } }, true, 201);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));
    fillRequiredFields(container, {
      title: 'Open scope',
      date: '2026-05-01',
      time: '09:00',
      location: 'Hoi truong lon',
    });

    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Tài liệu và gửi|Buoc 3: Tai lieu va gui/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lưu nháp|Luu nhap/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it('supports checklist filtering and quick-pick for mandatory class scope', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({ has_class_schedule_conflict: false, class_schedule_conflicts: [] });
      }

      if (url === '/api/classes') {
        return jsonResponse({
          classes: [
            { id: 1, name: 'CNTT K18A' },
            { id: 2, name: 'ANM K18B' },
          ],
        });
      }
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });

      if (url === '/api/activities' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body.class_ids).toEqual([2]);
        expect(body.mandatory_class_ids).toEqual([2]);
        return jsonResponse({ activity: { id: 501, title: body.title } }, true, 201);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));
    fillRequiredFields(container, {
      title: 'Checklist class',
      date: '2026-05-03',
      time: '08:00',
      location: 'Phong B1',
    });

    expect((await screen.findAllByText('ANM K18B')).length).toBeGreaterThan(0);
    fireEvent.change(getClassSearchInput(), { target: { value: 'ANM' } });
    clickPickAllFilteredClassMandatory();

    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Tài liệu và gửi|Buoc 3: Tai lieu va gui/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lưu nháp|Luu nhap/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it('allows bulk-picking filtered direct students into mandatory bucket', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({ has_class_schedule_conflict: false, class_schedule_conflicts: [] });
      }

      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });
      if (url === '/api/teacher/students') {
        return jsonResponse({
          students: [
            { id: 201, name: 'Nguyen Van A', email: 'a@example.com', class_name: 'CNTT K18A' },
            { id: 202, name: 'Tran Van B', email: 'b@example.com', class_name: 'CNTT K18B' },
          ],
        });
      }

      if (url === '/api/activities' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body.mandatory_student_ids).toEqual([201]);
        return jsonResponse({ activity: { id: 700, title: body.title } }, true, 201);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));
    fillRequiredFields(container, {
      title: 'Direct students',
      date: '2026-05-02',
      time: '07:30',
      location: 'San truong',
    });

    clickLoadStudentsButton();
    expect((await screen.findAllByText(/2 học viên|2 hoc vien/i)).length).toBeGreaterThan(0);

    const studentFilterInput = screen
      .getAllByRole('textbox')
      .find((element) => {
        const placeholder = ((element as HTMLInputElement).placeholder || '').toLowerCase();
        return (
          placeholder.includes('email') && (placeholder.includes('lớp') || placeholder.includes('lop'))
        );
      }) as HTMLInputElement;
    fireEvent.change(studentFilterInput, { target: { value: 'Nguyen Van A' } });

    const pickButtons = screen.getAllByRole('button').filter((element) => {
      const text = (element.textContent || '').toLowerCase();
      return text.includes('chon tat ca dang loc') || text.includes('chọn tất cả đang lọc');
    });
    fireEvent.click(pickButtons[2] as HTMLButtonElement);

    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Tài liệu và gửi|Buoc 3: Tai lieu va gui/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lưu nháp|Luu nhap/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it('updates max participant min by selected scope and keeps larger manual input', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({ has_class_schedule_conflict: false, class_schedule_conflicts: [] });
      }

      if (url === '/api/classes') {
        return jsonResponse({
          classes: [
            { id: 1, name: 'CNTT K18A', student_count: 20 },
            { id: 2, name: 'ANM K18B', student_count: 15 },
          ],
        });
      }
      if (url === '/api/activity-types') return jsonResponse({ types: [{ id: 9, name: 'Tinh nguyen' }] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });

      if (url === '/api/activities' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        expect(body.class_ids).toEqual([2]);
        expect(body.max_participants).toBe(40);
        return jsonResponse({ activity: { id: 900, title: body.title } }, true, 201);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));
    fillRequiredFields(container, {
      title: 'Auto floor max',
      date: '2026-05-06',
      time: '08:00',
      location: 'Phong C2',
    });

    expect((await screen.findAllByText('ANM K18B')).length).toBeGreaterThan(0);
    fireEvent.change(getClassSearchInput(), { target: { value: 'ANM' } });
    clickPickAllFilteredClassMandatory();

    fireEvent.click(screen.getByRole('button', { name: /Bước 2: Phạm vi và phân loại|Buoc 2: Pham vi va phan loai/i }));
    const maxInput = container.querySelector('input[type="number"]') as HTMLInputElement;

    await waitFor(() => {
      expect(maxInput.min).toBe('15');
      expect(Number(maxInput.value)).toBeGreaterThanOrEqual(15);
    });

    fireEvent.change(maxInput, { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Tài liệu và gửi|Buoc 3: Tai lieu va gui/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lưu nháp|Luu nhap/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
  });

  it('keeps entered data when moving forward and back between steps', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({ has_class_schedule_conflict: false, class_schedule_conflicts: [] });
      }
      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [{ id: 9, name: 'Tinh nguyen' }] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [{ id: 2, name: 'Cap khoa' }] });

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));
    await screen.findAllByText('CNTT K18A');

    fillRequiredFields(container, {
      title: 'Giu du lieu khi quay lai',
      date: '2026-05-10',
      time: '09:30',
      location: 'Phong D1',
    });

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Mo ta test giu du lieu' } });

    fireEvent.click(screen.getByRole('button', { name: /Bước 2: Phạm vi và phân loại|Buoc 2: Pham vi va phan loai/i }));
    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Tài liệu và gửi|Buoc 3: Tai lieu va gui/i }));
    fireEvent.click(screen.getByRole('button', { name: /Bước 1: Thông tin|Buoc 1: Thong tin/i }));

    const textInputs = container.querySelectorAll('input[type="text"]');
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement;

    expect((textInputs[0] as HTMLInputElement).value).toBe('Giu du lieu khi quay lai');
    expect((textInputs[1] as HTMLInputElement).value).toBe('Phong D1');
    expect(dateInput.value).toBe('2026-05-10');
    expect(timeInput.value).toBe('09:30');
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
      'Mo ta test giu du lieu'
    );
  });

  it('restores draft snapshot from session storage on page load', async () => {
    window.sessionStorage.setItem(
      'teacher:create-activity:draft:v1',
      JSON.stringify({
        schemaVersion: 1,
        savedAt: Date.now(),
        title: 'Draft title',
        description: 'Draft description',
        date: '2026-05-12',
        time: '10:15',
        endTime: '',
        location: 'Draft room',
        maxParticipants: 55,
        mandatoryClassIds: [1],
        voluntaryClassIds: [],
        mandatoryStudentIds: [],
        voluntaryStudentIds: [],
        appliesToAllStudents: false,
        activityTypeId: 9,
        organizationLevelId: '',
        quickTemplateId: '',
        currentTab: 'details',
        classSearch: 'CNTT',
        studentSearch: '',
        studentsLoaded: false,
        studentOptions: [],
      })
    );

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({ has_class_schedule_conflict: false, class_schedule_conflicts: [] });
      }
      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [{ id: 9, name: 'Tinh nguyen' }] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bước 2: Phạm vi và phân loại|Buoc 2: Pham vi va phan loai/i })).toHaveClass(
        'border-b-2'
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Bước 1: Thông tin|Buoc 1: Thong tin/i }));

    const textInputs = container.querySelectorAll('input[type="text"]');
    expect((textInputs[0] as HTMLInputElement).value).toBe('Draft title');
    expect((textInputs[1] as HTMLInputElement).value).toBe('Draft room');
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
      'Draft description'
    );
    expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe(
      '2026-05-12'
    );
  });

  it('clears draft snapshot after successful save', async () => {
    window.sessionStorage.setItem(
      'teacher:create-activity:draft:v1',
      JSON.stringify({ title: 'stale', description: '', date: '', time: '', endTime: '', location: '' })
    );

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({ has_class_schedule_conflict: false, class_schedule_conflicts: [] });
      }
      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });
      if (url === '/api/teacher/students') return jsonResponse({ students: [] });
      if (url === '/api/activities' && init?.method === 'POST') {
        return jsonResponse({ activity: { id: 1000, title: 'Saved' } }, true, 201);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));
    await screen.findAllByText('CNTT K18A');

    clickLoadStudentsButton();
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url) === '/api/teacher/students').length
      ).toBe(1);
    });
    fireEvent.click(screen.getAllByRole('checkbox')[0] as HTMLInputElement);

    fillRequiredFields(container, {
      title: 'Save and clear draft',
      date: '2026-05-15',
      time: '11:00',
      location: 'Room E1',
    });
    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Tài liệu và gửi|Buoc 3: Tai lieu va gui/i }));
    fireEvent.click(screen.getByRole('button', { name: /Lưu nháp|Luu nhap/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
      expect(window.sessionStorage.getItem('teacher:create-activity:draft:v1')).toBeNull();
      expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: /tải danh sách học viên|tai danh sach hoc vien/i }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url) === '/api/teacher/students').length
      ).toBe(2);
    });
  });

  it('does not restore expired draft snapshot', async () => {
    window.sessionStorage.setItem(
      'teacher:create-activity:draft:v1',
      JSON.stringify({
        schemaVersion: 1,
        savedAt: Date.now() - 13 * 60 * 60 * 1000,
        title: 'Expired draft',
        description: 'Old draft',
        date: '2026-05-12',
        time: '10:15',
        endTime: '',
        location: 'Expired room',
        maxParticipants: 20,
        mandatoryClassIds: [],
        voluntaryClassIds: [],
        mandatoryStudentIds: [],
        voluntaryStudentIds: [],
        appliesToAllStudents: false,
        activityTypeId: '',
        organizationLevelId: '',
        quickTemplateId: '',
        currentTab: 'basic',
        classSearch: '',
        studentSearch: '',
        studentsLoaded: false,
        studentOptions: [],
      })
    );

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({ has_class_schedule_conflict: false, class_schedule_conflicts: [] });
      }
      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });
      if (url === '/api/teacher/students') return jsonResponse({ students: [] });
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));
    await screen.findAllByText('CNTT K18A');

    const textInputs = container.querySelectorAll('input[type="text"]');
    expect((textInputs[0] as HTMLInputElement).value).toBe('');
    expect(window.sessionStorage.getItem('teacher:create-activity:draft:v1')).toBeNull();
  });

  it('supports manual discard draft action', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/activities/check-conflicts' && init?.method === 'POST') {
        return jsonResponse({ has_class_schedule_conflict: false, class_schedule_conflicts: [] });
      }
      if (url === '/api/classes') return jsonResponse({ classes: [{ id: 1, name: 'CNTT K18A' }] });
      if (url === '/api/activity-types') return jsonResponse({ types: [] });
      if (url === '/api/organization-levels') return jsonResponse({ levels: [] });
      if (url === '/api/teacher/students') return jsonResponse({ students: [] });
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(React.createElement(CreateActivityPage));
    await screen.findAllByText('CNTT K18A');

    fillRequiredFields(container, {
      title: 'Draft to discard',
      date: '2026-05-22',
      time: '09:00',
      location: 'Room Z',
    });
    clickLoadStudentsButton();
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url) === '/api/teacher/students').length
      ).toBe(1);
    });
    fireEvent.click(screen.getAllByRole('checkbox')[0] as HTMLInputElement);

    fireEvent.click(screen.getByRole('button', { name: /Xóa bản nháp tạm|Xoa ban nhap tam/i }));

    const textInputs = container.querySelectorAll('input[type="text"]');
    expect((textInputs[0] as HTMLInputElement).value).toBe('');
    expect(window.sessionStorage.getItem('teacher:create-activity:draft:v1')).toBeNull();
    expect(confirmSpy).toHaveBeenCalled();
    expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(false);

    clickLoadStudentsButton();
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url) === '/api/teacher/students').length
      ).toBe(2);
    });
  });
});

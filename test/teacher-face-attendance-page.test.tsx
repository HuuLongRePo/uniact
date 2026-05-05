import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const detectSingleEmbeddingMock = vi.fn();
const performLivenessCheckMock = vi.fn();
const requestPreferredCameraStreamMock = vi.fn();

vi.mock('@/lib/biometrics/face-runtime', () => ({
  detectSingleEmbedding: detectSingleEmbeddingMock,
  performLivenessCheck: performLivenessCheckMock,
  FaceBiometricUnavailableError: class FaceBiometricUnavailableError extends Error {},
  FaceDetectionError: class FaceDetectionError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  FACE_BIOMETRIC_RUNTIME_ENABLED: true,
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock('@/lib/camera-stream', () => ({
  requestPreferredCameraStream: requestPreferredCameraStreamMock,
  getCameraAccessErrorMessage: (error: unknown) =>
    error instanceof Error && error.message ? error.message : 'Khong truy cap duoc camera.',
}));

describe('TeacherFaceAttendancePage', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    detectSingleEmbeddingMock.mockReset();
    performLivenessCheckMock.mockReset();
    requestPreferredCameraStreamMock.mockReset();
    requestPreferredCameraStreamMock.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }],
        })),
      },
    } as any);
  });

  it('surfaces secure-context camera error before preview submission', async () => {
    requestPreferredCameraStreamMock.mockRejectedValue(
      new Error(
        'Camera chi hoat dong tren ket noi bao mat (HTTPS hoac localhost). Hay mo lai bang trinh duyet ngoai ung dung nhung.'
      )
    );

    const fetchMock = vi.fn() as any;
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Lay candidate tu camera' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Camera chi hoat dong tren ket noi bao mat (HTTPS hoac localhost). Hay mo lai bang trinh duyet ngoai ung dung nhung.'
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates candidate preview payload for face attendance', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            candidate_embedding: [0.1, 0.2, 0.3],
            quality_score: 75,
            liveness_score: 0.91,
            verification_method: 'candidate_embedding',
            upstream_verified: false,
          },
        }),
      }) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Tao candidate preview' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da tao candidate preview');
    });

    expect(screen.getAllByText(/candidate_embedding/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/biometric/candidate-preview',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('captures candidate embedding from camera and pushes it into the form', async () => {
    detectSingleEmbeddingMock.mockResolvedValue({ embedding: [0.4, 0.5, 0.6], qualityScore: 88 });
    performLivenessCheckMock.mockResolvedValue({ score: 0.94, passed: true, details: [] });

    const fetchMock = vi.fn() as any;
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Lay candidate tu camera' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da lay candidate embedding tu camera');
    });

    expect(screen.getByDisplayValue(/0.4, 0.5, 0.6/)).toBeInTheDocument();
  });

  it('rejects low-quality camera captures before preview submission', async () => {
    detectSingleEmbeddingMock.mockResolvedValue({ embedding: [0.4, 0.5, 0.6], qualityScore: 55 });
    performLivenessCheckMock.mockResolvedValue({ score: 0.94, passed: true, details: [] });

    const fetchMock = vi.fn() as any;
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Lay candidate tu camera' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Anh tu camera chua du ro de tao candidate embedding');
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces no-face camera errors before preview submission', async () => {
    detectSingleEmbeddingMock.mockResolvedValue(null);
    performLivenessCheckMock.mockResolvedValue({ score: 0.94, passed: true, details: [] });

    const fetchMock = vi.fn() as any;
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Lay candidate tu camera' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Khong phat hien duoc khuon mat nao de tao candidate embedding'
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces multiple-face camera errors before preview submission', async () => {
    detectSingleEmbeddingMock.mockResolvedValue({
      embedding: [0.4, 0.5, 0.6],
      qualityScore: 88,
      landmarks: { positions: new Array(121).fill({ x: 1, y: 1 }) },
      detection: { box: { width: 140, height: 140 } },
    });
    performLivenessCheckMock.mockResolvedValue({ score: 0.94, passed: true, details: [] });

    const fetchMock = vi.fn() as any;
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Lay candidate tu camera' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Phat hien nhieu khuon mat, hay chi giu mot nguoi trong khung hinh'
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces liveness detail errors before preview submission', async () => {
    detectSingleEmbeddingMock.mockResolvedValue({
      embedding: [0.4, 0.5, 0.6],
      qualityScore: 88,
      landmarks: { positions: [{ x: 1, y: 1 }] },
      detection: { box: { width: 140, height: 140 } },
    });
    performLivenessCheckMock.mockResolvedValue({
      score: 0.62,
      passed: false,
      details: ['Can chop mat hoac xoay dau ro hon de vuot qua liveness check'],
    });

    const fetchMock = vi.fn() as any;
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Lay candidate tu camera' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Can chop mat hoac xoay dau ro hon de vuot qua liveness check'
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces runtime-unavailable liveness errors before preview submission', async () => {
    detectSingleEmbeddingMock.mockResolvedValue({
      embedding: [0.4, 0.5, 0.6],
      qualityScore: 88,
      landmarks: { positions: [{ x: 1, y: 1 }] },
      detection: { box: { width: 140, height: 140 } },
    });
    performLivenessCheckMock.mockResolvedValue({
      score: 0,
      passed: false,
      status: 'runtime_unavailable',
      details: ['Face biometric runtime unavailable'],
    });

    const fetchMock = vi.fn() as any;
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Lay candidate tu camera' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Face biometric runtime unavailable');
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces verification failure state on the face attendance page', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities/94/participants') {
        return {
          ok: true,
          json: async () => ({
            data: {
              participations: [
                {
                  id: 201,
                  student_id: 3004,
                  student_name: 'Nguyen Van C',
                  student_code: 'HV004',
                  class_name: 'B2',
                  attendance_status: 'registered',
                },
              ],
            },
          }),
        } as Response;
      }

      if (url === '/api/biometric/candidate-preview') {
        return {
          ok: true,
          json: async () => ({
            data: {
              candidate_embedding: [0.1, 0.2, 0.3],
              quality_score: 75,
              liveness_score: 0.91,
              verification_method: 'candidate_embedding',
              upstream_verified: false,
            },
          }),
        } as Response;
      }

      if (url === '/api/attendance/face') {
        return {
          ok: false,
          json: async () => ({
            error: 'Biometric template khong khop de tu dong xac nhan face attendance',
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.change(screen.getByLabelText('Activity ID'), { target: { value: '94' } });
    await waitFor(() => {
      expect(screen.getByLabelText('Student ID')).toHaveValue('3004');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tao candidate preview' }));
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da tao candidate preview');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Gui face attendance' }));
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Biometric template khong khop de tu dong xac nhan face attendance'
      );
    });

    expect(screen.getAllByText('Verify that bai').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Biometric template khong khop de tu dong xac nhan face attendance')
        .length
    ).toBeGreaterThan(0);
  });

  it('loads roster after entering a valid activity id and preselects the first student', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities/94/participants') {
        return {
          ok: true,
          json: async () => ({
            data: {
              participations: [
                {
                  id: 301,
                  student_id: 4001,
                  student_name: 'Tran Thi D',
                  student_code: 'HV401',
                  class_name: 'C1',
                  attendance_status: 'registered',
                },
                {
                  id: 302,
                  student_id: 4002,
                  student_name: 'Le Van E',
                  student_code: 'HV402',
                  class_name: 'C1',
                  attendance_status: 'attended',
                },
              ],
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.change(screen.getByLabelText('Activity ID'), { target: { value: '94' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Student ID')).toHaveValue('4001');
    });

    expect(await screen.findByTestId('pending-attendance-count')).toHaveTextContent('1');
    expect(screen.getAllByText('Tran Thi D').length).toBeGreaterThan(0);
    expect(screen.getByRole('option', { name: /Le Van E - HV402/i })).toBeInTheDocument();
  });

  it('submits face attendance after candidate preview is ready', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/biometric/candidate-preview') {
        return {
          ok: true,
          json: async () => ({
            data: {
              candidate_embedding: [0.1, 0.2, 0.3],
              quality_score: 75,
              liveness_score: 0.91,
              verification_method: 'candidate_embedding',
              upstream_verified: false,
            },
          }),
        } as Response;
      }

      if (url === '/api/attendance/face') {
        return {
          ok: true,
          json: async () => ({
            data: {
              recorded: true,
              verification_source: 'runtime_bridge',
              verification_method: 'candidate_embedding',
              runtime_mode: 'runtime_ready',
            },
          }),
        } as Response;
      }

      if (url === '/api/activities/94/participants') {
        return {
          ok: true,
          json: async () => ({
            data: {
              participations: [
                {
                  id: 201,
                  student_id: 3004,
                  student_name: 'Nguyen Van C',
                  student_code: 'HV004',
                  class_name: 'B2',
                  attendance_status: 'registered',
                },
              ],
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.change(screen.getByLabelText('Activity ID'), { target: { value: '94' } });
    await waitFor(() => {
      expect(screen.getByLabelText('Student ID')).toHaveValue('3004');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tao candidate preview' }));
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da tao candidate preview');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Gui face attendance' }));
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da gui face attendance thanh cong');
    });

    expect(screen.getByText(/verification source/i)).toBeInTheDocument();
    expect(screen.getAllByText('Da verify').length).toBeGreaterThan(0);
    expect(await screen.findByTestId('pending-attendance-count')).toHaveTextContent('1');
    expect(screen.getAllByText('Nguyen Van C').length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/attendance/face',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
